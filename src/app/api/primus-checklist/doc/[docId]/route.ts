import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { primusDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { docId } = await params;

  try {
    const [deleted] = await db
      .delete(primusDocuments)
      .where(eq(primusDocuments.id, Number(docId)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
