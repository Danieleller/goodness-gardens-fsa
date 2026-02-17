import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store';

const navGroups = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/pre-harvest', label: 'Pre-Harvest' },
      { to: '/chemicals', label: 'Chemicals' },
      { to: '/checklists', label: 'Checklists' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/sops', label: 'SOP Hub' },
      { to: '/gap-analysis', label: 'Gap Analysis' },
      { to: '/audit-simulator', label: 'Audit Simulator' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/corrective-actions', label: 'Corrective Actions' },
      { to: '/suppliers', label: 'Suppliers' },
      { to: '/facilities', label: 'Facilities' },
      { to: '/reports', label: 'Reports' },
    ],
  },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-3 font-bold text-xl shrink-0">
            <img src="/logo.svg" alt="Goodness Gardens" className="w-9 h-9 rounded-full" />
            <span className="hidden lg:inline">FSQA Portal</span>
          </Link>

          <button
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav ref={dropdownRef} className="hidden lg:flex items-center gap-1">
            {navGroups.map((group) => (
              <div key={group.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition ${
                    group.items.some((item) => isActive(item.to)) ? 'bg-green-700' : ''
                  }`}
                >
                  {group.label}
                  <ChevronDown size={14} className={`transition-transform ${openDropdown === group.label ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === group.label && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`block px-4 py-2 text-sm transition ${
                          isActive(item.to)
                            ? 'bg-green-50 text-green-800 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition ${
                  isActive('/admin') ? 'bg-green-700' : ''
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <span className="text-sm">{user.first_name} {user.last_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-green-700 bg-green-800 px-4 pb-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mt-3">
              <div className="text-green-300 text-xs font-semibold uppercase tracking-wider mb-1">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block py-2 px-3 rounded-lg text-sm transition ${
                    isActive(item.to) ? 'bg-green-700 font-semibold' : 'hover:bg-green-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          {user.role === 'admin' && (
            <div className="mt-3">
              <div className="text-green-300 text-xs font-semibold uppercase tracking-wider mb-1">Admin</div>
              <Link to="/admin" className="block py-2 px-3 rounded-lg text-sm hover:bg-green-700">
                User Management
              </Link>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-green-700 flex items-center justify-between">
            <span className="text-sm">{user.first_name} {user.last_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg transition text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
