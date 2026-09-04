import React, { useState } from 'react';

export const CanvasLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="absolute top-3 left-3 z-20 select-none">
      {/* Mobile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="sm:hidden px-2.5 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 dark:border-slate-800 text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-xs">palette</span>
        <span>{isExpanded ? 'Hide Taxonomy' : 'Legend'}</span>
      </button>

      {/* Legend Box */}
      <div
        className={`${
          isExpanded ? 'flex' : 'hidden'
        } sm:flex mt-1.5 sm:mt-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-slate-200/80 dark:border-slate-800 flex-col gap-1.5 max-w-[240px] animate-in fade-in zoom-in-95 duration-100`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
          <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            VERDECT Taxonomy
          </span>
          <button
            onClick={() => setIsExpanded(false)}
            className="sm:hidden text-slate-400 p-0.5"
          >
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <div className="w-3 h-3 bg-rose-500/25 border-2 border-rose-600 rounded-sm shrink-0"></div>
          <span>Price / MRP (Defect / Missing Tax)</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <div className="w-3 h-3 bg-sky-500/20 border-2 border-sky-600 rounded-sm shrink-0"></div>
          <span>Brand Name &amp; Trademark</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <div className="w-3 h-3 bg-orange-500/20 border-2 border-orange-600 rounded-sm shrink-0"></div>
          <span>Calories &amp; Nutrition Facts</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <div className="w-3 h-3 bg-purple-500/20 border-2 border-purple-600 rounded-sm shrink-0"></div>
          <span>Net Quantity &amp; Weights</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-300">
          <div className="w-3 h-3 bg-cyan-500/20 border-2 border-cyan-600 rounded-sm shrink-0"></div>
          <span>Manufacturer &amp; Care Details</span>
        </div>
      </div>
    </div>
  );
};

export default CanvasLegend;
