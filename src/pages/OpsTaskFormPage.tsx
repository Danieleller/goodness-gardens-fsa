import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardCheck, CheckCircle, Clock, AlertTriangle,
  Loader, Building2, Send, Camera, Save, Hash, User, Calendar
} from 'lucide-react';
import { opsAPI } from '@/api';
import { useAuthStore } from '@/store';

interface TaskField {
  id: number;
  template_id: number;
  field_key: string;
  field_label: string;
  field_type: string;
  options_json: string | null;
  placeholder: string | null;
  default_value: string | null;
  is_required: number;
  auto_calc_rule: string | null;
  sort_order: number;
}

interface TaskResponse {
  id: number;
  instance_id: number;
  field_id: number;
  field_key: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: number | null;
  value_json: string | null;
}

interface TaskDetail {
  id: number;
  template_id: number;
  facility_id: number;
  transaction_id: string;
  status: string;
  due_date: string;
  template_name: string;
  prefix: string;
  template_code: string;
  category: string;
  template_description: string;
  facility_name: string;
  assigned_user_name: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  pending: { color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock, label: 'Pending' },
  in_progress: { color: 'text-blue-600', bg: 'bg-blue-100', icon: ClipboardCheck, label: 'In Progress' },
  submitted: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Submitted' },
  approved: { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle, label: 'Approved' },
  overdue: { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Overdue' },
};

export function OpsTaskFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [fields, setFields] = useState<TaskField[]>([]);
  const [responses, setResponses] = useState<TaskResponse[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sigDrawing, setSigDrawing] = useState(false);

  const isSupervisorPlus = ['supervisor', 'fsqa', 'management', 'admin'].includes(user?.role || '');
  const isReadOnly = task?.status === 'submitted' || task?.status === 'approved';

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const res = await opsAPI.tasks.getById(Number(id));
      const t = res.data.task;
      const f: TaskField[] = res.data.fields || [];
      const r: TaskResponse[] = res.data.responses || [];
      setTask(t);
      setFields(f);
      setResponses(r);
      setNotes(t.notes || '');

      // Build initial form values
      const vals: Record<string, any> = {};
      f.forEach((field) => {
        const existing = r.find((rsp) => rsp.field_key === field.field_key);
        if (existing) {
          if (field.field_type === 'boolean' || field.field_type === 'passfail') {
            vals[field.field_key] = existing.value_boolean;
          } else if (field.field_type === 'number') {
            vals[field.field_key] = existing.value_number ?? '';
          } else {
            vals[field.field_key] = existing.value_text || '';
          }
        } else {
          vals[field.field_key] = field.default_value || '';
        }
      });
      setFormValues(vals);
    } catch (err) {
      console.error('Failed to fetch task:', err);
      setError('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const setValue = (key: string, value: any) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-calc rules
      fields.forEach((f) => {
        if (f.auto_calc_rule && f.auto_calc_rule.startsWith('atp_pass:')) {
          const threshold = Number(f.auto_calc_rule.split(':')[1]);
          const readingField = fields.find((ff) => ff.field_key === 'reading');
          if (readingField && key === 'reading') {
            const reading = Number(value);
            next[f.field_key] = !isNaN(reading) && reading <= threshold ? 1 : 0;
          }
        }
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missing = fields.filter((f) => {
      if (!f.is_required) return false;
      const val = formValues[f.field_key];
      if (val === undefined || val === null || val === '') return true;
      return false;
    });
    if (missing.length > 0) {
      setError(`Please fill in required fields: ${missing.map((f) => f.field_label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const responseData = fields.map((f) => ({
        field_id: f.id,
        field_key: f.field_key,
        value: formValues[f.field_key],
        type: f.field_type,
      }));
      await opsAPI.tasks.submit(Number(id), { responses: responseData, notes });
      navigate('/ops/my-tasks', { replace: true });
    } catch (err: any) {
      console.error('Failed to submit task:', err);
      setError(err.response?.data?.error || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await opsAPI.tasks.approve(Number(id));
      fetchTask();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve task');
    } finally {
      setApproving(false);
    }
  };

  // Signature pad handlers
  const initSigCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    sigCanvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#1f2937';
    }
  };

  const startSigDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setSigDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawSig = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sigDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSigDraw = (fieldKey: string) => {
    setSigDrawing(false);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setValue(fieldKey, dataUrl);
  };

  const clearSig = (fieldKey: string) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setValue(fieldKey, '');
  };

  const renderField = (field: TaskField) => {
    const val = formValues[field.field_key];
    const baseInputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500';

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={val ?? ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={val || ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            placeholder={field.placeholder || ''}
            disabled={isReadOnly}
            rows={3}
            className={baseInputClass}
          />
        );

      case 'boolean':
        return (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => !isReadOnly && setValue(field.field_key, 1)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                val === 1
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => !isReadOnly && setValue(field.field_key, 0)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition ${
                val === 0
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              No
            </button>
          </div>
        );

      case 'passfail':
        return (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => !isReadOnly && setValue(field.field_key, 1)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition ${
                val === 1
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              PASS
            </button>
            <button
              type="button"
              onClick={() => !isReadOnly && setValue(field.field_key, 0)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition ${
                val === 0
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              FAIL
            </button>
          </div>
        );

      case 'select': {
        let options: string[] = [];
        try {
          options = field.options_json ? JSON.parse(field.options_json) : [];
        } catch { /* ignore */ }
        return (
          <select
            value={val || ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }

      case 'date':
        return (
          <input
            type="date"
            value={val || ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );

      case 'file':
        if (isReadOnly && val) {
          return (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Camera size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">Photo attached</span>
            </div>
          );
        }
        return (
          <div>
            <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition ${isReadOnly ? 'opacity-50 cursor-default' : ''}`}>
              <Camera size={20} className="text-gray-400" />
              <span className="text-sm text-gray-500">{val ? 'Photo captured' : 'Tap to take photo'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={isReadOnly}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setValue(field.field_key, reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            {val && (
              <div className="mt-2">
                <img src={val} alt="Capture" className="max-h-32 rounded border" />
              </div>
            )}
          </div>
        );

      case 'signature':
        if (isReadOnly && val) {
          return (
            <div className="p-2 bg-gray-50 rounded-lg border">
              <img src={val} alt="Signature" className="max-h-20" />
            </div>
          );
        }
        return (
          <div>
            <canvas
              ref={initSigCanvas}
              width={320}
              height={100}
              className="border border-gray-300 rounded-lg bg-white w-full touch-none"
              onMouseDown={startSigDraw}
              onMouseMove={drawSig}
              onMouseUp={() => endSigDraw(field.field_key)}
              onMouseLeave={() => sigDrawing && endSigDraw(field.field_key)}
              onTouchStart={startSigDraw}
              onTouchMove={drawSig}
              onTouchEnd={() => endSigDraw(field.field_key)}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">Sign above</span>
              <button
                type="button"
                onClick={() => clearSig(field.field_key)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            </div>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={val || ''}
            onChange={(e) => setValue(field.field_key, e.target.value)}
            disabled={isReadOnly}
            className={baseInputClass}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader className="animate-spin mb-4 text-green-800" size={40} />
        <p className="text-gray-500">Loading task...</p>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle size={40} className="mx-auto text-red-400 mb-2" />
          <p className="text-red-700">{error}</p>
          <Link to="/ops/my-tasks" className="text-sm text-green-700 hover:underline mt-4 inline-block">
            Back to My Tasks
          </Link>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const sc = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = sc.icon;

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link to="/ops/my-tasks" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-800 mb-4 transition">
          <ArrowLeft size={16} />
          Back to My Tasks
        </Link>

        {/* Task Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Hash size={14} className="text-gray-400" />
                <span className="font-mono text-sm font-semibold text-green-800">{task.transaction_id}</span>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                <StatusIcon size={14} />
                {sc.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{task.template_name}</h1>
            {task.template_description && (
              <p className="text-sm text-gray-500 mb-3">{task.template_description}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {task.facility_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
              {task.assigned_user_name && (
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {task.assigned_user_name}
                </span>
              )}
            </div>
          </div>

          {/* Submitted / Approved info */}
          {task.submitted_at && (
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 text-xs text-gray-500 flex flex-wrap gap-4">
              <span>Submitted by {task.submitted_by_name} at {new Date(task.submitted_at).toLocaleString()}</span>
              {task.approved_at && (
                <span>Approved by {task.approved_by_name} at {new Date(task.approved_at).toLocaleString()}</span>
              )}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {isReadOnly ? 'Submitted Responses' : 'Complete Task'}
            </h2>
          </div>
          <div className="p-4 space-y-5">
            {fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {field.field_label}
                  {field.is_required ? <span className="text-red-500 ml-1">*</span> : null}
                  {field.auto_calc_rule && (
                    <span className="text-xs text-blue-500 ml-2">(auto-calculated)</span>
                  )}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
              rows={2}
              placeholder="Any additional observations..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pb-8">
          {!isReadOnly && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-green-800 text-white rounded-lg hover:bg-green-700 transition font-semibold text-base disabled:opacity-50 shadow-sm"
            >
              {submitting ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
              {submitting ? 'Submitting...' : 'Submit Task'}
            </button>
          )}

          {task.status === 'submitted' && isSupervisorPlus && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-600 transition font-semibold text-base disabled:opacity-50 shadow-sm"
            >
              {approving ? (
                <Loader className="animate-spin" size={20} />
              ) : (
                <CheckCircle size={20} />
              )}
              {approving ? 'Approving...' : 'Approve Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
