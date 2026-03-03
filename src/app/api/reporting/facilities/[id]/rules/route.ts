import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  complianceRules,
  complianceRuleResults,
  complianceAssessments,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const [latestAssessment] = await db
      .select()
      .from(complianceAssessments)
      .where(eq(complianceAssessments.facilityId, Number(id)))
      .orderBy(desc(complianceAssessments.createdAt))
      .limit(1);

    const rules = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.isActive, 1));

    let ruleResults: (typeof complianceRuleResults.$inferSelect)[] = [];
    if (latestAssessment) {
      ruleResults = await db
        .select()
        .from(complianceRuleResults)
        .where(eq(complianceRuleResults.assessmentId, latestAssessment.id));
    }

    return NextResponse.json({
      assessment: latestAssessment ?? null,
      rules,
      ruleResults,
    });
  } catch (error) {
    console.error("Failed to fetch rule evaluation:", error);
    return NextResponse.json(
      { error: "Failed to fetch rule evaluation" },
      { status: 500 }
    );
  }
}
