import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, ChevronDown, User, Settings, Search, Bell, Clock, Home, FileText, Users as UsersIcon, ClipboardCheck, AlertTriangle, Building2, Shield } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore, useModuleStore } from '@/store';
import { notificationsAPI, searchAPI } from '@/api';

// Search result type icons & labels
const searchTypeIcons: Record<string, React.ReactNode> = {
  user: <User size={14} className="text-indigo-500" />,
  supplier: <UsersIcon size={14} className="text-blue-500" />,
  facility: <Building2 size={14} className="text-green-500" />,
  sop: <FileText size={14} className="text-purple-500" />,
  checklist: <ClipboardCheck size={14} className="text-teal-500" />,
  capa: <AlertTriangle size={14} className="text-orange-500" />,
  audit: <Shield size={14} className="text-red-500" />,
};
const searchTypeLabels: Record<string, string> = {
  user: 'Employees', supplier: 'Suppliers', facility: 'Facilities', sop: 'Documents',
  checklist: 'Checklists', capa: 'CAPA', audit: 'Audits',
};

interface NavItem {
  to: string;
  label: string;
  moduleKey?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  roles: string[];
}

const allNavGroups: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/pre-harvest', label: 'Pre-Harvest', moduleKey: 'pre_harvest' },
      { to: '/chemicals', label: 'Chemicals', moduleKey: 'chemicals' },
      { to: '/checklists', label: 'Checklists', moduleKey: 'checklists' },
      { to: '/supply-master', label: 'Supply Master', moduleKey: 'supply_master' },
    ],
    roles: ['worker', 'farmer', 'supervisor', 'fsqa', 'management', 'admin'],
  },
  {
    label: 'Compliance',
    items: [
      { to: '/audit-checklist', label: 'Audit Checklist', moduleKey: 'audit_checklist' },
      { to: '/sops', label: 'SOP Hub', moduleKey: 'sops' },
      { to: '/gap-analysis', label: 'Gap Analysis', moduleKey: 'gap_analysis' },
      { to: '/audit-simulator', label: 'Audit Simulator', moduleKey: 'audit_simulator' },
      { to: '/compliance', label: 'Compliance Dashboard', moduleKey: 'compliance_dashboard' },
      { to: '/compliance-reporting', label: 'Compliance Reporting', moduleKey: 'compliance_reporting' },
    ],
    roles: ['fsqa', 'management', 'admin'],
  },
  {
    label: 'Management',
    items: [
      { to: '/corrective-actions', label: 'Corrective Actions', moduleKey: 'corrective_actions' },
      { to: '/suppliers', label: 'Suppliers', moduleKey: 'suppliers' },
      { to: '/facilities', label: 'Facilities', moduleKey: 'facilities' },
      { to: '/reports', label: 'Reports', moduleKey: 'reports' },
      { to: '/training', label: 'Training', moduleKey: 'training' },
    ],
    roles: ['supervisor', 'fsqa', 'management', 'admin'],
  },
  {
    label: 'Setup',
    items: [
      { to: '/admin', label: 'Users' },
      { to: '/admin/roles', label: 'Roles' },
      { to: '/admin/transactions', label: 'Transaction Config' },
      { to: '/admin/modules', label: 'Modules' },
      { to: '/admin/audit', label: 'Audit' },
    ],
    roles: ['admin'],
  },
];

function getNavGroups(role: string, enabledModules: Set<string>): NavGroup[] {
  return allNavGroups
    .filter((g) => g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => !item.moduleKey || enabledModules.has(item.moduleKey)),
    }))
    .filter((g) => g.items.length > 0);
}

// Page label map for recent history display
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pre-harvest': 'Pre-Harvest Logs',
  '/chemicals': 'Chemical Tracking',
  '/checklists': 'Digital Checklists',
  '/supply-master': 'Supply Master',
  '/audit-checklist': 'Audit Checklist',
  '/sops': 'SOP Hub',
  '/gap-analysis': 'Gap Analysis',
  '/audit-simulator': 'Audit Simulator',
  '/compliance': 'Compliance Dashboard',
  '/compliance-reporting': 'Compliance Reporting',
  '/corrective-actions': 'Corrective Actions',
  '/suppliers': 'Suppliers',
  '/facilities': 'Facilities',
  '/reports': 'Reports',
  '/training': 'Training',
  '/admin': 'User Management',
  '/admin/roles': 'Roles',
  '/admin/transactions': 'Transaction Config',
  '/admin/modules': 'Modules',
  '/admin/audit': 'Audit Log',
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredDropdown, setHoveredDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, any[]>>({});
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const globalModules = useModuleStore((s) => s.enabledModules);
  const modulesLoaded = useModuleStore((s) => s.loaded);
  // Use global store if loaded AND non-empty, otherwise show all modules as fallback
  const allModuleKeys = new Set(allNavGroups.flatMap(g => g.items.filter(i => i.moduleKey).map(i => i.moduleKey!)));
  const enabledModules = (modulesLoaded && globalModules.size > 0)
    ? globalModules
    : allModuleKeys;
  const [recentPages, setRecentPages] = useState<{ path: string; label: string; time: number }[]>(() => {
    try {
      const saved = sessionStorage.getItem('fsqa_recent_pages');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [recentOpen, setRecentOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Track recent page visits (persisted to sessionStorage)
  useEffect(() => {
    const path = location.pathname;
    const label = PAGE_LABELS[path];
    if (!label) return;

    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.path !== path);
      const updated = [{ path, label, time: Date.now() }, ...filtered].slice(0, 10);
      try { sessionStorage.setItem('fsqa_recent_pages', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [location.pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setRecentOpen(false);
    setSearchFocused(false);
    setSearchQuery('');
    setSearchResults({});
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
        setRecentOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inline search: debounced API call
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults({}); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchAPI.search(searchQuery);
        setSearchResults(res.data.results || {});
      } catch { setSearchResults({}); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === 'Escape' && searchFocused) {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchFocused]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await notificationsAPI.getAll(true);
        setNotifications(res.data?.notifications || []);
      } catch {}
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Modules are now fetched once at app boot via useModuleStore (in App.tsx)

  // Hover dropdown handlers with delay for smooth UX
  const handleMouseEnter = useCallback((label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredDropdown(label);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setHoveredDropdown(null);
    }, 150);
  }, []);

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;
  const isGroupActive = (group: NavGroup) => group.items.some((item) => isActive(item.to));
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      <header className="shadow-md" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TOP BAR — White: Logo | Search | User                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14 gap-4">

              {/* Left: Logo + Portal name */}
              <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
                <img
                  src="/nobackgound-Goodness%20Gardens%20(630x630)%20(1).png"
                  alt="Goodness Gardens"
                  className="h-10 w-auto"
                />
                <span className="hidden sm:inline text-base font-bold" style={{ color: '#1A3A5C' }}>
                  FSQA Portal
                </span>
              </Link>

              {/* Center: Inline Global Search Bar */}
              <div ref={searchRef} className="flex-1 max-w-xl mx-auto hidden md:block relative">
                <div className={`flex items-center gap-3 px-4 py-2 border rounded-md text-sm transition ${
                  searchFocused ? 'bg-white border-blue-400 shadow-sm ring-2 ring-blue-100' : 'bg-gray-100 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}>
                  <Search size={16} className="text-gray-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    placeholder="Search records, SOPs, reports..."
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(''); setSearchResults({}); searchInputRef.current?.focus(); }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {!searchQuery && (
                    <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] text-gray-400 font-mono">
                      Ctrl+K
                    </kbd>
                  )}
                </div>

                {/* Inline search results dropdown */}
                {searchFocused && (searchQuery.length >= 2 || searchQuery.length === 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    {searchQuery.length < 2 ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-400">
                        Type to search suppliers, documents, checklists, audits...
                      </div>
                    ) : searchLoading ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-400">
                        <span className="inline-block animate-spin mr-2">⟳</span>Searching...
                      </div>
                    ) : Object.keys(searchResults).length === 0 ? (
                      <div className="px-4 py-4 text-center text-sm text-gray-400">No results found</div>
                    ) : (
                      <div className="max-h-[50vh] overflow-y-auto">
                        {Object.entries(searchResults).map(([type, items]) => (
                          <div key={type}>
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-100">
                              {searchTypeLabels[type] || type} ({items.length})
                            </div>
                            {items.map((item: any) => (
                              <button
                                key={`${item.entity_type}-${item.entity_id}`}
                                onClick={() => {
                                  navigate(item.url || '/dashboard');
                                  setSearchFocused(false);
                                  setSearchQuery('');
                                  setSearchResults({});
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 text-left transition"
                              >
                                <span className="shrink-0">{searchTypeIcons[type] || <FileText size={14} />}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                                  {item.subtitle && <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>}
                                </div>
                                {item.tags && <span className="text-[11px] text-gray-400 shrink-0">{item.tags}</span>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: hamburger + search */}
              <div className="flex items-center gap-2 md:hidden ml-auto">
                <button
                  onClick={() => { setSearchFocused(true); }}
                  className="p-2 rounded hover:bg-gray-100 transition"
                >
                  <Search size={20} className="text-gray-600" />
                </button>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded hover:bg-gray-100 transition"
                >
                  {mobileMenuOpen ? <X size={22} className="text-gray-700" /> : <Menu size={22} className="text-gray-700" />}
                </button>
              </div>

              {/* Right: Notification bell + User info */}
              <div className="hidden md:flex items-center gap-3 shrink-0">
                {/* Notification bell */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => setNotifOpen(!notifOpen)}
                    className="relative p-2 rounded-md hover:bg-gray-100 transition"
                  >
                    <Bell size={18} className="text-gray-600" />
                    {notifications.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                        {notifications.length > 9 ? '9+' : notifications.length}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[320px] max-h-[400px] overflow-y-auto z-50">
                      <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">Notifications</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={async () => {
                              try { await notificationsAPI.markAllRead(); setNotifications([]); } catch {}
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">No new notifications</div>
                      ) : (
                        notifications.slice(0, 10).map((n: any) => (
                          <div key={n.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                n.type === 'critical' || n.type === 'expiry' ? 'bg-red-500' :
                                n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 font-medium truncate">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-xs text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</p>
                              </div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try { await notificationsAPI.markRead(n.id); setNotifications(prev => prev.filter(x => x.id !== n.id)); } catch {}
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-gray-200" />

                {/* User info + dropdown */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: '#1A3A5C' }}>
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-semibold text-gray-800 leading-tight">{user.first_name} {user.last_name}</div>
                      <div className="text-[11px] text-gray-500 leading-tight">
                        {(user as any).title || roleLabel}
                      </div>
                    </div>
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[220px] z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{(user as any).title || roleLabel} &middot; {roleLabel}</div>
                      </div>
                      <Link
                        to="/admin"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                      >
                        <Settings size={14} />
                        Setup
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
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* BOTTOM BAR — Dark: Clock | Home | Nav tabs with hover menus   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="hidden md:block text-white" style={{ backgroundColor: '#1A3A5C' }}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-10 gap-0">

              {/* Recent Transactions (Clock icon) */}
              <div ref={recentRef} className="relative">
                <button
                  onClick={() => setRecentOpen(!recentOpen)}
                  className="flex items-center justify-center w-10 h-10 hover:bg-white/10 transition"
                  title="Recent Pages"
                >
                  <Clock size={16} />
                </button>
                {recentOpen && recentPages.length > 0 && (
                  <div className="absolute top-full left-0 mt-0 bg-white rounded-b-lg shadow-xl border border-gray-200 py-1 min-w-[260px] z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Pages</span>
                    </div>
                    {recentPages.map((p) => (
                      <Link
                        key={p.path}
                        to={p.path}
                        className={`flex items-center justify-between px-3 py-2 text-sm transition ${
                          isActive(p.path) ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{p.label}</span>
                        <span className="text-[10px] text-gray-400">{timeAgo(p.time)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-white/20" />

              {/* Home icon */}
              <Link
                to="/dashboard"
                className={`flex items-center justify-center w-10 h-10 transition ${
                  isActive('/dashboard') ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
                title="Dashboard"
              >
                <Home size={16} />
              </Link>

              {/* Divider */}
              <div className="w-px h-5 bg-white/20" />

              {/* Nav group tabs with HOVER dropdowns */}
              {getNavGroups(user.role, enabledModules).map((group) => (
                <div
                  key={group.label}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(group.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    to={group.items[0]?.to || '/dashboard'}
                    className={`flex items-center gap-1.5 px-4 h-10 text-sm font-medium transition whitespace-nowrap ${
                      isGroupActive(group)
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {group.label}
                    <ChevronDown size={12} className={`transition-transform ${hoveredDropdown === group.label ? 'rotate-180' : ''}`} />
                  </Link>

                  {/* Hover dropdown */}
                  {hoveredDropdown === group.label && (
                    <div
                      className="absolute top-full left-0 mt-0 bg-white rounded-b-lg shadow-xl border border-t-0 border-gray-200 py-1 min-w-[200px] z-50"
                      onMouseEnter={() => handleMouseEnter(group.label)}
                      onMouseLeave={handleMouseLeave}
                    >
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
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MOBILE MENU                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50" style={{ top: '56px' }}>
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative bg-white border-t border-gray-200 shadow-xl max-h-[calc(100vh-56px)] overflow-y-auto">
            {/* User info */}
            <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#1A3A5C' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{user.first_name} {user.last_name}</div>
                <div className="text-xs text-gray-500">{(user as any).title || roleLabel} &middot; {roleLabel}</div>
              </div>
            </div>

            {/* Dashboard link */}
            <Link
              to="/dashboard"
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-gray-100 transition ${
                isActive('/dashboard') ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Home size={16} />
              Dashboard
            </Link>

            {/* Nav groups */}
            {getNavGroups(user.role, enabledModules).map((group) => (
              <div key={group.label} className="border-b border-gray-100">
                <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`block px-6 py-2.5 text-sm transition ${
                      isActive(item.to) ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            {/* Sign out */}
            <div className="px-4 py-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-lg transition text-sm font-medium"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SearchModal removed — inline search is used instead */}
    </>
  );
}
