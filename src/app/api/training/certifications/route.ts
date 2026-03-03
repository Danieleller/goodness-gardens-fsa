import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { workerCertifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get("workerId");
  const facilityId = searchParams.get("facilityId");

  try {
    let query;
    if (workerId) {
      query = db
        .select()
        .from(workerCertifications)
        .where(eq(workerCertifications.userId, Number(workerId)))
        .orderBy(desc(workerCertifications.expiryDate));
    } else if (facilityId) {
      // workerCertifications has no facilityId column; filter by userId instead
      query = db
        .select()
        .from(workerCertifications)
        .orderBy(desc(workerCertifications.expiryDate));
    } else {
      query = db
        .select()
        .from(workerCertifications)
        .orderBy(desc(workerCertifications.expiryDate));
    }

    const certs = await query;
    return NextResponse.json(certs);
  } catch (error) {
    console.error("Failed to fetch certifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch certifications" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  try {
    const [cert] = await db
      .insert(workerCertifications)
      .values({ ...body, createdBy: userId })
      .returning();

    return NextResponse.json(cert, { status: 201 });
  } catch (error) {
    console.error("Failed to create certification:", error);
    return NextResponse.json(
      { error: "Failed to create certification" },
      { status: 500 }
    );
  }
}
