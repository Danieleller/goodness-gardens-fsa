import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { complianceAssessments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const assessments = facilityId
      ? await db
          .select()
          .from(complianceAssessments)
          .where(eq(complianceAssessments.facilityId, Number(facilityId)))
          .orderBy(desc(complianceAssessments.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select()
          .from(complianceAssessments)
          .orderBy(desc(complianceAssessments.createdAt))
          .limit(limit)
          .offset(offset);

    return NextResponse.json(assessments);
  } catch (error) {
    console.error("Failed to fetch assessment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessment history" },
      { status: 500 }
    );
  }
}
