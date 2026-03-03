import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const unread = searchParams.get("unread");

  const conditions = [eq(notifications.userId, userId)];

  if (unread === "true") {
    conditions.push(eq(notifications.isRead, 0));
  }

  const records = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));

  return NextResponse.json({ notifications: records });
}
