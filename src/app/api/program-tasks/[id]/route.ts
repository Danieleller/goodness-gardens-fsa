import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { programTasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [task] = await db
    .select()
    .from(programTasks)
    .where(eq(programTasks.id, Number(id)));

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = {
    updatedAt: sql`(datetime('now'))`,
  };

  if (body.status !== undefined) updates.status = body.status;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.phase !== undefined) updates.phase = body.phase;
  if (body.owner !== undefined) updates.owner = body.owner;
  if (body.effortEstimate !== undefined) updates.effortEstimate = body.effortEstimate;
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate;
  if (body.completionDate !== undefined) updates.completionDate = body.completionDate;
  if (body.linkedSopCode !== undefined) updates.linkedSopCode = body.linkedSopCode;
  if (body.notes !== undefined) updates.notes = body.notes;

  const [updated] = await db
    .update(programTasks)
    .set(updates)
    .where(eq(programTasks.id, Number(id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
