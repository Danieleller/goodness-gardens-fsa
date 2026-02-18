import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Users, ClipboardCheck, AlertTriangle, Building2, Shield } from 'lucide-react';
import { searchAPI } from '@/api';

const typeIcons: Record<string, React.ReactNode> = {
  supplier: <Users size={16} className="text-blue-500" />,
  facility: <Building2 size={16} className="text-green-500" />,
  sop: <FileText size={16} className="text-purple-500" />,
  checklist: <ClipboardCheck size={16} className="text-teal-500" />,
  capa: <AlertTriangle size={16} className="text-orange-500" />,
  audit: <Shield size={16} className="text-red-500" />,
};

const typeLabels: Record<string, string> = {
  supplier: 'Suppliers',
  facility: 'Facilities',
  sop: 'Documents',
  checklist: 'Checklists',
  capa: 'CAPA',
  audit: 'Audits',
};

const filterChips = ['All', 'Suppliers', 'Documents', 'Checklists', 'CAPA', 'Audits', 'Facilities'];
const filterMap: Record<string, string> = {
  Suppliers: 'supplier',
  Documents: 'sop',
  Checklists: 'checklist',
  CAPA: 'capa',
  Audits: 'audit',
  Facilities: 'facility',
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({});
      setActiveFilter('All');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Global Cmd/Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent toggles
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const doSearch = useCallback(async (q: string, type?: string) => {
    if (q.length < 2) { setResults({}); return; }
    setLoading(true);
    try {
      const typeParam = type && type !== 'All' ? filterMap[type] : undefined;
      const res = await searchAPI.search(q, typeParam);
      setResults(res.data.results || {});
    } catch (_e) {
      setResults({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) doSearch(query, activeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeFilter, doSearch]);

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  if (!isOpen) return null;

  const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers, documents, checklists, audits..."
            className="flex-1 text-sm outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ESC</kbd>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-1.5 px-4 py-2 border-b overflow-x-auto">
          {filterChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeFilter === chip
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Searching...</div>
          )}
          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">No results found</div>
          )}
          {!loading && query.length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          )}
          {!loading && Object.entries(results).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0">
                {typeLabels[type] || type} ({items.length})
              </div>
              {items.map((item: any) => (
                <button
                  key={`${item.entity_type}-${item.entity_id}`}
                  onClick={() => handleSelect(item.url || '/dashboard')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition"
                >
                  <span className="shrink-0">{typeIcons[type] || <FileText size={16} />}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                    )}
                  </div>
                  {item.tags && (
                    <span className="text-xs text-gray-400 shrink-0">{item.tags}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-gray-50 flex justify-between text-xs text-gray-400">
          <span>
            <kbd className="bg-gray-200 px-1 rounded">↑↓</kbd> Navigate
            <kbd className="bg-gray-200 px-1 rounded ml-2">↵</kbd> Select
          </span>
          <span><kbd className="bg-gray-200 px-1 rounded">⌘K</kbd> Toggle</span>
        </div>
      </div>
    </div>
  );
}
