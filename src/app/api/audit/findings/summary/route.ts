import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { auditFindings } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const bySeverity = await db
    .select({
      severity: auditFindings.severity,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(auditFindings)
    .groupBy(auditFindings.severity);

  const byStatus = await db
    .select({
      status: auditFindings.status,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(auditFindings)
    .groupBy(auditFindings.status);

  const byFacility = await db
    .select({
      facilityId: auditFindings.facilityId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(auditFindings)
    .groupBy(auditFindings.facilityId);

  const [total] = await db
    .select({
      count: sql<number>`count(*)`.as("count"),
    })
    .from(auditFindings);

  return NextResponse.json({
    total: total.count,
    bySeverity,
    byStatus,
    byFacility,
  });
}
