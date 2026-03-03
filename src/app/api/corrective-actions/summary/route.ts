import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import { nonconformances, correctiveActions } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const [ncStats] = await db
    .select({
      total: sql<number>`count(*)`.as("total"),
      minor: sql<number>`count(*) filter (where ${nonconformances.severity} = 'minor')`.as("minor"),
      major: sql<number>`count(*) filter (where ${nonconformances.severity} = 'major')`.as("major"),
      critical: sql<number>`count(*) filter (where ${nonconformances.severity} = 'critical')`.as("critical"),
    })
    .from(nonconformances)
    .where(eq(nonconformances.userId, userId));

  const [capaStats] = await db
    .select({
      total: sql<number>`count(*)`.as("total"),
      open: sql<number>`count(*) filter (where ${correctiveActions.status} = 'open')`.as("open"),
      inProgress: sql<number>`count(*) filter (where ${correctiveActions.status} = 'in_progress')`.as("in_progress"),
      closed: sql<number>`count(*) filter (where ${correctiveActions.status} = 'closed')`.as("closed"),
    })
    .from(correctiveActions)
    .where(eq(correctiveActions.userId, userId));

  const bySeverity = await db
    .select({
      severity: nonconformances.severity,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(nonconformances)
    .where(eq(nonconformances.userId, userId))
    .groupBy(nonconformances.severity);

  const byCategory = await db
    .select({
      category: nonconformances.findingCategory,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(nonconformances)
    .where(eq(nonconformances.userId, userId))
    .groupBy(nonconformances.findingCategory);

  return NextResponse.json({
    summary: {
      nonconformances: ncStats,
      correctiveActions: capaStats,
      bySeverity,
      byCategory,
    },
  });
}
