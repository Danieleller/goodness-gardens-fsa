import { useEffect, useState } from 'react';
import { Search, AlertCircle, Loader, Upload, Download, Trash2, Calendar, Mail, X } from 'lucide-react';
import { netsuiteAPI, certAPI } from '@/api';

interface SupplyMasterRecord {
  type: string;
  vendor: string;
  vendor_id: string;
  last_transaction: string;
}

interface Certification {
  id: number;
  vendor_id: string;
  vendor_name: string;
  item_type: string;
  cert_file_name: string;
  expiration_date: string;
  notification_email: string;
  notification_sent: number;
  uploaded_by: string;
  uploaded_at: string;
  updated_at: string;
}

interface MergedRecord extends SupplyMasterRecord {
  certification?: Certification;
}

const getExpiryColor = (expirationDate: string | null) => {
  if (!expirationDate) return 'gray';
  const expDate = new Date(expirationDate);
  const today = new Date();
  const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'red'; // expired
  if (daysLeft < 15) return 'red'; // less than 15 days
  if (daysLeft < 30) return 'yellow'; // 15-30 days
  return 'green'; // more than 30 days
};

const getExpiryText = (expirationDate: string | null) => {
  if (!expirationDate) return 'No expiration date';
  const expDate = new Date(expirationDate);
  const today = new Date();
  const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
  if (daysLeft === 0) return 'Expires today';
  return `Expires in ${daysLeft} days`;
};

export function SupplyMasterPage() {
  const [supplyData, setSupplyData] = useState<SupplyMasterRecord[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [mergedData, setMergedData] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState<MergedRecord | null>(null);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    expiration_date: '',
    notification_email: '',
  });

  // Fetch both supply data and certifications
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [supplyRes, certRes] = await Promise.all([
          netsuiteAPI.supplyMaster({ limit: 1000, offset: 0 }),
          certAPI.list(),
        ]);

        const supply = supplyRes.data.items || supplyRes.data.records || [];
        const certs = certRes.data.certifications || [];

        setSupplyData(supply);
        setCertifications(certs);

        // Merge data: for each supply record, find matching certification
        const merged = supply.map((record: SupplyMasterRecord) => {
          const matchingCert = certs.find(
            (cert: Certification) =>
              cert.vendor_id === record.vendor_id && cert.item_type === record.type
          );
          return {
            ...record,
            certification: matchingCert,
          };
        });

        setMergedData(merged);
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        const msg =
          err?.response?.data?.details ||
          err?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Failed to load data');
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleOpenUploadModal = (record: MergedRecord) => {
    setSelectedRow(record);
    setFileInput(null);
    setUploadForm({
      expiration_date: record.certification?.expiration_date || '',
      notification_email: record.certification?.notification_email || '',
    });
    setShowUploadModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Validate file type
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowed.includes(file.type)) {
        alert('Only PDF, JPG, and PNG files are allowed');
        return;
      }
      setFileInput(file);
    }
  };

  const handleUploadCert = async () => {
    if (!selectedRow) return;

    try {
      const isUpdate = selectedRow.certification?.id;

      if (!isUpdate && !fileInput) {
        alert('Please select a file to upload');
        return;
      }

      const data: any = {
        vendor_id: selectedRow.vendor_id,
        vendor_name: selectedRow.vendor,
        item_type: selectedRow.type,
        expiration_date: uploadForm.expiration_date || null,
        notification_email: uploadForm.notification_email || null,
      };

      // If new file is selected, convert to base64
      if (fileInput) {
        const base64 = await fileToBase64(fileInput);
        data.cert_file_name = fileInput.name;
        data.cert_file_data = base64;
        data.cert_content_type = fileInput.type;
      }

      if (isUpdate) {
        await certAPI.update(selectedRow.certification!.id, data);
      } else {
        await certAPI.upload(data);
      }

      // Refresh certifications
      const certRes = await certAPI.list();
      const certs = certRes.data.certifications || [];
      setCertifications(certs);

      // Merge again
      const merged = supplyData.map((record: SupplyMasterRecord) => {
        const matchingCert = certs.find(
          (cert: Certification) =>
            cert.vendor_id === record.vendor_id && cert.item_type === record.type
        );
        return {
          ...record,
          certification: matchingCert,
        };
      });
      setMergedData(merged);

      setShowUploadModal(false);
      setSelectedRow(null);
      setFileInput(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to upload certification');
      alert(msg);
    }
  };

  const handleDeleteCert = async (certId: number) => {
    if (!confirm('Are you sure you want to delete this certification?')) {
      return;
    }

    try {
      await certAPI.delete(certId);

      // Refresh certifications
      const certRes = await certAPI.list();
      const certs = certRes.data.certifications || [];
      setCertifications(certs);

      // Merge again
      const merged = supplyData.map((record: SupplyMasterRecord) => {
        const matchingCert = certs.find(
          (cert: Certification) =>
            cert.vendor_id === record.vendor_id && cert.item_type === record.type
        );
        return {
          ...record,
          certification: matchingCert,
        };
      });
      setMergedData(merged);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to delete certification');
      alert(msg);
    }
  };

  const handleDownloadCert = async (certId: number) => {
    try {
      const response = await certAPI.download(certId);
      const cert = certifications.find((c) => c.id === certId);
      if (!cert) return;

      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', cert.cert_file_name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        (err instanceof Error ? err.message : 'Failed to download certification');
      alert(msg);
    }
  };

  const filteredData = mergedData.filter((record) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      record.type.toLowerCase().includes(searchLower) ||
      record.vendor.toLowerCase().includes(searchLower)
    );
  });

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#1A3A5C' }}>
            Supply Master FSQA
          </h1>
          <p className="text-gray-600 mt-2">Live data from NetSuite</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-800">Error loading data</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        {!loading && mergedData.length > 0 && (
          <div className="mb-6">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by Type or Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                style={{ focusRingColor: '#1A3A5C' }}
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="animate-spin mb-4" size={40} style={{ color: '#1A3A5C' }} />
            <p className="text-gray-600">Loading supply master data...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">No records found</p>
          </div>
        )}

        {/* Table */}
        {!loading && filteredData.length > 0 && (
          <div className="rounded-lg border border-gray-200 overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#1A3A5C' }}>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">
                      Last Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">
                      Documentation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((record, idx) => {
                    const cert = record.certification;
                    const expiryColor = getExpiryColor(cert?.expiration_date || null);

                    return (
                      <tr key={idx} className="hover:bg-blue-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-900">{record.type}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{record.vendor}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.last_transaction ? new Date(record.last_transaction).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {cert ? (
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <button
                                    onClick={() => handleDownloadCert(cert.id)}
                                    className="text-blue-600 hover:text-blue-800 underline font-medium truncate"
                                    title={cert.cert_file_name}
                                  >
                                    {cert.cert_file_name}
                                  </button>
                                  <Download size={16} className="text-blue-600 flex-shrink-0" />
                                </div>
                                {cert.expiration_date && (
                                  <div
                                    className="text-xs font-medium px-2 py-1 rounded inline-block"
                                    style={{
                                      backgroundColor:
                                        expiryColor === 'red'
                                          ? '#fee2e2'
                                          : expiryColor === 'yellow'
                                            ? '#fef3c7'
                                            : '#dcfce7',
                                      color:
                                        expiryColor === 'red'
                                          ? '#991b1b'
                                          : expiryColor === 'yellow'
                                            ? '#92400e'
                                            : '#166534',
                                    }}
                                  >
                                    {getExpiryText(cert.expiration_date)}
                                  </div>
                                )}
                                {cert.notification_email && (
                                  <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                    <Mail size={14} />
                                    {cert.notification_email}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleOpenUploadModal(record)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                title={cert ? 'Update cert' : 'Upload cert'}
                              >
                                <Upload size={18} />
                              </button>
                              {cert && (
                                <button
                                  onClick={() => handleDeleteCert(cert.id)}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                  title="Delete cert"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && mergedData.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{filteredData.length}</span> records displayed
              {searchTerm && (
                <>
                  {' '}
                  (filtered from <span className="font-semibold">{mergedData.length}</span> total)
                </>
              )}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-semibold">{certifications.length}</span> certifications on file
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold" style={{ color: '#1A3A5C' }}>
                {selectedRow.certification ? 'Update' : 'Upload'} Certification
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Vendor Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  value={selectedRow.vendor}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <input
                  type="text"
                  value={selectedRow.type}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate File
                </label>
                <label className="block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {fileInput ? (
                    <div className="text-sm text-gray-700">
                      <p className="font-medium">{fileInput.name}</p>
                      <p className="text-gray-500">
                        {(fileInput.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      <p className="font-medium">Choose file or drag and drop</p>
                      <p>PDF, JPG, or PNG</p>
                    </div>
                  )}
                </label>
                {selectedRow.certification && (
                  <p className="text-xs text-gray-500 mt-2">
                    Current: {selectedRow.certification.cert_file_name}
                  </p>
                )}
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar size={16} className="inline mr-1" />
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={uploadForm.expiration_date}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, expiration_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>

              {/* Notification Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail size={16} className="inline mr-1" />
                  Notification Email
                </label>
                <input
                  type="email"
                  value={uploadForm.notification_email}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, notification_email: e.target.value })
                  }
                  placeholder="optional@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadCert}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition"
                style={{ backgroundColor: '#1A3A5C' }}
              >
                {selectedRow.certification ? 'Update' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
