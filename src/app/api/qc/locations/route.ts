import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, unauthorized } from '@/lib/api-auth';
import { db } from '@/db';

/**
 * GET /api/qc/locations
 * List all locations with their available products/commodities
 *
 * Returns:
 * - Array of locations with metadata and available commodities
 * - Each location includes: id, name, facility_type, commodities, last_inspection_date
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId(); if (!userId) return unauthorized();
    }

    // TODO: Fetch locations with their available commodities
    // const locations = await db.select({
    //   id: locationsTable.id,
    //   name: locationsTable.name,
    //   facility_type: locationsTable.facility_type,
    //   created_at: locationsTable.created_at,
    // })
    // .from(locationsTable)
    // .orderBy(asc(locationsTable.name));

    // TODO: For each location, fetch available commodities
    // const locationsWithCommodities = await Promise.all(locations.map(async (location) => {
    //   const commodities = await db.select({
    //     commodity: inspectionsTable.commodity,
    //     last_inspection_date: max(inspectionsTable.inspection_date),
    //     inspection_count: count(),
    //   })
    //   .from(inspectionsTable)
    //   .where(eq(inspectionsTable.location_id, location.id))
    //   .groupBy(inspectionsTable.commodity)
    //   .orderBy(asc(inspectionsTable.commodity));

    //   return {
    //     ...location,
    //     commodities,
    //   };
    // }));

    // Mock response
    const mockLocations = [
      {
        id: 'loc-001',
        name: 'Main Greenhouse',
        facility_type: 'Greenhouse',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Basil',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 47,
          },
          {
            commodity: 'Cilantro',
            last_inspection_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 35,
          },
          {
            commodity: 'Mint',
            last_inspection_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 28,
          },
        ],
      },
      {
        id: 'loc-002',
        name: 'North Facility',
        facility_type: 'Greenhouse',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Parsley',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 24,
          },
          {
            commodity: 'Dill',
            last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 18,
          },
        ],
      },
      {
        id: 'loc-003',
        name: 'Packing Station A',
        facility_type: 'Processing',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Basil',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 31,
          },
          {
            commodity: 'Cilantro',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 22,
          },
          {
            commodity: 'Mint',
            last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 16,
          },
          {
            commodity: 'Oregano',
            last_inspection_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 12,
          },
        ],
      },
      {
        id: 'loc-004',
        name: 'South Facility',
        facility_type: 'Greenhouse',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Thyme',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 19,
          },
          {
            commodity: 'Sage',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 14,
          },
          {
            commodity: 'Rosemary',
            last_inspection_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 11,
          },
        ],
      },
      {
        id: 'loc-005',
        name: 'Warehouse 1',
        facility_type: 'Storage',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Basil',
            last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 15,
          },
          {
            commodity: 'Mint',
            last_inspection_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 9,
          },
        ],
      },
      {
        id: 'loc-006',
        name: 'Distribution Center',
        facility_type: 'Distribution',
        active: true,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        commodities: [
          {
            commodity: 'Basil',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 42,
          },
          {
            commodity: 'Cilantro',
            last_inspection_date: new Date().toISOString(),
            inspection_count: 38,
          },
          {
            commodity: 'Parsley',
            last_inspection_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            inspection_count: 21,
          },
        ],
      },
    ];

    return NextResponse.json({
      data: mockLocations,
      summary: {
        total_locations: mockLocations.length,
        total_commodities: new Set(
          mockLocations.flatMap((loc) => loc.commodities.map((c) => c.commodity))
        ).size,
        facility_types: Array.from(
          new Set(mockLocations.map((loc) => loc.facility_type))
        ),
      },
    });
  } catch (error) {
    console.error('[GET /api/qc/locations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}
