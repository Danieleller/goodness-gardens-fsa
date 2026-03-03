import { useEffect, useState } from 'react';
import {
  Settings, ClipboardCheck, Loader, ChevronDown, ChevronUp,
  Hash, Layers, ToggleLeft, ToggleRight
} from 'lucide-react';
import { opsAPI, facilitiesAPI } from '@/api';
import { useAuthStore } from '@/store';

interface TemplateField {
  id: number;
  field_key: string;
  field_label: string;
  field_type: string;
  options_json: string | null;
  is_required: number;
  auto_calc_rule: string | null;
  sort_order: number;
}

interface Template {
  id: number;
  code: string;
  name: string;
  prefix: string;
  description: string;
  category: string;
  frequency: string;
  is_core_daily: number;
  is_active: number;
  field_count: number;
}

interface Schedule {
  id: number;
  template_id: number;
  facility_id: number;
  facility_name: string;
  recurrence: string;
  days_of_week: string | null;
  assigned_role: string;
  assigned_user_id: number | null;
  is_active: number;
}

interface Facility {
  id: number;
  name: string;
}

const categoryIcons: Record<string, string> = {
  inspection: '🔍',
  sanitation: '🧹',
  testing: '🧪',
  chemical: '🧴',
  drill: '🚨',
  training: '📋',
};

const fieldTypeLabels: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  boolean: 'Yes / No',
  passfail: 'Pass / Fail',
  select: 'Dropdown',
  textarea: 'Long Text',
  date: 'Date',
  file: 'File Upload',
  signature: 'Signature',
};

export function OpsTemplatesPage() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Schedule creation
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ facility_id: '', recurrence: 'daily', assigned_role: 'worker', days_of_week: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    opsAPI.templates.getAll().then((r) => { setTemplates(r.data.templates || []); setLoading(false); }).catch(() => setLoading(false));
    facilitiesAPI.getAll().then((r) => setFacilities(r.data.facilities || [])).catch(() => {});
  }, []);

  const toggleExpand = async (templateId: number) => {
    if (expandedId === templateId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(templateId);
    setLoadingDetail(true);
    setShowScheduleForm(false);
    try {
      const [tmplRes, schedRes] = await Promise.all([
        opsAPI.templates.getById(templateId),
        opsAPI.schedules.getAll(),
      ]);
      setFields(tmplRes.data.fields || []);
      const allSchedules = schedRes.data.schedules || [];
      setSchedules(allSchedules.filter((s: Schedule) => s.template_id === templateId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!expandedId || !newSchedule.facility_id) return;
    setSaving(true);
    try {
      await opsAPI.schedules.create({
        template_id: expandedId,
        facility_id: Number(newSchedule.facility_id),
        recurrence: newSchedule.recurrence,
        assigned_role: newSchedule.assigned_role,
        days_of_week: newSchedule.days_of_week || null,
      });
      // Refresh schedules
      const schedRes = await opsAPI.schedules.getAll();
      setSchedules((schedRes.data.schedules || []).filter((s: Schedule) => s.template_id === expandedId));
      setShowScheduleForm(false);
      setNewSchedule({ facility_id: '', recurrence: 'daily', assigned_role: 'worker', days_of_week: '' });
    } catch (e) {
      console.error(e);
      alert('Failed to create schedule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader className="animate-spin mb-4 text-green-800" size={40} />
        <p className="text-gray-500">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={28} className="text-green-800" />
            Task Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {templates.length} templates configured — manage fields and schedules
          </p>
        </div>

        {/* Template List */}
        <div className="space-y-3">
          {templates.map((t) => {
            const isExpanded = expandedId === t.id;
            return (
              <div key={t.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Template Header */}
                <button
                  onClick={() => toggleExpand(t.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition"
                >
                  <span className="text-2xl">{categoryIcons[t.category] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-green-800 bg-green-50 px-1.5 py-0.5 rounded">{t.prefix}-</span>
                      <span className="font-semibold text-gray-900">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="capitalize">{t.category}</span>
                      <span>{t.frequency}</span>
                      <span>{t.field_count} fields</span>
                      {t.is_core_daily ? <span className="text-green-600 font-medium">Core Daily</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.is_active
                      ? <ToggleRight size={20} className="text-green-600" />
                      : <ToggleLeft size={20} className="text-gray-300" />
                    }
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t bg-gray-50">
                    {loadingDetail ? (
                      <div className="flex justify-center py-8">
                        <Loader className="animate-spin text-green-800" size={24} />
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        {/* Description */}
                        {t.description && (
                          <p className="text-sm text-gray-600">{t.description}</p>
                        )}

                        {/* Fields */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Form Fields</h3>
                          <div className="bg-white rounded-lg border divide-y">
                            {fields.map((f, idx) => (
                              <div key={f.id} className="flex items-center gap-3 px-3 py-2">
                                <span className="text-xs text-gray-300 w-5 text-right">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-gray-900">{f.field_label}</span>
                                  {f.is_required ? <span className="text-red-500 text-xs ml-1">*</span> : null}
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                  {fieldTypeLabels[f.field_type] || f.field_type}
                                </span>
                                {f.auto_calc_rule && (
                                  <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">auto</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Schedules */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedules</h3>
                            {user?.role === 'admin' && (
                              <button
                                onClick={() => setShowScheduleForm(!showScheduleForm)}
                                className="text-xs text-green-700 hover:text-green-900 font-medium"
                              >
                                {showScheduleForm ? 'Cancel' : '+ Add Schedule'}
                              </button>
                            )}
                          </div>

                          {schedules.length === 0 && !showScheduleForm && (
                            <p className="text-sm text-gray-400 italic">No schedules configured for this template.</p>
                          )}

                          {schedules.length > 0 && (
                            <div className="bg-white rounded-lg border divide-y mb-2">
                              {schedules.map((s) => (
                                <div key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                                  <span className="text-gray-900 font-medium">{s.facility_name}</span>
                                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded capitalize">{s.recurrence}</span>
                                  <span className="text-xs text-gray-400">Role: {s.assigned_role}</span>
                                  {s.days_of_week && <span className="text-xs text-gray-400">Days: {s.days_of_week}</span>}
                                  {s.is_active
                                    ? <span className="text-xs text-green-600">Active</span>
                                    : <span className="text-xs text-gray-400">Inactive</span>
                                  }
                                </div>
                              ))}
                            </div>
                          )}

                          {/* New Schedule Form */}
                          {showScheduleForm && (
                            <div className="bg-white rounded-lg border p-3 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <select
                                  value={newSchedule.facility_id}
                                  onChange={(e) => setNewSchedule({ ...newSchedule, facility_id: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  <option value="">Select Facility...</option>
                                  {facilities.map((f) => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={newSchedule.recurrence}
                                  onChange={(e) => setNewSchedule({ ...newSchedule, recurrence: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                                <select
                                  value={newSchedule.assigned_role}
                                  onChange={(e) => setNewSchedule({ ...newSchedule, assigned_role: e.target.value })}
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                  <option value="worker">Worker</option>
                                  <option value="supervisor">Supervisor</option>
                                  <option value="fsqa">FSQA</option>
                                </select>
                                <input
                                  type="text"
                                  value={newSchedule.days_of_week}
                                  onChange={(e) => setNewSchedule({ ...newSchedule, days_of_week: e.target.value })}
                                  placeholder="Days (e.g. Mon,Wed,Fri)"
                                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>
                              <button
                                onClick={handleCreateSchedule}
                                disabled={saving || !newSchedule.facility_id}
                                className="px-4 py-2 bg-green-800 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                              >
                                {saving ? 'Creating...' : 'Create Schedule'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
