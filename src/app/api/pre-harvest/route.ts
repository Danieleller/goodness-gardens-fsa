import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { preHarvestLogs } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const logType = searchParams.get("log_type");

  const conditions = [eq(preHarvestLogs.userId, userId)];
  if (logType) {
    conditions.push(eq(preHarvestLogs.logType, logType));
  }

  const logs = await db
    .select()
    .from(preHarvestLogs)
    .where(and(...conditions))
    .orderBy(desc(preHarvestLogs.testDate));

  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [log] = await db
    .insert(preHarvestLogs)
    .values({
      ...body,
      userId,
    })
    .returning();

  return NextResponse.json({ log }, { status: 201 });
}
