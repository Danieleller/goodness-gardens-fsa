import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../lib/api-auth';
import { db } from '../../../../db';

interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET /api/qc/inspections/[id]
 * Get single inspection with all defects, photos, and credit details
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ error: 'Inspection ID is required' }, { status: 400 });
    }

    // TODO: Fetch inspection with relations
    // const inspection = await db.select()
    //   .from(inspectionsTable)
    //   .where(eq(inspectionsTable.id, id))
    //   .leftJoin(defectsTable, eq(inspectionsTable.id, defectsTable.inspection_id))
    //   .leftJoin(photosTable, eq(inspectionsTable.id, photosTable.inspection_id))
    //   .leftJoin(creditsTable, eq(inspectionsTable.id, creditsTable.inspection_id));

    // Mock response with full details
    const mockInspection = {
      id,
      lot_id: 'LOT-2024-001',
      location_id: 'Main Greenhouse',
      commodity: 'Basil',
      product_line: 'Fresh Herbs',
      vendor_id: 'VENDOR-001',
      vendor_name: 'Smith Farms',
      grade: 'B' as const,
      disposition: 'ACCEPT_WITH_SORTING',
      temperature_f: 38,
      sample_size: 15,
      total_cases: 50,
      total_weight_lbs: 1200,
      purchase_price_per_unit: 0.85,
      inspector_id: user.id,
      inspector_name: 'John Inspector',
      inspection_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      notes: 'Some defects detected but sortable',
      confidence_score: 85,
      confidence_level: 'high',
      total_defect_percentage: 15.5,
      weighted_score: 38.75,

      // Related data
      defects: [
        {
          id: 'defect-001',
          defect_code: 'BROWNING',
          defect_name: 'Browning',
          severity: 'major',
          category: 'quality',
          affected_percentage: 12,
          notes: 'Light browning on leaf edges',
          photo_ids: ['photo-001', 'photo-002'],
        },
      ],

      photos: [
        {
          id: 'photo-001',
          url: '/images/inspection-001.jpg',
          caption: 'Browning on leaf edges',
          uploaded_at: new Date().toISOString(),
        },
      ],

      credit: {
        id: 'credit-001',
        credit_amount_usd: 127.50,
        status: 'draft',
        base_damage_pct: 15.5,
        labor_buffer_pct: 12,
        yield_loss_pct: 5,
        total_credit_pct: 32.5,
        affected_quantity: 1200,
        unit_price: 0.85,
      },
    };

    if (!mockInspection) {
      return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    }

    return NextResponse.json({ data: mockInspection });
  } catch (error) {
    console.error('[GET /api/qc/inspections/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspection' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/qc/inspections/[id]
 * Update an inspection (inspector can override grade/disposition with reason)
 *
 * Request body:
 * - grade?: 'A' | 'B' | 'C' | 'D'
 * - disposition?: 'ACCEPT' | 'ACCEPT_WITH_SORTING' | 'DONATE' | 'REJECT'
 * - override_reason?: string (required if overriding grade/disposition)
 * - notes?: string
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = context.params;

    if (!id) {
      return NextResponse.json({ error: 'Inspection ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { grade, disposition, override_reason, notes } = body;

    // Validate input
    if (grade && !['A', 'B', 'C', 'D'].includes(grade)) {
      return NextResponse.json({ error: 'Invalid grade value' }, { status: 400 });
    }

    if (disposition && !['ACCEPT', 'ACCEPT_WITH_SORTING', 'DONATE', 'REJECT'].includes(disposition)) {
      return NextResponse.json({ error: 'Invalid disposition value' }, { status: 400 });
    }

    // If overriding grade or disposition, require a reason
    if ((grade || disposition) && !override_reason) {
      return NextResponse.json(
        { error: 'override_reason is required when changing grade or disposition' },
        { status: 400 }
      );
    }

    // TODO: Fetch existing inspection to verify ownership
    // const existingInspection = await db.select()
    //   .from(inspectionsTable)
    //   .where(eq(inspectionsTable.id, id));

    // if (!existingInspection || existingInspection.length === 0) {
    //   return NextResponse.json({ error: 'Inspection not found' }, { status: 404 });
    // }

    // TODO: Update inspection
    // const updatedInspection = await db.update(inspectionsTable)
    //   .set({
    //     grade: grade || existingInspection[0].grade,
    //     disposition: disposition || existingInspection[0].disposition,
    //     notes: notes !== undefined ? notes : existingInspection[0].notes,
    //     updated_at: new Date(),
    //   })
    //   .where(eq(inspectionsTable.id, id))
    //   .returning();

    // TODO: If grade/disposition overridden, log the override
    // if (grade || disposition) {
    //   await db.insert(inspectionOverridesTable).values({
    //     inspection_id: id,
    //     previous_grade: existingInspection[0].grade,
    //     new_grade: grade,
    //     previous_disposition: existingInspection[0].disposition,
    //     new_disposition: disposition,
    //     override_reason,
    //     overridden_by: user.id,
    //     overridden_at: new Date(),
    //   });
    // }

    // Mock response
    const mockUpdatedInspection = {
      id,
      lot_id: 'LOT-2024-001',
      location_id: 'Main Greenhouse',
      commodity: 'Basil',
      grade: grade || 'B',
      disposition: disposition || 'ACCEPT_WITH_SORTING',
      updated_at: new Date().toISOString(),
      notes: notes || 'Some defects detected but sortable',
      override_reason: override_reason || null,
      overridden_by: override_reason ? user.id : null,
      overridden_at: override_reason ? new Date().toISOString() : null,
    };

    return NextResponse.json({
      data: mockUpdatedInspection,
      message: 'Inspection updated successfully',
    });
  } catch (error) {
    console.error('[PATCH /api/qc/inspections/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update inspection' },
      { status: 500 }
    );
  }
}
