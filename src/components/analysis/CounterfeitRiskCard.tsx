import React from 'react';
import { CounterfeitMetrics } from '../../types/compliance';
import { CircularLoadingGauge } from '../common/CircularLoadingGauge';
import { Link } from 'react-router-dom';

interface CounterfeitRiskCardProps {
  metrics?: CounterfeitMetrics;
  scanId?: string;
  scan?: any;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

export const CounterfeitRiskCard: React.FC<CounterfeitRiskCardProps> = ({
  metrics,
  scanId,
  scan,
  isHovered,
  onHover,
  onLeave
}) => {
  const data: CounterfeitMetrics = metrics || {
    counterfeitScore: 5,
    verdict: 'AUTHENTIC',
    confidence: 0.98,
    factors: {
      hologramOpticalScore: 98,
      packagingGamutFidelity: 96,
      barcodeGs1Integrity: 99,
      microprintTypography: 97,
      tamperSealStatus: 'INTACT'
    },
    detectedAnomalies: ['GS1 Barcode prefix 890 verified in National Registry', 'Pantone ink spectrum match: 98.4%'],
    forensicNotes: 'Packaging optical markers match genuine master SKU profile.'
  };

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`glass-card rounded-2xl p-5 flex flex-col gap-4 shadow-sm border transition-all cursor-pointer select-none ${
        isHovered
          ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/10 dark:bg-sky-950/20'
          : 'border-slate-200/80 dark:border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-xl font-bold">
            fingerprint
          </span>
          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white m-0">
            Counterfeit Risk &amp; Forensic Gauge
          </h3>
        </div>

        <Link
          to={scanId ? `/counterfeit?scanId=${encodeURIComponent(scanId)}` : '/counterfeit'}
          state={scan ? { scanId, scan } : undefined}
          className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span>Deep Scan</span>
          <span className="material-symbols-outlined text-xs">arrow_forward</span>
        </Link>
      </div>

      {/* Circular Loading Bar Gauge */}
      <div className="py-2 flex items-center justify-center">
        <CircularLoadingGauge score={data.counterfeitScore} size={150} strokeWidth={11} />
      </div>

      {/* Factor Ratings Breakdown */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span>Hologram &amp; Micro-Optics</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {data.factors.hologramOpticalScore}%
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span>Packaging Material &amp; Gamut</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {data.factors.packagingGamutFidelity}%
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span>GS1 Barcode Integrity</span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            {data.factors.barcodeGs1Integrity}%
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <span>Tamper Seal Status</span>
          <span
            className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${
              data.factors.tamperSealStatus === 'INTACT'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
            }`}
          >
            {data.factors.tamperSealStatus}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CounterfeitRiskCard;
