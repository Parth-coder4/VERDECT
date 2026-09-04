import React, { useEffect, useState } from 'react';

interface CircularLoadingGaugeProps {
  score: number; // 1 to 100
  size?: number; // diameter in px (default 160)
  strokeWidth?: number; // thickness in px (default 12)
  isLoading?: boolean;
  loadingLabel?: string;
  showVerdict?: boolean;
}

export const CircularLoadingGauge: React.FC<CircularLoadingGaugeProps> = ({
  score,
  size = 160,
  strokeWidth = 12,
  isLoading = false,
  loadingLabel = 'Analyzing Packaging Signatures...',
  showVerdict = true
}) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Smooth animation effect
  useEffect(() => {
    if (isLoading) {
      setDisplayScore(0);
      return;
    }
    const target = Math.max(1, Math.min(100, Math.round(score)));
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        setDisplayScore(target);
        clearInterval(timer);
      } else {
        setDisplayScore(current);
      }
    }, 25);
    return () => clearInterval(timer);
  }, [score, isLoading]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  // Determine color scheme based on Counterfeit Risk (1-100)
  // Low Counterfeit Risk (1-20): Emerald / Green
  // Moderate Suspicion (21-50): Amber / Warning
  // High Counterfeit Probability (51-100): Crimson / Red
  const getColorScheme = (val: number) => {
    if (val <= 25) {
      return {
        stroke: '#10B981', // Emerald 500
        bgRing: '#D1FAE5',
        glow: 'rgba(16, 185, 129, 0.25)',
        text: 'text-emerald-700',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        label: 'GENUINE PRODUCT',
        riskLevel: 'LOW COUNTERFEIT RISK'
      };
    } else if (val <= 55) {
      return {
        stroke: '#F59E0B', // Amber 500
        bgRing: '#FEF3C7',
        glow: 'rgba(245, 158, 11, 0.25)',
        text: 'text-amber-700',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        label: 'SUSPECTED ANOMALIES',
        riskLevel: 'MODERATE SUSPICION'
      };
    } else {
      return {
        stroke: '#EF4444', // Red 500
        bgRing: '#FEE2E2',
        glow: 'rgba(239, 68, 68, 0.3)',
        text: 'text-rose-700',
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
        label: 'CRITICAL COUNTERFEIT',
        riskLevel: 'HIGH COUNTERFEIT PROBABILITY'
      };
    }
  };

  const scheme = getColorScheme(displayScore);

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Outer ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-xl transition-all duration-700 pointer-events-none"
          style={{
            background: isLoading
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%)'
              : `radial-gradient(circle, ${scheme.glow} 0%, transparent 70%)`
          }}
        />

        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
          />

          {/* Active Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isLoading ? '#0284C7' : scheme.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={isLoading ? circumference * 0.4 : strokeDashoffset}
            strokeLinecap="round"
            className={isLoading ? 'animate-spin origin-center' : 'transition-all duration-300 ease-out'}
            style={{
              filter: `drop-shadow(0 0 6px ${isLoading ? '#38BDF8' : scheme.stroke})`
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {isLoading ? (
            <div className="flex flex-col items-center gap-1">
              <span className="material-symbols-outlined text-sky-600 text-2xl animate-spin">
                sync
              </span>
              <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                Scanning
              </span>
            </div>
          ) : (
            <>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Score
              </span>
              <div className="flex items-baseline justify-center">
                <span className={`font-mono text-3xl md:text-4xl font-black tracking-tight ${scheme.text}`}>
                  {displayScore}
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">/100</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                Risk Index
              </span>
            </>
          )}
        </div>
      </div>

      {/* Label and Risk Level */}
      {showVerdict && (
        <div className="mt-3 text-center space-y-1">
          {isLoading ? (
            <span className="text-xs font-semibold text-slate-500 animate-pulse block">
              {loadingLabel}
            </span>
          ) : (
            <>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wide ${scheme.badgeBg}`}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: scheme.stroke }}
                />
                {scheme.label}
              </div>
              <p className="text-[11px] font-mono font-bold text-slate-500">{scheme.riskLevel}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
