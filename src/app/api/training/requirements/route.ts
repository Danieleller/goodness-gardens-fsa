import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { trainingRequirements } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const requirements = await db.select().from(trainingRequirements);
    return NextResponse.json(requirements);
  } catch (error) {
    console.error("Failed to fetch training requirements:", error);
    return NextResponse.json(
      { error: "Failed to fetch training requirements" },
      { status: 500 }
    );
  }
}
