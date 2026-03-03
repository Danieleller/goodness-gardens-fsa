import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditFindings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [finding] = await db
    .select()
    .from(auditFindings)
    .where(eq(auditFindings.id, Number(id)));

  if (!finding) {
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(auditFindings)
    .set({
      status: "capa_created",
      resolutionNotes: `CAPA created by user ${userId}`,
    })
    .where(eq(auditFindings.id, Number(id)))
    .returning();

  return NextResponse.json(updated, { status: 201 });
}
