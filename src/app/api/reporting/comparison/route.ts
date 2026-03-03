import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  complianceAssessments,
  riskScores,
  facilities,
} from "@/db/schema";
import { inArray, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityIdStrings = searchParams.get("facilityIds")?.split(",") || [];
  const facilityIds = facilityIdStrings.map(Number).filter(Boolean);

  if (facilityIds.length === 0) {
    return NextResponse.json(
      { error: "facilityIds query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const facilityList = await db
      .select()
      .from(facilities)
      .where(inArray(facilities.id, facilityIds));

    const assessments = await db
      .select()
      .from(complianceAssessments)
      .where(inArray(complianceAssessments.facilityId, facilityIds))
      .orderBy(desc(complianceAssessments.createdAt));

    const risks = await db
      .select()
      .from(riskScores)
      .where(inArray(riskScores.facilityId, facilityIds))
      .orderBy(desc(riskScores.calculatedAt));

    // Group by facility for comparison
    const comparison = facilityIds.map((fid) => ({
      facility: facilityList.find((f) => f.id === fid) ?? null,
      latestAssessment:
        assessments.find((a) => a.facilityId === fid) ?? null,
      latestRiskScore: risks.find((r) => r.facilityId === fid) ?? null,
    }));

    return NextResponse.json(comparison);
  } catch (error) {
    console.error("Failed to fetch comparison data:", error);
    return NextResponse.json(
      { error: "Failed to fetch comparison data" },
      { status: 500 }
    );
  }
}
