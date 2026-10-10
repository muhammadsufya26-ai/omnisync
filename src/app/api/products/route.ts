import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/products] Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
