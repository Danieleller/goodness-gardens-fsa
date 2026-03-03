import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { primusChecklistItems, primusDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  try {
    const items = await db.select().from(primusChecklistItems);
    const docs = await db.select().from(primusDocuments);

    const itemsWithDocs = items.map((item) => ({
      ...item,
      documents: docs.filter((d) => d.itemId === item.id),
    }));

    return NextResponse.json(itemsWithDocs);
  } catch (error) {
    console.error("Failed to fetch checklist items:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist items" },
      { status: 500 }
    );
  }
}
