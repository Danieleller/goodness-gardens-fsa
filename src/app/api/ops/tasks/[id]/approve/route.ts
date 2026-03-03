import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskInstances } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  try {
    const [task] = await db
      .select()
      .from(opsTaskInstances)
      .where(eq(opsTaskInstances.id, Number(id)))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    if (task.status !== "submitted") {
      return NextResponse.json(
        { error: "Task must be submitted before approval" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(opsTaskInstances)
      .set({
        status: body.approved ? "approved" : "rejected",
        approvedBy: userId,
        approvedAt: new Date().toISOString(),
        notes: body.notes || null,
      })
      .where(eq(opsTaskInstances.id, Number(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to approve task:", error);
    return NextResponse.json(
      { error: "Failed to approve task" },
      { status: 500 }
    );
  }
}
