import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { appModuleConfig } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const modules = await db.select().from(appModuleConfig);
    return NextResponse.json(modules);
  } catch (error) {
    console.error("Failed to fetch module configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch module configs" },
      { status: 500 }
    );
  }
}
