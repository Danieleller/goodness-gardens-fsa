import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { gapSnapshots, facilities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const allFacilities = await db.select().from(facilities);

  const summary = await Promise.all(
    allFacilities.map(async (facility) => {
      const [latestSnapshot] = await db
        .select()
        .from(gapSnapshots)
        .where(eq(gapSnapshots.facilityId, facility.id))
        .orderBy(desc(gapSnapshots.createdAt))
        .limit(1);

      return {
        facility,
        latestSnapshot: latestSnapshot || null,
      };
    })
  );

  return NextResponse.json(summary);
}
