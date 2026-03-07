/**
 * QC Decision Engine
 *
 * The brain of the Goodness Gardens Quality Control Platform.
 * Takes inspection findings and returns a grade recommendation, disposition,
 * credit calculation, and human-readable explanation.
 */

/**
 * Severity levels for defects
 */
type Severity = 'minor' | 'major' | 'critical';

/**
 * Defect categories for classification
 */
type Category = 'safety' | 'compliance' | 'quality' | 'cosmetic';

/**
 * Quality grades per SOP
 */
type Grade = 'A' | 'B' | 'C' | 'D';

/**
 * Product disposition/action
 */
type Disposition = 'ACCEPT' | 'ACCEPT_WITH_SORTING' | 'DONATE' | 'REJECT';

/**
 * Confidence level in the decision
 */
type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * A single defect finding from inspection
 */
export interface DefectFinding {
  defect_type_id: string;
  defect_code: string; // e.g., 'BROWNING', 'MOLD', 'WILTING'
  severity: Severity;
  category: Category;
  affected_percentage: number; // 0-100
  notes?: string;
  photo_ids?: string[];
  food_safety_critical: boolean;
}

/**
 * Input data for inspection evaluation
 */
export interface InspectionInput {
  lot_id: string;
  location_id: string;
  commodity: string;
  product_line: string;
  vendor_id: string;
  temperature_f: number;
  sample_size: number;
  total_cases: number;
  total_weight_lbs: number;
  purchase_price_per_unit: number;
  defects: DefectFinding[];
  inspector_id: string;
  inspection_date: string;
}

/**
 * Credit calculation breakdown
 */
export interface CreditCalculation {
  base_damage_pct: number;
  labor_buffer_pct: number;
  yield_loss_pct: number;
  total_credit_pct: number;
  credit_amount_usd: number;
  affected_quantity: number;
  unit_price: number;
}

/**
 * Defect breakdown for explanation
 */
export interface DefectBreakdownItem {
  defect_name: string;
  affected_pct: number;
  severity: string;
  category: string;
  score: number;
  impact: string; // "This defect contributed X% to the overall score"
}

/**
 * Human-readable explanation of the grade
 */
export interface ExplanationBlock {
  summary: string; // 1-2 sentence plain-English summary
  grade_reason: string; // Why this grade was assigned
  disposition_reason: string; // Why this disposition
  defect_breakdown: DefectBreakdownItem[];
  credit_explanation: string | null;
  inspector_guidance: string[]; // Action items for inspector
}

/**
 * Final grade recommendation
 */
export interface GradeRecommendation {
  grade: Grade;
  disposition: Disposition;
  confidence: ConfidenceLevel;
  confidence_score: number; // 0-100

  total_defect_percentage: number;
  weighted_score: number;

  credit: CreditCalculation | null; // null if Grade A

  explanation: ExplanationBlock;

  auto_reject_triggered: boolean;
  auto_reject_reasons: string[];

  flags: string[]; // warnings, notes
}

/**
 * Input for credit calculation
 */
export interface CreditInput {
  base_damage_pct: number;
  commodity: string;
  total_weight_lbs: number;
  purchase_price_per_unit: number;
}

/**
 * Severity weight multipliers
 */
const SEVERITY_WEIGHTS: Record<Severity, number> = {
  minor: 1.0,
  major: 2.5,
  critical: 5.0,
};

/**
 * Category multipliers for weighted scoring
 */
const CATEGORY_MULTIPLIERS: Record<Category, number> = {
  safety: 3.0,
  compliance: 2.0,
  quality: 1.5,
  cosmetic: 1.0,
};

/**
 * Grading thresholds from SOP
 */
const GRADE_THRESHOLDS = {
  A: 0.10,      // < 10%
  B: 0.25,      // 10-25%
  C: 1.00,      // 25-100%
  D: Infinity,  // > 100% or auto-reject
};

/**
 * All 21 defect types with metadata
 */
export const DEFECT_REGISTRY = {
  BROWNING: {
    name: 'Browning',
    code: 'BROWNING',
    severity: 'major' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  WILTING: {
    name: 'Wilting',
    code: 'WILTING',
    severity: 'major' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  YELLOWING: {
    name: 'Yellowing',
    code: 'YELLOWING',
    severity: 'minor' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  TIP_BURN: {
    name: 'Tip Burn',
    code: 'TIP_BURN',
    severity: 'major' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  DEHYDRATION: {
    name: 'Dehydration',
    code: 'DEHYDRATION',
    severity: 'minor' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  DISCOLORATION: {
    name: 'Discoloration',
    code: 'DISCOLORATION',
    severity: 'minor' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
  DECAY_ROT: {
    name: 'Decay/Rot',
    code: 'DECAY_ROT',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  MOLD: {
    name: 'Mold',
    code: 'MOLD',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  FOREIGN_MATERIAL: {
    name: 'Foreign Material',
    code: 'FOREIGN_MATERIAL',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  PEST_PRESENCE: {
    name: 'Pest Presence',
    code: 'PEST_PRESENCE',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  ODOR_OFF_SMELL: {
    name: 'Odor/Off-Smell',
    code: 'ODOR_OFF_SMELL',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  SLIME: {
    name: 'Slime',
    code: 'SLIME',
    severity: 'critical' as Severity,
    category: 'safety' as Category,
    food_safety_critical: true,
  },
  MECHANICAL_DAMAGE: {
    name: 'Mechanical Damage',
    code: 'MECHANICAL_DAMAGE',
    severity: 'major' as Severity,
    category: 'cosmetic' as Category,
    food_safety_critical: false,
  },
  PACKAGING_DAMAGE: {
    name: 'Packaging Damage',
    code: 'PACKAGING_DAMAGE',
    severity: 'minor' as Severity,
    category: 'cosmetic' as Category,
    food_safety_critical: false,
  },
  ROOT_DAMAGE: {
    name: 'Root Damage',
    code: 'ROOT_DAMAGE',
    severity: 'major' as Severity,
    category: 'cosmetic' as Category,
    food_safety_critical: false,
  },
  EXCESSIVE_STEMS: {
    name: 'Excessive Stems',
    code: 'EXCESSIVE_STEMS',
    severity: 'minor' as Severity,
    category: 'cosmetic' as Category,
    food_safety_critical: false,
  },
  LABEL_ERROR: {
    name: 'Label Error',
    code: 'LABEL_ERROR',
    severity: 'major' as Severity,
    category: 'compliance' as Category,
    food_safety_critical: false,
  },
  MISSING_DOCUMENTATION: {
    name: 'Missing Documentation',
    code: 'MISSING_DOCUMENTATION',
    severity: 'major' as Severity,
    category: 'compliance' as Category,
    food_safety_critical: false,
  },
  TEMPERATURE_ABUSE: {
    name: 'Temperature Abuse',
    code: 'TEMPERATURE_ABUSE',
    severity: 'major' as Severity,
    category: 'compliance' as Category,
    food_safety_critical: false,
  },
  MINOR_VISUAL: {
    name: 'Minor Visual Defect',
    code: 'MINOR_VISUAL',
    severity: 'minor' as Severity,
    category: 'cosmetic' as Category,
    food_safety_critical: false,
  },
  LIGHT_YELLOWING: {
    name: 'Light Yellowing',
    code: 'LIGHT_YELLOWING',
    severity: 'minor' as Severity,
    category: 'quality' as Category,
    food_safety_critical: false,
  },
};

/**
 * Commodity configuration mapping
 */
export const COMMODITY_CONFIG = {
  'Basil': {
    name: 'Basil',
    sort_category: 'hand_sort',
    labor_buffer_pct: 12,
    shelf_life_days: 5,
  },
  'Cilantro': {
    name: 'Cilantro',
    sort_category: 'hand_sort',
    labor_buffer_pct: 12,
    shelf_life_days: 5,
  },
  'Italian Parsley': {
    name: 'Italian Parsley',
    sort_category: 'hand_sort',
    labor_buffer_pct: 12,
    shelf_life_days: 7,
  },
  'Dill': {
    name: 'Dill',
    sort_category: 'hand_sort',
    labor_buffer_pct: 12,
    shelf_life_days: 5,
  },
  'Mint': {
    name: 'Mint',
    sort_category: 'hand_sort',
    labor_buffer_pct: 12,
    shelf_life_days: 7,
  },
  'Rosemary': {
    name: 'Rosemary',
    sort_category: 'machine_sort',
    labor_buffer_pct: 8,
    shelf_life_days: 14,
  },
  'Thyme': {
    name: 'Thyme',
    sort_category: 'machine_sort',
    labor_buffer_pct: 8,
    shelf_life_days: 14,
  },
  'Sage': {
    name: 'Sage',
    sort_category: 'machine_sort',
    labor_buffer_pct: 8,
    shelf_life_days: 14,
  },
  'Oregano': {
    name: 'Oregano',
    sort_category: 'machine_sort',
    labor_buffer_pct: 8,
    shelf_life_days: 14,
  },
  'Chives': {
    name: 'Chives',
    sort_category: 'fine_herbs',
    labor_buffer_pct: 15,
    shelf_life_days: 5,
  },
  'Tarragon': {
    name: 'Tarragon',
    sort_category: 'fine_herbs',
    labor_buffer_pct: 15,
    shelf_life_days: 7,
  },
  'Marjoram': {
    name: 'Marjoram',
    sort_category: 'fine_herbs',
    labor_buffer_pct: 15,
    shelf_life_days: 10,
  },
  'Bay Leaves': {
    name: 'Bay Leaves',
    sort_category: 'fine_herbs',
    labor_buffer_pct: 15,
    shelf_life_days: 30,
  },
};

/**
 * Calculate the weighted score for a single defect
 * Score = Severity Weight × Affected % × Category Multiplier
 *
 * @param defect The defect to score
 * @returns The weighted score
 */
function calculateDefectScore(defect: DefectFinding): number {
  const severityWeight = SEVERITY_WEIGHTS[defect.severity] || 1.0;
  const categoryMultiplier = CATEGORY_MULTIPLIERS[defect.category] || 1.0;
  const affectedRatio = defect.affected_percentage / 100;

  return severityWeight * affectedRatio * categoryMultiplier;
}

/**
 * Calculate the overall weighted score from all defects
 *
 * @param defects Array of defect findings
 * @returns Total weighted score
 */
export function calculateScore(defects: DefectFinding[]): number {
  if (defects.length === 0) {
    return 0;
  }

  const totalScore = defects.reduce((sum, defect) => {
    return sum + calculateDefectScore(defect);
  }, 0);

  return totalScore;
}

/**
 * Calculate the total defect percentage from weighted scores
 * This converts the weighted score to a percentage representation
 *
 * @param defects Array of defect findings
 * @returns Total defect percentage (0-100)
 */
function calculateTotalDefectPercentage(defects: DefectFinding[]): number {
  if (defects.length === 0) {
    return 0;
  }

  // For total defect percentage, we use a weighted average of all defect percentages
  // Each defect's contribution is proportional to its severity and category multiplier
  let totalWeight = 0;
  let weightedSum = 0;

  defects.forEach(defect => {
    const severityWeight = SEVERITY_WEIGHTS[defect.severity] || 1.0;
    const categoryMultiplier = CATEGORY_MULTIPLIERS[defect.category] || 1.0;
    const defectWeight = severityWeight * categoryMultiplier;

    weightedSum += defect.affected_percentage * defectWeight;
    totalWeight += defectWeight;
  });

  if (totalWeight === 0) {
    return 0;
  }

  // Cap at 100%
  return Math.min(100, (weightedSum / totalWeight));
}

/**
 * Check for auto-reject conditions
 *
 * @param defects Array of defects
 * @param temperature_f Temperature in Fahrenheit
 * @returns Object with triggered flag and reasons
 */
export function checkAutoReject(
  defects: DefectFinding[],
  temperature_f: number
): { triggered: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check each defect for auto-reject conditions
  defects.forEach(defect => {
    if (defect.defect_code === 'MOLD' && defect.affected_percentage > 0) {
      reasons.push('Mold detected at any percentage');
    }

    if (defect.defect_code === 'DECAY_ROT' && defect.affected_percentage > 15) {
      reasons.push('Decay/Rot exceeds 15% threshold');
    }

    if (defect.defect_code === 'FOREIGN_MATERIAL' && defect.affected_percentage > 0) {
      reasons.push('Foreign material detected');
    }

    if (defect.defect_code === 'PEST_PRESENCE' && defect.affected_percentage > 0) {
      reasons.push('Pest presence detected');
    }

    if (defect.defect_code === 'ODOR_OFF_SMELL' && defect.affected_percentage > 0) {
      reasons.push('Strong odor/off-smell detected');
    }

    if (defect.defect_code === 'SLIME' && defect.affected_percentage > 0) {
      reasons.push('Slime detected');
    }
  });

  // Check temperature: > 45°F (7.2°C) is auto-reject
  if (temperature_f > 45) {
    reasons.push(`Temperature abuse: ${temperature_f}°F exceeds safe storage limit of 45°F`);
  }

  return {
    triggered: reasons.length > 0,
    reasons,
  };
}

/**
 * Determine the grade based on defect percentage and auto-reject status
 *
 * @param totalDefectPct Total defect percentage (0-100)
 * @param autoRejectTriggered Whether an auto-reject condition was triggered
 * @returns Grade A, B, C, or D
 */
export function determineGrade(totalDefectPct: number, autoRejectTriggered: boolean): Grade {
  if (autoRejectTriggered) {
    return 'D';
  }

  if (totalDefectPct < GRADE_THRESHOLDS.A * 100) {
    return 'A';
  }

  if (totalDefectPct < GRADE_THRESHOLDS.B * 100) {
    return 'B';
  }

  if (totalDefectPct <= GRADE_THRESHOLDS.C * 100) {
    return 'C';
  }

  return 'D';
}

/**
 * Get the labor buffer percentage for a commodity
 *
 * @param commodity Commodity name
 * @returns Labor buffer percentage
 */
export function getLaborBufferPct(commodity: string): number {
  const config = COMMODITY_CONFIG[commodity as keyof typeof COMMODITY_CONFIG];
  return config ? config.labor_buffer_pct : 10; // Default fallback
}

/**
 * Calculate credit for damaged product
 *
 * @param input Credit calculation input
 * @returns Credit calculation breakdown
 */
export function calculateCredit(input: CreditInput): CreditCalculation {
  const baseDamagePct = input.base_damage_pct;
  const laborBufferPct = getLaborBufferPct(input.commodity);
  const yieldLossPct = 5; // Flat 5%

  const totalCreditPct = baseDamagePct + laborBufferPct + yieldLossPct;
  const creditAmountUsd = (totalCreditPct / 100) * input.total_weight_lbs * input.purchase_price_per_unit;

  return {
    base_damage_pct: baseDamagePct,
    labor_buffer_pct: laborBufferPct,
    yield_loss_pct: yieldLossPct,
    total_credit_pct: Math.min(100, totalCreditPct), // Cap at 100%
    credit_amount_usd: Math.round(creditAmountUsd * 100) / 100, // Round to cents
    affected_quantity: input.total_weight_lbs,
    unit_price: input.purchase_price_per_unit,
  };
}

/**
 * Calculate confidence score based on inspection quality
 *
 * @param defects Array of defects
 * @param sampleSize Sample size used in inspection
 * @param totalCases Total cases in shipment
 * @returns Confidence level and score (0-100)
 */
export function getConfidence(
  defects: DefectFinding[],
  sampleSize: number,
  totalCases: number
): { level: ConfidenceLevel; score: number } {
  let baseScore = 75; // Start at medium-high

  // Adjust based on sample size
  const sampleRatio = sampleSize / totalCases;
  if (sampleRatio >= 0.2) {
    baseScore += 15; // Large sample = high confidence
  } else if (sampleRatio >= 0.1) {
    baseScore += 5;
  } else if (sampleRatio < 0.05) {
    baseScore -= 15; // Tiny sample = low confidence
  }

  // Adjust based on defect clarity
  const hasMultipleCritical = defects.filter(d => d.severity === 'critical').length > 1;
  const hasManyMinor = defects.filter(d => d.severity === 'minor').length > 3;

  if (hasMultipleCritical) {
    baseScore -= 10; // Conflicting signals
  }

  if (hasManyMinor && !hasMultipleCritical) {
    baseScore -= 5; // Multiple minor defects = less clear
  }

  // Single dominant defect = high confidence
  if (defects.length === 1) {
    baseScore += 10;
  }

  // Clamp to 0-100
  baseScore = Math.max(0, Math.min(100, baseScore));

  let level: ConfidenceLevel;
  if (baseScore >= 90) {
    level = 'high';
  } else if (baseScore >= 70) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    level,
    score: Math.round(baseScore),
  };
}

/**
 * Generate a human-readable explanation of the grade
 *
 * @param input The inspection input
 * @param result The partial grade recommendation
 * @returns An explanation block
 */
export function generateExplanation(
  input: InspectionInput,
  result: Partial<GradeRecommendation>
): ExplanationBlock {
  const grade = result.grade || 'D';
  const totalDefectPct = result.total_defect_percentage || 0;
  const autoRejectTriggered = result.auto_reject_triggered || false;
  const autoRejectReasons = result.auto_reject_reasons || [];

  // Build defect breakdown
  const defectBreakdown: DefectBreakdownItem[] = input.defects.map(defect => {
    const score = calculateDefectScore(defect);
    const totalScore = calculateScore(input.defects);
    const percentContribution = totalScore > 0 ? (score / totalScore) * 100 : 0;

    return {
      defect_name: DEFECT_REGISTRY[defect.defect_code as keyof typeof DEFECT_REGISTRY]?.name || defect.defect_code,
      affected_pct: defect.affected_percentage,
      severity: defect.severity,
      category: defect.category,
      score,
      impact: `This defect contributed ${percentContribution.toFixed(1)}% to the overall score.`,
    };
  });

  // Generate summary
  let summary = '';
  if (autoRejectTriggered) {
    summary = `Lot ${input.lot_id} MUST BE REJECTED due to food safety critical defect(s). Grade D applies.`;
  } else {
    const defectDescriptor = totalDefectPct < 1 ? 'no significant defects' : `${totalDefectPct.toFixed(1)}% defects`;
    const gradeName = {
      A: 'Grade A - Ready to Pack',
      B: 'Grade B - Workable with Sorting',
      C: 'Grade C - Donation Quality',
      D: 'Grade D - Non-Saleable',
    }[grade];
    summary = `Lot ${input.lot_id} assessed at ${defectDescriptor}, resulting in ${gradeName}.`;
  }

  // Generate grade reason
  let gradeReason = '';
  if (autoRejectTriggered) {
    gradeReason = `Auto-reject triggered: ${autoRejectReasons.join('; ')}`;
  } else {
    const thresholds = [
      { threshold: 10, gradeLabel: 'A' },
      { threshold: 25, gradeLabel: 'B' },
      { threshold: 100, gradeLabel: 'C' },
    ];

    const applicableThreshold = thresholds.find(t => totalDefectPct < t.threshold);
    if (applicableThreshold) {
      gradeReason = `Total defect percentage of ${totalDefectPct.toFixed(1)}% falls below ${applicableThreshold.threshold}% threshold for Grade ${applicableThreshold.gradeLabel}.`;
    } else {
      gradeReason = `Total defect percentage exceeds all salvageable thresholds.`;
    }
  }

  // Generate disposition reason
  const dispositionMap: Record<Grade, { disposition: Disposition; reason: string }> = {
    A: {
      disposition: 'ACCEPT',
      reason: 'Product meets Grade A standards with minimal defects. Ship as-is.',
    },
    B: {
      disposition: 'ACCEPT_WITH_SORTING',
      reason: 'Product can be sorted/reworked to remove defects, then shipped.',
    },
    C: {
      disposition: 'DONATE',
      reason: 'Product is not saleable but safe for donation to food bank.',
    },
    D: {
      disposition: 'REJECT',
      reason: 'Product has critical food safety issues or excessive damage. Must be disposed of.',
    },
  };

  const dispositionInfo = dispositionMap[grade];

  // Generate credit explanation
  let creditExplanation: string | null = null;
  if (result.credit) {
    const credit = result.credit;
    creditExplanation = `Credit claim: ${credit.total_credit_pct.toFixed(1)}% of purchase price ` +
      `(base damage ${credit.base_damage_pct.toFixed(1)}% + labor buffer ${credit.labor_buffer_pct}% + yield loss 5%) = ` +
      `$${credit.credit_amount_usd.toFixed(2)} on ${credit.affected_quantity} lbs at $${credit.unit_price}/unit.`;
  }

  // Generate inspector guidance
  const inspectorGuidance: string[] = [];

  if (input.defects.length === 0) {
    inspectorGuidance.push('No defects detected. Proceed with packing.');
  } else {
    const criticalDefects = input.defects.filter(d => d.severity === 'critical');
    const majorDefects = input.defects.filter(d => d.severity === 'major');
    const minorDefects = input.defects.filter(d => d.severity === 'minor');

    if (criticalDefects.length > 0) {
      inspectorGuidance.push(
        `CRITICAL: Document and photograph all ${criticalDefects.length} critical defect(s) for safety records.`
      );
    }

    if (grade === 'B') {
      inspectorGuidance.push('Isolate affected product for sorting/rework.');
      inspectorGuidance.push('Schedule rework with Quality Control supervisor.');
    }

    if (grade === 'C') {
      inspectorGuidance.push('Prepare for donation. Contact food bank coordinator.');
      inspectorGuidance.push('Ensure proper documentation for donation tax purposes.');
    }

    if (grade === 'D') {
      inspectorGuidance.push('Isolate lot immediately. Do not ship.');
      inspectorGuidance.push('Arrange disposal following company environmental procedures.');
      inspectorGuidance.push('Document all auto-reject reasons in lot record.');
    }

    if (majorDefects.length > 0) {
      inspectorGuidance.push(
        `Review ${majorDefects.length} major defect(s) with vendor for root cause analysis.`
      );
    }
  }

  return {
    summary,
    grade_reason: gradeReason,
    disposition_reason: dispositionInfo.reason,
    defect_breakdown: defectBreakdown,
    credit_explanation: creditExplanation,
    inspector_guidance: inspectorGuidance,
  };
}

/**
 * Main evaluation function - orchestrates the entire decision engine
 *
 * @param input The inspection input data
 * @returns A comprehensive grade recommendation with all supporting data
 */
export function evaluateInspection(input: InspectionInput): GradeRecommendation {
  // Step 1: Check for auto-reject conditions
  const autoReject = checkAutoReject(input.defects, input.temperature_f);

  // Step 2: Calculate weighted score and defect percentage
  const weightedScore = calculateScore(input.defects);
  const totalDefectPercentage = calculateTotalDefectPercentage(input.defects);

  // Step 3: Determine grade
  const grade = determineGrade(totalDefectPercentage, autoReject.triggered);

  // Step 4: Map grade to disposition
  const dispositionMap: Record<Grade, Disposition> = {
    A: 'ACCEPT',
    B: 'ACCEPT_WITH_SORTING',
    C: 'DONATE',
    D: 'REJECT',
  };
  const disposition = dispositionMap[grade];

  // Step 5: Calculate credit if applicable (not for Grade A)
  let credit: CreditCalculation | null = null;
  if (grade !== 'A') {
    credit = calculateCredit({
      base_damage_pct: totalDefectPercentage,
      commodity: input.commodity,
      total_weight_lbs: input.total_weight_lbs,
      purchase_price_per_unit: input.purchase_price_per_unit,
    });
  }

  // Step 6: Calculate confidence
  const confidence = getConfidence(input.defects, input.sample_size, input.total_cases);

  // Step 7: Build flags/warnings
  const flags: string[] = [];

  if (input.temperature_f > 40) {
    flags.push(`Temperature is ${input.temperature_f}°F - approaching safety threshold of 45°F`);
  }

  if (input.sample_size < 5) {
    flags.push('Sample size is very small - consider increasing sample for higher confidence');
  }

  if (autoReject.triggered) {
    flags.push('AUTO-REJECT condition triggered');
  }

  const safetyCriticalDefects = input.defects.filter(d => d.food_safety_critical);
  if (safetyCriticalDefects.length > 0) {
    flags.push(`Contains ${safetyCriticalDefects.length} food safety critical defect(s)`);
  }

  // Step 8: Generate explanation
  const explanation = generateExplanation(input, {
    grade,
    total_defect_percentage: totalDefectPercentage,
    auto_reject_triggered: autoReject.triggered,
    auto_reject_reasons: autoReject.reasons,
  });

  return {
    grade,
    disposition,
    confidence: confidence.level,
    confidence_score: confidence.score,
    total_defect_percentage: totalDefectPercentage,
    weighted_score: weightedScore,
    credit,
    explanation,
    auto_reject_triggered: autoReject.triggered,
    auto_reject_reasons: autoReject.reasons,
    flags,
  };
}
