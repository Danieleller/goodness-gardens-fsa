import { useEffect, useState } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  Activity,
  FileCheck,
  ClipboardCheck,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { complianceAPI, facilitiesAPI } from '@/api';

interface Facility {
  id: string;
  name: string;
  code: string;
}

interface ModuleScore {
  module_code: string;
  module_name: string;
  score: number;
  status: string;
  requirements_met: number;
  requirements_total: number;
}

interface ComplianceScoreData {
  overall_score: number;
  overall_grade: string;
  module_scores: ModuleScore[];
  sop_readiness_pct: number;
  checklist_submissions_pct: number;
  audit_coverage_pct: number;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
}

interface Standard {
  standard_code: string;
  standard_name: string;
  total: number;
  satisfied: number;
  pct: number;
}

interface MatrixModule {
  module_code: string;
  module_name: string;
  standards: Standard[];
}

interface ComplianceMatrixData {
  matrix: MatrixModule[];
}

interface Requirement {
  requirement_code: string;
  requirement_text: string;
  criticality: string;
  evidence_links: Array<{
    evidence_type: string;
    evidence_code: string;
    evidence_title: string;
    is_satisfied: boolean;
  }>;
}

interface RequirementsData {
  requirements: Requirement[];
}

interface Assessment {
  id: string;
  assessment_date: string;
  overall_score: number;
  overall_grade: string;
}

interface HistoryData {
  assessments: Assessment[];
}

export function ComplianceDashboardPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [scoreData, setScoreData] = useState<ComplianceScoreData | null>(null);
  const [matrixData, setMatrixData] = useState<ComplianceMatrixData | null>(null);
  const [requirementsMap, setRequirementsMap] = useState<Record<string, Requirement[]>>({});
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAssessment, setRunningAssessment] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Load facilities
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const res = await facilitiesAPI.getAll();
        setFacilities(res.data.facilities);
        if (res.data.facilities.length > 0) {
          setSelectedFacilityId(res.data.facilities[0].id);
        }
      } catch (error) {
        console.error('Error loading facilities:', error);
      }
    };
    loadFacilities();
  }, []);

  // Load compliance data when facility changes
  useEffect(() => {
    if (!selectedFacilityId) return;

    const loadComplianceData = async () => {
      setLoading(true);
      try {
        const [scoreRes, matrixRes] = await Promise.all([
          complianceAPI.getScore(selectedFacilityId),
          complianceAPI.getMatrix(selectedFacilityId),
        ]);

        setScoreData(scoreRes.data || null);
        setMatrixData(matrixRes.data?.matrix ? matrixRes.data : { matrix: [] });
        setRequirementsMap({});
        setExpandedModule(null);
      } catch (error) {
        console.error('Error loading compliance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadComplianceData();
  }, [selectedFacilityId]);

  const handleModuleClick = async (moduleCode: string) => {
    if (expandedModule === moduleCode) {
      setExpandedModule(null);
      return;
    }

    if (!requirementsMap[moduleCode] && selectedFacilityId) {
      try {
        const res = await complianceAPI.getRequirements(moduleCode, selectedFacilityId);
        setRequirementsMap((prev) => ({
          ...prev,
          [moduleCode]: res.data.requirements,
        }));
      } catch (error) {
        console.error('Error loading requirements:', error);
      }
    }

    setExpandedModule(moduleCode);
  };

  const handleRunAssessment = async () => {
    if (!selectedFacilityId) return;

    setRunningAssessment(true);
    try {
      const res = await complianceAPI.getScore(selectedFacilityId, { save_assessment: true });
      setScoreData(res.data);
      setToastMessage('Assessment completed successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error('Error running assessment:', error);
      setToastMessage('Error running assessment');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setRunningAssessment(false);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'bg-green-600 text-white';
    if (grade === 'B') return 'bg-blue-600 text-white';
    if (grade === 'C') return 'bg-yellow-500 text-white';
    if (grade === 'D') return 'bg-orange-500 text-white';
    return 'bg-red-600 text-white';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-400 to-green-600';
    if (score >= 60) return 'from-yellow-400 to-yellow-600';
    return 'from-red-400 to-red-600';
  };

  const getCriticalityColor = (criticality: string) => {
    if (criticality === 'critical') return 'bg-red-100 text-red-800';
    if (criticality === 'major') return 'bg-orange-100 text-orange-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-green-700" />
              <h1 className="text-2xl sm:text-3xl font-bold text-green-900">Compliance Dashboard</h1>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleRunAssessment}
                disabled={!selectedFacilityId || runningAssessment}
                className="px-3 py-2 text-sm sm:px-4 sm:text-base bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {runningAssessment ? 'Running...' : 'Run Assessment'}
              </button>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="appearance-none w-full px-3 py-2 pr-10 text-sm sm:px-4 sm:text-base bg-white border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                >
                  <option value="">Select a location</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        )}

        {!loading && !selectedFacilityId && (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">Select a location to view compliance scores</p>
          </div>
        )}

        {!loading && selectedFacilityId && scoreData && (
          <>
            {/* Overall Score Section */}
            <div className="mb-8 bg-white rounded-xl shadow-md p-8 border border-green-100">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Circular Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke="url(#scoreGradient)"
                        strokeWidth="12"
                        strokeDasharray={`${(scoreData.overall_score / 100) * 565} 565`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient
                          id="scoreGradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="100%" stopColor="#15803d" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-gray-800">
                        {Math.round(scoreData.overall_score)}%
                      </div>
                      <div className={`mt-2 px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(scoreData.overall_grade)}`}>
                        {scoreData.overall_grade}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mini stat cards */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <FileCheck className="w-5 h-5 text-green-700" />
                      <span className="text-sm font-medium text-gray-700">SOP Readiness</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900">
                      {scoreData.sop_readiness_pct}%
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <ClipboardCheck className="w-5 h-5 text-blue-700" />
                      <span className="text-sm font-medium text-gray-700">Checklist Completion</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">
                      {scoreData.checklist_submissions_pct}%
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Activity className="w-5 h-5 text-purple-700" />
                      <span className="text-sm font-medium text-gray-700">Audit Coverage</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900">
                      {scoreData.audit_coverage_pct}%
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                      <div className="text-2xl font-bold text-red-600">{scoreData.critical_findings}</div>
                      <div className="text-xs text-red-700 font-medium">Critical</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                      <div className="text-2xl font-bold text-orange-600">{scoreData.major_findings}</div>
                      <div className="text-xs text-orange-700 font-medium">Major</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-center">
                      <div className="text-2xl font-bold text-yellow-600">{scoreData.minor_findings}</div>
                      <div className="text-xs text-yellow-700 font-medium">Minor</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Module Grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Module Scores</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(scoreData.module_scores || []).map((module) => (
                  <div key={module.module_code}>
                    <div
                      onClick={() => handleModuleClick(module.module_code)}
                      className="bg-white rounded-lg shadow-md p-4 border border-green-100 hover:shadow-lg hover:border-green-300 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="inline-block bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded mb-2">
                            {module.module_code}
                          </div>
                          <h3 className="font-semibold text-gray-800">{module.module_name}</h3>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 text-gray-400 transition-transform ${expandedModule === module.module_code ? 'rotate-90' : ''}`}
                        />
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Score</span>
                          <span className="text-sm font-bold text-gray-800">{module.score}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full bg-gradient-to-r ${getScoreColor(module.score)}`}
                            style={{ width: `${module.score}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Status and Requirements */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`inline-block px-2 py-1 rounded text-xs font-bold ${module.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                        >
                          {module.status}
                        </div>
                        <span className="text-xs text-gray-600">
                          {module.requirements_met}/{module.requirements_total} requirements
                        </span>
                      </div>
                    </div>

                    {/* Drill-down Panel */}
                    {expandedModule === module.module_code && requirementsMap[module.module_code] && (
                      <div className="mt-2 bg-white rounded-lg shadow-md border border-green-100 p-4 md:col-span-2 lg:col-span-3">
                        <h4 className="font-semibold text-gray-800 mb-4">Requirements</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Code</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Requirement</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Criticality</th>
                                <th className="text-left py-2 px-3 font-semibold text-gray-700">Evidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {requirementsMap[module.module_code].map((req) => (
                                <tr key={req.requirement_code} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-2 px-3 font-mono text-xs text-gray-600">
                                    {req.requirement_code}
                                  </td>
                                  <td className="py-2 px-3 text-gray-700">{req.requirement_text}</td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${getCriticalityColor(req.criticality)}`}
                                    >
                                      {req.criticality}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <div className="flex gap-2">
                                      {req.evidence_links.map((evidence, idx) => (
                                        <div
                                          key={idx}
                                          title={`${evidence.evidence_title} (${evidence.evidence_type})`}
                                          className="cursor-help"
                                        >
                                          {evidence.is_satisfied ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                          ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Matrix */}
            {matrixData && matrixData.matrix && matrixData.matrix.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-green-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Compliance Matrix</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold text-gray-800 bg-gray-50">Module</th>
                        {matrixData.matrix[0]?.standards.map((standard) => (
                          <th
                            key={standard.standard_code}
                            className="text-center py-3 px-3 font-semibold text-gray-700 bg-gray-50 text-xs"
                          >
                            {standard.standard_code}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.matrix.map((module) => (
                        <tr key={module.module_code} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-3 px-4 font-semibold text-gray-800 bg-gray-50">
                            {module.module_code}
                          </td>
                          {module.standards.map((standard) => {
                            let bgColor = 'bg-white';
                            if (standard.pct >= 80) bgColor = 'bg-green-100';
                            else if (standard.pct >= 60) bgColor = 'bg-yellow-100';
                            else bgColor = 'bg-red-100';

                            return (
                              <td
                                key={standard.standard_code}
                                className={`text-center py-3 px-3 font-medium text-gray-800 ${bgColor}`}
                              >
                                {standard.satisfied}/{standard.total}
                                <div className="text-xs text-gray-600">{standard.pct}%</div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
