import React, { useState } from 'react';
import { RuleTaxonomyItem } from '../../types/compliance';
import { Modal } from '../common/Modal';

interface RuleEditorModalProps {
  rule: RuleTaxonomyItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleId: string, newThreshold: number) => void;
}

export const RuleEditorModal: React.FC<RuleEditorModalProps> = ({
  rule,
  isOpen,
  onClose,
  onSave
}) => {
  if (!rule) return null;

  const [threshold, setThreshold] = useState<number>(rule.minThreshold);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Rule Parameter Tuning: ${rule.code}`}>
      <div className="space-y-4 text-xs">
        <div>
          <h4 className="font-bold text-sm text-primary">{rule.title}</h4>
          <p className="text-[11px] text-secondary font-mono">{rule.ruleClause}</p>
          <p className="text-xs text-on-surface-variant mt-1">{rule.description}</p>
        </div>

        <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-3">
          <div className="flex justify-between items-center">
            <label className="font-bold text-xs text-primary">Minimum Pass Threshold</label>
            <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-outline-variant">
              {threshold} {rule.unit}
            </span>
          </div>

          <input
            type="range"
            min={rule.code.includes('FONT') ? 1.0 : rule.code.includes('AUTH') ? 50 : 80}
            max={rule.code.includes('FONT') ? 5.0 : 100}
            step={rule.code.includes('FONT') ? 0.1 : 1}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full accent-secondary"
          />

          <div className="flex justify-between text-[10px] text-outline font-mono">
            <span>Lenient Sensitivity</span>
            <span>Statutory Standard</span>
            <span>Strict Zero-Tolerance</span>
          </div>
        </div>

        <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
            Penalties Linked
          </span>
          <p className="text-xs text-on-surface font-medium">{rule.penaltySection}</p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-outline rounded-lg text-xs font-bold hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(rule.id, threshold);
              onClose();
            }}
            className="px-5 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/90"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
};
