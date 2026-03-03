import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  complianceAssessments,
  complianceRuleResults,
  complianceTrends,
  riskScores,
  facilities,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  try {
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, Number(id)))
      .limit(1);

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

    const trends = await db
      .select()
      .from(complianceTrends)
      .where(eq(complianceTrends.facilityId, Number(id)))
      .orderBy(desc(complianceTrends.createdAt))
      .limit(90);

    const [latestRisk] = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.facilityId, Number(id)))
      .orderBy(desc(riskScores.calculatedAt))
      .limit(1);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      format,
      facility: facility ?? null,
      assessment: latestAssessment ?? null,
      ruleResults,
      trends,
      riskScore: latestRisk ?? null,
    };

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Failed to export data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
