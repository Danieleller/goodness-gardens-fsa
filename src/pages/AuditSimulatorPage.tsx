import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Play,
  Save,
  Trophy,
  AlertTriangle,
  BarChart,
  Loader2,
  ChevronRight,
  CheckCircle2,
  FileWarning,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import { auditAPI, facilitiesAPI, auditFindingsAPI } from '@/api';

interface Facility {
  id: string;
  name: string;
  code: string;
}

interface Question {
  id: string;
  question_code: string;
  question_text: string;
  points: number;
  is_auto_fail: number;
  is_new_v4: number;
  guidance: string;
  required_sop: string;
  required_checklist: string;
  frequency: string;
  responsible_role: string;
}

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  total_points: number;
  questions: Question[];
}

interface Response {
  question_id: string;
  score: number;
  notes: string;
}

interface Simulation {
  id: string;
  facility_id: string;
  total_points: number;
  status: string;
}

interface SimulationResult {
  id: string;
  total_points: number;
  earned_points: number;
  score_pct: number;
  has_auto_fail: number;
  grade: string;
}

interface ModuleScore {
  module_code: string;
  module_name: string;
  total_points: number;
  earned_points: number;
  score_pct: number;
}

interface PastSimulation {
  id: string;
  facility_id: string;
  date: string;
  status: string;
  score_pct: number;
  grade: string;
}

interface Finding {
  id: number;
  simulation_id: number;
  question_id: number;
  facility_id: number;
  finding_type: string;
  severity: string;
  description: string;
  evidence_notes: string;
  required_sop_code: string;
  is_auto_fail: number;
  status: string;
  question_code: string;
  question_text: string;
  module_name: string;
  created_at: string;
}

type PageState = 'setup' | 'in-progress' | 'results';

const getGradeColor = (grade: string): string => {
  switch (grade.toUpperCase()) {
    case 'A+':
    case 'A':
      return 'text-green-600 bg-green-50';
    case 'B':
      return 'text-blue-600 bg-blue-50';
    case 'C':
      return 'text-yellow-600 bg-yellow-50';
    case 'D':
      return 'text-orange-600 bg-orange-50';
    case 'FAIL':
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const getGradeBgColor = (grade: string): string => {
  switch (grade.toUpperCase()) {
    case 'A+':
    case 'A':
      return 'from-green-500 to-green-600';
    case 'B':
      return 'from-blue-500 to-blue-600';
    case 'C':
      return 'from-yellow-500 to-yellow-600';
    case 'D':
      return 'from-orange-500 to-orange-600';
    case 'FAIL':
      return 'from-red-500 to-red-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export function AuditSimulatorPage() {
  const [pageState, setPageState] = useState<PageState>('setup');
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>('');
  const [modules, setModules] = useState<Module[]>([]);
  const [pastSimulations, setPastSimulations] = useState<PastSimulation[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<Simulation | null>(
    null
  );
  const [activeModule, setActiveModule] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [results, setResults] = useState<{
    simulation: SimulationResult;
    modules: ModuleScore[];
  } | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [findingsLoading, setFindingsLoading] = useState(false);

  // Load facilities on mount
  useEffect(() => {
    const loadFacilities = async () => {
      setLoading(true);
      try {
        const data = await facilitiesAPI.getAll();
        setFacilities(data.data.facilities);
      } catch (error) {
        console.error('Error loading facilities:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFacilities();
  }, []);

  // Load modules and past simulations when facility is selected
  useEffect(() => {
    if (!selectedFacility) return;

    const loadFacilityData = async () => {
      setLoading(true);
      try {
        const [modulesData, simulationsData] = await Promise.all([
          auditAPI.modules(selectedFacility),
          auditAPI.simulations.getAll(selectedFacility),
        ]);
        setModules(modulesData.data.modules);
        setPastSimulations(simulationsData.data.simulations);
        if (modulesData.data.modules.length > 0) {
          setActiveModule(modulesData.data.modules[0].id);
        }
      } catch (error) {
        console.error('Error loading facility data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFacilityData();
  }, [selectedFacility]);

  const handleStartSimulation = async () => {
    if (!selectedFacility) return;

    setLoading(true);
    try {
      const data = await auditAPI.simulations.create(selectedFacility);
      setCurrentSimulation(data.data.simulation);
      setResponses({});
      setPageState('in-progress');
    } catch (error) {
      console.error('Error starting simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResponse = (
    questionId: string,
    score: number,
    notes: string
  ) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        score,
        notes,
      },
    }));
  };

  const handleSaveResponses = async () => {
    if (!currentSimulation) return;

    setLoading(true);
    try {
      const responseArray = Object.values(responses);
      await auditAPI.simulations.saveResponses(
        currentSimulation.id,
        responseArray
      );

      const scoreData = await auditAPI.simulations.getScore(
        currentSimulation.id
      );
      setResults(scoreData.data);
      setPageState('results');

      // Fetch auto-generated findings
      try {
        const findingsData = await auditFindingsAPI.getAll({ simulation_id: currentSimulation.id });
        setFindings(findingsData.data.findings || []);
      } catch (err) {
        console.error('Error loading findings:', err);
      }
    } catch (error) {
      console.error('Error saving responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSimulation = () => {
    setPageState('setup');
    setCurrentSimulation(null);
    setResponses({});
    setResults(null);
    setFindings([]);
  };

  const calculateRunningScore = (): { earned: number; total: number } => {
    let earned = 0;
    let total = 0;

    modules.forEach((module) => {
      module.questions.forEach((question) => {
        total += question.points;
        const response = responses[question.id];
        if (response) {
          earned += response.score;
        }
      });
    });

    return { earned, total };
  };

  const handleCreateCapa = async (findingId: number) => {
    try {
      await auditFindingsAPI.createCapa(findingId);
      // Refresh findings to update status
      if (currentSimulation) {
        const findingsData = await auditFindingsAPI.getAll({ simulation_id: currentSimulation.id });
        setFindings(findingsData.data.findings || []);
      }
    } catch (error) {
      console.error('Error creating CAPA:', error);
    }
  };

  const handleCreateAllCapas = async () => {
    setFindingsLoading(true);
    try {
      const openFindings = findings.filter(f => f.status === 'open');
      for (const finding of openFindings) {
        await auditFindingsAPI.createCapa(finding.id);
      }
      // Refresh findings
      if (currentSimulation) {
        const findingsData = await auditFindingsAPI.getAll({ simulation_id: currentSimulation.id });
        setFindings(findingsData.data.findings || []);
      }
    } catch (error) {
      console.error('Error creating CAPAs:', error);
    } finally {
      setFindingsLoading(false);
    }
  };

  if (loading && pageState === 'setup' && facilities.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin" />
          <p className="text-gray-600 font-medium">Loading audit simulator...</p>
        </div>
      </div>
    );
  }

  // Setup State
  if (pageState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              PrimusGFS Audit Simulator
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Setup Card */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                  Start New Simulation
                </h2>

                {/* Facility Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Facility
                  </label>
                  <select
                    value={selectedFacility}
                    onChange={(e) => setSelectedFacility(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Choose a location...</option>
                    {facilities.map((facility) => (
                      <option key={facility.id} value={facility.id}>
                        {facility.name} ({facility.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Modules Preview */}
                {modules.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Audit Modules ({modules.length})
                    </h3>
                    <div className="space-y-3">
                      {modules.map((module) => (
                        <div
                          key={module.id}
                          className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {module.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {module.questions.length} questions • Up to{' '}
                              {module.total_points} points
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Button */}
                <button
                  onClick={handleStartSimulation}
                  disabled={!selectedFacility || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  Start Simulation
                </button>
              </div>
            </div>

            {/* Past Simulations Card */}
            <div>
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-green-600" />
                  Past Simulations
                </h3>

                {pastSimulations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No past simulations</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pastSimulations.map((sim) => (
                      <div
                        key={sim.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-lg font-bold ${getGradeColor(sim.grade)}`}>
                            {sim.grade}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(sim.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {sim.score_pct.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // In Progress State
  if (pageState === 'in-progress' && currentSimulation) {
    const runningScore = calculateRunningScore();
    const scorePercentage = (runningScore.earned / runningScore.total) * 100;
    const currentModuleData = modules.find((m) => m.id === activeModule);

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">Audit Simulation</h1>
            </div>
            <button
              onClick={() => setPageState('setup')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              ← Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Module Tabs */}
              <div className="bg-white rounded-t-lg shadow-lg p-4 border-b-2 border-gray-200 overflow-x-auto">
                <div className="flex gap-2">
                  {modules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => setActiveModule(module.id)}
                      className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                        activeModule === module.id
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {module.code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions */}
              {currentModuleData && (
                <div className="bg-white rounded-b-lg shadow-lg p-8 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentModuleData.name}
                  </h2>
                  <p className="text-gray-600">{currentModuleData.description}</p>

                  <div className="space-y-6">
                    {currentModuleData.questions.map((question) => {
                      const response = responses[question.id];
                      const score = response?.score ?? 0;
                      const notes = response?.notes ?? '';

                      return (
                        <div
                          key={question.id}
                          className="border-2 border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors"
                        >
                          {/* Question Header */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {question.question_text}
                              </h3>
                              {question.guidance && (
                                <p className="text-sm text-gray-600 italic mb-3">
                                  Guidance: {question.guidance}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                {question.points} pts
                              </span>
                              {question.is_auto_fail === 1 && (
                                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-4 h-4" />
                                  AUTO-FAIL
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score Input */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Score
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                min="0"
                                max={question.points}
                                value={score}
                                onChange={(e) =>
                                  handleUpdateResponse(
                                    question.id,
                                    Math.min(
                                      Math.max(0, parseInt(e.target.value) || 0),
                                      question.points
                                    ),
                                    notes
                                  )
                                }
                                className="w-20 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                              />
                              <span className="text-gray-600">
                                / {question.points}
                              </span>
                              <div className="flex-1 flex gap-2">
                                <button
                                  onClick={() =>
                                    handleUpdateResponse(question.id, 0, notes)
                                  }
                                  className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                                >
                                  0
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateResponse(
                                      question.id,
                                      Math.floor(question.points / 2),
                                      notes
                                    )
                                  }
                                  className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium text-sm"
                                >
                                  Partial
                                </button>
                                <button
                                  onClick={() =>
                                    handleUpdateResponse(
                                      question.id,
                                      question.points,
                                      notes
                                    )
                                  }
                                  className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
                                >
                                  Full
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Notes
                            </label>
                            <textarea
                              value={notes}
                              onChange={(e) =>
                                handleUpdateResponse(
                                  question.id,
                                  score,
                                  e.target.value
                                )
                              }
                              placeholder="Add any observations or notes..."
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 resize-none"
                              rows={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveResponses}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 mt-8"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save & Calculate Score
                  </button>
                </div>
              )}
            </div>

            {/* Score Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Running Score
                </h3>

                {/* Score Display */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-green-600 mb-2">
                    {runningScore.earned}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    of {runningScore.total} points
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-500"
                      style={{ width: `${Math.min(scorePercentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-center text-sm font-medium text-gray-700 mt-2">
                    {scorePercentage.toFixed(1)}%
                  </div>
                </div>

                {/* Module Summary */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    Module Progress
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {modules.map((module) => {
                      const moduleEarned = module.questions.reduce(
                        (sum, q) => sum + (responses[q.id]?.score ?? 0),
                        0
                      );
                      const modulePct =
                        (moduleEarned / module.total_points) * 100;

                      return (
                        <div
                          key={module.id}
                          className={`p-3 rounded-lg ${
                            activeModule === module.id
                              ? 'bg-green-100 border-2 border-green-500'
                              : 'bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {module.code}
                            </span>
                            <span className="text-xs text-gray-600">
                              {moduleEarned}/{module.total_points}
                            </span>
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div
                              className="bg-green-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(modulePct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results State
  if (pageState === 'results' && results) {
    const { simulation, modules: moduleScores } = results;
    const scorePercentage = simulation.score_pct;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Audit Results
              </h1>
            </div>
          </div>

          {/* Auto-Fail Warning */}
          {simulation.has_auto_fail === 1 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-8 flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 text-lg mb-1">
                  Auto-Fail Triggered
                </h3>
                <p className="text-red-700">
                  One or more critical questions were scored as failures. This
                  audit cannot pass.
                </p>
              </div>
            </div>
          )}

          {/* Grade Display */}
          <div className={`bg-white rounded-lg shadow-lg p-12 mb-8 text-center border-4 border-gray-200`}>
            <div
              className={`inline-block bg-gradient-to-br ${getGradeBgColor(simulation.grade)} rounded-full w-40 h-40 flex items-center justify-center mb-6`}
            >
              <span className="text-7xl font-bold text-white">
                {simulation.grade}
              </span>
            </div>

            {/* Score Percentage */}
            <h2 className="text-5xl font-bold text-gray-900 mb-2">
              {scorePercentage.toFixed(1)}%
            </h2>
            <p className="text-xl text-gray-600 mb-6">
              {simulation.earned_points} of {simulation.total_points} points earned
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mb-6">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-600 h-full transition-all duration-500"
                style={{ width: `${scorePercentage}%` }}
              />
            </div>
          </div>

          {/* Module Breakdown */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart className="w-6 h-6 text-green-600" />
              Module Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Module
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Points Earned
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Total Points
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {moduleScores.map((module, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-200 hover:bg-green-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900">
                        {module.module_name}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {module.earned_points}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {module.total_points}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-full rounded-full"
                              style={{
                                width: `${(module.score_pct / 100) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-gray-900 w-12">
                            {module.score_pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Findings */}
          {findings.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileWarning className="w-6 h-6 text-orange-500" />
                  Audit Findings ({findings.length})
                </h3>
                {findings.some(f => f.status === 'open') && (
                  <button
                    onClick={handleCreateAllCapas}
                    disabled={findingsLoading}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                  >
                    {findingsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    Create All CAPAs
                  </button>
                )}
              </div>

              {/* Summary badges */}
              <div className="flex gap-3 mb-6">
                {(['critical', 'major', 'minor'] as const).map(sev => {
                  const count = findings.filter(f => f.severity === sev).length;
                  if (count === 0) return null;
                  return (
                    <span key={sev} className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      sev === 'critical' ? 'bg-red-100 text-red-800' :
                      sev === 'major' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {count} {sev}
                    </span>
                  );
                })}
              </div>

              {/* Findings table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Question</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Severity</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Required SOP</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((finding) => (
                      <tr key={finding.id} className="border-b border-gray-200 hover:bg-orange-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-medium text-gray-900 text-sm">{finding.question_code}</div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">{finding.question_text}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700 capitalize">{finding.finding_type.replace('_', ' ')}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            finding.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            finding.severity === 'major' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {finding.severity}
                            {finding.is_auto_fail === 1 && ' ⚠'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">{finding.required_sop_code || '—'}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            finding.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            finding.status === 'capa_created' ? 'bg-green-100 text-green-800' :
                            finding.status === 'resolved' ? 'bg-gray-100 text-gray-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {finding.status === 'capa_created' ? 'CAPA Created' : finding.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {finding.status === 'open' ? (
                            <button
                              onClick={() => handleCreateCapa(finding.id)}
                              className="flex items-center gap-1 text-orange-600 hover:text-orange-800 font-medium text-sm transition-colors"
                            >
                              <PlusCircle className="w-4 h-4" />
                              Create CAPA
                            </button>
                          ) : finding.status === 'capa_created' ? (
                            <Link to="/corrective-actions" className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm">
                              <ExternalLink className="w-4 h-4" />
                              View
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleNewSimulation}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              New Simulation
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold py-3 px-6 rounded-lg transition-all"
            >
              Print Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
