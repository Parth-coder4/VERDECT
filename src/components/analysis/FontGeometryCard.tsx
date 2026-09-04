import React from 'react';
import { FontGeometryMetrics } from '../../types/compliance';

interface FontGeometryCardProps {
  metrics: FontGeometryMetrics;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export const FontGeometryCard: React.FC<FontGeometryCardProps> = ({
  metrics,
  isHovered,
  onHover,
  onLeave
}) => {
  const isPass = metrics.status === 'PASS';

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`glass-card rounded-2xl p-5 flex flex-col gap-3 shadow-sm border transition-all cursor-pointer select-none ${
        isHovered
          ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/10 dark:bg-sky-950/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-lg">format_size</span>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white m-0">
            Rule 12: Principal Display Font Geometry
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isPass
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {isPass ? 'COMPLIANT' : 'FAIL (< MIN)'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Detected Height</span>
          <span className={`font-mono text-base sm:text-lg font-black ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {metrics.detectedHeightMm.toFixed(1)} mm
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">{metrics.targetField}</span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Required Min Height</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            &ge; {metrics.requiredHeightMm.toFixed(1)} mm
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Area: {metrics.packageAreaCm2} cm&sup2;</span>
        </div>
      </div>

      {/* Visual Meter */}
      <div>
        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
          <span>Height Ratio Scale</span>
          <span className="font-mono">{metrics.percentage}% of statutory minimum</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPass ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(metrics.percentage, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-right mt-1 font-semibold text-slate-400 dark:text-slate-500">
          {isPass ? 'Meets Table 1 Schedule Requirements' : 'Fails Statutory Height Specification under Rule 12'}
        </p>
      </div>
    </div>
  );
};

export default FontGeometryCard;
