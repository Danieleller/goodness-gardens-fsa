import { NextResponse, NextRequest } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { primusDocuments } from "@/db/schema";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const checklistItemId = formData.get("checklistItemId") as string;

    if (!file || !checklistItemId) {
      return NextResponse.json(
        { error: "file and checklistItemId are required" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const [doc] = await db
      .insert(primusDocuments)
      .values({
        itemId: Number(checklistItemId),
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        fileData: buffer.toString("base64"),
        uploadedBy: String(userId),
      })
      .returning();

    return NextResponse.json(
      { id: doc.id, fileName: doc.fileName, contentType: doc.contentType },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}
