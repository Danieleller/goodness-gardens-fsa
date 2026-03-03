import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { checklistSubmissions, checklistAnswers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [submission] = await db
    .select()
    .from(checklistSubmissions)
    .where(eq(checklistSubmissions.id, Number(id)));

  if (!submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const answers = await db
    .select()
    .from(checklistAnswers)
    .where(eq(checklistAnswers.submissionId, Number(id)));

  return NextResponse.json({ ...submission, answers });
}
