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

  const openStatuses = byStatus.filter(
    (s) => s.status === "open" || s.status === "in_progress"
  );
  const totalOpen = openStatuses.reduce((sum, s) => sum + s.count, 0);

  // Build keyed severity object for frontend dashboard
  const severityMap: Record<string, number> = {};
  for (const row of bySeverity) {
    severityMap[row.severity || "unknown"] = row.count;
  }

  return NextResponse.json({
    total: total.count,
    total_open: totalOpen,
    by_severity: severityMap,
    bySeverity,
    byStatus,
    byFacility,
  });
}
