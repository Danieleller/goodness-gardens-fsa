import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { checklistSubmissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facility_id");
  const templateId = searchParams.get("template_id");

  const conditions = [];

  if (facilityId) {
    conditions.push(eq(checklistSubmissions.facilityId, Number(facilityId)));
  }
  if (templateId) {
    conditions.push(eq(checklistSubmissions.templateId, Number(templateId)));
  }

  let query = db.select().from(checklistSubmissions);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const submissions = await query;
  return NextResponse.json(submissions);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [submission] = await db
    .insert(checklistSubmissions)
    .values({
      ...body,
      submittedBy: userId,
    })
    .returning();

  return NextResponse.json(submission, { status: 201 });
}
