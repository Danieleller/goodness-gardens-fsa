import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { transactionPrefixConfig } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const configs = await db.select().from(transactionPrefixConfig);
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Failed to fetch transaction configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction configs" },
      { status: 500 }
    );
  }
}
