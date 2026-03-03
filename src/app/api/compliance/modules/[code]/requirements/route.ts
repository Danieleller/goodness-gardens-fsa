import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  fsmsRequirements,
  fsmsClauses,
  fsmsStandards,
  requirementEvidenceLinks,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { code } = await params;

  try {
    const [standard] = await db
      .select()
      .from(fsmsStandards)
      .where(eq(fsmsStandards.code, code))
      .limit(1);

    if (!standard) {
      return NextResponse.json(
        { error: "Standard not found" },
        { status: 404 }
      );
    }

    const clauses = await db
      .select()
      .from(fsmsClauses)
      .where(eq(fsmsClauses.standardId, standard.id));

    const clauseIds = clauses.map((c) => c.id);

    let requirements: (typeof fsmsRequirements.$inferSelect)[] = [];
    if (clauseIds.length > 0) {
      requirements = await db.select().from(fsmsRequirements);
      requirements = requirements.filter((r) =>
        clauseIds.includes(r.clauseId)
      );
    }

    const evidenceLinks = await db.select().from(requirementEvidenceLinks);

    return NextResponse.json({
      standard,
      clauses,
      requirements,
      evidenceLinks: evidenceLinks.filter((e) =>
        requirements.some((r) => r.id === e.requirementId)
      ),
    });
  } catch (error) {
    console.error("Failed to fetch module requirements:", error);
    return NextResponse.json(
      { error: "Failed to fetch module requirements" },
      { status: 500 }
    );
  }
}
