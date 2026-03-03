import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { trainingRecords } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  try {
    let query;
    if (facilityId) {
      query = db
        .select()
        .from(trainingRecords)
        .where(eq(trainingRecords.facilityId, Number(facilityId)))
        .orderBy(desc(trainingRecords.trainingDate))
        .limit(limit)
        .offset(offset);
    } else {
      query = db
        .select()
        .from(trainingRecords)
        .orderBy(desc(trainingRecords.trainingDate))
        .limit(limit)
        .offset(offset);
    }

    const records = await query;
    return NextResponse.json(records);
  } catch (error) {
    console.error("Failed to fetch training records:", error);
    return NextResponse.json(
      { error: "Failed to fetch training records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  try {
    const [record] = await db
      .insert(trainingRecords)
      .values({ ...body, createdBy: userId })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Failed to create training record:", error);
    return NextResponse.json(
      { error: "Failed to create training record" },
      { status: 500 }
    );
  }
}
