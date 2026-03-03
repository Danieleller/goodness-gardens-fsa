import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [updated] = await db
    .update(notifications)
    .set({ isDismissed: 1 })
    .where(
      and(
        eq(notifications.id, Number(id)),
        eq(notifications.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Notification not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ notification: updated });
}
