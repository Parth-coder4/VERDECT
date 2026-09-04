import React, { useState } from 'react';
import { ViolationRecord } from '../../types/compliance';

interface ViolationTableProps {
  violations: ViolationRecord[];
  onSelectViolation: (vio: ViolationRecord) => void;
  onServeNotice: (vio: ViolationRecord) => void;
}

export const ViolationTable: React.FC<ViolationTableProps> = ({
  violations,
  onSelectViolation,
  onServeNotice
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = violations.filter((v) => {
    const matchesSeverity = filterSeverity === 'ALL' || v.severity === filterSeverity;
    const matchesSearch =
      v.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.clauseViolated.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col select-none">
      {/* Table Control Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search violations, products, clauses..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shrink-0 ${
                filterSeverity === sev
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card List View (< 768px) */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No matching violation notices found.
          </div>
        ) : (
          filtered.map((v) => (
            <div key={v.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                    {v.id}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                    {v.productName}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    Batch: {v.batchNumber} &bull; Brand: {v.brand}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${
                    v.severity === 'CRITICAL'
                      ? 'bg-rose-600 text-white'
                      : v.severity === 'HIGH'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {v.severity}
                </span>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Clause Violated:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{v.clauseViolated}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Compounding Penalty:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₹{v.fineAmountInr.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 line-clamp-2">
                  {v.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    v.status === 'NOTICE_SERVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {v.status.replace('_', ' ')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectViolation(v)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    View Dossier
                  </button>
                  {v.status === 'PENDING_NOTICE' && (
                    <button
                      onClick={() => onServeNotice(v)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      Serve Notice
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4">Violation ID</th>
              <th className="py-3.5 px-4">Product &amp; Batch</th>
              <th className="py-3.5 px-4">Statutory Clause</th>
              <th className="py-3.5 px-4">Severity</th>
              <th className="py-3.5 px-4">Compounding Penalty</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{v.id}</td>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 dark:text-white">{v.productName}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Batch: {v.batchNumber}</div>
                </td>
                <td className="py-3.5 px-4">
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{v.clauseViolated}</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{v.description}</p>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      v.severity === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : v.severity === 'HIGH'
                        ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {v.severity}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                  ₹{v.fineAmountInr.toLocaleString('en-IN')}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.status === 'NOTICE_SERVED'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {v.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onSelectViolation(v)}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all"
                    >
                      Dossier
                    </button>
                    {v.status === 'PENDING_NOTICE' && (
                      <button
                        onClick={() => onServeNotice(v)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        Serve Notice
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViolationTable;
