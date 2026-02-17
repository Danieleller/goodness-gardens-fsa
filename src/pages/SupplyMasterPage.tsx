import { useEffect, useState } from 'react';
import { Search, AlertCircle, Loader } from 'lucide-react';
import { netsuiteAPI } from '@/api';

interface SupplyMasterRecord {
  [key: string]: any;
}

interface ApiResponse {
  totalResults?: number;
  pageSize?: number;
  pageIndex?: number;
  records?: SupplyMasterRecord[];
  [key: string]: any;
}

export function SupplyMasterPage() {
  const [data, setData] = useState<SupplyMasterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalResults, setTotalResults] = useState(0);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    fetchSupplyMasterData();
  }, [currentPage, pageSize]);

  const fetchSupplyMasterData = async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = currentPage * pageSize;
      const response = await netsuiteAPI.supplyMaster({ limit: pageSize, offset });

      if (response.data.records) {
        setData(response.data.records);

        if (response.data.records.length > 0) {
          const recordColumns = Object.keys(response.data.records[0]).filter(
            (col) => !col.startsWith('_') && col !== 'id'
          );
          setColumns(recordColumns);
        }

        if (response.data.totalResults) {
          setTotalResults(response.data.totalResults);
        }
      } else if (Array.isArray(response.data)) {
        setData(response.data);
        if (response.data.length > 0) {
          const recordColumns = Object.keys(response.data[0]).filter(
            (col) => !col.startsWith('_') && col !== 'id'
          );
          setColumns(recordColumns);
        }
      }
    } catch (err) {
      console.error('Failed to fetch supply master data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supply master data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter((record) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(record).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalResults / pageSize);

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Supply Master FSQA</h1>
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

        {/* Search and Filter */}
        {!loading && data.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search supply master records..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="animate-spin text-blue-600 mb-4" size={40} />
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
          <>
            <div className="rounded-lg border border-gray-200 overflow-hidden shadow-md">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#1A3A5C' }}>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-6 py-3 text-left text-sm font-semibold text-white whitespace-nowrap"
                        >
                          {col.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((record, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-blue-50 transition"
                      >
                        {columns.map((col) => (
                          <td
                            key={`${idx}-${col}`}
                            className="px-6 py-4 text-sm text-gray-900"
                          >
                            {record[col] ? String(record[col]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {currentPage * pageSize + 1} to{' '}
                  {Math.min((currentPage + 1) * pageSize, totalResults)} of {totalResults} records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                  </div>
                  <button
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#f0f4f8' }}>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{filteredData.length}</span> records displayed
                {searchTerm && (
                  <>
                    {' '}
                    (filtered from <span className="font-semibold">{data.length}</span> total)
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
