import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, unauthorized } from '@/lib/api-auth';
import { evaluateInspection, type InspectionInput } from '@/lib/qc/decision-engine';

/**
 * POST /api/qc/evaluate
 * Run the decision engine on-the-fly for live preview
 *
 * This endpoint evaluates inspection findings WITHOUT saving to the database.
 * Useful for:
 * - Live preview in the inspection form
 * - What-if analysis (change defects and see the impact)
 * - Training and testing the decision engine
 *
 * Request body: InspectionInput (from decision engine)
 * Returns: GradeRecommendation with full explanation
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const userId = await getAuthUserId(); if (!userId) return unauthorized();
    }

    const body = await request.json();

    // Validate input - require only core fields for evaluation
    const { lot_id, location_id, commodity, vendor_id, temperature_f, sample_size, total_cases, total_weight_lbs, purchase_price_per_unit, defects, inspection_date } = body;

    // Basic validation
    const errors: string[] = [];

    if (!lot_id) errors.push('lot_id is required');
    if (!location_id) errors.push('location_id is required');
    if (!commodity) errors.push('commodity is required');
    if (!vendor_id) errors.push('vendor_id is required');
    if (typeof temperature_f !== 'number') errors.push('temperature_f must be a number');
    if (typeof sample_size !== 'number') errors.push('sample_size must be a number');
    if (typeof total_cases !== 'number') errors.push('total_cases must be a number');
    if (typeof total_weight_lbs !== 'number') errors.push('total_weight_lbs must be a number');
    if (typeof purchase_price_per_unit !== 'number') errors.push('purchase_price_per_unit must be a number');
    if (!Array.isArray(defects)) errors.push('defects must be an array');

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Validate defects structure
    for (let i = 0; i < defects.length; i++) {
      const defect = defects[i];
      if (!defect.defect_code) {
        errors.push(`defects[${i}].defect_code is required`);
      }
      if (!defect.severity) {
        errors.push(`defects[${i}].severity is required`);
      }
      if (!defect.category) {
        errors.push(`defects[${i}].category is required`);
      }
      if (typeof defect.affected_percentage !== 'number') {
        errors.push(`defects[${i}].affected_percentage must be a number`);
      }
      if (typeof defect.food_safety_critical !== 'boolean') {
        errors.push(`defects[${i}].food_safety_critical must be a boolean`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    // Validate numeric ranges
    const rangeErrors: string[] = [];

    if (temperature_f < -50 || temperature_f > 150) {
      rangeErrors.push('temperature_f must be between -50 and 150 degrees Fahrenheit');
    }

    if (sample_size < 1) {
      rangeErrors.push('sample_size must be at least 1');
    }

    if (total_cases < 1) {
      rangeErrors.push('total_cases must be at least 1');
    }

    if (total_weight_lbs < 1) {
      rangeErrors.push('total_weight_lbs must be at least 1');
    }

    if (purchase_price_per_unit <= 0) {
      rangeErrors.push('purchase_price_per_unit must be greater than 0');
    }

    if (sample_size > total_cases) {
      rangeErrors.push('sample_size cannot exceed total_cases');
    }

    if (rangeErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: rangeErrors },
        { status: 400 }
      );
    }

    // Build the inspection input
    const input: InspectionInput = {
      lot_id,
      location_id,
      commodity,
      product_line: body.product_line || '',
      vendor_id,
      temperature_f,
      sample_size,
      total_cases,
      total_weight_lbs,
      purchase_price_per_unit,
      defects,
      inspector_id: userId,
      inspection_date: inspection_date || new Date().toISOString(),
    };

    // Run the decision engine
    const gradeRecommendation = evaluateInspection(input);

    // Return the full recommendation
    return NextResponse.json({
      data: {
        grade: gradeRecommendation.grade,
        disposition: gradeRecommendation.disposition,
        confidence: gradeRecommendation.confidence,
        confidence_score: gradeRecommendation.confidence_score,
        total_defect_percentage: gradeRecommendation.total_defect_percentage,
        weighted_score: gradeRecommendation.weighted_score,
        auto_reject_triggered: gradeRecommendation.auto_reject_triggered,
        auto_reject_reasons: gradeRecommendation.auto_reject_reasons,
        flags: gradeRecommendation.flags,
        credit: gradeRecommendation.credit,
        explanation: gradeRecommendation.explanation,
      },
      metadata: {
        evaluated_at: new Date().toISOString(),
        evaluation_type: 'preview',
        saved: false,
        note: 'This is a preview evaluation. No data has been saved to the database.',
      },
    });
  } catch (error) {
    console.error('[POST /api/qc/evaluate] Error:', error);

    // Provide detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(
      {
        error: 'Failed to evaluate inspection',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
      },
      { status: 500 }
    );
  }
}
