import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditSimulations } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facility_id");

  let query = db.select().from(auditSimulations);

  if (facilityId) {
    query = query.where(eq(auditSimulations.facilityId, Number(facilityId))) as typeof query;
  }

  const simulations = await query;
  return NextResponse.json(simulations);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [simulation] = await db
    .insert(auditSimulations)
    .values({
      ...body,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(simulation, { status: 201 });
}
