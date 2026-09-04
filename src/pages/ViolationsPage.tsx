import React, { useState } from 'react';
import { useCompliance } from '../context/ComplianceContext';
import { ViolationTable } from '../components/violations/ViolationTable';
import { NoticeModal } from '../components/violations/NoticeModal';
import { ViolationRecord } from '../types/compliance';
import { useNavigate } from 'react-router-dom';

export const ViolationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { violations, updateViolationStatus } = useCompliance();
  const [selectedViolation, setSelectedViolation] = useState<ViolationRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleServeNotice = (vio: ViolationRecord) => {
    setSelectedViolation(vio);
    setModalOpen(true);
  };

  const handleConfirmSend = (id: string) => {
    updateViolationStatus(id, 'NOTICE_SERVED');
  };

  const totalFines = violations.reduce((acc, v) => acc + v.fineAmountInr, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 animate-in fade-in duration-200 select-none font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
            Legal Metrology Act Enforcement Registry
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Violations &amp; Statutory Notice Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking non-compliant commodity packaging, compounding fines, and show-cause directives under Section 36.
          </p>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-4 py-2.5 rounded-2xl text-right">
          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase block">Total Compounding Liability</span>
          <span className="font-mono text-lg font-black text-rose-900 dark:text-rose-200">
            ₹{totalFines.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      <ViolationTable
        violations={violations}
        onSelectViolation={(v) => navigate(`/analysis/${v.scanId}`)}
        onServeNotice={handleServeNotice}
      />

      <NoticeModal
        violation={selectedViolation}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirmSend={handleConfirmSend}
      />
    </div>
  );
};

export default ViolationsPage;
