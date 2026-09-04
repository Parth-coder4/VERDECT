import React from 'react';
import { RuleTaxonomyItem } from '../../types/compliance';

interface ClauseCardProps {
  rule: RuleTaxonomyItem;
  onToggle: (id: string) => void;
  onEdit: (rule: RuleTaxonomyItem) => void;
}

export const ClauseCard: React.FC<ClauseCardProps> = ({ rule, onToggle, onEdit }) => {
  return (
    <div className="glass-card rounded-xl p-5 border border-outline-variant shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start gap-2 mb-2">
          <span className="font-mono text-[11px] font-bold text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded">
            {rule.code}
          </span>
          <button
            onClick={() => onToggle(rule.id)}
            className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${
              rule.active ? 'bg-secondary' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                rule.active ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <h3 className="font-headline-md text-sm font-bold text-primary mb-1">{rule.title}</h3>
        <p className="text-[11px] text-secondary font-medium mb-2">{rule.ruleClause}</p>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-3">
          {rule.description}
        </p>
      </div>

      <div className="pt-3 border-t border-surface-variant flex justify-between items-center text-xs">
        <div>
          <span className="text-[10px] text-outline block">Enforced Threshold</span>
          <span className="font-data-mono font-bold text-primary">
            {rule.minThreshold} {rule.unit}
          </span>
        </div>

        <button
          onClick={() => onEdit(rule)}
          className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary rounded-lg font-bold text-xs border border-outline-variant transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">tune</span>
          Configure
        </button>
      </div>
    </div>
  );
};
