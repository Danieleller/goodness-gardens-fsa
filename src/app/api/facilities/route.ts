import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { facilities } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const allFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.isActive, 1));

  return NextResponse.json({ facilities: allFacilities });
}
