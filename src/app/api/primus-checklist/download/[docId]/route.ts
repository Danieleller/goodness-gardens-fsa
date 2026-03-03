import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { primusDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { docId } = await params;

  try {
    const [doc] = await db
      .select()
      .from(primusDocuments)
      .where(eq(primusDocuments.id, Number(docId)))
      .limit(1);

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", doc.contentType || "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${doc.fileName}"`
    );

    return new NextResponse(doc.fileData, { headers });
  } catch (error) {
    console.error("Failed to download document:", error);
    return NextResponse.json(
      { error: "Failed to download document" },
      { status: 500 }
    );
  }
}
