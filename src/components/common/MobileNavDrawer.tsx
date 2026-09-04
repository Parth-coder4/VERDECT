import React, { useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompliance } from '../../context/ComplianceContext';
import { VerdectLogo } from './VerdectLogo';
import { ThemeToggle } from './ThemeToggle';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const { violations } = useCompliance();
  const location = useLocation();

  // Auto-close drawer on route change
  useEffect(() => {
    if (isOpen) onClose();
  }, [location.pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const navItems = [
    { to: '/', label: 'Surveillance Overview', icon: 'dashboard' },
    { to: '/scan', label: 'Packaging AI Scanner', icon: 'photo_camera' },
    { to: '/counterfeit', label: 'Forensic & Brand Authenticity', icon: 'fingerprint' },
    { to: '/registry', label: 'Commodity SKU Registry', icon: 'inventory_2' },
    {
      to: '/violations',
      label: 'Statutory Violations & Notices',
      icon: 'warning',
      badge: violations.length > 0 ? violations.length : undefined
    },
    { to: '/history', label: 'Inspection Archives', icon: 'history' },
    { to: '/performance', label: 'Inspector Scorecard', icon: 'military_tech' },
    { to: '/support', label: 'Legal Metrology Handbook', icon: 'gavel' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="fixed inset-y-0 left-0 w-[82%] max-w-sm bg-white dark:bg-[#0C1526] border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between p-5 z-50 animate-in slide-in-from-left duration-250 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <VerdectLogo variant="horizontal" size="sm" showTagline={true} />
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close navigation drawer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Inspector Badge Card */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt=""
              className="w-10 h-10 rounded-full border-2 border-sky-500 object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                {user?.name || 'Field Inspector'}
              </h3>
              <p className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-bold truncate">
                Badge: {user?.badgeNumber || '9402-INSP'}
              </p>
              <p className="text-[9px] text-slate-400 truncate mt-0.5">{user?.jurisdiction}</p>
            </div>
          </div>

          {/* Quick Scan CTA */}
          <Link
            to="/scan"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-sky-500/25 active:scale-98 transition-all"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            Launch Packaging Scan
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 overflow-y-auto max-h-[46vh] pr-1 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <span
                        className="material-symbols-outlined text-[19px]"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500 text-white rounded-full font-black animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* Admin Console shortcut for admin users */}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 mt-1"
              >
                <span className="material-symbols-outlined text-[19px] text-sky-500">
                  admin_panel_settings
                </span>
                <span>Directorate Admin Panel</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Drawer Controls */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Theme Mode</span>
            <ThemeToggle showLabel={true} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Link
              to="/login"
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex-1 py-2 px-3 text-center bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Sign Out
            </Link>
          </div>

          <p className="text-[10px] font-mono text-center text-slate-400 dark:text-slate-500">
            VERDECT AI &bull; Legal Metrology Surveillance
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileNavDrawer;
