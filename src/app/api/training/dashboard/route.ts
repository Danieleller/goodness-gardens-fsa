import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  trainingRecords,
  trainingRequirements,
  workerCertifications,
} from "@/db/schema";
import { eq, sql, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const facilityId = searchParams.get("facilityId");

  try {
    const requirements = await db.select().from(trainingRequirements);

    let records;
    if (facilityId) {
      records = await db
        .select()
        .from(trainingRecords)
        .where(eq(trainingRecords.facilityId, Number(facilityId)));
    } else {
      records = await db.select().from(trainingRecords);
    }

    // workerCertifications has no facilityId column; always fetch all
    const certs = await db.select().from(workerCertifications);

    const now = new Date();
    const expiringCerts = certs.filter(
      (c) => c.expiryDate && new Date(c.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    return NextResponse.json({
      totalRequirements: requirements.length,
      totalRecords: records.length,
      totalCertifications: certs.length,
      expiringSoon: expiringCerts.length,
      requirements,
      recentRecords: records.slice(0, 10),
      expiringCerts,
    });
  } catch (error) {
    console.error("Failed to fetch training dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch training dashboard" },
      { status: 500 }
    );
  }
}
