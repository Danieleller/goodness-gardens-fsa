import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { opsTaskTemplates, opsTaskFields } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const [template] = await db
      .select()
      .from(opsTaskTemplates)
      .where(eq(opsTaskTemplates.id, Number(id)))
      .limit(1);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const fields = await db
      .select()
      .from(opsTaskFields)
      .where(eq(opsTaskFields.templateId, Number(id)));

    return NextResponse.json({ ...template, fields });
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}
