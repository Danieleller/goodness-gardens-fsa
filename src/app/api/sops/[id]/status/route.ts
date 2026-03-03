import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { status } = await request.json();

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(sopDocuments)
    .set({
      status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sopDocuments.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "SOP not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
