import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { complianceAssessments, complianceRuleResults } from "@/db/schema";
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

    if (!latestAssessment) {
      return NextResponse.json({ score: null, assessment: null });
    }

    const ruleResults = await db
      .select()
      .from(complianceRuleResults)
      .where(eq(complianceRuleResults.assessmentId, latestAssessment.id));

    return NextResponse.json({
      score: latestAssessment.overallScore,
      assessment: latestAssessment,
      ruleResults,
    });
  } catch (error) {
    console.error("Failed to fetch compliance score:", error);
    return NextResponse.json(
      { error: "Failed to fetch compliance score" },
      { status: 500 }
    );
  }
}
