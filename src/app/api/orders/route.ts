import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChannelType, OrderStatus as PrismaOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/sseBroker";
import {
  INITIAL_MOCK_ORDERS,
  ROLE_PERMISSIONS_MAP,
  type OrderRecord,
  type OrderStatus as UiOrderStatus,
  type Channel as UiChannel,
  type LocalizedChannelLabel,
  type CourierPartner,
  type OrderedItem,
  type UserRole,
} from "@/lib/mockData";

export const dynamic = "force-dynamic";

const PatchOrderSchema = z.object({
  id: z.string().optional(),
  ids: z.array(z.string()).optional(),
  status: z.enum(["Pending", "Shipped", "Delivered", "Cancelled"]),
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
    .optional(),
  trackingNumber: z.string().optional(),
  estimatedDelivery: z.string().optional(),
});

// In-memory store for multi-channel orders API simulation
let inMemoryOrders: OrderRecord[] = [...INITIAL_MOCK_ORDERS];
let syncSequenceCounter = 1050;
let candidateCursor = 0;

const WEBHOOK_SYNC_CANDIDATES: Array<{
  customer: string;
  customerEmail: string;
  customerPhone: string;
  city: string;
  shippingAddress: string;
  channel: UiChannel;
  channelDisplay: LocalizedChannelLabel;
  channelNote: string;
  status: UiOrderStatus;
  courierPartner: CourierPartner;
  rtoRiskScore: number;
  rtoRiskLevel: "HIGH" | "MODERATE" | "LOW";
  rtoRiskReason: string;
  items: OrderedItem[];
}> = [
  {
    customer: "Zohaib Hassan",
    customerEmail: "zohaib.hassan.isb@example.com",
    customerPhone: "+92 300 5541920",
    city: "Islamabad",
    shippingAddress: "House #14, Street 3, Sector G-11/2, Islamabad",
    channel: "Shopify",
    channelDisplay: "WhatsApp",
    channelNote: "Ordered via direct DM voice note confirmation",
    status: "Pending",
    courierPartner: "TCS Express",
    rtoRiskScore: 14,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Complete Sector G-11/2 house address • Repeat WhatsApp customer.",
    items: [
      {
        sku: "OS-AUD-101",
        name: "AeroPods Pro ANC Wireless Earbuds",
        quantity: 1,
        price: 3450,
      },
    ],
  },
  {
    customer: "Maryam Nawaz",
    customerEmail: "maryam.khi@example.com",
    customerPhone: "+92 333 8812049",
    city: "Karachi",
    shippingAddress: "Flat 4B, Gulshan-e-Iqbal Block 13D, Karachi",
    channel: "Etsy",
    channelDisplay: "Instagram DM",
    channelNote: "Sale campaign: Winter drop",
    status: "Pending",
    courierPartner: "Trax Logistics",
    rtoRiskScore: 18,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified Block 13D Gulshan-e-Iqbal address • Active phone number.",
    items: [
      {
        sku: "OS-PWR-302",
        name: "VoltMax 20000mAh 65W PD Power Bank",
        quantity: 1,
        price: 4200,
      },
    ],
  },
  {
    customer: "Rizwan Gondal",
    customerEmail: "rizwan.grw@example.com",
    customerPhone: "0321-4490812",
    city: "Gujranwala",
    shippingAddress: "Main Bazar near Clock Tower, Gujranwala",
    channel: "Amazon",
    channelDisplay: "Daraz Store",
    channelNote: "Daraz Mall order sync",
    status: "Pending",
    courierPartner: "Leopards Courier",
    rtoRiskScore: 82,
    rtoRiskLevel: "HIGH",
    rtoRiskReason:
      "Previous parcel returned undelivered in Gujranwala • Incomplete house number detected.",
    items: [
      {
        sku: "OS-WTC-800",
        name: "Chronos Fit AMOLED Titanium Smartwatch",
        quantity: 1,
        price: 6850,
      },
    ],
  },
  {
    customer: "Taimoor Durrani",
    customerEmail: "taimoor.fsd@example.com",
    customerPhone: "+92 301 9920148",
    city: "Faisalabad",
    shippingAddress: "D-Ground Peoples Colony, Faisalabad",
    channel: "Shopify",
    channelDisplay: "Online Store",
    channelNote: "Direct Checkout",
    status: "Pending",
    courierPartner: "TCS Express",
    rtoRiskScore: 16,
    rtoRiskLevel: "LOW",
    rtoRiskReason:
      "Verified Peoples Colony address • Repeat customer with 4 delivered orders.",
    items: [
      {
        sku: "OS-HUB-510",
        name: "HyperPort 8-in-1 Dual 4K USB-C Hub",
        quantity: 1,
        price: 2950,
      },
    ],
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatParam = searchParams.get("format");
    const statusParam = searchParams.get("status");
    const channelParam = searchParams.get("channel");
    const searchParam = searchParams.get("search")?.trim();

    // Filter in-memory multi-channel orders
    let filteredChannelOrders = [...inMemoryOrders];
    if (statusParam && statusParam !== "All" && statusParam !== "ALL") {
      filteredChannelOrders = filteredChannelOrders.filter(
        (o) => o.status.toLowerCase() === statusParam.toLowerCase()
      );
    }
    if (channelParam && channelParam !== "All" && channelParam !== "ALL") {
      filteredChannelOrders = filteredChannelOrders.filter(
        (o) => o.channel.toLowerCase() === channelParam.toLowerCase()
      );
    }
    if (searchParam) {
      const q = searchParam.toLowerCase();
      filteredChannelOrders = filteredChannelOrders.filter(
        (o) =>
          o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)
      );
    }

    if (formatParam === "multichannel") {
      return NextResponse.json(
        {
          orders: filteredChannelOrders,
          total: filteredChannelOrders.length,
        },
        { status: 200 }
      );
    }

    // Also query Prisma SQLite DB for legacy routes (/reconciliation, /dashboard)
    const whereClause: {
      status?: PrismaOrderStatus;
      channel?: ChannelType;
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (
      statusParam &&
      statusParam !== "ALL" &&
      Object.values(PrismaOrderStatus).includes(
        statusParam as PrismaOrderStatus
      )
    ) {
      whereClause.status = statusParam as PrismaOrderStatus;
    }

    if (
      channelParam &&
      channelParam !== "ALL" &&
      Object.values(ChannelType).includes(channelParam as ChannelType)
    ) {
      whereClause.channel = channelParam as ChannelType;
    }

    if (searchParam) {
      whereClause.OR = [
        { orderNumber: { contains: searchParam } },
        { customerName: { contains: searchParam } },
        { customerPhone: { contains: searchParam } },
        { city: { contains: searchParam } },
      ];
    }

    let dbOrders: unknown[] = [];
    try {
      dbOrders = await db.order.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch {
      // Fallback if SQLite is read-only or unavailable in serverless build
      dbOrders = [];
    }

    return NextResponse.json(
      {
        orders: dbOrders,
        multiChannelOrders: filteredChannelOrders,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/orders] Failed to fetch orders:", error);
    return NextResponse.json(
      {
        orders: inMemoryOrders,
        multiChannelOrders: inMemoryOrders,
      },
      { status: 200 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = checkRateLimit(`api_orders_patch_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  // RBAC guard via x-omnisync-role header (defaults to OWNER if not passed)
  const roleHeader = (request.headers.get("x-omnisync-role") ||
    "OWNER") as UserRole;
  const rolePermissions =
    ROLE_PERMISSIONS_MAP[roleHeader] || ROLE_PERMISSIONS_MAP.OWNER;
  if (!rolePermissions.canUpdateOrderStatus) {
    return NextResponse.json(
      {
        error: `Forbidden: Role '${roleHeader}' does not have permission to update order statuses.`,
      },
      { status: 403, headers: rateLimit.headers }
    );
  }

  try {
    const rawBody = await request.json();
    const parsed = PatchOrderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          issues: parsed.error.issues,
        },
        { status: 400, headers: rateLimit.headers }
      );
    }

    const body = parsed.data;
    const targetIds = body.ids ?? (body.id ? [body.id] : []);
    const nextStatus: UiOrderStatus = body.status;

    if (targetIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: provide 'id' (or 'ids') and a valid 'status'.",
        },
        { status: 400, headers: rateLimit.headers }
      );
    }

    const idSet = new Set(targetIds);
    inMemoryOrders = inMemoryOrders.map((order) => {
      if (!idSet.has(order.id)) return order;
      return {
        ...order,
        status: nextStatus,
        courierPartner:
          (body.courierPartner as CourierPartner | undefined) ??
          order.courierPartner,
        trackingNumber: body.trackingNumber ?? order.trackingNumber,
        estimatedDelivery: body.estimatedDelivery ?? order.estimatedDelivery,
      };
    });

    return NextResponse.json(
      {
        success: true,
        updatedIds: targetIds,
        status: nextStatus,
        courierPartner: body.courierPartner,
        trackingNumber: body.trackingNumber,
        estimatedDelivery: body.estimatedDelivery,
        syncedAt: new Date().toISOString(),
      },
      { status: 200, headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("[PATCH /api/orders] Error updating order status:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderRequestBody {
  action?: "webhook_sync";
  existingCount?: number;
  orderNumber?: string;
  channel?: ChannelType;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  city?: string;
  items?: CreateOrderItemInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as CreateOrderRequestBody;

    // 1. Handle simulated multi-channel webhook sync
    if (body.action === "webhook_sync" || !body.items) {
      const countToInject = Math.random() < 0.5 ? 1 : 2;
      const nowTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const todayIso = new Date().toISOString().slice(0, 10);
      const baseSeq = Math.max(
        syncSequenceCounter,
        1040 + (body.existingCount ?? inMemoryOrders.length)
      );

      const syncedOrders: OrderRecord[] = [];
      for (let i = 0; i < countToInject; i++) {
        const template =
          WEBHOOK_SYNC_CANDIDATES[
            (candidateCursor + i) % WEBHOOK_SYNC_CANDIDATES.length
          ];
        const amount = Number(
          template.items
            .reduce((sum, item) => sum + item.quantity * item.price, 0)
            .toFixed(2)
        );

        syncedOrders.push({
          id: `OMS-${baseSeq + i}`,
          customer: template.customer,
          customerEmail: template.customerEmail,
          customerPhone: template.customerPhone,
          city: template.city,
          shippingAddress: template.shippingAddress,
          channel: template.channel,
          channelDisplay: template.channelDisplay,
          channelNote: template.channelNote,
          date: todayIso,
          syncedAt: `Today • ${nowTime}`,
          amount,
          status: template.status,
          courierPartner: template.courierPartner,
          rtoRiskScore: template.rtoRiskScore,
          rtoRiskLevel: template.rtoRiskLevel,
          rtoRiskReason: template.rtoRiskReason,
          items: template.items,
        });
      }

      syncSequenceCounter = baseSeq + countToInject;
      candidateCursor += countToInject;
      inMemoryOrders = [...syncedOrders, ...inMemoryOrders];

      return NextResponse.json(
        {
          success: true,
          syncedOrders,
          message: `Synced ${syncedOrders.length} new order(s) via webhook.`,
        },
        { status: 201 }
      );
    }

    // 2. Handle Prisma order creation for /order form
    const {
      orderNumber,
      channel,
      customerName,
      customerPhone,
      customerAddress,
      city,
      items,
    } = body;

    if (
      !channel ||
      !Object.values(ChannelType).includes(channel) ||
      !customerName?.trim() ||
      !customerPhone?.trim() ||
      !customerAddress?.trim() ||
      !city?.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing or invalid required fields: channel, customerName, customerPhone, customerAddress, city, and non-empty items array are required.",
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (
        !item.productId ||
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          {
            error:
              "Each order item must specify a valid productId and a positive integer quantity.",
          },
          { status: 400 }
        );
      }
    }

    const createdOrder = await db.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsPayload: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        totalAmount += product.price * item.quantity;
        orderItemsPayload.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const generatedOrderNumber =
        orderNumber?.trim() ||
        `ORD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      return tx.order.create({
        data: {
          orderNumber: generatedOrderNumber,
          channel,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          city: city.trim(),
          totalAmount,
          status: PrismaOrderStatus.PENDING_VERIFICATION,
          items: {
            create: orderItemsPayload,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ order: createdOrder }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/orders] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process order";
    const isClientError =
      message.includes("Insufficient stock") ||
      message.includes("Product not found");

    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
