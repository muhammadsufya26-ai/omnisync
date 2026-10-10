import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      status?: OrderStatus;
      courierName?: string;
      trackingNumber?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: "Order ID parameter is required." },
        { status: 400 }
      );
    }

    if (
      !body.status ||
      !Object.values(OrderStatus).includes(body.status as OrderStatus)
    ) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${Object.values(OrderStatus).join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existingOrder = await db.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: `Order not found with ID: ${id}` },
        { status: 404 }
      );
    }

    const updateData: {
      status: OrderStatus;
      courierName?: string;
      trackingNumber?: string;
    } = {
      status: body.status,
    };

    // Auto-assign courier tracking when dispatching if none was set
    if (body.status === OrderStatus.DISPATCHED) {
      updateData.courierName =
        body.courierName?.trim() ||
        existingOrder.courierName ||
        "TCS Express";
      updateData.trackingNumber =
        body.trackingNumber?.trim() ||
        existingOrder.trackingNumber ||
        `TCS-${Math.floor(10000000 + Math.random() * 90000000)}`;
    } else {
      if (body.courierName !== undefined) {
        updateData.courierName = body.courierName.trim();
      }
      if (body.trackingNumber !== undefined) {
        updateData.trackingNumber = body.trackingNumber.trim();
      }
    }

    const updatedOrder = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error) {
    console.error(
      "[PATCH /api/orders/[id]/status] Failed to update order status:",
      error
    );
    return NextResponse.json(
      {
        error: "Failed to update order status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
