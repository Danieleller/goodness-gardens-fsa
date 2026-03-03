import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  complianceAssessments,
  complianceRuleResults,
  complianceTrends,
  riskScores,
  facilities,
  trainingRecords,
  opsTaskInstances,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");
  const type = searchParams.get("type") || "compliance";
  const format = searchParams.get("format") || "json";

  try {
    let exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportedBy: userId,
      type,
      format,
    };

    if (type === "compliance" && facilityId) {
      const [assessment] = await db
        .select()
        .from(complianceAssessments)
        .where(eq(complianceAssessments.facilityId, Number(facilityId)))
        .orderBy(desc(complianceAssessments.createdAt))
        .limit(1);

      let ruleResults: (typeof complianceRuleResults.$inferSelect)[] = [];
      if (assessment) {
        ruleResults = await db
          .select()
          .from(complianceRuleResults)
          .where(eq(complianceRuleResults.assessmentId, assessment.id));
      }

      exportData = { ...exportData, assessment, ruleResults };
    } else if (type === "training" && facilityId) {
      const records = await db
        .select()
        .from(trainingRecords)
        .where(eq(trainingRecords.facilityId, Number(facilityId)));

      exportData = { ...exportData, trainingRecords: records };
    } else if (type === "operations" && facilityId) {
      const tasks = await db
        .select()
        .from(opsTaskInstances)
        .where(eq(opsTaskInstances.facilityId, Number(facilityId)));

      exportData = { ...exportData, tasks };
    } else {
      const allFacilities = await db.select().from(facilities);
      exportData = { ...exportData, facilities: allFacilities };
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error("Failed to export report:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
