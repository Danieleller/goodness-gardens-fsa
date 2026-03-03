import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { nonconformances } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const record = await db.query.nonconformances.findFirst({
    where: and(
      eq(nonconformances.id, Number(id)),
      eq(nonconformances.userId, userId)
    ),
  });

  if (!record) {
    return NextResponse.json(
      { error: "Nonconformance not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ nonconformance: record });
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
    .update(nonconformances)
    .set(body)
    .where(
      and(
        eq(nonconformances.id, Number(id)),
        eq(nonconformances.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Nonconformance not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ nonconformance: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [deleted] = await db
    .delete(nonconformances)
    .where(
      and(
        eq(nonconformances.id, Number(id)),
        eq(nonconformances.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Nonconformance not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
