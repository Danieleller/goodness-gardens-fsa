import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { vendorCertifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const [cert] = await db
      .select()
      .from(vendorCertifications)
      .where(eq(vendorCertifications.id, Number(id)))
      .limit(1);

    if (!cert) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 }
      );
    }

    if (!cert.certFileData) {
      return NextResponse.json(
        { error: "No file attached to this certification" },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", cert.certContentType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${cert.certFileName || "certificate"}"`
    );

    return new NextResponse(cert.certFileData, { headers });
  } catch (error) {
    console.error("Failed to download certification:", error);
    return NextResponse.json(
      { error: "Failed to download certification" },
      { status: 500 }
    );
  }
}
