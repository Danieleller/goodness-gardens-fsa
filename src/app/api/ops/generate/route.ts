import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  opsTaskSchedules,
  opsTaskInstances,
  opsTaskTemplates,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();
  const { facilityId, date } = body;

  try {
    const schedules = await db
      .select()
      .from(opsTaskSchedules)
      .where(eq(opsTaskSchedules.facilityId, Number(facilityId)));

    const activeSchedules = schedules.filter((s) => s.isActive === 1);

    const createdTasks = [];

    for (const schedule of activeSchedules) {
      const [template] = await db
        .select()
        .from(opsTaskTemplates)
        .where(eq(opsTaskTemplates.id, schedule.templateId))
        .limit(1);

      if (!template) continue;

      const [task] = await db
        .insert(opsTaskInstances)
        .values({
          scheduleId: schedule.id,
          templateId: schedule.templateId,
          facilityId: Number(facilityId),
          assignedUserId: schedule.assignedUserId,
          dueDate: date || new Date().toISOString().split("T")[0],
          status: "pending",
        })
        .returning();

      createdTasks.push(task);
    }

    return NextResponse.json({
      generated: createdTasks.length,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("Failed to generate tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }
}
