import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskInstances } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let query;
    if (status) {
      query = db
        .select()
        .from(opsTaskInstances)
        .where(eq(opsTaskInstances.assignedUserId, userId))
        .orderBy(desc(opsTaskInstances.dueDate));
    } else {
      query = db
        .select()
        .from(opsTaskInstances)
        .where(eq(opsTaskInstances.assignedUserId, userId))
        .orderBy(desc(opsTaskInstances.dueDate));
    }

    const tasks = await query;

    // Filter by status in JS if provided
    const filtered = status
      ? tasks.filter((t) => t.status === status)
      : tasks;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Failed to fetch my tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch my tasks" },
      { status: 500 }
    );
  }
}
