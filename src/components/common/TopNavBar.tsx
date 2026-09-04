import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { VerdectLogo } from './VerdectLogo';
import { ThemeToggle } from './ThemeToggle';

interface TopNavBarProps {
  onSearch?: (query: string) => void;
  onOpenMobileDrawer?: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({ onSearch, onOpenMobileDrawer }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) onSearch(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/history?search=${encodeURIComponent(searchQuery)}`);
      setMobileSearchOpen(false);
    }
  };

  return (
    <>
      {/* Desktop Top App Bar */}
      <nav className="hidden md:flex bg-white dark:bg-[#0C1526] border-b border-slate-200 dark:border-slate-800 shadow-xs w-full z-40 shrink-0 sticky top-0 transition-colors duration-200">
        <div className="flex justify-between items-center w-full px-6 lg:px-8 py-2.5 max-w-container-max mx-auto">
          {/* Brand & System Badge */}
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:opacity-95 transition-opacity">
              <VerdectLogo variant="horizontal" size="sm" showTagline={true} />
            </Link>
            <span className="hidden xl:inline-flex text-[11px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700/80">
              Legal Metrology (PC) Rules, 2011
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search scans, batch, SKU, rule..."
                className="pl-9 pr-3.5 py-1.5 border border-slate-200 dark:border-slate-700/80 rounded-full bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 text-xs w-56 lg:w-72 transition-all"
              />
            </form>

            {/* Live AI Engine Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                AI Engine: Active
              </span>
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <ThemeToggle showLabel={false} />

            {/* Switch to Admin Panel Link (if user has admin role) */}
            {isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                Admin Console
              </Link>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 relative"
                title="Statutory Alerts & Notifications"
              >
                <span className="material-symbols-outlined text-[19px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Statutory Notifications
                    </span>
                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-bold px-2 py-0.5 rounded-full">
                      2 New
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                    <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        High-Risk Batch Detected
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Batch MC-2026-B88 non-compliant MRP formatting notice queued under Sec 36(1).
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">5 minutes ago</span>
                    </div>
                    <div className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <p className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        Rulebook Definition Synchronized
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Legal Metrology Packaged Commodities 2026 amendments active in VERDECT OCR core.
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">2 hours ago</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile badge */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1 pl-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors border border-slate-200 dark:border-slate-700/80"
              >
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {user?.name || 'Inspector'}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-mono">
                    {user?.badgeNumber || '9402-INSP'}
                  </p>
                </div>
                <img
                  src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="Officer Profile"
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/80 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.jurisdiction}</p>
                  </div>
                  <Link
                    to="/performance"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-[16px] text-sky-500">military_tech</span>
                    Inspector Scorecard
                  </Link>
                  <Link
                    to="/support"
                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="material-symbols-outlined text-[16px] text-teal-500">help</span>
                    Legal Metrology Handbook
                  </Link>
                  <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                  <Link
                    to="/login"
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    Sign Out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white dark:bg-[#0C1526] border-b border-slate-200 dark:border-slate-800 shadow-xs flex justify-between items-center w-full px-3.5 py-2.5 z-40 sticky top-0 transition-colors duration-200">
        <div className="flex items-center gap-2.5">
          {/* Hamburger Drawer Trigger */}
          <button
            onClick={onOpenMobileDrawer}
            type="button"
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all border border-slate-200/80 dark:border-slate-800"
            aria-label="Open navigation menu"
          >
            <span className="material-symbols-outlined text-2xl block">menu</span>
          </button>

          <Link to="/" className="flex items-center gap-1.5">
            <VerdectLogo variant="horizontal" size="xs" showTagline={false} />
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800"
            aria-label="Toggle search"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile Avatar (Triggers drawer or performance page) */}
          <button
            onClick={onOpenMobileDrawer}
            className="rounded-full border border-sky-500/50 p-0.5"
            aria-label="Open profile"
          >
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Profile"
              className="w-7 h-7 rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Expandable Mobile Search Bar */}
      {mobileSearchOpen && (
        <div className="md:hidden p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search scans, batch, SKU, clause..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Search
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default TopNavBar;
