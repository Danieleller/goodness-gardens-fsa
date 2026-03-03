import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const facility = await db.query.facilities.findFirst({
    where: eq(facilities.id, Number(id)),
  });

  if (!facility) {
    return NextResponse.json(
      { error: "Facility not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ facility });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(facilities)
    .set(body)
    .where(eq(facilities.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Facility not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ facility: updated });
}
