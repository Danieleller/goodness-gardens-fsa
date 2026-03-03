import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { gapSnapshots } from "@/db/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { facilityId } = await params;
  const body = await request.json();

  const [snapshot] = await db
    .insert(gapSnapshots)
    .values({
      ...body,
      facilityId: Number(facilityId),
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(snapshot, { status: 201 });
}
