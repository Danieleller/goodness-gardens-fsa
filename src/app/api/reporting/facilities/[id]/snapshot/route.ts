import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  complianceAssessments,
  complianceRuleResults,
  complianceRules,
  riskScores,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const rules = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.isActive, 1));

    const [latestAssessment] = await db
      .select()
      .from(complianceAssessments)
      .where(eq(complianceAssessments.facilityId, Number(id)))
      .orderBy(desc(complianceAssessments.createdAt))
      .limit(1);

    let ruleResults: (typeof complianceRuleResults.$inferSelect)[] = [];
    if (latestAssessment) {
      ruleResults = await db
        .select()
        .from(complianceRuleResults)
        .where(eq(complianceRuleResults.assessmentId, latestAssessment.id));
    }

    const [latestRisk] = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.facilityId, Number(id)))
      .orderBy(desc(riskScores.calculatedAt))
      .limit(1);

    const snapshot = {
      facilityId: id,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      assessment: latestAssessment ?? null,
      ruleResults,
      rules,
      riskScore: latestRisk ?? null,
    };

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Failed to create snapshot:", error);
    return NextResponse.json(
      { error: "Failed to create snapshot" },
      { status: 500 }
    );
  }
}
