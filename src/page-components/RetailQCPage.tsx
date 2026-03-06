'use client';

import React, { useState } from 'react';
import { Save, Plus, Trash2, TrendingUp } from 'lucide-react';

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

const PRODUCTION_LINES = [
  'Line 1',
  'Line 2',
  'Line 3',
  'Line 4',
  'Line 5',
  'Line 6',
  'Line 7',
  'Line 8',
  'Line 9',
  'Line 10',
  'Line 11',
  'Line 12',
  'Greenhouse',
  'T2',
  'T3',
];

const PRODUCTS = [
  'Mixed Greens',
  'Spinach',
  'Arugula',
  'Kale',
  'Lettuce Mix',
  'Herb Blend',
  'Basil Mix',
  'Microgreens Assortment',
  'Spring Mix',
  'Baby Greens',
];

const PRODUCT_TYPES = ['ORGANIC', 'CONVENTIONAL'];

interface Sample {
  id: string;
  number: number;
  weight: number;
  labelCheck: boolean;
  lotCodeCheck: boolean;
  visualCheck: boolean;
  placementCheck: boolean;
}

const getStatistics = (samples: Sample[]) => {
  if (samples.length === 0) {
    return { mean: 0, min: 0, max: 0, stdDev: 0 };
  }

  const weights = samples.map((s) => s.weight);
  const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
  const min = Math.min(...weights);
  const max = Math.max(...weights);

  const variance =
    weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
  const stdDev = Math.sqrt(variance);

  return { mean: mean.toFixed(2), min, max, stdDev: stdDev.toFixed(2) };
};

const getPassRate = (samples: Sample[]) => {
  if (samples.length === 0) return 0;
  const passing = samples.filter(
    (s) => s.labelCheck && s.lotCodeCheck && s.visualCheck && s.placementCheck
  ).length;
  return Math.round((passing / samples.length) * 100);
};

const getGrade = (passRate: number) => {
  if (passRate >= 95) return { grade: 'A', color: 'bg-green-500' };
  if (passRate >= 90) return { grade: 'B', color: 'bg-blue-500' };
  if (passRate >= 85) return { grade: 'C', color: 'bg-yellow-500' };
  return { grade: 'D', color: 'bg-red-500' };
};

export function RetailQCPage() {
  const [location, setLocation] = useState('');
  const [productionLine, setProductionLine] = useState('');
  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState('');
  const [productType, setProductType] = useState('ORGANIC');
  const [samples, setSamples] = useState<Sample[]>([
    {
      id: '1',
      number: 1,
      weight: 0,
      labelCheck: false,
      lotCodeCheck: false,
      visualCheck: false,
      placementCheck: false,
    },
  ]);

  const stats = getStatistics(samples);
  const passRate = getPassRate(samples);
  const { grade, color } = getGrade(passRate);

  const addSample = () => {
    const newId = Math.max(...samples.map((s) => parseInt(s.id)), 0) + 1;
    setSamples([
      ...samples,
      {
        id: newId.toString(),
        number: samples.length + 1,
        weight: 0,
        labelCheck: false,
        lotCodeCheck: false,
        visualCheck: false,
        placementCheck: false,
      },
    ]);
  };

  const removeSample = (id: string) => {
    if (samples.length > 1) {
      setSamples(samples.filter((s) => s.id !== id));
    }
  };

  const updateSample = (id: string, field: string, value: any) => {
    setSamples(
      samples.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Retail/Production QC</h1>
        <p className="text-gray-600">Quality inspection for production batches and retail packaging</p>
      </div>

      {/* Form Container */}
      <div className="bg-white rounded-lg shadow p-8 space-y-8">
        {/* Batch Information */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Batch Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Location *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
                Production Line *
              </label>
              <select
                value={productionLine}
                onChange={(e) => setProductionLine(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Line</option>
                {PRODUCTION_LINES.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Customer
              </label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product *
              </label>
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Product</option>
                {PRODUCTS.map((prod) => (
                  <option key={prod} value={prod}>
                    {prod}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Type
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRODUCT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AQL Sample Table */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">AQL Sample Analysis</h2>
            <button
              onClick={addSample}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              Add Sample
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sample #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Weight (g)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Label Check
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lot Code Check
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Visual Check
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Placement Check
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {samples.map((sample) => (
                  <tr key={sample.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-900">Sample {sample.number}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={sample.weight}
                        onChange={(e) =>
                          updateSample(sample.id, 'weight', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={sample.labelCheck}
                        onChange={(e) =>
                          updateSample(sample.id, 'labelCheck', e.target.checked)
                        }
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={sample.lotCodeCheck}
                        onChange={(e) =>
                          updateSample(sample.id, 'lotCodeCheck', e.target.checked)
                        }
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={sample.visualCheck}
                        onChange={(e) =>
                          updateSample(sample.id, 'visualCheck', e.target.checked)
                        }
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={sample.placementCheck}
                        onChange={(e) =>
                          updateSample(sample.id, 'placementCheck', e.target.checked)
                        }
                        className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => removeSample(sample.id)}
                        disabled={samples.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-300 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics and Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weight Statistics */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 space-y-4 border border-blue-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Weight Statistics
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between bg-white rounded px-3 py-2">
                <span className="text-gray-600">Mean Weight:</span>
                <span className="font-semibold text-gray-900">{stats.mean}g</span>
              </div>
              <div className="flex justify-between bg-white rounded px-3 py-2">
                <span className="text-gray-600">Min Weight:</span>
                <span className="font-semibold text-gray-900">{stats.min}g</span>
              </div>
              <div className="flex justify-between bg-white rounded px-3 py-2">
                <span className="text-gray-600">Max Weight:</span>
                <span className="font-semibold text-gray-900">{stats.max}g</span>
              </div>
              <div className="flex justify-between bg-white rounded px-3 py-2">
                <span className="text-gray-600">Std Dev:</span>
                <span className="font-semibold text-gray-900">±{stats.stdDev}g</span>
              </div>
            </div>
          </div>

          {/* Pass Rate and Grade */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-6 space-y-4 border border-emerald-200">
            <h3 className="font-semibold text-gray-900">Quality Grade</h3>
            <div className="space-y-4">
              {/* Pass Rate Bar */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Pass Rate</span>
                  <span className="text-lg font-bold text-gray-900">{passRate}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      passRate >= 95
                        ? 'bg-green-500'
                        : passRate >= 90
                          ? 'bg-blue-500'
                          : passRate >= 85
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                    style={{ width: `${passRate}%` }}
                  />
                </div>
              </div>

              {/* Grade Badge */}
              <div className="flex items-center justify-center gap-4">
                <span className="text-gray-600 font-medium">Batch Grade:</span>
                <div
                  className={`${color} text-white rounded-full w-16 h-16 flex items-center justify-center text-3xl font-bold`}
                >
                  {grade}
                </div>
              </div>

              {/* Interpretation */}
              <p className="text-xs text-gray-600 italic bg-white rounded px-3 py-2">
                {grade === 'A' && 'Excellent quality. All samples passed.'}
                {grade === 'B' && 'Good quality. Minor issues detected.'}
                {grade === 'C' && 'Acceptable quality. Some issues found.'}
                {grade === 'D' && 'Quality concerns. Requires review.'}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition">
            Cancel
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition">
            <Save className="w-4 h-4" />
            Submit Batch
          </button>
        </div>
      </div>
    </div>
  );
}
