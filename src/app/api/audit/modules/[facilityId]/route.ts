import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditModules, facilityModules } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ facilityId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { facilityId } = await params;

  const facilityMods = await db
    .select()
    .from(facilityModules)
    .where(eq(facilityModules.facilityId, Number(facilityId)));

  const moduleIds = facilityMods.map((fm) => fm.moduleId);

  let modules: typeof auditModules.$inferSelect[] = [];
  if (moduleIds.length > 0) {
    modules = await db
      .select()
      .from(auditModules)
      .where(inArray(auditModules.id, moduleIds));
  }

  return NextResponse.json(modules);
}
