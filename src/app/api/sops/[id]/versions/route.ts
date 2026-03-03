import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopVersions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const versions = await db
    .select()
    .from(sopVersions)
    .where(eq(sopVersions.sopId, Number(id)))
    .orderBy(desc(sopVersions.versionNumber));

  return NextResponse.json(versions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [version] = await db
    .insert(sopVersions)
    .values({
      ...body,
      sopId: Number(id),
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(version, { status: 201 });
}
