import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [sop] = await db
    .select()
    .from(sopDocuments)
    .where(eq(sopDocuments.id, Number(id)));

  if (!sop) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  return NextResponse.json(sop);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(sopDocuments)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(sopDocuments.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
