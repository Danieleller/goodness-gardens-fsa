import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditSimulations, auditResponses, auditQuestionsV2 } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [simulation] = await db
    .select()
    .from(auditSimulations)
    .where(eq(auditSimulations.id, Number(id)));

  if (!simulation) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  const responses = await db
    .select()
    .from(auditResponses)
    .where(eq(auditResponses.simulationId, Number(id)));

  const totalQuestions = responses.length;
  const totalScore = responses.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const maxScore = totalQuestions * 10; // assuming max score per question is 10
  const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return NextResponse.json({
    simulationId: Number(id),
    totalQuestions,
    totalScore,
    maxScore,
    score: scorePercent,
    responses,
  });
}
