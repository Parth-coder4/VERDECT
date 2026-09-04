import React from 'react';
import { ScanRecord, MultilingualToken } from '../../types/compliance';

interface MultilingualDeclarationsCardProps {
  scan: ScanRecord;
  activeHoverBoxId: string | null;
  onHoverRule: (boxId: string | null) => void;
}

const SCRIPT_ICONS: Record<string, { icon: string; bg: string; text: string; border: string }> = {
  Marathi: { icon: 'translate', bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500/30' },
  Hindi: { icon: 'translate', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30' },
  Devanagari: { icon: 'translate', bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30' },
  Tamil: { icon: 'language', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30' },
  Telugu: { icon: 'language', bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-500/30' },
  Gujarati: { icon: 'language', bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-500/30' },
  Bengali: { icon: 'language', bg: 'bg-pink-500/10 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-500/30' },
  Latin: { icon: 'spellcheck', bg: 'bg-sky-500/10 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-500/30' },
  Default: { icon: 'g_translate', bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/30' },
};

export const MultilingualDeclarationsCard: React.FC<MultilingualDeclarationsCardProps> = ({
  scan,
  activeHoverBoxId,
  onHoverRule
}) => {
  // Collect all multilingual tokens from scan record
  const tokens: MultilingualToken[] = React.useMemo(() => {
    if (scan.multilingualTokens && scan.multilingualTokens.length > 0) {
      return scan.multilingualTokens;
    }
    if (scan.multilingual_tokens && scan.multilingual_tokens.length > 0) {
      return scan.multilingual_tokens;
    }
    // Fallback: extract from boundingBoxes if flagged or containing Indic characters
    return scan.boundingBoxes
      .filter((b) => b.is_multilingual || /[\u0900-\u0D7F]/.test(b.detectedText))
      .map((b) => ({
        id: b.id,
        text: b.detectedText,
        script: b.script || 'Devanagari (Indic)',
        language: b.language || 'hi',
        confidence: b.confidence,
        category: b.category,
        side: b.side
      }));
  }, [scan]);

  const detectedLangs = React.useMemo(() => {
    const list = scan.detectedLanguages || scan.detected_languages || [];
    if (list.length > 0) return list;
    if (tokens.length > 0) {
      return Array.from(new Set(tokens.map((t) => t.script)));
    }
    return ['Latin (English)'];
  }, [scan, tokens]);

  const hasIndic = tokens.length > 0 || detectedLangs.some((l) => !l.startsWith('Latin'));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm transition-all duration-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-lg">translate</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Multilingual Declarations (बहुभाषी घोषणाएं)
              {hasIndic && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-full">
                  Indic Detected
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              LMPC Rule 6(2) compliance for Hindi, Marathi &amp; regional official language declarations
            </p>
          </div>
        </div>

        {/* Detected Script Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {detectedLangs.map((lang, idx) => {
            const key = Object.keys(SCRIPT_ICONS).find((k) => lang.includes(k)) || 'Default';
            const style = SCRIPT_ICONS[key];
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
              >
                <span className="material-symbols-outlined text-xs">{style.icon}</span>
                <span>{lang}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Body: Token List or Zero State */}
      {tokens.length === 0 ? (
        <div className="py-4 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Standard Monolingual (English / Latin) Packaging
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            No secondary Indic script declarations detected. English statutory declarations satisfy Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tokens.map((token, idx) => {
              const isHovered = activeHoverBoxId === token.id;
              const scriptKey = Object.keys(SCRIPT_ICONS).find((k) => token.script.includes(k)) || 'Default';
              const style = SCRIPT_ICONS[scriptKey];

              return (
                <div
                  key={token.id || idx}
                  onMouseEnter={() => onHoverRule(token.id)}
                  onMouseLeave={() => onHoverRule(null)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-400/20'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {token.script}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      OCR: {Math.round(token.confidence * 100)}%
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                    {token.text}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Field: {token.category}
                    </span>
                    {token.side && (
                      <span className="text-slate-400 dark:text-slate-500 font-mono">
                        Panel: {token.side}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2 p-2.5 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 rounded-xl flex items-start gap-2 text-[11px] text-sky-800 dark:text-sky-300">
            <span className="material-symbols-outlined text-sm text-sky-600 dark:text-sky-400 shrink-0 mt-0.5">
              info
            </span>
            <span>
              Under <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>, mandatory declarations may be in English or Hindi (Devanagari script), or in an official regional language alongside English/Hindi.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultilingualDeclarationsCard;
