import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { complianceRules } from "@/db/schema";
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
      .update(complianceRules)
      .set({ isActive: body.enabled ? 1 : 0 })
      .where(eq(complianceRules.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to toggle rule:", error);
    return NextResponse.json(
      { error: "Failed to toggle rule" },
      { status: 500 }
    );
  }
}
