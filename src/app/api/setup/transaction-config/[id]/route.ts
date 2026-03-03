import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { transactionPrefixConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  try {
    const [updated] = await db
      .update(transactionPrefixConfig)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(transactionPrefixConfig.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Transaction config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update transaction config:", error);
    return NextResponse.json(
      { error: "Failed to update transaction config" },
      { status: 500 }
    );
  }
}
