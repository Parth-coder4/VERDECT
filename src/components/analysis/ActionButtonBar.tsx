import React from 'react';
import { Link } from 'react-router-dom';
import { ScanRecord } from '../../types/compliance';
import { ExportManager } from '../../services/exportManager';

interface ActionButtonBarProps {
  scan: ScanRecord;
  onRetest: () => void;
  onApproveVerdict?: (verdict: 'COMPLIANT' | 'NON-COMPLIANT') => void;
}

export const ActionButtonBar: React.FC<ActionButtonBarProps> = ({ scan, onRetest, onApproveVerdict }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/counterfeit?scanId=${encodeURIComponent(scan.id)}`}
          state={{ scanId: scan.id, scan }}
          className="border border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-base">fingerprint</span>
          Forensic Deep Scan
        </Link>

        <button
          onClick={() => ExportManager.exportViolationNoticePdf(scan)}
          className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">picture_as_pdf</span>
          Export VERDECT PDF Notice
        </button>

        <button
          onClick={() => ExportManager.exportAuditLogCsv([scan])}
          className="border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">table_chart</span>
          Export Audit CSV
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRetest}
          className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Re-Analyze Scan
        </button>

        {scan.overallVerdict === 'NON-COMPLIANT' ? (
          <button
            onClick={() => onApproveVerdict && onApproveVerdict('NON-COMPLIANT')}
            className="px-5 py-2.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all"
          >
            <span className="material-symbols-outlined text-base">gavel</span>
            Enforce Statutory Notice (Sec 36)
          </button>
        ) : (
          <button
            onClick={() => onApproveVerdict && onApproveVerdict('COMPLIANT')}
            className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <span className="material-symbols-outlined text-base">verified</span>
            Confirm Compliant Clearance
          </button>
        )}
      </div>
    </div>
  );
};

export default ActionButtonBar;
