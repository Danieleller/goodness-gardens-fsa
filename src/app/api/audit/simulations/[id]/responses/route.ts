import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditResponses } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { responses } = await request.json();

  if (!responses || !Array.isArray(responses)) {
    return NextResponse.json({ error: "Responses array is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(auditResponses)
    .values(
      responses.map((r: any) => ({
        simulationId: Number(id),
        questionId: r.question_id ?? r.questionId,
        score: r.score ?? 0,
        notes: r.notes ?? null,
        evidenceUrl: r.evidence_url ?? r.evidenceUrl ?? null,
      }))
    )
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
