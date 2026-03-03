'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Trash2,
  Search,
  CheckCircle,
  Circle,
  FileText,
  X,
  AlertCircle,
  Loader,
} from 'lucide-react';
import { primusChecklistAPI } from '@/api';

// Type definitions
interface Document {
  id: number;
  item_id: number;
  file_name: string;
  content_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  notes: string;
}

interface ChecklistItem {
  id: number;
  module_number: number;
  module_name: string;
  module_color: string;
  section_number: string;
  section_name: string;
  item_code: string;
  item_name: string;
  has_document: number;
  sort_order: number;
  documents: Document[];
}

interface Section {
  section_number: string;
  section_name: string;
  items: ChecklistItem[];
}

interface Module {
  module_number: number;
  module_name: string;
  module_color: string;
  sections: Section[];
  total: number;
  completed: number;
}

interface UploadModalState {
  isOpen: boolean;
  itemId: number | null;
  itemCode: string;
  itemName: string;
}

const NAVY_BLUE = '#1A3A5C';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function AuditChecklistPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadModal, setUploadModal] = useState<UploadModalState>({
    isOpen: false,
    itemId: null,
    itemCode: '',
    itemName: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await primusChecklistAPI.getAll();
      setModules(response.data.modules);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load checklist data';
      setError(message);
      console.error('Error fetching checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle module expansion
  const toggleModule = (moduleNumber: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleNumber)) {
        next.delete(moduleNumber);
      } else {
        next.add(moduleNumber);
      }
      return next;
    });
  };

  // Handle checkbox toggle
  const handleToggleDocument = async (itemId: number) => {
    try {
      await primusChecklistAPI.toggle(itemId);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle document status';
      setError(message);
      console.error('Error toggling document:', err);
    }
  };

  // Open upload modal
  const openUploadModal = (item: ChecklistItem) => {
    setUploadModal({
      isOpen: true,
      itemId: item.id,
      itemCode: item.item_code,
      itemName: item.item_name,
    });
    setUploadFile(null);
    setUploadNotes('');
  };

  // Close upload modal
  const closeUploadModal = () => {
    setUploadModal({ isOpen: false, itemId: null, itemCode: '', itemName: '' });
    setUploadFile(null);
    setUploadNotes('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5MB limit');
      return;
    }

    setUploadFile(file);
    setError(null);
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:image/png;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!uploadFile || !uploadModal.itemId) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const fileData = await fileToBase64(uploadFile);

      await primusChecklistAPI.upload({
        item_id: uploadModal.itemId,
        file_name: uploadFile.name,
        file_data: fileData,
        content_type: uploadFile.type,
        file_size: uploadFile.size,
        notes: uploadNotes,
      });

      closeUploadModal();
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      console.error('Error uploading file:', err);
    } finally {
      setUploading(false);
    }
  };

  // Handle file download
  const handleDownload = async (doc: Document) => {
    try {
      setError(null);
      const response = await primusChecklistAPI.download(doc.id);

      // Create blob from base64
      const data = response.data;
      const binaryString = atob(data.file_data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.content_type });

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download file';
      setError(message);
      console.error('Error downloading file:', err);
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingDocId(docId);
      setError(null);
      await primusChecklistAPI.deleteDoc(docId);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete document';
      setError(message);
      console.error('Error deleting document:', err);
    } finally {
      setDeletingDocId(null);
    }
  };

  // Filter modules and items based on search
  const filteredModules = modules
    .map((module) => ({
      ...module,
      sections: module.sections
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) =>
              item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((section) => section.items.length > 0),
    }))
    .filter((module) => module.sections.length > 0 || searchTerm === '');

  // Calculate overall progress
  const totalItems = modules.reduce((sum, m) => sum + m.total, 0);
  const completedItems = modules.reduce((sum, m) => sum + m.completed, 0);
  const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: NAVY_BLUE }} />
          <p className="text-gray-600">Loading audit checklist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: NAVY_BLUE }} className="text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">PrimusGFS v4.0 Audit Checklist</h1>
          <p className="text-blue-100">Document Tracking & Audit Readiness</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by item code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mb-8 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Overall Progress</h2>
            <span className="text-2xl font-bold" style={{ color: NAVY_BLUE }}>
              {overallPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300 rounded-full"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            {completedItems} of {totalItems} items completed
          </p>
        </div>

        {/* Modules */}
        {filteredModules.length > 0 ? (
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <div key={module.module_number} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module.module_number)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-l-4"
                  style={{ borderLeftColor: module.module_color }}
                >
                  {expandedModules.has(module.module_number) ? (
                    <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: module.module_color }} />
                  ) : (
                    <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: module.module_color }} />
                  )}
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900">
                      Module {module.module_number}: {module.module_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${module.total > 0 ? (module.completed / module.total) * 100 : 0}%`,
                            backgroundColor: module.module_color,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                      {module.completed} / {module.total}
                    </span>
                  </div>
                </button>

                {/* Module Content */}
                {expandedModules.has(module.module_number) && (
                  <div className="border-t border-gray-200 divide-y divide-gray-200">
                    {module.sections.map((section) => (
                      <div key={section.section_number} className="px-6 py-6">
                        {/* Section Header */}
                        <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                          <div
                            className="w-1 h-5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: module.module_color }}
                          />
                          {section.section_number} - {section.section_name}
                        </h4>

                        {/* Section Items */}
                        <div className="space-y-4 ml-6">
                          {section.items.map((item) => (
                            <div
                              key={item.id}
                              className={`p-4 rounded-lg border ${
                                item.has_document || item.documents.length > 0
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              {/* Item Header */}
                              <div className="flex items-start gap-3 mb-3">
                                <button
                                  onClick={() => handleToggleDocument(item.id)}
                                  className="flex-shrink-0 mt-0.5 focus:outline-none"
                                  aria-label={`Toggle document for ${item.item_code}`}
                                >
                                  {item.has_document || item.documents.length > 0 ? (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400" />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-gray-900">{item.item_code}</p>
                                  <p className="text-gray-700 text-sm">{item.item_name}</p>
                                </div>
                              </div>

                              {/* Documents */}
                              {item.documents.length > 0 && (
                                <div className="ml-8 mb-3 space-y-2">
                                  {item.documents.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center justify-between p-2 bg-white rounded border border-green-100"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        <button
                                          onClick={() => handleDownload(doc)}
                                          className="text-blue-600 hover:text-blue-800 underline text-sm truncate focus:outline-none"
                                          title={doc.file_name}
                                        >
                                          {doc.file_name}
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                        <button
                                          onClick={() => handleDownload(doc)}
                                          className="p-1 text-blue-600 hover:bg-blue-50 rounded focus:outline-none transition-colors"
                                          title="Download"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteDocument(doc.id)}
                                          disabled={deletingDocId === doc.id}
                                          className="p-1 text-red-600 hover:bg-red-50 rounded focus:outline-none transition-colors disabled:opacity-50"
                                          title="Delete"
                                        >
                                          {deletingDocId === doc.id ? (
                                            <Loader className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-4 h-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Upload Button */}
                              <div className="ml-8">
                                <button
                                  onClick={() => openUploadModal(item)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors focus:outline-none border border-blue-200"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload Document
                                </button>
                              </div>

                              {/* Document Notes */}
                              {item.documents.length > 0 && item.documents[0].notes && (
                                <p className="ml-8 mt-2 text-xs text-gray-600 italic">
                                  Note: {item.documents[0].notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {searchTerm ? 'No items match your search criteria' : 'No checklist data available'}
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload Document</h3>
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Item Info */}
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700">
                  <span className="font-bold text-gray-900">{uploadModal.itemCode}</span> - {uploadModal.itemName}
                </p>
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: PDF, JPG, PNG (max 5MB)
                </p>
              </div>

              {/* File Selected */}
              {uploadFile && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">File selected:</span> {uploadFile.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  disabled={uploading}
                  placeholder="Add any notes about this document..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium focus:outline-none transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="px-4 py-2 text-white rounded-lg font-medium focus:outline-none transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: NAVY_BLUE }}
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
