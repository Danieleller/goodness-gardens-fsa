import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { appModuleConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ moduleKey: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { moduleKey } = await params;
  const body = await request.json();

  try {
    const [updated] = await db
      .update(appModuleConfig)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(appModuleConfig.moduleKey, moduleKey))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Module config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update module config:", error);
    return NextResponse.json(
      { error: "Failed to update module config" },
      { status: 500 }
    );
  }
}
