import { useEffect, useState } from 'react';
import {
  Truck,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { suppliersAPI } from '@/api';
import { useAuthStore } from '@/store';

interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  supplier_type: string;
  approval_status: string;
  cert_count: number;
  next_expiry: string | null;
  notes?: string;
}

interface Certification {
  id: number;
  cert_type: string;
  cert_name: string;
  issuing_body: string;
  cert_number: string;
  issue_date: string;
  expiry_date: string;
  status: string;
}

interface ExpiringCert {
  id: number;
  supplier_id: number;
  supplier_name: string;
  cert_type: string;
  cert_name: string;
  expiry_date: string;
  days_until_expiry: number;
  status: string;
}

export function SupplierPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Main state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCert[]>([]);
  const [showExpiringDetails, setShowExpiringDetails] = useState(false);
  const [certLoading, setCertLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Forms
  const [supplierFormData, setSupplierFormData] = useState({
    code: '',
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    supplier_type: 'Produce',
    notes: '',
  });

  const [certFormData, setCertFormData] = useState({
    cert_type: '',
    cert_name: '',
    issuing_body: '',
    cert_number: '',
    issue_date: '',
    expiry_date: '',
    alert_days_before: '30',
  });

  const [showCertForm, setShowCertForm] = useState(false);

  // Fetch suppliers and expiring certs
  useEffect(() => {
    fetchSuppliers();
    fetchExpiringCerts();
  }, [filterType, filterStatus]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersAPI.getAll({
        ...(filterType && { type: filterType }),
        ...(filterStatus && { status: filterStatus }),
      });
      setSuppliers(response.data.suppliers || response.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringCerts = async () => {
    try {
      const response = await suppliersAPI.expiring(30);
      setExpiringCerts(response.data.certifications || response.data);
    } catch (error) {
      console.error('Failed to fetch expiring certs:', error);
    }
  };

  const fetchSupplierDetails = async (supplierId: number) => {
    setCertLoading(true);
    try {
      const supplierRes = await suppliersAPI.getById(supplierId);
      setSelectedSupplier(supplierRes.data.supplier || supplierRes.data);

      const certsRes = await suppliersAPI.certifications.getAll(supplierId);
      setCertifications(certsRes.data.certifications || certsRes.data);
    } catch (error) {
      console.error('Failed to fetch supplier details:', error);
    } finally {
      setCertLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await suppliersAPI.create(supplierFormData);
      resetSupplierForm();
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to create supplier:', error);
    }
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    try {
      await suppliersAPI.certifications.create(selectedSupplierId, certFormData);
      resetCertForm();
      fetchSupplierDetails(selectedSupplierId);
      fetchExpiringCerts();
      fetchSuppliers();
    } catch (error) {
      console.error('Failed to add certification:', error);
    }
  };

  const handleUpdateApprovalStatus = async (supplierId: number, newStatus: string) => {
    try {
      await suppliersAPI.update(supplierId, { approval_status: newStatus });
      fetchSuppliers();
      if (selectedSupplierId === supplierId) {
        fetchSupplierDetails(supplierId);
      }
    } catch (error) {
      console.error('Failed to update approval status:', error);
    }
  };

  const handleDeleteSupplier = async (supplierId: number) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await suppliersAPI.delete(supplierId);
        if (selectedSupplierId === supplierId) {
          setSelectedSupplierId(null);
          setSelectedSupplier(null);
        }
        fetchSuppliers();
      } catch (error) {
        console.error('Failed to delete supplier:', error);
      }
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      code: '',
      name: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      supplier_type: 'Produce',
      notes: '',
    });
    setShowAddForm(false);
  };

  const resetCertForm = () => {
    setCertFormData({
      cert_type: '',
      cert_name: '',
      issuing_body: '',
      cert_number: '',
      issue_date: '',
      expiry_date: '',
      alert_days_before: '30',
    });
    setShowCertForm(false);
  };

  const getCertStatusColor = (status: string, daysUntilExpiry?: number) => {
    if (status === 'expired' || (daysUntilExpiry !== undefined && daysUntilExpiry < 0)) {
      return 'bg-red-100 text-red-800';
    }
    if (status === 'expiring_soon' || (daysUntilExpiry !== undefined && daysUntilExpiry < 30)) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getCertStatusIcon = (status: string, daysUntilExpiry?: number) => {
    if (status === 'expired' || (daysUntilExpiry !== undefined && daysUntilExpiry < 0)) {
      return <XCircle size={16} />;
    }
    if (status === 'expiring_soon' || (daysUntilExpiry !== undefined && daysUntilExpiry < 30)) {
      return <AlertTriangle size={16} />;
    }
    return <CheckCircle size={16} />;
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getApprovalStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading && suppliers.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Truck size={32} className="text-green-800" />
          Supplier Management
        </h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Plus size={20} />
          Add Supplier
        </button>
      </div>

      {/* Expiring Certifications Banner */}
      {expiringCerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-lg">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowExpiringDetails(!showExpiringDetails)}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-yellow-600" />
              <div>
                <h3 className="font-semibold text-yellow-800">
                  {expiringCerts.length} Certification{expiringCerts.length !== 1 ? 's' : ''} Expiring Soon
                </h3>
                <p className="text-sm text-yellow-700">Within the next 30 days</p>
              </div>
            </div>
            {showExpiringDetails ? (
              <ChevronUp size={20} className="text-yellow-600" />
            ) : (
              <ChevronDown size={20} className="text-yellow-600" />
            )}
          </div>

          {showExpiringDetails && (
            <div className="mt-4 bg-white rounded-lg p-4">
              <div className="space-y-3">
                {expiringCerts.map((cert) => (
                  <div key={cert.id} className="flex items-between justify-between pb-3 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{cert.supplier_name}</p>
                      <p className="text-sm text-gray-600">
                        {cert.cert_name} • Expires {new Date(cert.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getCertStatusColor(cert.status, cert.days_until_expiry)}`}>
                      {getCertStatusIcon(cert.status, cert.days_until_expiry)}
                      {cert.days_until_expiry} days
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="Produce">Produce</option>
              <option value="Packaging">Packaging</option>
              <option value="Chemical">Chemical</option>
              <option value="Service">Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers List */}
        <div className="lg:col-span-2">
          {showAddForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus size={24} className="text-green-800" />
                Add New Supplier
              </h2>
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                    <input
                      type="text"
                      value={supplierFormData.code}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={supplierFormData.name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_name}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Type</label>
                    <select
                      value={supplierFormData.supplier_type}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, supplier_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Produce">Produce</option>
                      <option value="Packaging">Packaging</option>
                      <option value="Chemical">Chemical</option>
                      <option value="Service">Service</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={supplierFormData.notes}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-800 text-white py-2 rounded-lg hover:bg-green-700 transition font-medium"
                  >
                    Save Supplier
                  </button>
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-green-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Supplier</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Certs</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Next Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-green-50 cursor-pointer transition"
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      fetchSupplierDetails(supplier.id);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{supplier.name}</p>
                        <p className="text-sm text-gray-600">{supplier.contact_name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{supplier.code}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {supplier.supplier_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getApprovalStatusColor(supplier.approval_status)}`}>
                        {supplier.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Shield size={16} className="text-green-600" />
                        <span className="font-medium">{supplier.cert_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {supplier.next_expiry ? (
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          {new Date(supplier.next_expiry).toLocaleDateString()}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {suppliers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Truck size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">No suppliers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Supplier Details Panel */}
        {selectedSupplier && (
          <div className="bg-white rounded-lg shadow overflow-hidden sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
            <div className="p-6 border-b bg-green-50">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{selectedSupplier.name}</h2>
              <p className="text-sm text-gray-600">{selectedSupplier.code}</p>
            </div>

            <div className="p-6 space-y-4 border-b">
              <div>
                <p className="text-sm text-gray-600">Contact Person</p>
                <p className="font-medium text-gray-900">{selectedSupplier.contact_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{selectedSupplier.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{selectedSupplier.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{selectedSupplier.address}</p>
              </div>
              {selectedSupplier.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="font-medium text-gray-900">{selectedSupplier.notes}</p>
                </div>
              )}
            </div>

            {/* Approval Status Management */}
            {isAdmin && (
              <div className="p-6 border-b">
                <p className="text-sm font-semibold text-gray-700 mb-3">Approval Status</p>
                <div className="flex gap-2 flex-wrap">
                  {['Pending', 'Approved', 'Suspended'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateApprovalStatus(selectedSupplier.id, status)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                        selectedSupplier.approval_status === status
                          ? 'bg-green-800 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Shield size={18} className="text-green-700" />
                  Certifications ({certifications.length})
                </h3>
                <button
                  onClick={() => setShowCertForm(!showCertForm)}
                  className="bg-green-800 text-white p-2 rounded-lg hover:bg-green-700 transition"
                  title="Add Certification"
                >
                  <Plus size={16} />
                </button>
              </div>

              {showCertForm && (
                <form onSubmit={handleAddCertification} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cert Type</label>
                      <input
                        type="text"
                        value={certFormData.cert_type}
                        onChange={(e) => setCertFormData({ ...certFormData, cert_type: e.target.value })}
                        placeholder="e.g., FSSC22000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cert Name</label>
                      <input
                        type="text"
                        value={certFormData.cert_name}
                        onChange={(e) => setCertFormData({ ...certFormData, cert_name: e.target.value })}
                        placeholder="e.g., Food Safety System Certification"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Body</label>
                      <input
                        type="text"
                        value={certFormData.issuing_body}
                        onChange={(e) => setCertFormData({ ...certFormData, issuing_body: e.target.value })}
                        placeholder="e.g., Cert Body Inc"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cert Number</label>
                      <input
                        type="text"
                        value={certFormData.cert_number}
                        onChange={(e) => setCertFormData({ ...certFormData, cert_number: e.target.value })}
                        placeholder="e.g., ABC-123456"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                        <input
                          type="date"
                          value={certFormData.issue_date}
                          onChange={(e) => setCertFormData({ ...certFormData, issue_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={certFormData.expiry_date}
                          onChange={(e) => setCertFormData({ ...certFormData, expiry_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Alert Days Before</label>
                      <input
                        type="number"
                        value={certFormData.alert_days_before}
                        onChange={(e) => setCertFormData({ ...certFormData, alert_days_before: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-green-800 text-white py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Add Cert
                    </button>
                    <button
                      type="button"
                      onClick={resetCertForm}
                      className="flex-1 bg-gray-300 text-gray-900 py-2 rounded-lg hover:bg-gray-400 transition text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {certLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                </div>
              ) : certifications.length > 0 ? (
                <div className="space-y-3">
                  {certifications.map((cert) => {
                    const daysUntil = getDaysUntilExpiry(cert.expiry_date);
                    return (
                      <div key={cert.id} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{cert.cert_name}</p>
                            <p className="text-xs text-gray-600">{cert.cert_type}</p>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getCertStatusColor(cert.status, daysUntil)}`}>
                            {getCertStatusIcon(cert.status, daysUntil)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1 mb-2">
                          <p>Number: {cert.cert_number}</p>
                          <p>Body: {cert.issuing_body}</p>
                          <p>Issued: {new Date(cert.issue_date).toLocaleDateString()}</p>
                          <p className="font-medium">Expires: {new Date(cert.expiry_date).toLocaleDateString()}</p>
                          <p className={`font-medium ${daysUntil < 0 ? 'text-red-600' : daysUntil < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {daysUntil < 0 ? `Expired ${Math.abs(daysUntil)} days ago` : `${daysUntil} days remaining`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600 text-center py-4">No certifications</p>
              )}
            </div>

            {/* Delete Button */}
            <div className="p-6">
              <button
                onClick={() => handleDeleteSupplier(selectedSupplier.id)}
                className="w-full flex items-center justify-center gap-2 bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition font-medium"
              >
                <Trash2 size={18} />
                Delete Supplier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
