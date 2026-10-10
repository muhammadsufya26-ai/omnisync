import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { OrderStatus, RiskLevel } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AiRiskAssessmentResult {
  riskScore: number;
  riskLevel: RiskLevel;
  riskReason: string;
  source: "gemini-3.8-flash" | "rule-based-fallback";
}

function normalizeRiskLevel(level: string | undefined, score: number): RiskLevel {
  const upper = (level ?? "").toUpperCase().trim();
  if (upper === "SAFE" || upper === "LOW") return RiskLevel.SAFE;
  if (upper === "MODERATE" || upper === "MEDIUM") return RiskLevel.MODERATE;
  if (upper === "HIGH_RISK" || upper === "HIGH") return RiskLevel.HIGH_RISK;

  if (score < 35) return RiskLevel.SAFE;
  if (score < 70) return RiskLevel.MODERATE;
  return RiskLevel.HIGH_RISK;
}

function computeRuleBasedRisk(params: {
  customerAddress: string;
  city: string;
  channel: string;
  totalAmount: number;
  pastOrders: Array<{ status: OrderStatus; orderNumber: string }>;
}): AiRiskAssessmentResult {
  const { customerAddress, city, channel, totalAmount, pastOrders } = params;
  let score = 25;
  const reasons: string[] = [];

  const rtoOrders = pastOrders.filter(
    (o) => o.status === OrderStatus.RTO_RETURNED
  );
  const deliveredOrders = pastOrders.filter(
    (o) => o.status === OrderStatus.DELIVERED
  );

  // 1. Historical phone behavior
  if (rtoOrders.length > 0) {
    score += Math.min(45, rtoOrders.length * 35);
    reasons.push(
      `Phone has ${rtoOrders.length} prior RTO return(s) (${rtoOrders
        .map((o) => o.orderNumber)
        .join(", ")})`
    );
  }

  if (deliveredOrders.length > 0) {
    score -= Math.min(25, deliveredOrders.length * 15);
    reasons.push(
      `${deliveredOrders.length} verified past delivery(s) on this phone number`
    );
  }

  if (pastOrders.length === 0) {
    score += 10;
    reasons.push("First-time customer phone record");
  }

  // 2. Address quality heuristics
  const addressLower = customerAddress.toLowerCase();
  const hasStructuredNumber =
    /\b(house|flat|apt|plot|street|st|sector|block|phase|lane|room)\b/i.test(
      customerAddress
    ) && /\d+/.test(customerAddress);
  const hasVagueLandmark =
    /\b(near|bazar|chowk|bus stand|call me|gate|hostel|corner)\b/i.test(
      addressLower
    );

  if (!hasStructuredNumber) {
    score += 18;
    reasons.push("Missing structured house/street/sector number");
  } else {
    score -= 10;
  }

  if (hasVagueLandmark && customerAddress.length < 48) {
    score += 14;
    reasons.push("Landmark-heavy or informal delivery instructions");
  }

  // 3. Order value & channel risk signals
  if (totalAmount >= 12000) {
    score += 12;
    reasons.push(
      `High-value COD parcel (PKR ${totalAmount.toLocaleString()})`
    );
  }

  if (channel === "INSTAGRAM") {
    score += 8;
    reasons.push("Social DM channel carries higher impulse-order RTO rate");
  } else if (channel === "DARAZ") {
    score -= 5;
  }

  const primaryMetroCities = ["lahore", "karachi", "islamabad", "rawalpindi"];
  if (!primaryMetroCities.includes(city.toLowerCase().trim())) {
    score += 6;
    reasons.push(`Outstation delivery zone (${city})`);
  }

  const clampedScore = Math.max(5, Math.min(98, Math.round(score)));
  const riskLevel = normalizeRiskLevel(undefined, clampedScore);

  const summaryPrefix =
    riskLevel === RiskLevel.HIGH_RISK
      ? "High RTO probability detected:"
      : riskLevel === RiskLevel.MODERATE
        ? "Moderate RTO risk:"
        : "Low RTO risk profile:";

  const riskReason =
    reasons.length > 0
      ? `${summaryPrefix} ${reasons.join("; ")}.`
      : `${summaryPrefix} Standard address and order profile in ${city}.`;

  return {
    riskScore: clampedScore,
    riskLevel,
    riskReason,
    source: "rule-based-fallback",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { orderId?: string };
    const orderId = body.orderId?.trim();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required in the request body." },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: `Order not found for ID: ${orderId}` },
        { status: 404 }
      );
    }

    // Fetch historical orders for the same customer phone number
    const historicalOrders = await db.order.findMany({
      where: {
        customerPhone: order.customerPhone,
        id: { not: order.id },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        city: true,
        channel: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let assessment: AiRiskAssessmentResult | null = null;
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey) {
      try {
        const client = new GoogleGenAI({ apiKey });

        const prompt = `You are an e-commerce Cash-on-Delivery (COD) Return-to-Origin (RTO) fraud and risk analyst for Pakistan/South Asia fulfillment.
Evaluate the following order and historical phone records to determine its RTO risk.

Current Order:
- Order Number: ${order.orderNumber}
- Channel: ${order.channel}
- Customer Name: ${order.customerName}
- Customer Phone: ${order.customerPhone}
- Delivery Address: ${order.customerAddress}
- City: ${order.city}
- Total Amount: PKR ${order.totalAmount}
- Items: ${order.items.map((i) => `${i.quantity}x ${i.product.name} (SKU: ${i.product.sku})`).join(", ")}

Historical Orders for Phone (${order.customerPhone}):
${
  historicalOrders.length === 0
    ? "No previous orders found for this phone number."
    : historicalOrders
        .map(
          (h) =>
            `- ${h.orderNumber}: Status=${h.status}, Amount=PKR ${h.totalAmount}, City=${h.city}, Channel=${h.channel}`
        )
        .join("\n")
}

Return a JSON object with:
- "riskScore": integer from 0 to 100 (0 = safest, 100 = highest risk of RTO return)
- "riskLevel": one of "SAFE" (0-34), "MODERATE" (35-69), or "HIGH_RISK" (70-100)
- "riskReason": concise 1-2 sentence explanation referencing address completeness, order value, channel, and phone delivery/RTO history.`;

        // Using gemini-3.8-flash with the Interactions API (gemini-2.5-flash is deprecated)
        const interaction = await client.interactions.create({
          model: "gemini-3.8-flash",
          input: prompt,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: {
              type: "object",
              properties: {
                riskScore: {
                  type: "number",
                  description: "Integer risk score between 0 and 100",
                },
                riskLevel: {
                  type: "string",
                  enum: ["SAFE", "MODERATE", "HIGH_RISK"],
                  description: "Categorical risk level",
                },
                riskReason: {
                  type: "string",
                  description:
                    "Concise explanation of why this order received the risk score",
                },
              },
              required: ["riskScore", "riskLevel", "riskReason"],
            },
          },
        });

        const rawText = interaction.output_text;
        if (rawText) {
          const parsed = JSON.parse(rawText) as {
            riskScore?: number;
            riskLevel?: string;
            riskReason?: string;
          };

          const score = Math.max(
            0,
            Math.min(100, Math.round(Number(parsed.riskScore ?? 50)))
          );
          const level = normalizeRiskLevel(parsed.riskLevel, score);
          const reason =
            parsed.riskReason?.trim() ||
            "Evaluated by Gemini AI against customer phone history and address structure.";

          assessment = {
            riskScore: score,
            riskLevel: level,
            riskReason: reason,
            source: "gemini-3.8-flash",
          };
        }
      } catch (aiError) {
        console.warn(
          "[POST /api/ai-risk] Gemini API call failed, falling back to rule-based engine:",
          aiError
        );
      }
    }

    if (!assessment) {
      assessment = computeRuleBasedRisk({
        customerAddress: order.customerAddress,
        city: order.city,
        channel: order.channel,
        totalAmount: order.totalAmount,
        pastOrders: historicalOrders,
      });
    }

    const updatedOrder = await db.order.update({
      where: { id: order.id },
      data: {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        riskReason: assessment.riskReason,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        order: updatedOrder,
        assessment,
        historicalOrderCount: historicalOrders.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/ai-risk] Failed to evaluate order risk:", error);
    return NextResponse.json(
      {
        error: "Failed to evaluate AI risk score",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
