import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, unauthorized } from '@/lib/api-auth';
import { db } from '@/db';

/**
 * GET /api/qc/credits
 * List vendor credits with optional filters
 *
 * Query Parameters:
 * - status: Filter by status (draft, submitted, approved, paid)
 * - vendor_id: Filter by vendor ID
 * - location_id: Filter by location ID
 * - date_from: ISO date string (YYYY-MM-DD)
 * - date_to: ISO date string (YYYY-MM-DD)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');
    const locationId = searchParams.get('location_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // TODO: Replace with actual Drizzle queries
    // const credits = await db.select()
    //   .from(creditsTable)
    //   .where(
    //     and(
    //       status ? eq(creditsTable.status, status) : undefined,
    //       vendorId ? eq(creditsTable.vendor_id, vendorId) : undefined,
    //       locationId ? eq(creditsTable.location_id, locationId) : undefined,
    //       dateFrom ? gte(creditsTable.created_at, new Date(dateFrom)) : undefined,
    //       dateTo ? lte(creditsTable.created_at, new Date(dateTo)) : undefined,
    //     )
    //   )
    //   .limit(limit)
    //   .offset(offset)
    //   .orderBy(desc(creditsTable.created_at))
    //   .leftJoin(inspectionsTable, eq(creditsTable.inspection_id, inspectionsTable.id))
    //   .leftJoin(vendorsTable, eq(creditsTable.vendor_id, vendorsTable.id));

    // Mock response
    const mockCredits = [
      {
        id: 'credit-001',
        inspection_id: 'insp-001',
        lot_id: 'LOT-2024-001',
        vendor_id: vendorId || 'VENDOR-001',
        vendor_name: 'Smith Farms',
        location_id: locationId || 'Main Greenhouse',
        commodity: 'Basil',
        credit_amount_usd: 127.50,
        status: (status || 'draft') as 'draft' | 'submitted' | 'approved' | 'paid',
        base_damage_pct: 15.5,
        labor_buffer_pct: 12,
        yield_loss_pct: 5,
        total_credit_pct: 32.5,
        created_by: userId,
        created_at: new Date().toISOString(),
        submitted_at: null,
        approved_at: null,
        paid_at: null,
        notes: null,
      },
    ];

    // TODO: Get total count
    // const totalCount = await db.select({ count: count() })
    //   .from(creditsTable)
    //   .where(...filters);

    const totalCount = 1;

    return NextResponse.json({
      data: mockCredits,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
      summary: {
        total_amount_usd: 127.50,
        by_status: {
          draft: 127.50,
          submitted: 0,
          approved: 0,
          paid: 0,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/qc/credits] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/qc/credits
 * Generate a credit claim from an inspection
 *
 * Request body:
 * - inspection_id: string (required)
 * - vendor_id: string (required)
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

    const body = await request.json();
    const { inspection_id, vendor_id, notes } = body;

    if (!inspection_id || !vendor_id) {
      return NextResponse.json(
        { error: 'Missing required fields: inspection_id, vendor_id' },
        { status: 400 }
      );
    }

    // TODO: Fetch inspection to get credit details
    // const inspection = await db.select()
    //   .from(inspectionsTable)
    //   .where(eq(inspectionsTable.id, inspection_id));

    // if (!inspection || inspection.length === 0) {
    //   return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    // }

    // // Check if credit already exists for this inspection
    // const existingCredit = await db.select()
    //   .from(creditsTable)
    //   .where(eq(creditsTable.inspection_id, inspection_id));

    // if (existingCredit && existingCredit.length > 0) {
    //   return NextResponse.json(
    //     { error: 'Credit claim already exists for this inspection' },
    //     { status: 409 }
    //   );
    // }

    // // If inspection grade is A, no credit is needed
    // if (inspection[0].grade === 'A') {
    //   return NextResponse.json(
    //     { error: 'No credit claim needed for Grade A inspections' },
    //     { status: 400 }
    //   );
    // }

    // TODO: Create credit record
    // const insertedCredit = await db.insert(creditsTable).values({
    //   inspection_id,
    //   vendor_id,
    //   location_id: inspection[0].location_id,
    //   credit_amount_usd: inspection[0].credit_amount_usd, // From decision engine result
    //   base_damage_pct: inspection[0].base_damage_pct,
    //   labor_buffer_pct: inspection[0].labor_buffer_pct,
    //   yield_loss_pct: 5,
    //   total_credit_pct: inspection[0].total_credit_pct,
    //   status: 'draft',
    //   created_by: userId,
    //   created_at: new Date(),
    //   notes: notes || null,
    // }).returning();

    // Mock response
    const mockCredit = {
      id: `credit-${Date.now()}`,
      inspection_id,
      lot_id: 'LOT-2024-001',
      vendor_id,
      vendor_name: 'Smith Farms',
      location_id: 'Main Greenhouse',
      commodity: 'Basil',
      credit_amount_usd: 127.50,
      status: 'draft' as const,
      base_damage_pct: 15.5,
      labor_buffer_pct: 12,
      yield_loss_pct: 5,
      total_credit_pct: 32.5,
      created_by: userId,
      created_at: new Date().toISOString(),
      submitted_at: null,
      approved_at: null,
      paid_at: null,
      notes: notes || null,
    };

    return NextResponse.json({
      data: mockCredit,
      message: 'Credit claim generated in draft status',
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/qc/credits] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create credit claim' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/qc/credits
 * Update credit status (draft → submitted → approved → paid)
 *
 * Query Parameters:
 * - credit_id: string (required)
 *
 * Request body:
 * - status: 'submitted' | 'approved' | 'paid' (required)
 * - notes?: string
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId();
    if (!userId) return unauthorized();

    const searchParams = request.nextUrl.searchParams;
    const creditId = searchParams.get('credit_id');

    if (!creditId) {
      return NextResponse.json({ error: 'credit_id query parameter is required' }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Validate status transition
    const validStatuses = ['submitted', 'approved', 'paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status: must be submitted, approved, or paid' },
        { status: 400 }
      );
    }

    // TODO: Fetch existing credit
    // const existingCredit = await db.select()
    //   .from(creditsTable)
    //   .where(eq(creditsTable.id, creditId));

    // if (!existingCredit || existingCredit.length === 0) {
    //   return NextResponse.json({ error: 'Credit not found' }, { status: 404 });
    // }

    // TODO: Validate status transitions
    // const statusOrder = ['draft', 'submitted', 'approved', 'paid'];
    // const currentIndex = statusOrder.indexOf(existingCredit[0].status);
    // const newIndex = statusOrder.indexOf(status);

    // if (newIndex <= currentIndex) {
    //   return NextResponse.json(
    //     { error: `Cannot transition from ${existingCredit[0].status} to ${status}` },
    //     { status: 400 }
    //   );
    // }

    // TODO: Update credit status
    // const updateData: any = {
    //   status,
    //   updated_at: new Date(),
    // };

    // if (status === 'submitted') {
    //   updateData.submitted_at = new Date();
    // } else if (status === 'approved') {
    //   updateData.approved_at = new Date();
    //   updateData.approved_by = userId;
    // } else if (status === 'paid') {
    //   updateData.paid_at = new Date();
    //   updateData.paid_by = userId;
    // }

    // if (notes) {
    //   updateData.notes = notes;
    // }

    // const updatedCredit = await db.update(creditsTable)
    //   .set(updateData)
    //   .where(eq(creditsTable.id, creditId))
    //   .returning();

    // Mock response
    const mockUpdatedCredit = {
      id: creditId,
      inspection_id: 'insp-001',
      lot_id: 'LOT-2024-001',
      vendor_id: 'VENDOR-001',
      vendor_name: 'Smith Farms',
      location_id: 'Main Greenhouse',
      commodity: 'Basil',
      credit_amount_usd: 127.50,
      status,
      base_damage_pct: 15.5,
      labor_buffer_pct: 12,
      yield_loss_pct: 5,
      total_credit_pct: 32.5,
      created_at: new Date().toISOString(),
      submitted_at: status === 'submitted' || status === 'approved' || status === 'paid' ? new Date().toISOString() : null,
      approved_at: status === 'approved' || status === 'paid' ? new Date().toISOString() : null,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
      notes: notes || null,
    };

    return NextResponse.json({
      data: mockUpdatedCredit,
      message: `Credit status updated to ${status}`,
    });
  } catch (error) {
    console.error('[PATCH /api/qc/credits] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update credit' },
      { status: 500 }
    );
  }
}
