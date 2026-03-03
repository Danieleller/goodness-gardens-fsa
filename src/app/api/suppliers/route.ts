import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { suppliers } from "@/db/schema";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const allSuppliers = await db.select().from(suppliers);
  return NextResponse.json(allSuppliers);
}

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const body = await request.json();

  const [supplier] = await db
    .insert(suppliers)
    .values({
      ...body,
      createdBy: userId,
    })
    .returning();

  return NextResponse.json(supplier, { status: 201 });
}
