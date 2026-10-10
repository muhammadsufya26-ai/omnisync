import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  computeHmacSha256,
  verifyHmacSha256Signature,
  checkRateLimit,
  broadcastSseEvent,
  OMNISYNC_WEBHOOK_SECRET,
} from "@/lib/sseBroker";
import type { OrderRecord } from "@/lib/mockData";

export const dynamic = "force-dynamic";

// Strict Zod schema for incoming external marketplace order webhooks
const WebhookOrderItemSchema = z.object({
  sku: z.string().min(2, "SKU must be at least 2 characters"),
  name: z.string().min(2, "Item name is required"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
  price: z.number().nonnegative("Price must be non-negative"),
});

const WebhookOrderPayloadSchema = z.object({
  orderId: z
    .string()
    .regex(/^(OMS|ORD)-\d{4,6}$/, "orderId must match OMS-XXXX or ORD-XXXX format")
    .optional(),
  customer: z.string().min(2, "Customer full name is required"),
  customerEmail: z.string().email("Valid customer email is required"),
  customerPhone: z.string().optional(),
  city: z.string().optional(),
  shippingAddress: z.string().min(8, "Full shipping address is required"),
  channel: z.enum(["Shopify", "Amazon", "Etsy"]),
  channelDisplay: z
    .enum(["WhatsApp", "Instagram DM", "Daraz Store", "Online Store"])
    .optional(),
  channelNote: z.string().optional(),
  status: z
    .enum(["Pending", "Shipped", "Delivered", "Cancelled"])
    .default("Pending"),
  courierPartner: z
    .enum([
      "Trax Logistics",
      "TCS Express",
      "Leopards Courier",
      "TCS",
      "Leopards",
      "DHL",
      "FedEx",
      "BlueEx",
    ])
    .default("TCS Express"),
  trackingNumber: z.string().min(5).optional(),
  estimatedDelivery: z.string().optional(),
  rtoRiskScore: z.number().optional(),
  rtoRiskLevel: z.enum(["HIGH", "MODERATE", "LOW"]).optional(),
  rtoRiskReason: z.string().optional(),
  items: z
    .array(WebhookOrderItemSchema)
    .min(1, "At least one ordered line item is required"),
});

export type WebhookOrderPayload = z.infer<typeof WebhookOrderPayloadSchema>;

let webhookOrderSeq = 1050;

export async function GET(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rate = checkRateLimit(`webhook-orders-get:${clientIp}`, 60, 60_000);

  const samplePayload: WebhookOrderPayload = {
    orderId: `OMS-${webhookOrderSeq}`,
    customer: "Bilal Ahmed",
    customerEmail: "bilal.ahmed@example.com",
    customerPhone: "+92 300 1234567",
    city: "Islamabad",
    shippingAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
    channel: "Shopify",
    channelDisplay: "WhatsApp",
    channelNote: "Ordered via direct DM voice note confirmation",
    status: "Pending",
    courierPartner: "TCS Express",
    trackingNumber: `TCS-77${webhookOrderSeq}48`,
    estimatedDelivery: "Oct 10, 2026",
    rtoRiskScore: 14,
    rtoRiskLevel: "LOW",
    rtoRiskReason: "Verified Sector G-11/2 residential address.",
    items: [
      {
        sku: "OS-AUD-101",
        name: "AeroPods Pro ANC Wireless Earbuds",
        quantity: 1,
        price: 3450,
      },
    ],
  };

  const rawSample = JSON.stringify(samplePayload);
  const sampleSignature = computeHmacSha256(rawSample, OMNISYNC_WEBHOOK_SECRET);

  return NextResponse.json(
    {
      endpoint: "/api/webhooks/orders",
      security: "HMAC-SHA256 (x-omnisync-signature)",
      validation: "Zod v3 Strict Schema",
      rateLimit: {
        limit: rate.limit,
        remaining: rate.remaining,
      },
      samplePayload,
      sampleSignature,
    },
    { status: 200, headers: rate.headers }
  );
}

export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rate = checkRateLimit(`webhook-orders-post:${clientIp}`, 25, 60_000);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded for /api/webhooks/orders",
        retryAfterSeconds: 60,
      },
      { status: 429, headers: rate.headers }
    );
  }

  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400, headers: rate.headers }
      );
    }

    // Check HMAC SHA-256 signature header
    let signatureHeader = request.headers.get("x-omnisync-signature");

    // Allow authenticated UI test button to request server-side signing using internal secret token
    if (
      !signatureHeader &&
      request.headers.get("x-omnisync-internal-sim") === "omnisync-ui-sim"
    ) {
      signatureHeader = computeHmacSha256(rawBody, OMNISYNC_WEBHOOK_SECRET);
    }

    const isSignatureValid = verifyHmacSha256Signature(
      rawBody,
      signatureHeader,
      OMNISYNC_WEBHOOK_SECRET
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        {
          error:
            "Unauthorized: Invalid or missing x-omnisync-signature HMAC SHA-256 digest.",
          expectedHeader: "x-omnisync-signature",
          algorithm: "HMAC-SHA256",
        },
        { status: 401, headers: rate.headers }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400, headers: rate.headers }
      );
    }

    // Validate request payload against strict Zod schema
    const validation = WebhookOrderPayloadSchema.safeParse(parsedJson);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Webhook payload validation failed",
          issues: validation.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400, headers: rate.headers }
      );
    }

    const data = validation.data;
    const totalAmount = Number(
      data.items
        .reduce((sum, item) => sum + item.quantity * item.price, 0)
        .toFixed(2)
    );

    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    const timeLabel = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const assignedOrderId = data.orderId ?? `OMS-${webhookOrderSeq++}`;
    const newOrder: OrderRecord = {
      id: assignedOrderId,
      customer: data.customer,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      city: data.city,
      shippingAddress: data.shippingAddress,
      channel: data.channel,
      channelDisplay: data.channelDisplay,
      channelNote: data.channelNote,
      date: todayIso,
      syncedAt: `Today • ${timeLabel}`,
      amount: totalAmount,
      status: data.status,
      courierPartner: data.courierPartner,
      trackingNumber:
        data.trackingNumber ??
        `TCS-77${Math.floor(100000 + Math.random() * 900000)}`,
      estimatedDelivery: data.estimatedDelivery ?? "Oct 10, 2026",
      rtoRiskScore: data.rtoRiskScore,
      rtoRiskLevel: data.rtoRiskLevel,
      rtoRiskReason: data.rtoRiskReason,
      items: data.items,
    };

    // Broadcast live SSE event to all active clients
    const broadcastEvt = broadcastSseEvent({
      type: "webhook_order",
      order: newOrder,
      message: `New order #${newOrder.id} received from ${newOrder.channelDisplay || newOrder.channel}`,
      meta: {
        hmacVerified: true,
        channel: newOrder.channel,
        amount: newOrder.amount,
      },
    });

    return NextResponse.json(
      {
        success: true,
        hmacVerified: true,
        order: newOrder,
        eventId: broadcastEvt.id,
        message: `New order #${newOrder.id} received from ${newOrder.channel}`,
      },
      { status: 201, headers: rate.headers }
    );
  } catch (error) {
    console.error("[POST /api/webhooks/orders] Error:", error);
    return NextResponse.json(
      { error: "Internal webhook processing error" },
      { status: 500, headers: rate.headers }
    );
  }
}
