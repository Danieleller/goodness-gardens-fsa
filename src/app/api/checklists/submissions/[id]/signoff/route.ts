import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { checklistSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(checklistSubmissions)
    .where(eq(checklistSubmissions.id, Number(id)));

  if (!existing) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(checklistSubmissions)
    .set({
      supervisorId: userId,
      signoffDate: new Date().toISOString(),
      status: "signed_off",
    })
    .where(eq(checklistSubmissions.id, Number(id)))
    .returning();

  return NextResponse.json(updated);
}
