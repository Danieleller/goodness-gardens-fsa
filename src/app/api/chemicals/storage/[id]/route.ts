import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { chemicalStorage } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const record = await db.query.chemicalStorage.findFirst({
    where: and(
      eq(chemicalStorage.id, Number(id)),
      eq(chemicalStorage.userId, userId)
    ),
  });

  if (!record) {
    return NextResponse.json(
      { error: "Storage record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ storage: record });
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
    .update(chemicalStorage)
    .set(body)
    .where(
      and(
        eq(chemicalStorage.id, Number(id)),
        eq(chemicalStorage.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Storage record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ storage: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [deleted] = await db
    .delete(chemicalStorage)
    .where(
      and(
        eq(chemicalStorage.id, Number(id)),
        eq(chemicalStorage.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Storage record not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
