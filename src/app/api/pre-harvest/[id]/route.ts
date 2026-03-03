import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { preHarvestLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const log = await db.query.preHarvestLogs.findFirst({
    where: and(
      eq(preHarvestLogs.id, Number(id)),
      eq(preHarvestLogs.userId, userId)
    ),
  });

  if (!log) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ log });
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
    .update(preHarvestLogs)
    .set(body)
    .where(
      and(
        eq(preHarvestLogs.id, Number(id)),
        eq(preHarvestLogs.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ log: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [deleted] = await db
    .delete(preHarvestLogs)
    .where(
      and(
        eq(preHarvestLogs.id, Number(id)),
        eq(preHarvestLogs.userId, userId)
      )
    )
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Log not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
