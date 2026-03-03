import { Download, FileText } from 'lucide-react';

export function ReportsPage() {
  const exportData = async (type: string) => {
    try {
      const response = await fetch(`/api/reports/export?type=${type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const reports = [
    {
      id: 'pre-harvest',
      title: 'Pre-Harvest Logs',
      description: 'Export water tests, soil amendments, worker training, and animal intrusion records',
      icon: '📋',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'chemicals',
      title: 'Chemical Records',
      description: 'Export chemical applications and storage inventory with MRL compliance data',
      icon: '⚗️',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'corrective-actions',
      title: 'Corrective Actions',
      description: 'Export nonconformances and CAPA documentation with verification status',
      icon: '✓',
      color: 'bg-green-50 border-green-200',
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FileText size={32} className="text-green-800" />
          Reports & Exports
        </h1>
        <p className="text-gray-600">Download data in CSV format for analysis and compliance documentation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`border-2 rounded-lg p-6 ${report.color} transition hover:shadow-lg`}
          >
            <div className="text-4xl mb-4">{report.icon}</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{report.title}</h3>
            <p className="text-gray-600 text-sm mb-6">{report.description}</p>
            <button
              onClick={() => exportData(report.id)}
              className="w-full flex items-center justify-center gap-2 bg-green-800 text-white font-medium py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Export Guidelines</h2>
        <ul className="space-y-3 text-gray-600">
          <li className="flex gap-3">
            <span className="text-green-600 font-bold">1.</span>
            <span>All exports include complete records from your account with timestamps</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-600 font-bold">2.</span>
            <span>Data is formatted in CSV for easy import to Excel, Google Sheets, or analysis tools</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-600 font-bold">3.</span>
            <span>Use chemical exports to verify MRL compliance across all applications</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-600 font-bold">4.</span>
            <span>Corrective action exports help track nonconformance closure and verification</span>
          </li>
          <li className="flex gap-3">
            <span className="text-green-600 font-bold">5.</span>
            <span>Keep exports as evidence of compliance for audits and regulatory inspections</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
