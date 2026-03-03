import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { correctiveActions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const actions = await db
    .select()
    .from(correctiveActions)
    .where(eq(correctiveActions.userId, userId))
    .orderBy(desc(correctiveActions.createdAt));

  return NextResponse.json({ correctiveActions: actions });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [action] = await db
    .insert(correctiveActions)
    .values({
      ...body,
      userId,
    })
    .returning();

  return NextResponse.json({ correctiveAction: action }, { status: 201 });
}
