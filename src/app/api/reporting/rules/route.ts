import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { complianceRules } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const rules = await db.select().from(complianceRules);
    return NextResponse.json(rules);
  } catch (error) {
    console.error("Failed to fetch rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}
