import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { riskScores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const scores = await db
      .select()
      .from(riskScores)
      .where(eq(riskScores.facilityId, Number(id)))
      .orderBy(desc(riskScores.calculatedAt))
      .limit(1);

    return NextResponse.json(scores[0] ?? null);
  } catch (error) {
    console.error("Failed to fetch risk score:", error);
    return NextResponse.json(
      { error: "Failed to fetch risk score" },
      { status: 500 }
    );
  }
}
