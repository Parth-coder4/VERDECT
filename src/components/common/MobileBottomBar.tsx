import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCompliance } from '../../context/ComplianceContext';

interface MobileBottomBarProps {
  onOpenDrawer: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onOpenDrawer }) => {
  const { violations } = useCompliance();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0C1526]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/90 shadow-2xl px-2 py-1.5 transition-colors duration-200">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Overview */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                dashboard
              </span>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Overview</span>
            </>
          )}
        </NavLink>

        {/* Counterfeit AI */}
        <NavLink
          to="/counterfeit"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                fingerprint
              </span>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Forensic</span>
            </>
          )}
        </NavLink>

        {/* Central Scan CTA Button */}
        <NavLink
          to="/scan"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center -mt-5 transition-transform active:scale-95 ${
              isActive ? 'scale-105' : ''
            }`
          }
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-600 to-cyan-500 p-0.5 shadow-lg shadow-sky-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-gradient-to-tr from-sky-600 to-cyan-500 flex flex-col items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">photo_camera</span>
            </div>
          </div>
          <span className="text-[10px] font-black text-sky-600 dark:text-sky-400 mt-1">Scan</span>
        </NavLink>

        {/* Violations with Badge */}
        <NavLink
          to="/violations"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-3 rounded-2xl relative transition-all duration-150 ${
              isActive
                ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  warning
                </span>
                {violations.length > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                    {violations.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">Notices</span>
            </>
          )}
        </NavLink>

        {/* More Menu (Drawer Trigger) */}
        <button
          onClick={onOpenDrawer}
          type="button"
          className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          aria-label="Open full menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomBar;
