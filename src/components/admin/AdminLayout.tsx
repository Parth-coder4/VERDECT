import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { VerdectLogo } from '../common/VerdectLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { formatAuditTimestamp } from '../../utils/dateUtils';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [newAuditModalOpen, setNewAuditModalOpen] = useState(false);

  // Close mobile menu on location change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getHeaderTitle = () => {
    if (location.pathname.includes('/admin/rulebook')) return 'Rulebook Management';
    if (location.pathname.includes('/admin/reports')) return 'Regulatory Reports & Analytics';
    if (location.pathname.includes('/admin/logs')) return 'System Audit Logs';
    return 'Inspector Oversight & Roster';
  };

  const getSearchPlaceholder = () => {
    if (location.pathname.includes('/admin/rulebook')) return 'Search rules, protocols...';
    if (location.pathname.includes('/admin/reports')) return 'Search reports ID, subject...';
    return 'Search system...';
  };

  const navItems = [
    {
      to: '/admin/oversight',
      label: 'INSPECTOR OVERSIGHT',
      icon: 'shield',
      aliasMatch: ['/admin', '/admin/oversight']
    },
    {
      to: '/admin/rulebook',
      label: 'RULEBOOK MANAGEMENT',
      icon: 'tune',
      aliasMatch: ['/admin/rulebook']
    },
    {
      to: '/admin/logs',
      label: 'SYSTEM LOGS',
      icon: 'receipt_long',
      aliasMatch: ['/admin/logs']
    },
    {
      to: '/admin/reports',
      label: 'REPORTS & ANALYTICS',
      icon: 'bar_chart',
      aliasMatch: ['/admin/reports']
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-[#070D19] text-slate-800 dark:text-slate-100 overflow-hidden font-sans select-none transition-colors duration-200">
      {/* Mobile Navigation Drawer for Admin */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 w-[82%] max-w-sm bg-white dark:bg-[#0C1526] border-r border-slate-200 dark:border-slate-800 p-5 shadow-2xl flex flex-col justify-between z-50 animate-in slide-in-from-left duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <VerdectLogo variant="icon" size="sm" />
                  <div>
                    <h2 className="text-xs font-black text-slate-900 dark:text-white">VERDECT Admin</h2>
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase">
                      Directorate Console
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-2xl">close</span>
                </button>
              </div>

              {/* Admin Nav Items */}
              <nav className="flex flex-col gap-1 py-1">
                {navItems.map((item) => {
                  const isActive =
                    item.aliasMatch.includes(location.pathname) ||
                    (item.to === '/admin/oversight' && location.pathname === '/admin');

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20 font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[19px]"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                Switch to Field Portal
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setNewAuditModalOpen(true);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Deploy New Audit
              </button>

              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Theme Mode</span>
                <ThemeToggle showLabel={true} />
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white dark:bg-[#0C1526] border-r border-slate-200 dark:border-slate-800/90 flex flex-col justify-between h-full py-5 px-3.5 shrink-0 hidden md:flex">
        <div className="space-y-5">
          {/* Brand header */}
          <div className="flex items-center gap-3 px-2">
            <VerdectLogo variant="icon" size="sm" />
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                VERDECT Admin
              </h2>
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider">
                Directorate Console
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                item.aliasMatch.includes(location.pathname) ||
                (item.to === '/admin/oversight' && location.pathname === '/admin');

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold tracking-wide transition-all ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[19px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Actions */}
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/"
            className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-sm">swap_horiz</span>
            Switch to Field Portal
          </Link>

          <button
            onClick={() => setNewAuditModalOpen(true)}
            className="w-full py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
          >
            <span className="material-symbols-outlined text-sm font-black">add</span>
            Deploy New Audit
          </button>

          <div className="space-y-0.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[17px]">logout</span>
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-[#0C1526] border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors duration-200">
          {/* Title & Mobile Hamburger Button */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              type="button"
              className="p-2 md:hidden text-slate-700 dark:text-slate-200 hover:text-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
              aria-label="Open Admin Menu"
            >
              <span className="material-symbols-outlined text-2xl block">menu</span>
            </button>
            <h1 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
              {getHeaderTitle()}
            </h1>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={getSearchPlaceholder()}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle showLabel={false} />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 relative"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 font-bold text-xs text-slate-900 dark:text-white">
                    Regulatory Admin Notifications
                  </div>
                  <div className="p-3 text-xs text-slate-600 dark:text-slate-300">
                    All administrative services synchronized.
                  </div>
                </div>
              )}
            </div>

            {/* Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.name || 'Director Rajesh'}
                  </p>
                  <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase">
                    Admin Authority
                  </p>
                </div>
                <img
                  src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Administrator'}</p>
                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono">{user?.badgeNumber || 'ADMIN-DIR-01'}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Logged in: <strong className="text-slate-700 dark:text-slate-300">{formatAuditTimestamp(user?.lastLogin).timeOnly}</strong> ({formatAuditTimestamp(user?.lastLogin).relativeTime})
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/"
                      className="block px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                    >
                      Field Inspector Portal
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-[#070D19] transition-colors duration-200">
          <Outlet />
        </main>
      </div>

      {/* Schedule Audit Modal */}
      {newAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-base text-slate-900 dark:text-white">Schedule Regulatory Audit</h3>
              <button onClick={() => setNewAuditModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Deploy inspection order to regional field enforcement teams under LMPC 2011.
            </p>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Target Entity / Facility</label>
                <input
                  type="text"
                  placeholder="e.g. Tata Consumer Products Central Hub"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Assign Lead Inspector</label>
                <select className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white">
                  <option>Insp. Elena Rodriguez (VRD-8472)</option>
                  <option>Insp. Vikram Malhotra (VRD-9402)</option>
                  <option>Insp. Sarah Chen (VRD-9934)</option>
                  <option>Insp. David Patel (VRD-1102)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Audit Protocol Type</label>
                <select className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white">
                  <option>Surprise Statutory Inspection (Sec 36)</option>
                  <option>Routine Mandatory Packaging Audit (LMPC 2011)</option>
                  <option>Follow-up Compliance Check</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setNewAuditModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Audit deployment dispatched to field inspector.');
                  setNewAuditModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md"
              >
                Deploy Audit Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;
