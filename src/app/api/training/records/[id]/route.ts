import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { trainingRecords } from "@/db/schema";
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
      .update(trainingRecords)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(trainingRecords.id, Number(id)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update training record:", error);
    return NextResponse.json(
      { error: "Failed to update training record" },
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
      .delete(trainingRecords)
      .where(eq(trainingRecords.id, Number(id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete training record:", error);
    return NextResponse.json(
      { error: "Failed to delete training record" },
      { status: 500 }
    );
  }
}
