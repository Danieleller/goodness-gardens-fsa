import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");

  try {
    let query;
    if (facilityId) {
      query = db
        .select()
        .from(opsTaskSchedules)
        .where(eq(opsTaskSchedules.facilityId, Number(facilityId)));
    } else {
      query = db.select().from(opsTaskSchedules);
    }

    const schedules = await query;
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Failed to fetch schedules:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  try {
    const [schedule] = await db
      .insert(opsTaskSchedules)
      .values({ ...body, createdBy: userId })
      .returning();

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Failed to create schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
