import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { supplierCertifications } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;

  const certifications = await db
    .select()
    .from(supplierCertifications)
    .where(eq(supplierCertifications.supplierId, Number(id)));

  return NextResponse.json(certifications);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  const [certification] = await db
    .insert(supplierCertifications)
    .values({
      ...body,
      supplierId: Number(id),
    })
    .returning();

  return NextResponse.json(certification, { status: 201 });
}
