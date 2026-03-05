import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopDocuments, sopTags } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const phase = searchParams.get("phase");
  const tag = searchParams.get("tag");

  const conditions = [];

  if (category) {
    conditions.push(eq(sopDocuments.category, category));
  }
  if (status) {
    conditions.push(eq(sopDocuments.status, status));
  }
  if (priority) {
    conditions.push(eq(sopDocuments.priority, priority));
  }
  if (phase) {
    conditions.push(eq(sopDocuments.phase, phase));
  }

  let query = db.select().from(sopDocuments);

  if (tag) {
    const taggedDocs = await db
      .select({ sopId: sopTags.sopId })
      .from(sopTags)
      .where(eq(sopTags.tag, tag));
    const sopIds = taggedDocs.map((t) => t.sopId);

    if (sopIds.length > 0) {
      conditions.push(inArray(sopDocuments.id, sopIds));
    } else {
      return NextResponse.json([]);
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const sops = await query;
  return NextResponse.json(sops);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [sop] = await db
    .insert(sopDocuments)
    .values({
      code: body.code,
      title: body.title,
      category: body.category,
      description: body.description,
      priority: body.priority,
      language: body.language,
      primusRef: body.primus_ref || body.primusRef,
      nopRef: body.nop_ref || body.nopRef,
      phase: body.phase,
      sopType: body.sop_type || body.sopType,
      reviewOwner: body.review_owner || body.reviewOwner,
      facilityTypes: body.facility_types || body.facilityTypes,
    })
    .returning();

  return NextResponse.json(sop, { status: 201 });
}
