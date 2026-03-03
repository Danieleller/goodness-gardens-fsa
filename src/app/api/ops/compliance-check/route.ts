import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  opsTaskInstances,
  complianceAssessments,
  complianceRules,
  complianceRuleResults,
  facilities,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const allFacilities = await db.select().from(facilities);
    const rules = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.isActive, 1));

    const results = [];

    for (const facility of allFacilities) {
      const tasks = await db
        .select()
        .from(opsTaskInstances)
        .where(eq(opsTaskInstances.facilityId, facility.id));

      // Create assessment
      const [assessment] = await db
        .insert(complianceAssessments)
        .values({
          facilityId: facility.id,
          assessmentDate: new Date().toISOString().split("T")[0],
          assessedBy: userId,
          overallScore: 0,
        })
        .returning();

      // Evaluate each rule
      let totalScore = 0;
      for (const rule of rules) {
        const passed = true; // Placeholder: actual rule evaluation logic
        const score = passed ? 100 : 0;
        totalScore += score;

        await db.insert(complianceRuleResults).values({
          assessmentId: assessment.id,
          ruleId: rule.id,
          facilityId: facility.id,
          status: passed ? "pass" : "fail",
          details: JSON.stringify({ score }),
        });
      }

      const overallScore = rules.length > 0 ? totalScore / rules.length : 0;

      await db
        .update(complianceAssessments)
        .set({ overallScore })
        .where(eq(complianceAssessments.id, assessment.id));

      results.push({
        facilityId: facility.id,
        assessmentId: assessment.id,
        overallScore,
      });
    }

    return NextResponse.json({
      checked: results.length,
      results,
    });
  } catch (error) {
    console.error("Failed to run compliance check:", error);
    return NextResponse.json(
      { error: "Failed to run compliance check" },
      { status: 500 }
    );
  }
}
