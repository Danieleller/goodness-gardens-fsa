import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { checklistTemplates, checklistItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const [template] = await db
    .select()
    .from(checklistTemplates)
    .where(eq(checklistTemplates.id, Number(id)));

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.templateId, Number(id)));

  return NextResponse.json({ ...template, items });
}
