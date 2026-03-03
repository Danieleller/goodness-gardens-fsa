import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopDocuments, sopFacilityStatus } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { facilityId } = await params;

  const facilityStatuses = await db
    .select()
    .from(sopFacilityStatus)
    .where(eq(sopFacilityStatus.facilityId, Number(facilityId)));

  const sopIds = facilityStatuses.map((fs) => fs.sopId);

  let sops: typeof sopDocuments.$inferSelect[] = [];
  if (sopIds.length > 0) {
    const { inArray } = await import("drizzle-orm");
    sops = await db
      .select()
      .from(sopDocuments)
      .where(inArray(sopDocuments.id, sopIds));
  }

  const result = sops.map((sop) => ({
    ...sop,
    facilityStatus: facilityStatuses.find((fs) => fs.sopId === sop.id),
  }));

  return NextResponse.json(result);
}
