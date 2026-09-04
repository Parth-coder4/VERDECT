import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        title={`Current mode: ${theme}. Click to switch to ${isDark ? 'Light' : 'Dark'} mode.`}
        aria-label="Toggle Dark Mode"
      >
        {isDark ? (
          <span className="material-symbols-outlined text-[19px] text-amber-400 transform rotate-0 transition-transform duration-300">
            light_mode
          </span>
        ) : (
          <span className="material-symbols-outlined text-[19px] text-sky-600 dark:text-sky-400 transform -rotate-12 transition-transform duration-300">
            dark_mode
          </span>
        )}
        {showLabel && (
          <span className="text-xs font-bold capitalize select-none hidden sm:inline">
            {isDark ? 'Dark' : 'Light'}
          </span>
        )}
      </button>
    </div>
  );
};
