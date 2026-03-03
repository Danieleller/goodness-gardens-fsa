import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { sopTags } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const allTags = await db
    .selectDistinct({ tag: sopTags.tag })
    .from(sopTags);

  const tags = allTags.map((t) => t.tag);

  return NextResponse.json(tags);
}
