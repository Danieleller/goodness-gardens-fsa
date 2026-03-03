import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { searchIndex } from "@/db/schema";
import { sql, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const searchTerm = `%${q.toLowerCase()}%`;

  const results = await db
    .select({
      id: searchIndex.id,
      entityType: searchIndex.entityType,
      entityId: searchIndex.entityId,
      title: searchIndex.title,
      subtitle: searchIndex.subtitle,
      url: searchIndex.url,
    })
    .from(searchIndex)
    .where(like(sql`lower(${searchIndex.tokens})`, searchTerm))
    .limit(50);

  return NextResponse.json({ results });
}
