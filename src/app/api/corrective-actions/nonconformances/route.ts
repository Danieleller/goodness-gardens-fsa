import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { nonconformances } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const records = await db
    .select()
    .from(nonconformances)
    .where(eq(nonconformances.userId, userId))
    .orderBy(desc(nonconformances.findingDate));

  return NextResponse.json({ nonconformances: records });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [record] = await db
    .insert(nonconformances)
    .values({
      ...body,
      userId,
    })
    .returning();

  return NextResponse.json({ nonconformance: record }, { status: 201 });
}
