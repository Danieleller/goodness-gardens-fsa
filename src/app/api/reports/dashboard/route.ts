import { NextResponse } from "next/server";
import { getAuthUserId, unauthorized } from "@/lib/api-auth";
import { db } from "@/db";
import {
  preHarvestLogs,
  chemicalApplications,
  chemicalStorage,
  nonconformances,
  correctiveActions,
  notifications,
} from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return unauthorized();

  const [preHarvestCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(preHarvestLogs)
    .where(eq(preHarvestLogs.userId, userId));

  const [chemAppCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chemicalApplications)
    .where(eq(chemicalApplications.userId, userId));

  const [chemStorageCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(chemicalStorage)
    .where(eq(chemicalStorage.userId, userId));

  const [ncCount] = await db
    .select({
      total: sql<number>`count(*)`,
      critical: sql<number>`count(*) filter (where ${nonconformances.severity} = 'critical')`,
    })
    .from(nonconformances)
    .where(eq(nonconformances.userId, userId));

  const [capaCount] = await db
    .select({
      total: sql<number>`count(*)`,
      open: sql<number>`count(*) filter (where ${correctiveActions.status} = 'open')`,
      inProgress: sql<number>`count(*) filter (where ${correctiveActions.status} = 'in_progress')`,
    })
    .from(correctiveActions)
    .where(eq(correctiveActions.userId, userId));

  const [unreadNotifications] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, 0)
      )
    );

  const recentActivity = await db
    .select()
    .from(preHarvestLogs)
    .where(eq(preHarvestLogs.userId, userId))
    .orderBy(desc(preHarvestLogs.createdAt))
    .limit(5);

  return NextResponse.json({
    dashboard: {
      counts: {
        preHarvestLogs: preHarvestCount.count,
        chemicalApplications: chemAppCount.count,
        chemicalStorage: chemStorageCount.count,
        nonconformances: ncCount,
        correctiveActions: capaCount,
        unreadNotifications: unreadNotifications.count,
      },
      recentActivity,
    },
  });
}
