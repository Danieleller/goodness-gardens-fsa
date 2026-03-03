import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopFiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { fileId } = await params;

  const [file] = await db
    .select()
    .from(sopFiles)
    .where(eq(sopFiles.id, Number(fileId)));

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json(file);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { fileId } = await params;

  const [deleted] = await db
    .delete(sopFiles)
    .where(eq(sopFiles.id, Number(fileId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
