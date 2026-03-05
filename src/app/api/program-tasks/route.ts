import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { programTasks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const taskType = searchParams.get("taskType");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const phase = searchParams.get("phase");
  const owner = searchParams.get("owner");

  const conditions = [];
  if (taskType) conditions.push(eq(programTasks.taskType, taskType));
  if (status) conditions.push(eq(programTasks.status, status));
  if (priority) conditions.push(eq(programTasks.priority, priority));
  if (phase) conditions.push(eq(programTasks.phase, phase));
  if (owner) conditions.push(eq(programTasks.owner, owner));

  let query = db.select().from(programTasks);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const tasks = await query;
  return NextResponse.json(tasks);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [task] = await db
    .insert(programTasks)
    .values({
      code: body.code,
      title: body.title,
      description: body.description,
      taskType: body.taskType,
      priority: body.priority || "MEDIUM",
      status: body.status || "pending",
      phase: body.phase,
      owner: body.owner,
      effortEstimate: body.effortEstimate,
      targetDate: body.targetDate,
      linkedSopCode: body.linkedSopCode,
      notes: body.notes,
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
