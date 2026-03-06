import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../lib/api-auth';
import { db } from '../../../db';
import { evaluateInspection, type InspectionInput } from '../../../lib/qc/decision-engine';

/**
 * GET /api/qc/inspections
 * List inspections with optional filters
 *
 * Query Parameters:
 * - location_id: Filter by location
 * - date_from: ISO date string (YYYY-MM-DD)
 * - date_to: ISO date string (YYYY-MM-DD)
 * - grade: Filter by grade (A, B, C, D)
 * - commodity: Filter by commodity name
 * - vendor_id: Filter by vendor ID
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const grade = searchParams.get('grade');
    const commodity = searchParams.get('commodity');
    const vendorId = searchParams.get('vendor_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // TODO: Replace with actual Drizzle queries
    // const inspections = await db.select()
    //   .from(inspectionsTable)
    //   .where(
    //     and(
    //       locationId ? eq(inspectionsTable.location_id, locationId) : undefined,
    //       dateFrom ? gte(inspectionsTable.inspection_date, new Date(dateFrom)) : undefined,
    //       dateTo ? lte(inspectionsTable.inspection_date, new Date(dateTo)) : undefined,
    //       grade ? eq(inspectionsTable.grade, grade) : undefined,
    //       commodity ? eq(inspectionsTable.commodity, commodity) : undefined,
    //       vendorId ? eq(inspectionsTable.vendor_id, vendorId) : undefined,
    //     )
    //   )
    //   .limit(limit)
    //   .offset(offset)
    //   .orderBy(desc(inspectionsTable.inspection_date));

    // Mock response
    const mockInspections = [
      {
        id: 'insp-001',
        lot_id: 'LOT-2024-001',
        location_id: locationId || 'Main Greenhouse',
        commodity: commodity || 'Basil',
        vendor_id: vendorId || 'VENDOR-001',
        grade: (grade || 'A') as 'A' | 'B' | 'C' | 'D',
        disposition: 'ACCEPT',
        inspection_date: new Date().toISOString(),
        inspector_id: user.id,
        created_at: new Date().toISOString(),
      },
    ];

    // TODO: Get total count for pagination
    // const totalCount = await db.select({ count: count() })
    //   .from(inspectionsTable)
    //   .where(...filters);

    const totalCount = 1;

    return NextResponse.json({
      data: mockInspections,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/qc/inspections] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qc/inspections
 * Create a new receiving inspection
 *
 * Request body: InspectionInput (from decision engine)
 * Returns: The created inspection record with grade recommendation
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const { lot_id, location_id, commodity, product_line, vendor_id, temperature_f, sample_size, total_cases, total_weight_lbs, purchase_price_per_unit, defects, inspection_date } = body;

    if (!lot_id || !location_id || !commodity || !vendor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: lot_id, location_id, commodity, vendor_id' },
        { status: 400 }
      );
    }

    if (typeof temperature_f !== 'number' || typeof sample_size !== 'number' || typeof total_cases !== 'number') {
      return NextResponse.json(
        { error: 'Invalid numeric fields: temperature_f, sample_size, total_cases' },
        { status: 400 }
      );
    }

    if (!Array.isArray(defects)) {
      return NextResponse.json(
        { error: 'Invalid defects: must be an array' },
        { status: 400 }
      );
    }

    // Run decision engine
    const input: InspectionInput = {
      lot_id,
      location_id,
      commodity,
      product_line: product_line || '',
      vendor_id,
      temperature_f,
      sample_size,
      total_cases,
      total_weight_lbs,
      purchase_price_per_unit,
      defects,
      inspector_id: user.id,
      inspection_date: inspection_date || new Date().toISOString(),
    };

    const gradeRecommendation = evaluateInspection(input);

    // TODO: Store in database
    // const insertedInspection = await db.insert(inspectionsTable).values({
    //   lot_id,
    //   location_id,
    //   commodity,
    //   product_line,
    //   vendor_id,
    //   grade: gradeRecommendation.grade,
    //   disposition: gradeRecommendation.disposition,
    //   temperature_f,
    //   sample_size,
    //   total_cases,
    //   total_weight_lbs,
    //   purchase_price_per_unit,
    //   inspector_id: user.id,
    //   inspection_date: new Date(inspection_date),
    //   created_at: new Date(),
    //   updated_at: new Date(),
    //   notes: gradeRecommendation.explanation.summary,
    // }).returning();

    // TODO: Store defects
    // for (const defect of defects) {
    //   await db.insert(defectsTable).values({
    //     inspection_id: insertedInspection[0].id,
    //     defect_code: defect.defect_code,
    //     severity: defect.severity,
    //     category: defect.category,
    //     affected_percentage: defect.affected_percentage,
    //     notes: defect.notes,
    //   });
    // }

    // TODO: Create credit claim if applicable (grade != A)
    // if (gradeRecommendation.grade !== 'A' && gradeRecommendation.credit) {
    //   await db.insert(creditsTable).values({
    //     inspection_id: insertedInspection[0].id,
    //     vendor_id,
    //     location_id,
    //     credit_amount_usd: gradeRecommendation.credit.credit_amount_usd,
    //     status: 'draft',
    //     created_by: user.id,
    //     created_at: new Date(),
    //   });
    // }

    return NextResponse.json({
      data: {
        id: `insp-${Date.now()}`,
        lot_id,
        location_id,
        commodity,
        vendor_id,
        grade: gradeRecommendation.grade,
        disposition: gradeRecommendation.disposition,
        confidence: gradeRecommendation.confidence,
        confidence_score: gradeRecommendation.confidence_score,
        temperature_f,
        sample_size,
        total_cases,
        total_weight_lbs,
        purchase_price_per_unit,
        inspector_id: user.id,
        inspection_date,
        created_at: new Date().toISOString(),
        // Include the full grade recommendation for the response
        grade_recommendation: gradeRecommendation,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/qc/inspections] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create inspection' },
      { status: 500 }
    );
  }
}
