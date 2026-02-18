import { useEffect, useState } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { checklistsAPI, facilitiesAPI } from '@/api';

interface Facility {
  id: number;
  name: string;
  code: string;
  facility_type: string;
}

interface ChecklistTemplate {
  id: number;
  code: string;
  name: string;
  category: string;
  frequency: string;
  facility_type: string;
  requires_photos: boolean;
  requires_signoff: boolean;
  item_count: number;
  phase?: string;
}

interface ChecklistItem {
  id: number;
  item_number: number;
  item_text: string;
  item_type: string;
  is_critical: boolean;
  sort_order: number;
}

interface ChecklistSubmission {
  id: number;
  facility_id: number;
  template_id: number;
  template_name: string;
  submitted_by: string;
  submission_date: string;
  overall_pass: boolean;
  signoff_date?: string;
}

interface ItemAnswer {
  item_id: number;
  answer_value: boolean | null;
  notes: string;
}

export function ChecklistsPage() {
  const [tab, setTab] = useState<'fill' | 'history'>('fill');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [submissions, setSubmissions] = useState<ChecklistSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<ChecklistItem[]>([]);
  const [answers, setAnswers] = useState<ItemAnswer[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tab === 'fill' && selectedFacility) {
      fetchTemplates();
    } else if (tab === 'history') {
      fetchSubmissions();
    }
  }, [tab, selectedFacility]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [facilitiesRes, templatesRes, submissionsRes] = await Promise.all([
        facilitiesAPI.getAll(),
        checklistsAPI.templates.getAll(),
        checklistsAPI.submissions.getAll(),
      ]);

      setFacilities(facilitiesRes.data.facilities || []);
      setTemplates(templatesRes.data.templates || []);
      setSubmissions(submissionsRes.data.submissions || []);

      if (facilitiesRes.data.facilities?.length > 0) {
        setSelectedFacility(facilitiesRes.data.facilities[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    if (!selectedFacility) return;
    try {
      const facility = facilities.find((f) => f.id === selectedFacility);
      const response = await checklistsAPI.templates.getAll(facility?.facility_type);
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await checklistsAPI.submissions.getAll(
        selectedFacility ? { facility_id: selectedFacility } : {}
      );
      setSubmissions(response.data.submissions || []);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const handleSelectTemplate = async (template: ChecklistTemplate) => {
    try {
      setSelectedTemplate(template);
      const response = await checklistsAPI.templates.getById(template.id);
      const items = response.data.items || [];
      setTemplateItems(items);
      setAnswers(items.map((item) => ({ item_id: item.id, answer_value: null, notes: '' })));
    } catch (error) {
      console.error('Failed to load template items:', error);
    }
  };

  const handleAnswerChange = (itemId: number, answer: boolean | null) => {
    setAnswers((prev) =>
      prev.map((a) => (a.item_id === itemId ? { ...a, answer_value: answer } : a))
    );
  };

  const handleNotesChange = (itemId: number, notes: string) => {
    setAnswers((prev) =>
      prev.map((a) => (a.item_id === itemId ? { ...a, notes } : a))
    );
  };

  const handleSubmitChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedFacility) return;

    try {
      setSubmitting(true);
      await checklistsAPI.submissions.create({
        facility_id: selectedFacility,
        template_id: selectedTemplate.id,
        answers,
        notes: '',
      });
      setSelectedTemplate(null);
      setAnswers([]);
      setTemplateItems([]);
      await Promise.all([fetchTemplates(), fetchSubmissions()]);
    } catch (error) {
      console.error('Failed to submit checklist:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const frequency = template.frequency || 'Other';
      if (!acc[frequency]) acc[frequency] = [];
      acc[frequency].push(template);
      return acc;
    },
    {} as Record<string, ChecklistTemplate[]>
  );

  const frequencyOrder = ['Daily', 'Weekly', 'Monthly', 'Per Event', 'Annual', 'Other'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardCheck size={32} className="text-green-800" />
          <h1 className="text-3xl font-bold text-gray-900">Checklists</h1>
        </div>
        <p className="text-gray-600">Complete daily safety and compliance checklists</p>
      </div>

      {/* Location Selector */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
        <select
          value={selectedFacility || ''}
          onChange={(e) => setSelectedFacility(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="">Select a location</option>
          {facilities.map((facility) => (
            <option key={facility.id} value={facility.id}>
              {facility.name} ({facility.code})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b bg-white rounded-t-lg px-4">
        <button
          onClick={() => setTab('fill')}
          className={`px-4 py-3 font-medium transition ${
            tab === 'fill'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Fill Checklist
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-3 font-medium transition ${
            tab === 'history'
              ? 'text-green-800 border-b-2 border-green-800'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          History
        </button>
      </div>

      {/* Fill Checklist Tab */}
      {tab === 'fill' && (
        <div className="bg-white rounded-b-lg shadow">
          {!selectedTemplate ? (
            <div className="p-4 md:p-6">
              {Object.keys(groupedTemplates).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No templates available for this location</p>
              ) : (
                frequencyOrder.map((frequency) => {
                  const items = groupedTemplates[frequency];
                  if (!items) return null;

                  return (
                    <div key={frequency} className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Calendar size={20} className="text-green-800" />
                        {frequency}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-green-300 transition text-left"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900">{template.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{template.code}</div>
                                <div className="flex gap-2 mt-2">
                                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                    {template.category}
                                  </span>
                                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {template.item_count} items
                                  </span>
                                </div>
                              </div>
                              <ChevronRight size={20} className="text-gray-400 mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitChecklist}>
              <div className="p-4 md:p-6">
                {/* Template Header */}
                <div className="mb-6 pb-6 border-b">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="text-green-800 hover:text-green-700 font-medium mb-3 text-sm"
                  >
                    ← Back to Templates
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">Code: {selectedTemplate.code}</p>
                </div>

                {/* Checklist Items */}
                <div className="space-y-4 mb-6">
                  {templateItems.map((item) => {
                    const answer = answers.find((a) => a.item_id === item.id);
                    return (
                      <div
                        key={item.id}
                        className={`border-2 rounded-lg p-4 ${
                          item.is_critical ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-500">Item {item.item_number}</span>
                              {item.is_critical && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                                  <AlertCircle size={14} />
                                  Critical
                                </span>
                              )}
                            </div>
                            <p className="text-gray-900 font-medium text-sm md:text-base">{item.item_text}</p>

                            {/* Yes/No Buttons */}
                            <div className="flex gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => handleAnswerChange(item.id, true)}
                                className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                  answer?.answer_value === true
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <CheckCircle size={18} />
                                <span className="hidden sm:inline">Yes</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnswerChange(item.id, false)}
                                className={`flex-1 py-2 px-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                                  answer?.answer_value === false
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                <XCircle size={18} />
                                <span className="hidden sm:inline">No</span>
                              </button>
                              {answer?.answer_value !== null && (
                                <button
                                  type="button"
                                  onClick={() => handleAnswerChange(item.id, null)}
                                  className="py-2 px-3 rounded-lg font-medium transition bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Notes Field */}
                            <textarea
                              placeholder="Add notes (optional)"
                              value={answer?.notes || ''}
                              onChange={(e) => handleNotesChange(item.id, e.target.value)}
                              className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Submit Section */}
                <div className="border-t pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="flex-1 bg-gray-300 text-gray-900 py-3 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-green-800 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit Checklist'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-b-lg shadow overflow-hidden">
          {submissions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Template</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 hidden md:table-cell">
                      Submitted By
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-green-50">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span>{submission.template_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 hidden md:table-cell">
                        {submission.submitted_by}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {new Date(submission.submission_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        {submission.overall_pass ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            <CheckCircle size={16} />
                            PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                            <XCircle size={16} />
                            FAIL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
