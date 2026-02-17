import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronDown, User, Settings } from 'lucide-react';
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
      { to: '/supply-master', label: 'Supply Master' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/audit-checklist', label: 'Audit Checklist' },
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="text-white shadow-lg" style={{ backgroundColor: '#1A3A5C' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link to="/dashboard" className="flex items-center gap-3 font-bold text-xl shrink-0">
            <img src="/nobackground-Goodness%20Gardens%20(630x630)%20(1).png" alt="Goodness Gardens" className="w-9 h-9 rounded-full" />
            <span className="hidden lg:inline text-base font-semibold">FSQA Portal</span>
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
                  className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-medium transition ${
                    group.items.some((item) => isActive(item.to))
                      ? 'bg-white/15'
                      : 'hover:bg-white/10'
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
                            ? 'bg-blue-50 text-blue-800 font-semibold'
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
                className={`px-3 py-2 rounded text-sm font-semibold transition ${
                  isActive('/admin') ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* User dropdown menu */}
          <div ref={userMenuRef} className="hidden lg:block relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/10 transition"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium leading-tight">{user.first_name} {user.last_name}</div>
                {(user as any).title && (
                  <div className="text-xs text-white/70 leading-tight">{(user as any).title}</div>
                )}
              </div>
              <ChevronDown size={14} className={`transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl py-1 min-w-[200px] z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  {(user as any).title && (
                    <div className="text-xs text-gray-400 mt-0.5">{(user as any).title}</div>
                  )}
                </div>
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  <Settings size={14} />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/20 px-4 pb-4" style={{ backgroundColor: '#1A3A5C' }}>
          {navGroups.map((group) => (
            <div key={group.label} className="mt-3">
              <div className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block py-2 px-3 rounded-lg text-sm transition ${
                    isActive(item.to) ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          {user.role === 'admin' && (
            <div className="mt-3">
              <div className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Admin</div>
              <Link to="/admin" className="block py-2 px-3 rounded-lg text-sm hover:bg-white/10">
                User Management
              </Link>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <User size={16} />
              </div>
              <div>
                <div className="text-sm font-medium">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-white/60">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition text-sm"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
