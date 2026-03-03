import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { chemicalApplications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const applications = await db
    .select()
    .from(chemicalApplications)
    .where(eq(chemicalApplications.userId, userId))
    .orderBy(desc(chemicalApplications.createdAt));

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [application] = await db
    .insert(chemicalApplications)
    .values({
      ...body,
      userId,
    })
    .returning();

  return NextResponse.json({ application }, { status: 201 });
}
