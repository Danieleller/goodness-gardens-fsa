import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { correctiveActions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const action = await db.query.correctiveActions.findFirst({
    where: and(
      eq(correctiveActions.id, Number(id)),
      eq(correctiveActions.userId, userId)
    ),
  });

  if (!action) {
    return NextResponse.json(
      { error: "Corrective action not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ correctiveAction: action });
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
    .update(correctiveActions)
    .set(body)
    .where(
      and(
        eq(correctiveActions.id, Number(id)),
        eq(correctiveActions.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: "Corrective action not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ correctiveAction: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [deleted] = await db
    .delete(correctiveActions)
    .where(
      and(
        eq(correctiveActions.id, Number(id)),
        eq(correctiveActions.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: "Corrective action not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
