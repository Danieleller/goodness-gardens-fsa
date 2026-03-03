import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { vendorCertifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  try {
    const [updated] = await db
      .update(vendorCertifications)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(vendorCertifications.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update vendor certification:", error);
    return NextResponse.json(
      { error: "Failed to update vendor certification" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(vendorCertifications)
      .where(eq(vendorCertifications.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Certification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete vendor certification:", error);
    return NextResponse.json(
      { error: "Failed to delete vendor certification" },
      { status: 500 }
    );
  }
}
