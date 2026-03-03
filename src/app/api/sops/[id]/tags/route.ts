import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopTags } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { tags } = await request.json();

  if (!tags || !Array.isArray(tags)) {
    return NextResponse.json({ error: "Tags array is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(sopTags)
    .values(tags.map((tag: string) => ({ sopId: Number(id), tag })))
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");

  if (!tag) {
    return NextResponse.json({ error: "Tag query parameter is required" }, { status: 400 });
  }

  await db
    .delete(sopTags)
    .where(and(eq(sopTags.sopId, Number(id)), eq(sopTags.tag, tag)));

  return NextResponse.json({ success: true });
}
