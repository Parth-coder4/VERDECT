import React from 'react';
import { ComplianceStatus } from '../../types/compliance';

interface StatusPillProps {
  status: ComplianceStatus | 'COMPLIANT' | 'NON-COMPLIANT' | 'UNDER_REVIEW' | 'GENUINE' | 'SUSPECT';
  label?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, label, className = '' }) => {
  let styles = 'status-info';
  let displayLabel = label || status;

  switch (status) {
    case 'PASS':
    case 'COMPLIANT':
    case 'GENUINE':
      styles = 'status-pass';
      displayLabel = label || (status === 'PASS' ? 'COMPLIANT' : status);
      break;
    case 'ISSUE':
    case 'NON-COMPLIANT':
    case 'SUSPECT':
      styles = 'status-fail';
      displayLabel = label || (status === 'ISSUE' ? 'NON-COMPLIANT' : status);
      break;
    case 'REVIEW':
    case 'UNDER_REVIEW':
      styles = 'status-review';
      displayLabel = label || 'UNDER REVIEW';
      break;
    default:
      styles = 'status-info';
      break;
  }

  return (
    <span className={`status-pill ${styles} ${className}`}>
      {status === 'PASS' || status === 'COMPLIANT' || status === 'GENUINE' ? (
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
      ) : status === 'ISSUE' || status === 'NON-COMPLIANT' ? (
        <span className="material-symbols-outlined text-[14px]">cancel</span>
      ) : (
        <span className="material-symbols-outlined text-[14px]">help</span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
