import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCompliance } from '../context/ComplianceContext';
import { MetricCard } from '../components/common/MetricCard';

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const { scans, violations } = useCompliance();

  const totalInspections = (user?.inspectionsCompleted || 0) + scans.length;
  const compliantCount = scans.filter((s) => s.overallVerdict === 'COMPLIANT').length;
  const accuracy = scans.length
    ? ((compliantCount / scans.length) * 100).toFixed(1)
    : (user?.accuracyRate || 99.0).toFixed(1);

  const monthlyTarget = 100;
  const progressPercent = Math.min(100, Math.round((scans.length / monthlyTarget) * 100));

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 animate-in fade-in duration-200 select-none font-sans">
      <div>
        <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
          Field Officer Analytics
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          Inspector Performance &amp; Surveillance Oversight
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Individual inspection throughput, OCR verification accuracy, and quality assurance scorecard.
        </p>
      </div>

      {/* Inspector Profile Banner */}
      <div className="glass-card rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <img
          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
          alt={user?.name}
          className="w-20 h-20 rounded-2xl border-2 border-sky-500 object-cover shadow-md"
        />
        <div className="space-y-1 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">{user?.name}</h2>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
              Badge: {user?.badgeNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {user?.role?.replace(/_/g, ' ')} &bull; {user?.jurisdiction}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">{user?.email}</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <MetricCard
          title="Total Inspections Logged"
          value={totalInspections}
          subtitle="Real-time verified commodities"
          icon="fact_check"
          iconColorClass="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50"
        />
        <MetricCard
          title="Inspection Accuracy"
          value={`${accuracy}%`}
          subtitle="Statutory compliance rate"
          icon="military_tech"
          iconColorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
        />
        <MetricCard
          title="Active Infractions Served"
          value={violations.length}
          subtitle="Actionable statutory notices"
          icon="warning"
          iconColorClass="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50"
        />
      </div>

      {/* Monthly Throughput Progression */}
      <div className="glass-card rounded-3xl p-6 space-y-4 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          Live Shift Volume &amp; Target Progression
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              <span>Current Cycle Target ({monthlyTarget} Scans)</span>
              <span className="text-sky-600 dark:text-sky-400 font-mono">
                {scans.length} / {monthlyTarget} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-sky-600 to-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              <span>Statutory Compliance Rate</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">{accuracy}% Passed</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Number(accuracy))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePage;
