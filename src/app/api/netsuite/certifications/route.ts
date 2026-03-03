import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { vendorCertifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get("vendorId");

  try {
    let query;
    if (vendorId) {
      query = db
        .select()
        .from(vendorCertifications)
        .where(eq(vendorCertifications.vendorId, vendorId))
        .orderBy(desc(vendorCertifications.expirationDate));
    } else {
      query = db
        .select()
        .from(vendorCertifications)
        .orderBy(desc(vendorCertifications.expirationDate));
    }

    const certs = await query;
    return NextResponse.json(certs);
  } catch (error) {
    console.error("Failed to fetch vendor certifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch vendor certifications" },
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
      .insert(vendorCertifications)
      .values({ ...body, uploadedBy: userId })
      .returning();

    return NextResponse.json(cert, { status: 201 });
  } catch (error) {
    console.error("Failed to create vendor certification:", error);
    return NextResponse.json(
      { error: "Failed to create vendor certification" },
      { status: 500 }
    );
  }
}
