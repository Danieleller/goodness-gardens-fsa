import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-white text-green-800 rounded-lg flex items-center justify-center font-bold">
              FSA
            </div>
            Food Safety Audit Manager
          </Link>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <nav className={`${
            mobileMenuOpen ? 'flex' : 'hidden'
          } md:flex flex-col md:flex-row gap-6 absolute md:static top-16 left-0 right-0 md:top-auto bg-green-800 md:bg-transparent p-4 md:p-0`}>
            <Link to="/dashboard" className="hover:text-green-200 transition">Dashboard</Link>
            <Link to="/pre-harvest" className="hover:text-green-200 transition">Pre-Harvest</Link>
            <Link to="/chemicals" className="hover:text-green-200 transition">Chemicals</Link>
            <Link to="/corrective-actions" className="hover:text-green-200 transition">Corrective Actions</Link>
            <Link to="/reports" className="hover:text-green-200 transition">Reports</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm">{user.first_name} {user.last_name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
