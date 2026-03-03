import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditModules, auditQuestionsV2, sopDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  // Look up the SOP code to find related audit questions via requiredSop
  const [sop] = await db
    .select()
    .from(sopDocuments)
    .where(eq(sopDocuments.id, Number(id)))
    .limit(1);

  const questions = sop
    ? await db
        .select()
        .from(auditQuestionsV2)
        .where(eq(auditQuestionsV2.requiredSop, sop.code))
    : [];

  const moduleIds = [...new Set(questions.map((q) => q.moduleId))];

  let modules: typeof auditModules.$inferSelect[] = [];
  if (moduleIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    modules = await db
      .select()
      .from(auditModules)
      .where(inArray(auditModules.id, moduleIds));
  }

  return NextResponse.json({
    sopId: id,
    questionCount: questions.length,
    modules,
    questions,
  });
}
