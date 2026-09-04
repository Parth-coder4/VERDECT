import React from 'react';
import { useCompliance } from '../context/ComplianceContext';
import { MetricCard } from '../components/common/MetricCard';
import { StatusPill } from '../components/common/StatusPill';
import { Link } from 'react-router-dom';
import { VerdectLogo } from '../components/common/VerdectLogo';

export const OverviewPage: React.FC = () => {
  const { scans, violations, batches } = useCompliance();

  const totalScans = scans.length;
  const compliantCount = scans.filter((s) => s.overallVerdict === 'COMPLIANT').length;
  const nonCompliantCount = scans.filter((s) => s.overallVerdict === 'NON-COMPLIANT').length;
  const complianceRate = totalScans ? ((compliantCount / totalScans) * 100).toFixed(1) : '100.0';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-200 select-none font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-[#081324] via-[#0C203B] to-[#0A2540] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-slate-800">
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#38BDF8 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-extrabold text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-500/30 tracking-wider uppercase">
              VERDECT • Legal Metrology Surveillance Engine
            </span>
            <span className="text-[10px] font-bold text-slate-400">LMPC Rules, 2011</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            VERDECT Automated Packaging Surveillance
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Instant statutory verification of packaged commodities, font geometry ratios, mandatory declarations, and counterfeit risk under the Legal Metrology Act, 2009.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            to="/scan"
            className="flex-1 sm:flex-initial px-5 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            Start Packaging Scan
          </Link>
          <Link
            to="/violations"
            className="flex-1 sm:flex-initial px-5 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 border border-white/20 backdrop-blur transition-all"
          >
            <span className="material-symbols-outlined text-base">warning</span>
            Violations ({violations.length})
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Compliance Rate"
          value={`${complianceRate}%`}
          subtitle="Statutory pass criteria"
          icon="verified"
          trend={{
            value: totalScans > 0 ? `${compliantCount} of ${totalScans} passed` : 'Active inspection shift',
            isPositive: true
          }}
          iconColorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
        />
        <MetricCard
          title="Total Packaging Scans"
          value={totalScans}
          subtitle="Processed through VERDECT OCR"
          icon="document_scanner"
          badgeText="Active Shift"
          iconColorClass="text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50"
        />
        <MetricCard
          title="Infractions Flagged"
          value={nonCompliantCount}
          subtitle="Actionable statutory defects"
          icon="warning"
          trend={{ value: `${violations.length} notices active`, isPositive: nonCompliantCount === 0 }}
          iconColorClass="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50"
        />
        <Link to="/registry" className="block transition-transform active:scale-98">
          <MetricCard
            title="Registered Batches"
            value={batches.length}
            subtitle="Across FMCG categories"
            icon="inventory_2"
            iconColorClass="text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50"
            badgeText="View Master"
          />
        </Link>
      </div>

      {/* Bento Layout: Recent Inspections & Priority Infractions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Inspections (Col 8) */}
        <div className="lg:col-span-8 glass-card rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Recent Packaging Inspections
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live statutory verification feed across FMCG brands
              </p>
            </div>
            {scans.length > 0 && (
              <Link
                to="/history"
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                View All History
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            )}
          </div>

          {scans.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  No Inspections Logged Yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-0.5">
                  Launch the live optical scanner or upload packaged commodity artwork to start inspection analysis.
                </p>
              </div>
              <Link
                to="/scan"
                className="px-4 py-2 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Perform First Scan
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
              {scans.slice(0, 4).map((scan) => (
                <div
                  key={scan.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {scan.frontImageUrl ? (
                      <img
                        src={scan.frontImageUrl}
                        alt={scan.productName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <span className="material-symbols-outlined text-xl">inventory_2</span>
                      </div>
                    )}
                    <div>
                      <Link
                        to={`/analysis/${scan.id}`}
                        className="font-bold text-xs text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400"
                      >
                        {scan.productName}
                      </Link>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {scan.id} &bull; Batch: {scan.batchNumber}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">
                        {(scan.confidenceScore * 100).toFixed(0)}% Conf
                      </span>
                      <p className="text-[10px] text-slate-400">{scan.timestamp.slice(11, 16)} hrs</p>
                    </div>
                    <StatusPill status={scan.overallVerdict} />
                    <Link
                      to={`/analysis/${scan.id}`}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
                    >
                      <span className="material-symbols-outlined text-base">chevron_right</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Priority Infractions Feed (Col 4) */}
        <div className="lg:col-span-4 glass-card rounded-3xl p-6 flex flex-col justify-between shadow-sm border border-slate-200/80 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4 border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-xl">
                priority_high
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Priority Infractions
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
              LMPC Sec 36
            </span>
          </div>

          {violations.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                No Active Infractions
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                All assessed packaged commodities satisfy statutory declaration guidelines.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {violations.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] font-bold text-rose-700 dark:text-rose-400">
                      {v.id}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-600 text-white uppercase">
                      {v.severity}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {v.productName}
                  </h4>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-tight font-medium">
                    {v.clauseViolated}
                  </p>
                  <div className="flex justify-between items-center pt-2 mt-1 border-t border-rose-200/60 dark:border-rose-900/40 text-[10px]">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      Penalty: ₹{v.fineAmountInr.toLocaleString('en-IN')}
                    </span>
                    <Link
                      to="/violations"
                      className="font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Serve Notice &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
