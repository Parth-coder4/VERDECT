import React, { useState, useMemo } from 'react';
import { useCompliance } from '../context/ComplianceContext';
import { HistoryTable } from '../components/history/HistoryTable';
import { ExportManager } from '../services/exportManager';

export const HistoryPage: React.FC = () => {
  const { scans, deleteScanRecord, deleteMultipleScanRecords, clearAllScans } = useCompliance();
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = useMemo(() => {
    return scans.filter((s) => {
      const matchVerdict = filterVerdict === 'ALL' || s.overallVerdict === filterVerdict;
      const matchSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.batchNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.inspectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchVerdict && matchSearch;
    });
  }, [scans, filterVerdict, searchQuery]);

  const handleDeleteSingle = async (scanId: string) => {
    await deleteScanRecord(scanId);
    showToast(`Inspection record ${scanId} deleted successfully.`);
  };

  const handleDeleteMultiple = async (scanIds: string[]) => {
    await deleteMultipleScanRecords(scanIds);
    showToast(`${scanIds.length} inspection records removed from history.`);
  };

  const handleClearAll = async () => {
    await clearAllScans();
    setIsClearAllModalOpen(false);
    showToast('Inspection history archive cleared.');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 animate-in fade-in duration-200 select-none font-sans">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
            VERDECT Audit Trail &amp; Archives
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Inspection History &amp; Audit Archives
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete historical repository of computer vision packaging scans and digital evidence records under LMPC 2011.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {scans.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Purge all records"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              Clear History
            </button>
          )}

          <button
            onClick={() => ExportManager.exportAuditLogCsv(filtered)}
            className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all active:scale-98"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Filters and Search Row */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {['ALL', 'COMPLIANT', 'NON-COMPLIANT', 'UNDER_REVIEW'].map((v) => (
            <button
              key={v}
              onClick={() => setFilterVerdict(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterVerdict === v
                  ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {v.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, product, batch, inspector..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 shadow-xs"
          />
        </div>
      </div>

      {/* Main Records Table */}
      <HistoryTable
        scans={filtered}
        onDeleteScan={handleDeleteSingle}
        onDeleteMultiple={handleDeleteMultiple}
      />

      {/* Clear All Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Clear Inspection Archive</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently erase <strong>all {scans.length} inspection records</strong>? This will clear all historical compliance evidence.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Purge All Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
