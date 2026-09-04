import React, { useState } from 'react';
import { ScanRecord } from '../../types/compliance';
import { StatusPill } from '../common/StatusPill';
import { Link } from 'react-router-dom';
import { ExportManager } from '../../services/exportManager';

interface HistoryTableProps {
  scans: ScanRecord[];
  onDeleteScan?: (scanId: string) => void;
  onDeleteMultiple?: (scanIds: string[]) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  scans,
  onDeleteScan,
  onDeleteMultiple
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scanToDelete, setScanToDelete] = useState<ScanRecord | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(scans.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmSingleDelete = () => {
    if (scanToDelete && onDeleteScan) {
      onDeleteScan(scanToDelete.id);
      setSelectedIds((prev) => prev.filter((id) => id !== scanToDelete.id));
      setScanToDelete(null);
    }
  };

  const confirmBulkDelete = () => {
    if (onDeleteMultiple && selectedIds.length > 0) {
      onDeleteMultiple(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
    }
  };

  const isAllSelected = scans.length > 0 && selectedIds.length === scans.length;

  return (
    <div className="space-y-3 select-none font-sans">
      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 border border-slate-700">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-lg">
              {selectedIds.length} Selected
            </span>
            <span className="text-slate-300">Action for selected inspection archives</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                const selectedScans = scans.filter((s) => selectedIds.includes(s.id));
                ExportManager.exportAuditLogCsv(selectedScans);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export
            </button>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Main Table Wrapper */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col">
        {/* Mobile Card List (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {scans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
              No archived inspection records matching current filters.
            </div>
          ) : (
            scans.map((scan) => (
              <div
                key={scan.id}
                className={`p-4 space-y-3 transition-colors ${
                  selectedIds.includes(scan.id) ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(scan.id)}
                      onChange={() => toggleSelect(scan.id)}
                      className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer mt-0.5"
                    />
                    <Link
                      to={`/analysis/${scan.id}`}
                      className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      #{scan.id}
                    </Link>
                  </div>
                  <StatusPill status={scan.overallVerdict} />
                </div>

                <div className="flex items-center gap-3">
                  {scan.frontImageUrl && (
                    <img
                      src={scan.frontImageUrl}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/analysis/${scan.id}`}
                      className="font-bold text-xs text-slate-900 dark:text-white hover:text-sky-600 block truncate"
                    >
                      {scan.productName}
                    </Link>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Batch: {scan.batchNumber} &bull; Conf: {(scan.confidenceScore * 100).toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {scan.timestamp} &bull; {scan.inspectorName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/analysis/${scan.id}`}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1"
                  >
                    <span>View Inspection</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => ExportManager.exportViolationNoticePdf(scan)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Export PDF Notice"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                    </button>
                    {onDeleteScan && (
                      <button
                        onClick={() => setScanToDelete(scan)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Delete Scan Record"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Inspection Ref</th>
                <th className="py-3.5 px-4">Product Name &amp; SKU</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Verdict</th>
                <th className="py-3.5 px-4">OCR Confidence</th>
                <th className="py-3.5 px-4">Inspector</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {scans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
                    No archived inspection records matching current filters.
                  </td>
                </tr>
              ) : (
                scans.map((scan) => (
                  <tr
                    key={scan.id}
                    className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedIds.includes(scan.id) ? 'bg-sky-50/40 dark:bg-sky-950/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(scan.id)}
                        onChange={() => toggleSelect(scan.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                      <Link to={`/analysis/${scan.id}`} className="hover:underline">
                        {scan.id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {scan.frontImageUrl && (
                          <img
                            src={scan.frontImageUrl}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        )}
                        <div>
                          <Link
                            to={`/analysis/${scan.id}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 block truncate max-w-xs"
                          >
                            {scan.productName}
                          </Link>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Batch: {scan.batchNumber}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {scan.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusPill status={scan.overallVerdict} />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {(scan.confidenceScore * 100).toFixed(0)}%
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                      {scan.inspectorName}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/analysis/${scan.id}`}
                          className="p-1.5 text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Analysis"
                        >
                          <span className="material-symbols-outlined text-[17px]">visibility</span>
                        </Link>
                        <button
                          onClick={() => ExportManager.exportViolationNoticePdf(scan)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Export PDF Notice"
                        >
                          <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                        </button>
                        {onDeleteScan && (
                          <button
                            onClick={() => setScanToDelete(scan)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Delete Scan Record"
                          >
                            <span className="material-symbols-outlined text-[17px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {scanToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Delete Inspection Record</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to purge record <strong>#{scanToDelete.id}</strong> ({scanToDelete.productName})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setScanToDelete(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmSingleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-2xl">delete_sweep</span>
              <h3 className="font-black text-base text-slate-900 dark:text-white">Bulk Delete Records</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected inspection records from the historical archive?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md"
              >
                Delete Selected Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTable;
