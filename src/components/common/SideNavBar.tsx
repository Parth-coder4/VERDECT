import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCompliance } from '../../context/ComplianceContext';
import { VerdectLogo } from './VerdectLogo';

export const SideNavBar: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { violations } = useCompliance();

  const navItems = [
    { to: '/', label: 'Overview', icon: 'dashboard' },
    { to: '/scan', label: 'Packaging Scan', icon: 'qr_code_scanner' },
    { to: '/counterfeit', label: 'Counterfeit & Brand AI', icon: 'fingerprint' },
    { to: '/registry', label: 'Product Registry', icon: 'inventory_2' },
    {
      to: '/violations',
      label: 'Statutory Violations',
      icon: 'warning',
      badge: violations.length > 0 ? violations.length : undefined
    },
    { to: '/history', label: 'Inspection Archives', icon: 'history' },
    { to: '/performance', label: 'Inspector Analytics', icon: 'insights' }
  ];

  return (
    <aside className="w-64 bg-white dark:bg-[#0C1526] border-r border-slate-200 dark:border-slate-800/90 flex flex-col h-full py-5 px-3.5 shrink-0 hidden md:flex select-none transition-colors duration-200">
      {/* Unit Identity Card */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <VerdectLogo variant="icon" size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs font-black text-slate-900 dark:text-white truncate leading-tight">
              VERDECT Unit
            </h2>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
            {user?.badgeNumber || '9402-INSP'} &bull; {user?.name?.split(' ')[0] || 'Officer'}
          </p>
        </div>
      </div>

      {/* New Scan CTA Button */}
      <Link
        to="/scan"
        className="w-full mb-4 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white transition-all py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 active:scale-[0.98]"
      >
        <span className="material-symbols-outlined text-base">photo_camera</span>
        New Packaging Scan
      </Link>

      {/* Primary Navigation Menu */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 relative group ${
                isActive
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800/80 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="material-symbols-outlined text-[19px] shrink-0"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span className="text-[10px] font-mono px-2 py-0.2 bg-rose-500 text-white rounded-full font-black animate-pulse">
                    {item.badge}
                  </span>
                ) : isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0"></span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mt-2 border border-dashed border-slate-300 dark:border-slate-700"
          >
            <span className="material-symbols-outlined text-[19px] text-sky-500">
              admin_panel_settings
            </span>
            <span className="truncate">Directorate Admin</span>
          </Link>
        )}
      </nav>

      {/* Footer Navigation & SIH Reference */}
      <div className="mt-auto flex flex-col gap-1.5 pt-3 border-t border-slate-200 dark:border-slate-800">
        <NavLink
          to="/support"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`
          }
        >
          <span className="material-symbols-outlined text-[17px]">gavel</span>
          <span className="truncate">Legal Metrology Guide</span>
        </NavLink>

        <Link
          to="/login"
          className="flex items-center gap-2.5 px-3 py-1.5 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-all rounded-xl text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[17px]">logout</span>
          <span>End Shift / Switch</span>
        </Link>

        {/* Statutory Badge */}
        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/60 dark:border-slate-800/80 text-center">
          <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
            Statutory Surveillance Core
          </span>
          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block leading-tight mt-0.5">
            Legal Metrology Rules 2011
          </span>
        </div>
      </div>
    </aside>
  );
};

export default SideNavBar;
