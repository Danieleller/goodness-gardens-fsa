'use client';

import React, { useState, useReducer } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Zap,
  Upload,
  Camera,
  CheckCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

// Constants
const LOCATIONS = [
  'Main Greenhouse',
  'North Facility',
  'South Facility',
  'East Wing',
  'West Wing',
  'Cooling Plant 1',
  'Cooling Plant 2',
  'Cooling Plant 3',
  'Packing Station A',
  'Packing Station B',
  'Warehouse 1',
  'Warehouse 2',
  'Distribution Center',
  'Retail Center 1',
  'Retail Center 2',
  'Testing Lab',
  'Secondary Processing',
];

const COMMODITIES = [
  'Basil',
  'Cilantro',
  'Parsley',
  'Dill',
  'Mint',
  'Oregano',
  'Thyme',
  'Sage',
  'Rosemary',
  'Chives',
  'Tarragon',
  'Marjoram',
  'Bay Leaf',
  'Coriander',
  'Fennel',
  'Lemongrass',
  'Arugula',
  'Microgreens',
  'Kale',
  'Spinach',
  'Lettuce Mix',
  'Watercress',
  'Endive',
];

const DEFECT_TYPES = [
  { id: 'wilting', name: 'Wilting/Decay', category: 'quality', severity: 'major' },
  { id: 'discolor', name: 'Discoloration', category: 'quality', severity: 'minor' },
  { id: 'pest', name: 'Pest Damage', category: 'safety', severity: 'critical' },
  { id: 'mold', name: 'Mold/Fungal Growth', category: 'safety', severity: 'critical' },
  { id: 'bruising', name: 'Bruising', category: 'quality', severity: 'minor' },
  { id: 'foreign', name: 'Foreign Material', category: 'safety', severity: 'critical' },
  { id: 'wronglabel', name: 'Wrong Label', category: 'compliance', severity: 'major' },
  { id: 'dehydration', name: 'Dehydration', category: 'quality', severity: 'minor' },
  { id: 'tempabuse', name: 'Temperature Abuse', category: 'safety', severity: 'major' },
  { id: 'contamination', name: 'Contamination', category: 'safety', severity: 'critical' },
  { id: 'underfill', name: 'Underfill/Weight', category: 'compliance', severity: 'major' },
  { id: 'overfill', name: 'Overfill', category: 'quality', severity: 'minor' },
  { id: 'packaging', name: 'Packaging Damage', category: 'cosmetic', severity: 'minor' },
  { id: 'odor', name: 'Off-Odor', category: 'quality', severity: 'major' },
  { id: 'texture', name: 'Abnormal Texture', category: 'quality', severity: 'minor' },
  { id: 'insects', name: 'Live Insects', category: 'safety', severity: 'critical' },
  { id: 'debris', name: 'Debris/Dirt', category: 'safety', severity: 'major' },
  { id: 'rootrot', name: 'Root Rot', category: 'quality', severity: 'major' },
  { id: 'yellowing', name: 'Yellowing', category: 'quality', severity: 'minor' },
  { id: 'spotting', name: 'Spotting/Lesions', category: 'quality', severity: 'minor' },
  { id: 'wrong', name: 'Wrong Product', category: 'compliance', severity: 'critical' },
];

const PRODUCT_LINES = ['Fresh Cut', 'Bulk', 'Pre-Packaged', 'Organic Specialty'];

interface DefectEntry {
  id: string;
  affectedPercent: number;
  notes: string;
}

interface FormState {
  // Step 1: Lot Info
  location: string;
  vendor: string;
  poNumber: string;
  commodity: string;
  productLine: string;
  cases: string;
  weight: string;
  purchasePrice: string;

  // Step 2: Temperature
  temperature: string;
  tempFlag: string;

  // Step 3: Visual Inspection
  defects: DefectEntry[];

  // Step 4: Photos
  photos: File[];

  // Step 5: Review
  notes: string;
}

interface FormAction {
  type: string;
  payload?: any;
}

const initialState: FormState = {
  location: '',
  vendor: '',
  poNumber: '',
  commodity: '',
  productLine: '',
  cases: '',
  weight: '',
  purchasePrice: '',
  temperature: '',
  tempFlag: 'ok',
  defects: DEFECT_TYPES.map((d) => ({ id: d.id, affectedPercent: 0, notes: '' })),
  photos: [],
  notes: '',
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_LOT_INFO':
      return { ...state, ...action.payload };
    case 'SET_TEMPERATURE':
      const temp = parseFloat(action.payload.temperature);
      let flag = 'ok';
      if (temp > 45) flag = 'reject';
      else if (temp > 41) flag = 'warning';
      return {
        ...state,
        temperature: action.payload.temperature,
        tempFlag: flag,
      };
    case 'SET_DEFECT':
      return {
        ...state,
        defects: state.defects.map((d) =>
          d.id === action.payload.id ? { ...d, ...action.payload.data } : d
        ),
      };
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };
    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((_, i) => i !== action.payload),
      };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    default:
      return state;
  }
}

// Decision Engine - calculates grade and disposition
function calculateDecision(state: FormState) {
  // Find defects with affected %
  const flaggedDefects = state.defects.filter((d) => d.affectedPercent > 0);

  // Calculate severity score
  let severityScore = 0;
  let hasReject = false;
  let hasMajor = false;
  let hasMinor = false;

  flaggedDefects.forEach((defect) => {
    const defectType = DEFECT_TYPES.find((d) => d.id === defect.id);
    if (!defectType) return;

    const baseScore = defect.affectedPercent;

    if (defectType.severity === 'critical') {
      severityScore += baseScore * 3;
      hasReject = true;
    } else if (defectType.severity === 'major') {
      severityScore += baseScore * 2;
      hasMajor = true;
    } else {
      severityScore += baseScore * 1;
      hasMinor = true;
    }
  });

  // Temperature check
  const tempVal = parseFloat(state.temperature);
  if (tempVal > 45) {
    hasReject = true;
  } else if (tempVal > 41) {
    hasMajor = true;
  }

  // Determine grade
  let grade = 'A';
  let disposition = 'ACCEPT';
  let confidence = 95;

  if (hasReject) {
    grade = 'D';
    disposition = 'REJECT';
    confidence = 98;
  } else if (severityScore > 50) {
    grade = 'D';
    disposition = 'REJECT';
    confidence = 92;
  } else if (severityScore > 30) {
    grade = 'C';
    disposition = 'ACCEPT_WITH_CLAIM';
    confidence = 88;
  } else if (severityScore > 10 || hasMajor) {
    grade = 'B';
    disposition = 'ACCEPT_WITH_MINOR_CLAIM';
    confidence = 85;
  }

  // Calculate credit if applicable
  let credit = 0;
  if (disposition.includes('CLAIM')) {
    const baseDamage = severityScore * 2;
    const laborBuffer = 50;
    const yieldLoss = (severityScore / 100) * (parseFloat(state.purchasePrice) || 0);
    credit = Math.round(baseDamage + laborBuffer + yieldLoss);
  }

  return {
    grade,
    disposition,
    confidence,
    credit,
    flaggedDefectCount: flaggedDefects.length,
    severityScore: Math.round(severityScore),
  };
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'safety':
      return 'bg-red-100 text-red-800';
    case 'compliance':
      return 'bg-orange-100 text-orange-800';
    case 'quality':
      return 'bg-yellow-100 text-yellow-800';
    case 'cosmetic':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getGradeColor = (grade: string) => {
  switch (grade) {
    case 'A':
      return 'bg-green-500';
    case 'B':
      return 'bg-blue-500';
    case 'C':
      return 'bg-yellow-500';
    case 'D':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
};

export function ReceivingInspectionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, dispatch] = useReducer(formReducer, initialState);
  const decision = calculateDecision(formState);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!(
          formState.location &&
          formState.vendor &&
          formState.poNumber &&
          formState.commodity &&
          formState.cases &&
          formState.weight
        );
      case 2:
        return !!formState.temperature;
      case 3:
        return formState.defects.some((d) => d.affectedPercent > 0) || true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Receiving Inspection</h1>
        <p className="text-gray-600">Complete multi-step quality inspection for incoming shipments</p>
      </div>

      {/* Stepper */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          {[
            { num: 1, name: 'Lot Info' },
            { num: 2, name: 'Temperature' },
            { num: 3, name: 'Visual Inspection' },
            { num: 4, name: 'Photos' },
            { num: 5, name: 'Review & Submit' },
          ].map((step, idx, arr) => (
            <React.Fragment key={step.num}>
              <div
                className={`flex flex-col items-center cursor-pointer transition ${
                  currentStep === step.num ? 'opacity-100' : 'opacity-60 hover:opacity-80'
                }`}
                onClick={() => idx < currentStep && setCurrentStep(step.num)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white transition ${
                    currentStep >= step.num
                      ? 'bg-blue-600'
                      : 'bg-gray-300'
                  }`}
                >
                  {step.num}
                </div>
                <span className="text-sm font-medium text-gray-700 mt-2">{step.name}</span>
              </div>
              {idx < arr.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 transition ${
                    currentStep > step.num ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow p-8">
        {/* Step 1: Lot Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Lot Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location *
                </label>
                <select
                  value={formState.location}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { location: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Location</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vendor *
                </label>
                <input
                  type="text"
                  value={formState.vendor}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { vendor: e.target.value },
                    })
                  }
                  placeholder="Enter vendor name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PO Number *
                </label>
                <input
                  type="text"
                  value={formState.poNumber}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { poNumber: e.target.value },
                    })
                  }
                  placeholder="e.g., PO-2024-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Commodity *
                </label>
                <select
                  value={formState.commodity}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { commodity: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Commodity</option>
                  {COMMODITIES.map((comm) => (
                    <option key={comm} value={comm}>
                      {comm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product Line
                </label>
                <select
                  value={formState.productLine}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { productLine: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Product Line</option>
                  {PRODUCT_LINES.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cases *
                </label>
                <input
                  type="number"
                  value={formState.cases}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { cases: e.target.value },
                    })
                  }
                  placeholder="Number of cases"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weight (lbs) *
                </label>
                <input
                  type="number"
                  value={formState.weight}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { weight: e.target.value },
                    })
                  }
                  placeholder="Total weight"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Purchase Price ($)
                </label>
                <input
                  type="number"
                  value={formState.purchasePrice}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOT_INFO',
                      payload: { purchasePrice: e.target.value },
                    })
                  }
                  placeholder="Price per unit"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Temperature */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Temperature Reading</h2>
            <div className="max-w-md">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Temperature (°F) *
              </label>
              <input
                type="number"
                value={formState.temperature}
                onChange={(e) =>
                  dispatch({ type: 'SET_TEMPERATURE', payload: { temperature: e.target.value } })
                }
                placeholder="e.g., 38"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {formState.temperature && (
              <div
                className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                  formState.tempFlag === 'ok'
                    ? 'bg-green-100 border border-green-300'
                    : formState.tempFlag === 'warning'
                      ? 'bg-yellow-100 border border-yellow-300'
                      : 'bg-red-100 border border-red-300'
                }`}
              >
                {formState.tempFlag === 'reject' ? (
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                ) : formState.tempFlag === 'warning' ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  {formState.tempFlag === 'reject' && (
                    <p className="font-semibold text-red-800">Temperature Too High - Reject</p>
                  )}
                  {formState.tempFlag === 'warning' && (
                    <p className="font-semibold text-yellow-800">Temperature Warning</p>
                  )}
                  {formState.tempFlag === 'ok' && (
                    <p className="font-semibold text-green-800">Temperature OK</p>
                  )}
                  <p className="text-sm mt-1">
                    {formState.tempFlag === 'reject' &&
                      'Temperature exceeds 45°F. Product must be rejected for safety.'}
                    {formState.tempFlag === 'warning' &&
                      'Temperature between 41°F and 45°F. Review for potential issues.'}
                    {formState.tempFlag === 'ok' && 'Temperature is within acceptable range.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Visual Inspection */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Visual Inspection</h2>
            <p className="text-gray-600">Check defects found during inspection. Set percentage affected.</p>

            <div className="space-y-4">
              {DEFECT_TYPES.map((defect) => {
                const entry = formState.defects.find((d) => d.id === defect.id);
                if (!entry) return null;

                return (
                  <div key={defect.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={entry.affectedPercent > 0}
                            onChange={(e) => {
                              dispatch({
                                type: 'SET_DEFECT',
                                payload: {
                                  id: defect.id,
                                  data: {
                                    affectedPercent: e.target.checked ? 1 : 0,
                                  },
                                },
                              });
                            }}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                          <label className="font-semibold text-gray-900">{defect.name}</label>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(defect.category)}`}>
                            {defect.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {entry.affectedPercent > 0 && (
                      <div className="ml-7 space-y-3 pt-2 border-t border-gray-200">
                        <div>
                          <div className="flex justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">
                              Affected Percentage
                            </label>
                            <span className="text-sm font-semibold text-gray-900">
                              {entry.affectedPercent}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={entry.affectedPercent}
                            onChange={(e) => {
                              dispatch({
                                type: 'SET_DEFECT',
                                payload: {
                                  id: defect.id,
                                  data: { affectedPercent: parseInt(e.target.value) },
                                },
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-2">
                            Notes
                          </label>
                          <textarea
                            value={entry.notes}
                            onChange={(e) => {
                              dispatch({
                                type: 'SET_DEFECT',
                                payload: {
                                  id: defect.id,
                                  data: { notes: e.target.value },
                                },
                              });
                            }}
                            placeholder="Additional details about this defect..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: Photos */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Photos</h2>
            <p className="text-gray-600">Upload photos documenting inspection findings</p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 mb-1">Upload Photos</p>
              <p className="text-sm text-gray-600 mb-4">Drag and drop images or click to browse</p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Upload className="w-4 h-4" />
                Select Photos
              </button>
            </div>

            {formState.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {formState.photos.map((photo, idx) => (
                  <div key={idx} className="relative bg-gray-100 rounded-lg aspect-square flex items-center justify-center">
                    <div className="text-gray-600 text-sm text-center p-2">
                      <p className="font-medium">{photo.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(photo.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        dispatch({ type: 'REMOVE_PHOTO', payload: idx })
                      }
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Review & Submit</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Summary */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Inspection Summary</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{formState.location}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor:</span>
                      <span className="font-medium">{formState.vendor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Commodity:</span>
                      <span className="font-medium">{formState.commodity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cases:</span>
                      <span className="font-medium">{formState.cases}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-medium">{formState.weight} lbs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Temperature:</span>
                      <span className="font-medium">{formState.temperature}°F</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Defects Found</h3>
                  {formState.defects.filter((d) => d.affectedPercent > 0).length === 0 ? (
                    <p className="text-sm text-gray-600">No defects detected</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {formState.defects
                        .filter((d) => d.affectedPercent > 0)
                        .map((defect) => {
                          const defectType = DEFECT_TYPES.find((d) => d.id === defect.id);
                          return (
                            <li key={defect.id} className="flex justify-between">
                              <span>{defectType?.name}</span>
                              <span className="font-medium">{defect.affectedPercent}%</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Right: Decision Engine */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">Decision Engine</h3>
                </div>

                {/* Grade Badge */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Overall Grade</p>
                  <div
                    className={`${getGradeColor(decision.grade)} text-white rounded-full w-24 h-24 flex items-center justify-center mx-auto text-5xl font-bold`}
                  >
                    {decision.grade}
                  </div>
                </div>

                {/* Disposition */}
                <div className="bg-white rounded-lg p-4 space-y-2">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Disposition</p>
                  <p className="font-semibold text-gray-900">
                    {decision.disposition === 'ACCEPT' && 'ACCEPT'}
                    {decision.disposition === 'ACCEPT_WITH_MINOR_CLAIM' && 'ACCEPT WITH MINOR CLAIM'}
                    {decision.disposition === 'ACCEPT_WITH_CLAIM' && 'ACCEPT WITH CLAIM'}
                    {decision.disposition === 'REJECT' && 'REJECT'}
                  </p>
                </div>

                {/* Confidence */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Confidence</p>
                    <p className="font-semibold text-gray-900">{decision.confidence}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${decision.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Credit Calculation */}
                {decision.credit > 0 && (
                  <div className="bg-white rounded-lg p-4 space-y-2 border border-yellow-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Credit Calculation</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Damage:</span>
                        <span className="font-medium">${Math.round(decision.severityScore * 2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor Buffer:</span>
                        <span className="font-medium">$50</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                        <span className="font-semibold">Total Credit:</span>
                        <span className="font-bold text-lg">${decision.credit}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div className="bg-white rounded-lg p-4">
                  <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Analysis</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {decision.grade === 'A' &&
                      'Product meets all quality standards. No defects detected. Recommended for acceptance.'}
                    {decision.grade === 'B' &&
                      `${decision.flaggedDefectCount} minor defect(s) found. Product is acceptable with potential minor adjustment or credit.`}
                    {decision.grade === 'C' &&
                      `${decision.flaggedDefectCount} moderate defect(s) detected. Recommend acceptance with claim or vendor negotiation.`}
                    {decision.grade === 'D' &&
                      `Critical issues found. Product does not meet quality standards and should be rejected.`}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Accept
                  </button>
                  <button className="flex-1 px-4 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition">
                    Override
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <span className="text-sm text-gray-600">
            Step {currentStep} of 5
          </span>

          <button
            onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
