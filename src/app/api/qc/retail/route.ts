import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, unauthorized } from '@/lib/api-auth';
import { db } from '@/db';
import { evaluateInspection, type InspectionInput } from '@/lib/qc/decision-engine';

/**
 * GET /api/qc/retail
 * List retail/production inspections (post-processing QC checks)
 *
 * Query Parameters:
 * - location_id: Filter by location
 * - date_from: ISO date string (YYYY-MM-DD)
 * - date_to: ISO date string (YYYY-MM-DD)
 * - batch_id: Filter by batch ID
 * - status: Filter by status (pending, approved, rejected)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
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
    const batchId = searchParams.get('batch_id');
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // TODO: Replace with actual Drizzle queries
    // const retailInspections = await db.select()
    //   .from(retailInspectionsTable)
    //   .where(
    //     and(
    //       locationId ? eq(retailInspectionsTable.location_id, locationId) : undefined,
    //       dateFrom ? gte(retailInspectionsTable.inspection_date, new Date(dateFrom)) : undefined,
    //       dateTo ? lte(retailInspectionsTable.inspection_date, new Date(dateTo)) : undefined,
    //       batchId ? eq(retailInspectionsTable.batch_id, batchId) : undefined,
    //       status ? eq(retailInspectionsTable.status, status) : undefined,
    //     )
    //   )
    //   .limit(limit)
    //   .offset(offset)
    //   .orderBy(desc(retailInspectionsTable.inspection_date));

    // Mock response
    const mockRetailInspections = [
      {
        id: 'retail-001',
        batch_id: 'BATCH-2024-001',
        location_id: locationId || 'Packing Station A',
        commodity: 'Basil',
        product_line: 'Fresh Herbs - Retail Pack',
        status: status || 'pending',
        sample_count: 10,
        inspection_date: new Date().toISOString(),
        inspector_id: userId,
        created_at: new Date().toISOString(),
      },
    ];

    // TODO: Get total count
    // const totalCount = await db.select({ count: count() })
    //   .from(retailInspectionsTable)
    //   .where(...filters);

    const totalCount = 1;

    return NextResponse.json({
      data: mockRetailInspections,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/qc/retail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retail inspections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qc/retail
 * Create a new retail batch inspection with samples
 *
 * Request body:
 * - batch_id: string
 * - location_id: string
 * - commodity: string
 * - product_line: string
 * - sample_count: number
 * - total_packs: number
 * - samples: array of sample inspection results
 * - inspection_date?: ISO date string
 *
 * Each sample should include:
 * - sample_number: number
 * - pack_size: string
 * - defects: DefectFinding[]
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId(); if (!userId) return unauthorized();
    }

    const body = await request.json();

    // Validate input
    const { batch_id, location_id, commodity, product_line, sample_count, total_packs, samples, inspection_date } = body;

    if (!batch_id || !location_id || !commodity) {
      return NextResponse.json(
        { error: 'Missing required fields: batch_id, location_id, commodity' },
        { status: 400 }
      );
    }

    if (!Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json(
        { error: 'samples must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each sample
    for (const sample of samples) {
      if (!sample.sample_number || typeof sample.sample_number !== 'number') {
        return NextResponse.json(
          { error: 'Each sample must have a valid sample_number' },
          { status: 400 }
        );
      }
      if (!Array.isArray(sample.defects)) {
        return NextResponse.json(
          { error: 'Each sample must have a defects array' },
          { status: 400 }
        );
      }
    }

    // TODO: Store retail inspection batch
    // const insertedBatch = await db.insert(retailInspectionsTable).values({
    //   batch_id,
    //   location_id,
    //   commodity,
    //   product_line,
    //   sample_count,
    //   total_packs,
    //   status: 'pending',
    //   inspector_id: userId,
    //   inspection_date: new Date(inspection_date),
    //   created_at: new Date(),
    // }).returning();

    // TODO: Store individual samples and their defects
    // const storedSamples = [];
    // for (const sample of samples) {
    //   const insertedSample = await db.insert(retailSamplesTable).values({
    //     retail_inspection_id: insertedBatch[0].id,
    //     sample_number: sample.sample_number,
    //     pack_size: sample.pack_size,
    //     notes: sample.notes,
    //     created_at: new Date(),
    //   }).returning();

    //   for (const defect of sample.defects) {
    //     await db.insert(retailDefectsTable).values({
    //       sample_id: insertedSample[0].id,
    //       defect_code: defect.defect_code,
    //       severity: defect.severity,
    //       category: defect.category,
    //       affected_percentage: defect.affected_percentage,
    //       notes: defect.notes,
    //     });
    //   }
    //   storedSamples.push(insertedSample[0]);
    // }

    // Calculate overall batch results
    let totalDefects = 0;
    let totalCriticalDefects = 0;
    const defectSummary: Record<string, number> = {};

    for (const sample of samples) {
      totalDefects += sample.defects.length;
      totalCriticalDefects += sample.defects.filter((d: any) => d.severity === 'critical').length;

      for (const defect of sample.defects) {
        defectSummary[defect.defect_code] = (defectSummary[defect.defect_code] || 0) + 1;
      }
    }

    // Mock response
    const mockBatch = {
      id: `retail-${Date.now()}`,
      batch_id,
      location_id,
      commodity,
      product_line,
      sample_count,
      total_packs,
      status: totalCriticalDefects > 0 ? 'rejected' : 'pending',
      inspector_id: userId,
      inspection_date,
      created_at: new Date().toISOString(),
      summary: {
        total_defects: totalDefects,
        total_critical_defects: totalCriticalDefects,
        defect_summary: defectSummary,
        approval_status: totalCriticalDefects > 0 ? 'REJECT' : 'PENDING_REVIEW',
      },
      samples: samples.map((s: any, idx: number) => ({
        id: `sample-${Date.now()}-${idx}`,
        sample_number: s.sample_number,
        pack_size: s.pack_size,
        defect_count: s.defects.length,
        critical_defect_count: s.defects.filter((d: any) => d.severity === 'critical').length,
        notes: s.notes,
      })),
    };

    return NextResponse.json({
      data: mockBatch,
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/qc/retail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create retail inspection' },
      { status: 500 }
    );
  }
}
