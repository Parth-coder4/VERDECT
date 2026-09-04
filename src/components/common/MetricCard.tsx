import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconColorClass?: string;
  badgeText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  iconColorClass = 'text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400',
  badgeText
}) => {
  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-200 border border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColorClass}`}>
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {value}
          </h3>
          {badgeText && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {badgeText}
            </span>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                {subtitle}
              </p>
            )}
            {trend && (
              <span
                className={`text-xs font-bold flex items-center shrink-0 ${
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {trend.isPositive ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {trend.value}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
