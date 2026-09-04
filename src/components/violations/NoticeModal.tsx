import React from 'react';
import { ViolationRecord } from '../../types/compliance';
import { Modal } from '../common/Modal';

interface NoticeModalProps {
  violation: ViolationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: (id: string) => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  violation,
  isOpen,
  onClose,
  onConfirmSend
}) => {
  if (!violation) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statutory Show-Cause Notice Generation">
      <div className="space-y-4 text-xs select-none">
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-900 dark:text-rose-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-sm text-rose-700 dark:text-rose-400">
            <span className="material-symbols-outlined text-rose-700 dark:text-rose-400 text-base">gavel</span>
            Form LMPC-Notice-36A (Legal Metrology Act 2009)
          </div>
          <p className="text-[11px] text-rose-800 dark:text-rose-300">
            This action generates a formal statutory notice requiring mandatory written response and rectification within 15 calendar days.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-sans">Product</span>
            <p className="font-bold text-slate-900 dark:text-white truncate">{violation.productName}</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-sans">Batch &amp; Brand</span>
            <p className="font-bold text-slate-900 dark:text-white truncate">{violation.brand} ({violation.batchNumber})</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-sans">Clause Infraction</span>
            <p className="font-bold text-rose-600 dark:text-rose-400">{violation.clauseViolated}</p>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-sans">Compounding Fine (Est.)</span>
            <p className="font-bold text-slate-900 dark:text-white">₹{violation.fineAmountInr.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div>
          <label className="font-bold text-xs text-slate-800 dark:text-slate-200 block mb-1">
            VERDECT Statutory Notice Directive
          </label>
          <textarea
            readOnly
            rows={3}
            value={`Directing brand manufacturer/packer to show cause within 15 calendar days regarding infraction of statutory requirements under ${violation.clauseViolated}. Inspection report ref: ${violation.scanId}. Compounding fee scheduled under Rule 32.`}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmSend(violation.id);
              onClose();
            }}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            Issue &amp; Serve Statutory Notice
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NoticeModal;
