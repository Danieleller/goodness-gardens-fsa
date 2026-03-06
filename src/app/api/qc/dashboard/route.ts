import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, unauthorized } from '@/lib/api-auth';
import { db } from '@/db';

/**
 * GET /api/qc/dashboard
 * Dashboard aggregations with statistics
 *
 * Query Parameters:
 * - location_id: Filter by location (optional)
 * - date_from: ISO date string (YYYY-MM-DD, optional)
 * - date_to: ISO date string (YYYY-MM-DD, optional)
 *
 * Returns:
 * - Overall statistics (total inspections, avg grade, compliance rate)
 * - Grade distribution
 * - Defect Pareto chart (top defects)
 * - Recent inspections
 * - Vendor performance metrics
 * - Credit summary
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId(); if (!userId) return unauthorized();
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    // TODO: Fetch aggregated data
    // const dateFilters = and(
    //   dateFrom ? gte(inspectionsTable.inspection_date, new Date(dateFrom)) : undefined,
    //   dateTo ? lte(inspectionsTable.inspection_date, new Date(dateTo)) : undefined,
    //   locationId ? eq(inspectionsTable.location_id, locationId) : undefined,
    // );

    // TODO: Get overall stats
    // const stats = await db.select({
    //   total_inspections: count(),
    //   grade_a_count: count(eq(inspectionsTable.grade, 'A')),
    //   grade_b_count: count(eq(inspectionsTable.grade, 'B')),
    //   grade_c_count: count(eq(inspectionsTable.grade, 'C')),
    //   grade_d_count: count(eq(inspectionsTable.grade, 'D')),
    //   avg_confidence: avg(inspectionsTable.confidence_score),
    // })
    // .from(inspectionsTable)
    // .where(dateFilters);

    // TODO: Get top defects (Pareto)
    // const defectStats = await db.select({
    //   defect_code: defectsTable.defect_code,
    //   defect_count: count(),
    //   avg_affected_pct: avg(defectsTable.affected_percentage),
    // })
    // .from(defectsTable)
    // .innerJoin(inspectionsTable, eq(defectsTable.inspection_id, inspectionsTable.id))
    // .where(dateFilters)
    // .groupBy(defectsTable.defect_code)
    // .orderBy(desc(count()))
    // .limit(10);

    // TODO: Get vendor performance
    // const vendorStats = await db.select({
    //   vendor_id: inspectionsTable.vendor_id,
    //   total_inspections: count(),
    //   grade_a_percentage: sql<number>`(SUM(CASE WHEN ${inspectionsTable.grade} = 'A' THEN 1 ELSE 0 END) / COUNT(*)) * 100`,
    //   avg_defect_pct: avg(inspectionsTable.total_defect_percentage),
    // })
    // .from(inspectionsTable)
    // .where(dateFilters)
    // .groupBy(inspectionsTable.vendor_id)
    // .orderBy(desc(count()))
    // .limit(10);

    // TODO: Get recent inspections
    // const recentInspections = await db.select()
    //   .from(inspectionsTable)
    //   .where(dateFilters)
    //   .orderBy(desc(inspectionsTable.inspection_date))
    //   .limit(10);

    // TODO: Get credit summary
    // const creditStats = await db.select({
    //   status: creditsTable.status,
    //   count: count(),
    //   total_amount: sum(creditsTable.credit_amount_usd),
    // })
    // .from(creditsTable)
    // .where(dateFilters)
    // .groupBy(creditsTable.status);

    // Mock response
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const mockDashboard = {
      period: {
        from: dateFrom || thirtyDaysAgo.toISOString().split('T')[0],
        to: dateTo || now.toISOString().split('T')[0],
      },
      location_filter: locationId || 'All Locations',
      stats: {
        total_inspections: 247,
        inspection_rate_per_day: 8.2,
        avg_confidence_score: 87,
        compliance_rate_pct: 94.3,
      },
      grade_distribution: {
        A: {
          count: 185,
          percentage: 74.9,
          disposition: 'ACCEPT',
        },
        B: {
          count: 42,
          percentage: 17.0,
          disposition: 'ACCEPT_WITH_SORTING',
        },
        C: {
          count: 15,
          percentage: 6.1,
          disposition: 'DONATE',
        },
        D: {
          count: 5,
          percentage: 2.0,
          disposition: 'REJECT',
        },
      },
      defect_pareto: [
        {
          rank: 1,
          defect_code: 'BROWNING',
          defect_name: 'Browning',
          occurrence_count: 67,
          percentage_of_total: 28.4,
          avg_affected_pct: 12.3,
          severity: 'major',
        },
        {
          rank: 2,
          defect_code: 'WILTING',
          defect_name: 'Wilting',
          occurrence_count: 43,
          percentage_of_total: 18.2,
          avg_affected_pct: 8.7,
          severity: 'major',
        },
        {
          rank: 3,
          defect_code: 'DISCOLORATION',
          defect_name: 'Discoloration',
          occurrence_count: 31,
          percentage_of_total: 13.1,
          avg_affected_pct: 5.2,
          severity: 'minor',
        },
        {
          rank: 4,
          defect_code: 'YELLOWING',
          defect_name: 'Yellowing',
          occurrence_count: 28,
          percentage_of_total: 11.9,
          avg_affected_pct: 4.5,
          severity: 'minor',
        },
        {
          rank: 5,
          defect_code: 'MOLD',
          defect_name: 'Mold',
          occurrence_count: 12,
          percentage_of_total: 5.1,
          avg_affected_pct: 3.2,
          severity: 'critical',
        },
      ],
      vendor_performance: [
        {
          vendor_id: 'VENDOR-001',
          vendor_name: 'Smith Farms',
          total_inspections: 52,
          grade_a_percentage: 88.5,
          avg_defect_pct: 8.3,
          trend: 'improving',
        },
        {
          vendor_id: 'VENDOR-002',
          vendor_name: 'Green Valley Produce',
          total_inspections: 48,
          grade_a_percentage: 79.2,
          avg_defect_pct: 12.1,
          trend: 'stable',
        },
        {
          vendor_id: 'VENDOR-003',
          vendor_name: 'Organic Growth Inc',
          total_inspections: 41,
          grade_a_percentage: 73.2,
          avg_defect_pct: 14.7,
          trend: 'declining',
        },
      ],
      credit_summary: {
        total_amount_usd: 2847.50,
        by_status: {
          draft: {
            count: 8,
            amount_usd: 512.30,
          },
          submitted: {
            count: 5,
            amount_usd: 763.45,
          },
          approved: {
            count: 12,
            amount_usd: 1287.50,
          },
          paid: {
            count: 6,
            amount_usd: 284.25,
          },
        },
      },
      recent_inspections: [
        {
          id: 'insp-001',
          lot_id: 'LOT-2024-001',
          location_id: locationId || 'Main Greenhouse',
          commodity: 'Basil',
          vendor_name: 'Smith Farms',
          grade: 'A',
          disposition: 'ACCEPT',
          confidence_score: 92,
          defect_count: 0,
          inspection_date: new Date().toISOString(),
          inspector_name: 'John Inspector',
        },
        {
          id: 'insp-002',
          lot_id: 'LOT-2024-002',
          location_id: locationId || 'North Facility',
          commodity: 'Cilantro',
          vendor_name: 'Green Valley Produce',
          grade: 'B',
          disposition: 'ACCEPT_WITH_SORTING',
          confidence_score: 85,
          defect_count: 2,
          inspection_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          inspector_name: 'Jane Smith',
        },
      ],
      summary: {
        key_insight: 'Overall compliance at 94.3%. Top defect is browning (28.4% of all defects). Smith Farms showing most improved vendor performance.',
        action_items: [
          'Investigate root cause of browning defects with top vendors',
          'Review temperature management in storage areas',
          'Schedule quality improvement workshop with Organic Growth Inc',
        ],
      },
    };

    return NextResponse.json({ data: mockDashboard });
  } catch (error) {
    console.error('[GET /api/qc/dashboard] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
