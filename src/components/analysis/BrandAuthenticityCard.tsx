import React from 'react';
import { BrandAuthenticityMetrics } from '../../types/compliance';

export interface BrandAuthenticityCardProps {
  metrics: BrandAuthenticityMetrics;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export const BrandAuthenticityCard: React.FC<BrandAuthenticityCardProps> = ({
  metrics,
  isHovered,
  onHover,
  onLeave
}) => {
  const isGenuine = metrics.status === 'GENUINE';

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`glass-card rounded-2xl p-5 flex flex-col gap-3.5 shadow-sm border transition-all cursor-pointer select-none ${
        isHovered
          ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/10 dark:bg-sky-950/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-lg">verified_user</span>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white m-0">
            Brand Authenticity &amp; Trademark Match
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isGenuine
              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          {metrics.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Matched Trademark</span>
          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate">
            {metrics.brandDetected}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{metrics.registeredOwner}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Optical Similarity</span>
          <span className="font-mono text-base sm:text-lg font-black text-sky-600 dark:text-sky-400">
            {metrics.similarityScore.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono">{(metrics.confidence * 100).toFixed(0)}% Conf</span>
        </div>
      </div>

      {metrics.details && metrics.details.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Verification Evidence</span>
          <div className="space-y-1">
            {metrics.details.map((detail, i) => (
              <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5 leading-tight">
                <span className="material-symbols-outlined text-[13px] text-emerald-500 shrink-0 mt-0.5">check</span>
                <span>{detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandAuthenticityCard;
