import { useState, useEffect } from 'react';
import { Building2, MapPin, Leaf, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { facilitiesAPI } from '@/api';

interface Facility {
  id: string;
  internal_id: number | null;
  code: string;
  name: string;
  location: string;
  facility_type: string;
  organic_scope: string | null;
  m1_fsms: boolean;
  m2_haccp: boolean;
  m3_prev_controls: boolean;
  m4_growing: boolean;
  m5_harvest: boolean;
  m6_processing: boolean;
  m7_cold_storage: boolean;
  m8_transport: boolean;
  m9_packaging: boolean;
}

interface Module {
  module_code: string;
  module_name: string;
  is_applicable: boolean;
}

interface FacilityDetail {
  facility: Facility;
  modules: Module[];
}

const MODULE_INFO = [
  { code: 'M1', name: 'FSMS', fullName: 'Food Safety Management System' },
  { code: 'M2', name: 'HACCP', fullName: 'Hazard Analysis & Critical Control Points' },
  { code: 'M3', name: 'Preventive Controls', fullName: 'Preventive Controls' },
  { code: 'M4', name: 'Growing Operations', fullName: 'Growing Operations' },
  { code: 'M5', name: 'Harvest', fullName: 'Harvest' },
  { code: 'M6', name: 'Processing', fullName: 'Processing' },
  { code: 'M7', name: 'Cold Storage', fullName: 'Cold Storage' },
  { code: 'M8', name: 'Transport', fullName: 'Transport' },
  { code: 'M9', name: 'Packaging', fullName: 'Packaging' },
];

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Loading facilities...</p>
      </div>
    </div>
  );
}

function FacilityCard({ facility, onClick }: { facility: Facility; onClick: () => void }) {
  const moduleCount = [
    facility.m1_fsms,
    facility.m2_haccp,
    facility.m3_prev_controls,
    facility.m4_growing,
    facility.m5_harvest,
    facility.m6_processing,
    facility.m7_cold_storage,
    facility.m8_transport,
    facility.m9_packaging,
  ].filter(Boolean).length;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg hover:border-green-500 border-2 border-transparent transition-all p-6 text-left w-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{facility.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-mono">{facility.code}</span>
            {facility.internal_id && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">ID: {facility.internal_id}</span>
            )}
          </div>
        </div>
        <Building2 className="w-5 h-5 text-green-600 flex-shrink-0" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{facility.location}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
            {facility.facility_type}
          </span>
          {facility.organic_scope && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
              <Leaf className="w-3 h-3" />
              Organic
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {moduleCount} of 9 modules applicable
          </span>
          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
              style={{ width: `${(moduleCount / 9) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </button>
  );
}

function ModuleGrid({ facility }: { facility: Facility }) {
  const moduleApplicability = {
    m1_fsms: facility.m1_fsms,
    m2_haccp: facility.m2_haccp,
    m3_prev_controls: facility.m3_prev_controls,
    m4_growing: facility.m4_growing,
    m5_harvest: facility.m5_harvest,
    m6_processing: facility.m6_processing,
    m7_cold_storage: facility.m7_cold_storage,
    m8_transport: facility.m8_transport,
    m9_packaging: facility.m9_packaging,
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {MODULE_INFO.map((module, index) => {
        const key = `m${index + 1}_${Object.keys(moduleApplicability)[index].split('_').slice(1).join('_')}` as keyof typeof moduleApplicability;
        const isApplicable = moduleApplicability[key];

        return (
          <div
            key={module.code}
            className={`flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              isApplicable
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            {isApplicable ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-gray-400" />
            )}
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">{module.code}</p>
              <p className="text-xs text-gray-600 mt-1">{module.name}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FacilityDetailView({
  facility,
  onBack,
}: {
  facility: Facility;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facilities
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{facility.name}</h1>
                <span className="text-sm font-mono bg-gray-100 text-gray-700 px-3 py-1 rounded">
                  {facility.code}
                </span>
                {facility.internal_id && (
                  <span className="text-sm font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded">
                    Internal ID: {facility.internal_id}
                  </span>
                )}
              </div>
              <p className="text-gray-600 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {facility.location}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-green-600 flex-shrink-0" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Facility Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {facility.internal_id && (
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Internal ID</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">{facility.internal_id}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Facility Type</p>
              <p className="text-lg font-semibold text-gray-900 inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {facility.facility_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">Organic Scope</p>
              {facility.organic_scope ? (
                <p className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                  <Leaf className="w-4 h-4 text-green-600" />
                  {facility.organic_scope}
                </p>
              ) : (
                <p className="text-lg text-gray-500">Not applicable</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Module Applicability</h2>
          <ModuleGrid facility={facility} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Module Descriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULE_INFO.map((module) => (
              <div key={module.code} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-semibold text-gray-900">
                  {module.code}: {module.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{module.fullName}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setLoading(true);
        const response = await facilitiesAPI.getAll();
        setFacilities(response.data.facilities);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load facilities'
        );
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <p className="text-red-600 font-semibold mb-2">Error Loading Facilities</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  if (selectedFacility) {
    return (
      <FacilityDetailView
        facility={selectedFacility}
        onBack={() => setSelectedFacilityId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Facilities</h1>
          </div>
          <p className="text-gray-600">
            Manage {facilities.length} locations across your food safety network
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {facilities.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No facilities found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.id}
                facility={facility}
                onClick={() => setSelectedFacilityId(facility.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
