import React, { useState } from 'react';
import { RuleEvaluation, BoundingBox } from '../../types/compliance';

interface RuleMatrixCardProps {
  evaluations: RuleEvaluation[];
  boundingBoxes?: BoundingBox[];
  backBoundingBoxes?: BoundingBox[];
  activeHoverBoxId: string | null;
  onHoverRule: (boxId: string | null) => void;
}

export const RuleMatrixCard: React.FC<RuleMatrixCardProps> = ({
  evaluations,
  boundingBoxes = [],
  backBoundingBoxes = [],
  activeHoverBoxId,
  onHoverRule
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'tokens'>('rules');

  const passedCount = evaluations.filter((e) => e.status === 'PASS').length;
  const failedCount = evaluations.filter((e) => e.status === 'ISSUE').length;

  const allTokens = [
    ...boundingBoxes.map((b) => ({ ...b, side: b.side || 'front' })),
    ...backBoundingBoxes.map((b) => ({ ...b, side: b.side || 'back' }))
  ];

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-4 shadow-sm select-none border border-slate-200/80 dark:border-slate-800">
      {/* Header with Pass/Fail summary badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            fact_check
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white m-0">
              VERDECT Statutory Compliance Findings
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">LMPC Rules 2011 schedule verification</p>
          </div>
        </div>

        {/* Pass / Fail counters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            {passedCount} PASS
          </span>
          {failedCount > 0 && (
            <span className="text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-800">
              <span className="material-symbols-outlined text-[13px]">cancel</span>
              {failedCount} FAIL
            </span>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">gavel</span>
          Statutory Rules ({evaluations.length})
        </button>
        <button
          onClick={() => setActiveTab('tokens')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tokens'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-sm">document_scanner</span>
          OCR Detected Text ({allTokens.length})
        </button>
      </div>

      {/* Tab 1: Statutory Rules Breakdown with Pass/Fail and Detected Values */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          {evaluations.map((ev) => {
            const isHovered = ev.boundingBoxId && ev.boundingBoxId === activeHoverBoxId;
            const isPass = ev.status === 'PASS';
            const sideKey =
              ev.side ||
              (ev.boundingBoxId && backBoundingBoxes.some((b) => b.id === ev.boundingBoxId)
                ? 'back_0'
                : 'front');

            const getSideLabel = (s: string) => {
              if (s === 'front') return 'Front PDP';
              if (s === 'back_0' || s === 'back') return 'Back Panel';
              if (s === 'back_1') return 'Side Panel 1';
              if (s === 'back_2') return 'Side Panel 2';
              return s.replace('_', ' ').toUpperCase();
            };

            return (
              <div
                key={ev.id}
                onMouseEnter={() => ev.boundingBoxId && onHoverRule(ev.boundingBoxId)}
                onMouseLeave={() => onHoverRule(null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/10 dark:bg-sky-950/20'
                    : isPass
                    ? 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                    : 'border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 hover:border-rose-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                      {ev.ruleCode}
                    </span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2 py-0.5 rounded-md">
                      {getSideLabel(sideKey)}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                      {ev.title}
                    </h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                      isPass
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {isPass ? 'COMPLIANT' : 'INFRACTION'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 leading-tight">
                  {ev.clause}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Detected Inscription:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-words">
                      {ev.detectedValue || 'Not detected'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Statutory Requirement:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {ev.requiredSpecification}
                    </span>
                  </div>
                </div>

                {ev.notes && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 italic flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    {ev.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: OCR Detected Text Tokens */}
      {activeTab === 'tokens' && (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {allTokens.map((token) => {
            const isHovered = token.id === activeHoverBoxId;
            return (
              <div
                key={token.id}
                onMouseEnter={() => onHoverRule(token.id)}
                onMouseLeave={() => onHoverRule(null)}
                className={`p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between gap-3 ${
                  isHovered
                    ? 'border-sky-500 bg-sky-50/20 dark:bg-sky-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      {token.label}
                    </span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      {token.side?.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                    "{token.detectedText}"
                  </p>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                  {(token.confidence * 100).toFixed(0)}% conf
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RuleMatrixCard;
