import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskInstances } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    const conditions = [];
    if (facilityId) {
      conditions.push(eq(opsTaskInstances.facilityId, Number(facilityId)));
    }
    if (status) {
      conditions.push(eq(opsTaskInstances.status, status));
    }
    if (date) {
      conditions.push(eq(opsTaskInstances.dueDate, date));
    }

    let query;
    if (conditions.length > 0) {
      query = db
        .select()
        .from(opsTaskInstances)
        .where(and(...conditions))
        .orderBy(desc(opsTaskInstances.dueDate))
        .limit(limit)
        .offset(offset);
    } else {
      query = db
        .select()
        .from(opsTaskInstances)
        .orderBy(desc(opsTaskInstances.dueDate))
        .limit(limit)
        .offset(offset);
    }

    const tasks = await query;
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
