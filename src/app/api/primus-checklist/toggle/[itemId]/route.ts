import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { primusChecklistItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { itemId } = await params;
  const body = await request.json();

  try {
    const [updated] = await db
      .update(primusChecklistItems)
      .set({
        hasDocument: body.completed ? 1 : 0,
      })
      .where(eq(primusChecklistItems.id, Number(itemId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to toggle checklist item:", error);
    return NextResponse.json(
      { error: "Failed to toggle checklist item" },
      { status: 500 }
    );
  }
}
