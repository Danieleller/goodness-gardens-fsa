import { useEffect, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  FileText,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
} from 'lucide-react';
import { reportingAPI, facilitiesAPI } from '@/api';

interface Facility {
  id: string;
  name: string;
  code: string;
}

interface RuleResult {
  rule_id: number;
  rule_code: string;
  rule_name: string;
  rule_type: string;
  severity: string;
  module_code: string | null;
  status: string;
  details: any;
}

interface RulesSummary {
  passed: number;
  failed: number;
  warnings: number;
  total: number;
}

interface RulesData {
  results: RuleResult[];
  summary: RulesSummary;
  risk_level: string;
  risk_score: number;
}

interface ModuleRisk {
  module_code: string;
  module_name: string;
  risk_level: string;
  risk_score: number;
  contributing_factors: string[];
  recommendations: string[];
}

interface RiskData {
  facility_risk_score: number;
  facility_risk_level: string;
  module_risks: ModuleRisk[];
}

interface TrendAssessment {
  id: number;
  assessment_date: string;
  overall_score: number;
  overall_grade: string;
  sop_readiness_pct: number;
  checklist_submissions_pct: number;
  audit_coverage_pct: number;
  critical_findings_count: number;
  major_findings_count: number;
  minor_findings_count: number;
}

interface TrendsData {
  assessments: TrendAssessment[];
  trends: any[];
}

type TabType = 'rules' | 'risk' | 'trends' | 'export';

export function ComplianceReportingPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedFacilityId) return;
    loadTabData();
  }, [selectedFacilityId, activeTab]);

  const loadTabData = async () => {
    if (!selectedFacilityId) return;
    setLoading(true);
    try {
      if (activeTab === 'rules') {
        const res = await reportingAPI.evaluateRules(parseInt(selectedFacilityId));
        setRulesData(res.data);
      } else if (activeTab === 'risk') {
        const res = await reportingAPI.getRisk(parseInt(selectedFacilityId));
        setRiskData(res.data);
      } else if (activeTab === 'trends') {
        const res = await reportingAPI.getTrends(parseInt(selectedFacilityId));
        setTrendsData(res.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluation = async () => {
    if (!selectedFacilityId) return;
    setEvaluating(true);
    try {
      const res = await reportingAPI.evaluateRules(parseInt(selectedFacilityId), true);
      setRulesData(res.data);
      setToastMessage('Rules evaluation saved!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setToastMessage('Evaluation failed');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!selectedFacilityId) return;
    try {
      await reportingAPI.saveSnapshot(parseInt(selectedFacilityId));
      setToastMessage('Trend snapshot saved!');
      setTimeout(() => setToastMessage(''), 3000);
      loadTabData();
    } catch (error) {
      setToastMessage('Snapshot failed');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const handleExportReport = async () => {
    if (!selectedFacilityId) return;
    try {
      const res = await reportingAPI.exportReport(parseInt(selectedFacilityId));
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${selectedFacilityId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setToastMessage('Report exported!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (error) {
      setToastMessage('Export failed');
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  const getRiskColor = (level: string) => {
    if (level === 'critical') return 'bg-red-600 text-white';
    if (level === 'high') return 'bg-orange-500 text-white';
    if (level === 'medium') return 'bg-yellow-500 text-white';
    return 'bg-green-600 text-white';
  };

  const getRiskBg = (level: string) => {
    if (level === 'critical') return 'bg-red-50 border-red-200';
    if (level === 'high') return 'bg-orange-50 border-orange-200';
    if (level === 'medium') return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'pass') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (status === 'fail') return <XCircle className="w-5 h-5 text-red-600" />;
    if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <Minus className="w-5 h-5 text-gray-400" />;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      major: 'bg-orange-100 text-orange-800',
      minor: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || 'bg-gray-100 text-gray-800'}`}>
        {severity}
      </span>
    );
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'rules', label: 'Rules Engine', icon: Shield },
    { key: 'risk', label: 'Risk Assessment', icon: Target },
    { key: 'trends', label: 'Trend Analysis', icon: TrendingUp },
    { key: 'export', label: 'Export Report', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-700" />
              <div>
                <h1 className="text-3xl font-bold text-green-900">Compliance Reporting</h1>
                <p className="text-sm text-gray-500 mt-1">Rules engine, risk scoring, trends & analytics</p>
              </div>
            </div>
            <div className="relative">
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="appearance-none px-4 py-2 pr-10 bg-white border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="">Select a facility</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
          </div>
        )}

        {!loading && !selectedFacilityId && (
          <div className="text-center py-16">
            <p className="text-gray-600 text-lg">Select a facility to view compliance reporting</p>
          </div>
        )}

        {/* ====== RULES ENGINE TAB ====== */}
        {!loading && selectedFacilityId && activeTab === 'rules' && rulesData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">Total Rules</div>
                <div className="text-3xl font-bold text-gray-800">{rulesData.summary.total}</div>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
                <div className="text-sm text-green-700 mb-1">Passed</div>
                <div className="text-3xl font-bold text-green-700">{rulesData.summary.passed}</div>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
                <div className="text-sm text-red-700 mb-1">Failed</div>
                <div className="text-3xl font-bold text-red-700">{rulesData.summary.failed}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
                <div className="text-sm text-yellow-700 mb-1">Warnings</div>
                <div className="text-3xl font-bold text-yellow-700">{rulesData.summary.warnings}</div>
              </div>
              <div className={`rounded-lg shadow p-4 border ${getRiskBg(rulesData.risk_level)}`}>
                <div className="text-sm text-gray-600 mb-1">Risk Score</div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-gray-800">{rulesData.risk_score}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getRiskColor(rulesData.risk_level)}`}>{rulesData.risk_level}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleRunEvaluation}
                disabled={evaluating}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-4 h-4 ${evaluating ? 'animate-spin' : ''}`} />
                {evaluating ? 'Evaluating...' : 'Run & Save Evaluation'}
              </button>
            </div>

            {/* Rules Table */}
            <div className="bg-white rounded-xl shadow-md border border-green-100">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800">Compliance Rules Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Rule Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Module</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rulesData.results.map((rule) => (
                      <>
                        <tr
                          key={rule.rule_code}
                          onClick={() => setExpandedRule(expandedRule === rule.rule_code ? null : rule.rule_code)}
                          className={`border-b border-gray-100 cursor-pointer transition ${
                            rule.status === 'fail' ? 'bg-red-50 hover:bg-red-100' :
                            rule.status === 'warning' ? 'bg-yellow-50 hover:bg-yellow-100' :
                            'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-3 px-4">{getStatusIcon(rule.status)}</td>
                          <td className="py-3 px-4 font-mono text-xs text-gray-600">{rule.rule_code}</td>
                          <td className="py-3 px-4 font-medium text-gray-800">{rule.rule_name}</td>
                          <td className="py-3 px-4">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                              {rule.rule_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">{getSeverityBadge(rule.severity)}</td>
                          <td className="py-3 px-4 text-gray-600">{rule.module_code || 'All'}</td>
                        </tr>
                        {expandedRule === rule.rule_code && rule.details && (
                          <tr key={`${rule.rule_code}-details`} className="bg-gray-50">
                            <td colSpan={6} className="px-8 py-4">
                              <div className="text-sm text-gray-700">
                                <span className="font-semibold">Details: </span>
                                {typeof rule.details === 'object' ? (
                                  <span>
                                    {rule.details.items && rule.details.items.length > 0 && (
                                      <span>Items: {rule.details.items.map((i: any) => typeof i === 'string' ? i : JSON.stringify(i)).join(', ')}</span>
                                    )}
                                    {rule.details.overdue_count !== undefined && <span> | Overdue: {rule.details.overdue_count}</span>}
                                    {rule.details.non_current !== undefined && <span> | Non-current: {rule.details.non_current}/{rule.details.total}</span>}
                                    {rule.details.auto_fail_zeros !== undefined && <span> | Auto-fail zeros: {rule.details.auto_fail_zeros}</span>}
                                    {rule.details.modules_failing !== undefined && <span> | Failing modules: {rule.details.modules_failing}/{rule.details.modules_checked}</span>}
                                    {rule.details.overdue_capas !== undefined && <span> | Overdue CAPAs: {rule.details.overdue_capas}</span>}
                                    {rule.details.expired_certs !== undefined && <span> | Expired certs: {rule.details.expired_certs}</span>}
                                    {rule.details.overdue_count !== undefined && rule.details.overdue_count > 0 && <span> | Overdue: {rule.details.overdue_count}</span>}
                                    {rule.details.failing_modules && rule.details.failing_modules.length > 0 && (
                                      <span> | Modules: {rule.details.failing_modules.map((m: any) => `${m.code} (${m.score}%)`).join(', ')}</span>
                                    )}
                                  </span>
                                ) : (
                                  <span>{String(rule.details)}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ====== RISK ASSESSMENT TAB ====== */}
        {!loading && selectedFacilityId && activeTab === 'risk' && riskData && (
          <>
            {/* Overall Risk */}
            <div className={`mb-8 rounded-xl shadow-md p-8 border ${getRiskBg(riskData.facility_risk_level)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Facility Risk Assessment</h2>
                  <p className="text-gray-600">Aggregated risk score across all applicable modules</p>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-800 mb-2">{riskData.facility_risk_score}</div>
                  <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${getRiskColor(riskData.facility_risk_level)}`}>
                    {riskData.facility_risk_level} risk
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Meter Visual */}
            <div className="mb-8 bg-white rounded-xl shadow-md p-6 border border-green-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Risk Distribution</h3>
              <div className="w-full h-6 rounded-full bg-gray-200 overflow-hidden flex">
                <div
                  className="bg-green-500 h-full transition-all duration-500"
                  style={{ width: `${Math.max(100 - riskData.facility_risk_score, 0)}%` }}
                ></div>
                <div
                  className={`h-full transition-all duration-500 ${
                    riskData.facility_risk_score >= 75 ? 'bg-red-500' :
                    riskData.facility_risk_score >= 50 ? 'bg-orange-500' :
                    riskData.facility_risk_score >= 25 ? 'bg-yellow-500' : 'bg-green-300'
                  }`}
                  style={{ width: `${riskData.facility_risk_score}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Low Risk (0)</span>
                <span>Medium (25)</span>
                <span>High (50)</span>
                <span>Critical (75+)</span>
              </div>
            </div>

            {/* Module Risk Cards */}
            <h3 className="text-lg font-bold text-gray-800 mb-4">Module Risk Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riskData.module_risks.map((mod) => (
                <div
                  key={mod.module_code}
                  className={`rounded-lg shadow-md p-5 border cursor-pointer transition hover:shadow-lg ${getRiskBg(mod.risk_level)}`}
                  onClick={() => setExpandedRisk(expandedRisk === mod.module_code ? null : mod.module_code)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded">{mod.module_code}</span>
                      <h4 className="font-semibold text-gray-800 mt-1">{mod.module_name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">{mod.risk_score}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getRiskColor(mod.risk_level)}`}>
                        {mod.risk_level}
                      </span>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="w-full h-2 rounded-full bg-gray-200 mb-3">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        mod.risk_score >= 75 ? 'bg-red-500' :
                        mod.risk_score >= 50 ? 'bg-orange-500' :
                        mod.risk_score >= 25 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${mod.risk_score}%` }}
                    ></div>
                  </div>

                  {expandedRisk === mod.module_code && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {mod.contributing_factors.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs font-bold text-gray-600 uppercase">Contributing Factors</span>
                          <ul className="mt-1 space-y-1">
                            {mod.contributing_factors.map((f, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {mod.recommendations.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-gray-600 uppercase">Recommendations</span>
                          <ul className="mt-1 space-y-1">
                            {mod.recommendations.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-green-800">
                                <Zap className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ====== TRENDS TAB ====== */}
        {!loading && selectedFacilityId && activeTab === 'trends' && trendsData && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Assessment History & Trends</h2>
              <button
                onClick={handleSaveSnapshot}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition"
              >
                <Activity className="w-4 h-4" />
                Save Weekly Snapshot
              </button>
            </div>

            {trendsData.assessments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center border border-green-100">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No assessment history yet</p>
                <p className="text-gray-400 text-sm mt-2">Run assessments from the Compliance Dashboard to build trend data</p>
              </div>
            ) : (
              <>
                {/* Trend Chart (ASCII/visual) */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-green-100 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Score Trend</h3>
                  <div className="flex items-end gap-2 h-48">
                    {trendsData.assessments.slice(0, 20).reverse().map((a, i) => {
                      const height = Math.max(a.overall_score, 5);
                      const barColor = a.overall_score >= 80 ? 'bg-green-500' : a.overall_score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                      return (
                        <div key={a.id || i} className="flex-1 flex flex-col items-center gap-1" title={`${a.assessment_date}: ${a.overall_score}% (${a.overall_grade})`}>
                          <span className="text-xs text-gray-500 font-medium">{Math.round(a.overall_score)}%</span>
                          <div className={`w-full rounded-t ${barColor} transition-all duration-300`} style={{ height: `${height * 1.6}px` }}></div>
                          <span className="text-xs text-gray-400 truncate w-full text-center">
                            {a.assessment_date ? a.assessment_date.split('T')[0].slice(5) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Assessment History Table */}
                <div className="bg-white rounded-xl shadow-md border border-green-100">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800">Assessment History</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Grade</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">SOP</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Checklists</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Audit</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Findings</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trendsData.assessments.map((a, i) => {
                          const prev = trendsData.assessments[i + 1];
                          const scoreDiff = prev ? a.overall_score - prev.overall_score : 0;
                          return (
                            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-600">{a.assessment_date ? a.assessment_date.split('T')[0] : '-'}</td>
                              <td className="py-3 px-4 font-bold text-gray-800">{a.overall_score}%</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  a.overall_grade === 'A+' || a.overall_grade === 'A' ? 'bg-green-100 text-green-800' :
                                  a.overall_grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                  a.overall_grade === 'C' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>{a.overall_grade}</span>
                              </td>
                              <td className="py-3 px-4 text-gray-600">{a.sop_readiness_pct}%</td>
                              <td className="py-3 px-4 text-gray-600">{a.checklist_submissions_pct}%</td>
                              <td className="py-3 px-4 text-gray-600">{a.audit_coverage_pct}%</td>
                              <td className="py-3 px-4">
                                <span className="text-red-600 text-xs font-medium">{a.critical_findings_count}C</span>
                                <span className="text-orange-600 text-xs font-medium ml-1">{a.major_findings_count}Mj</span>
                                <span className="text-yellow-600 text-xs font-medium ml-1">{a.minor_findings_count}Mn</span>
                              </td>
                              <td className="py-3 px-4">
                                {scoreDiff > 0 ? (
                                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <ArrowUpRight className="w-4 h-4" />+{scoreDiff.toFixed(1)}
                                  </span>
                                ) : scoreDiff < 0 ? (
                                  <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                    <ArrowDownRight className="w-4 h-4" />{scoreDiff.toFixed(1)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-sm">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ====== EXPORT TAB ====== */}
        {!loading && selectedFacilityId && activeTab === 'export' && (
          <div className="bg-white rounded-xl shadow-md p-8 border border-green-100">
            <div className="text-center max-w-lg mx-auto">
              <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Export Compliance Report</h2>
              <p className="text-gray-600 mb-8">
                Generate a comprehensive compliance report including scores, rule evaluations, risk assessments, and assessment history.
              </p>
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition mx-auto text-lg font-medium"
              >
                <Download className="w-5 h-5" />
                Download Report (JSON)
              </button>
              <p className="text-sm text-gray-400 mt-4">
                Report includes: compliance score, all rule evaluations, risk assessment by module, and assessment history
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
