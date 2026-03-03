import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  await db
    .update(notifications)
    .set({ isRead: 1 })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      )
    );

  return NextResponse.json({ success: true });
}
