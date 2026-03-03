import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { supplierCertifications, suppliers } from "@/db/schema";
import { lte, gte, and, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days") || "30";
  const days = parseInt(daysParam, 10);

  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const expiringCerts = await db
    .select({
      certification: supplierCertifications,
      supplier: suppliers,
    })
    .from(supplierCertifications)
    .innerJoin(suppliers, eq(supplierCertifications.supplierId, suppliers.id))
    .where(
      and(
        gte(supplierCertifications.expiryDate, now.toISOString().split("T")[0]),
        lte(supplierCertifications.expiryDate, futureDate.toISOString().split("T")[0])
      )
    );

  return NextResponse.json(expiringCerts);
}
