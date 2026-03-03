import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskInstances } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  try {
    let tasks;
    if (facilityId) {
      tasks = await db
        .select()
        .from(opsTaskInstances)
        .where(eq(opsTaskInstances.facilityId, Number(facilityId)));
    } else {
      tasks = await db.select().from(opsTaskInstances);
    }

    // Filter to the requested date
    const dayTasks = tasks.filter((t) => t.dueDate === date);

    const statusCounts = {
      pending: dayTasks.filter((t) => t.status === "pending").length,
      submitted: dayTasks.filter((t) => t.status === "submitted").length,
      approved: dayTasks.filter((t) => t.status === "approved").length,
      rejected: dayTasks.filter((t) => t.status === "rejected").length,
      overdue: dayTasks.filter((t) => t.status === "overdue").length,
    };

    return NextResponse.json({
      date,
      facilityId: facilityId ?? "all",
      total: dayTasks.length,
      statusCounts,
      tasks: dayTasks,
    });
  } catch (error) {
    console.error("Failed to fetch status board:", error);
    return NextResponse.json(
      { error: "Failed to fetch status board" },
      { status: 500 }
    );
  }
}
