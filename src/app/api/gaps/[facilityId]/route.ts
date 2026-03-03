import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { gapSnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { facilityId } = await params;

  const snapshots = await db
    .select()
    .from(gapSnapshots)
    .where(eq(gapSnapshots.facilityId, Number(facilityId)))
    .orderBy(desc(gapSnapshots.createdAt));

  return NextResponse.json(snapshots);
}
