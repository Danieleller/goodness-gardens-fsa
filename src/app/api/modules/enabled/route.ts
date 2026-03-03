import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { appModuleConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const modules = await db
    .select()
    .from(appModuleConfig)
    .where(eq(appModuleConfig.isEnabled, 1));

  return NextResponse.json({ modules });
}
