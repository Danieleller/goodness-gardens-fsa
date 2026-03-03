import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskInstances, opsTaskResponses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();
  const { responses } = body;

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

    // Insert responses
    if (responses && Array.isArray(responses)) {
      for (const response of responses) {
        await db.insert(opsTaskResponses).values({
          instanceId: Number(id),
          fieldId: response.fieldId,
          fieldKey: response.fieldKey || String(response.fieldId),
          valueText: response.value != null ? String(response.value) : null,
        });
      }
    }

    // Update task status
    const [updated] = await db
      .update(opsTaskInstances)
      .set({
        status: "submitted",
        submittedAt: new Date().toISOString(),
        submittedBy: userId,
      })
      .where(eq(opsTaskInstances.id, Number(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to submit task:", error);
    return NextResponse.json(
      { error: "Failed to submit task" },
      { status: 500 }
    );
  }
}
