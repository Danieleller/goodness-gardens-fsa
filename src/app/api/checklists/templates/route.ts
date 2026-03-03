import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityType = searchParams.get("facility_type");

  let query = db.select().from(checklistTemplates);

  if (facilityType) {
    query = query.where(eq(checklistTemplates.facilityType, facilityType)) as typeof query;
  }

  const templates = await query;
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [template] = await db
    .insert(checklistTemplates)
    .values({
      ...body,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(template, { status: 201 });
}
