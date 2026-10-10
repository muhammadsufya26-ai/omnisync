import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/sseBroker";
import {
  INITIAL_INVENTORY_ITEMS,
  ROLE_PERMISSIONS_MAP,
  type InventoryItem,
  type ChannelAllocations,
  type UserRole,
} from "@/lib/mockData";

export const dynamic = "force-dynamic";

const PatchInventorySchema = z.object({
  action: z.enum(["push_all"]).optional(),
  id: z.string().optional(),
  sku: z.string().optional(),
  delta: z.number().optional(),
  allocations: z
    .object({
      Shopify: z.number().nonnegative(),
      Amazon: z.number().nonnegative(),
      Etsy: z.number().nonnegative(),
    })
    .optional(),
});

let inMemoryInventory: InventoryItem[] = [...INITIAL_INVENTORY_ITEMS];

function computeTotalUnits(alloc: ChannelAllocations): number {
  return alloc.Shopify + alloc.Amazon + alloc.Etsy;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get("category");
    const searchParam = searchParams.get("search")?.trim().toLowerCase();

    let items = [...inMemoryInventory];

    if (categoryParam && categoryParam !== "All") {
      items = items.filter((item) => item.category === categoryParam);
    }

    if (searchParam) {
      items = items.filter(
        (item) =>
          item.sku.toLowerCase().includes(searchParam) ||
          item.name.toLowerCase().includes(searchParam)
      );
    }

    const totalUnits = items.reduce(
      (sum, item) => sum + computeTotalUnits(item.allocations),
      0
    );

    return NextResponse.json(
      {
        items,
        totalSkus: items.length,
        totalUnits,
        syncedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/inventory] Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory items" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const rateLimit = checkRateLimit(`api_inventory_patch_${clientIp}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimit.headers }
    );
  }

  // RBAC guard via x-omnisync-role header (blocks SUPPORT and VIEWER from stock reassignment)
  const roleHeader = (request.headers.get("x-omnisync-role") ||
    "OWNER") as UserRole;
  const rolePermissions =
    ROLE_PERMISSIONS_MAP[roleHeader] || ROLE_PERMISSIONS_MAP.OWNER;
  if (!rolePermissions.canReassignStock) {
    return NextResponse.json(
      {
        error: `Forbidden: Role '${roleHeader}' is blocked from reassigning stock levels.`,
      },
      { status: 403, headers: rateLimit.headers }
    );
  }

  try {
    const rawBody = await request.json().catch(() => ({}));
    const parsed = PatchInventorySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid inventory update payload",
          issues: parsed.error.issues,
        },
        { status: 400, headers: rateLimit.headers }
      );
    }

    const body = parsed.data;

    if (body.action === "push_all") {
      inMemoryInventory = inMemoryInventory.map((item) => ({
        ...item,
        lastPushedAt: "Just now",
      }));

      return NextResponse.json(
        {
          success: true,
          items: inMemoryInventory,
          pushedChannels: ["Shopify", "Amazon", "Etsy"],
          syncedAt: new Date().toISOString(),
        },
        { status: 200, headers: rateLimit.headers }
      );
    }

    const targetIndex = inMemoryInventory.findIndex(
      (item) => item.id === body.id || item.sku === body.sku
    );

    if (targetIndex === -1) {
      return NextResponse.json(
        { error: "Inventory item not found for given id or sku." },
        { status: 404, headers: rateLimit.headers }
      );
    }

    const existing = inMemoryInventory[targetIndex];
    let updatedAllocations: ChannelAllocations = { ...existing.allocations };

    if (body.allocations) {
      updatedAllocations = {
        Shopify: Math.max(0, Math.floor(Number(body.allocations.Shopify) || 0)),
        Amazon: Math.max(0, Math.floor(Number(body.allocations.Amazon) || 0)),
        Etsy: Math.max(0, Math.floor(Number(body.allocations.Etsy) || 0)),
      };
    } else if (typeof body.delta === "number") {
      const delta = body.delta;
      if (delta > 0) {
        updatedAllocations.Shopify += delta;
      } else if (delta < 0) {
        let remaining = Math.abs(delta);
        const channels: Array<keyof ChannelAllocations> = [
          "Shopify",
          "Amazon",
          "Etsy",
        ];
        for (const ch of channels) {
          if (remaining <= 0) break;
          const deduct = Math.min(updatedAllocations[ch], remaining);
          updatedAllocations[ch] -= deduct;
          remaining -= deduct;
        }
      }
    }

    const updatedItem: InventoryItem = {
      ...existing,
      allocations: updatedAllocations,
      lastPushedAt: "Just now",
    };

    inMemoryInventory[targetIndex] = updatedItem;

    return NextResponse.json(
      {
        success: true,
        item: updatedItem,
        totalStock: computeTotalUnits(updatedAllocations),
        pushedChannels: ["Shopify", "Amazon", "Etsy"],
        syncedAt: new Date().toISOString(),
      },
      { status: 200, headers: rateLimit.headers }
    );
  } catch (error) {
    console.error("[PATCH /api/inventory] Error updating stock:", error);
    return NextResponse.json(
      { error: "Failed to update inventory stock" },
      { status: 500, headers: rateLimit.headers }
    );
  }
}
