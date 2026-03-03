import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { chemicalStorage } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const storage = await db
    .select()
    .from(chemicalStorage)
    .where(eq(chemicalStorage.userId, userId))
    .orderBy(desc(chemicalStorage.createdAt));

  return NextResponse.json({ storage });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [record] = await db
    .insert(chemicalStorage)
    .values({
      ...body,
      userId,
    })
    .returning();

  return NextResponse.json({ storage: record }, { status: 201 });
}
