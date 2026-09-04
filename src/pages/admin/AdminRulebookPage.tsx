import React, { useState, useMemo, useEffect } from 'react';
import { ADMIN_ACTIVE_RULES } from '../../services/mockData';
import { AdminRuleItem } from '../../types/user';
import { ComplianceApi } from '../../services/api';

const LOCAL_STORAGE_KEY = 'lmpc_admin_rules_store';

export const AdminRulebookPage: React.FC = () => {
  const [rules, setRules] = useState<AdminRuleItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback to default
    }
    return ADMIN_ACTIVE_RULES;
  });

  const refreshData = async () => {
    try {
      const liveRules = await ComplianceApi.getRulebook();
      if (liveRules && liveRules.length > 0) {
        const mapped: AdminRuleItem[] = liveRules.map((r: any) => ({
          id: r.id,
          name: r.title,
          ruleCode: r.code,
          category: r.category || 'Mandatory Declarations',
          severity: (r.category === 'Pricing & Currency' || r.category === 'Mandatory Declarations' ? 'High' : 'Medium') as any,
          status: r.active !== false,
          description: r.description || r.ruleClause || '',
          threshold: r.minThreshold ? `${r.minThreshold}${r.unit || '%'}` : '100% standard',
          lastUpdated: new Date().toISOString().slice(0, 10)
        }));
        setRules(mapped);
      }
    } catch {
      // Keep local state
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [editingRule, setEditingRule] = useState<AdminRuleItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Rule Form State
  const [newRule, setNewRule] = useState<Partial<AdminRuleItem>>({
    name: '',
    ruleCode: '',
    category: 'Mandatory Declarations',
    severity: 'High',
    status: true,
    description: '',
    threshold: '100% min'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchCat = categoryFilter === 'ALL' || r.category === categoryFilter;
      const matchSev = severityFilter === 'ALL' || r.severity === severityFilter;
      return matchCat && matchSev;
    });
  }, [rules, categoryFilter, severityFilter]);

  const toggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const nextStatus = !target.status;

    await ComplianceApi.updateRule(id, { active: nextStatus });

    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: nextStatus,
            lastUpdated: new Date().toISOString().slice(0, 10)
          };
        }
        return r;
      })
    );
    showToast(`Rule ${target.ruleCode} is now ${nextStatus ? 'ACTIVE' : 'DISABLED'}`);
    void refreshData();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    await ComplianceApi.updateRule(editingRule.id, {
      title: editingRule.name,
      code: editingRule.ruleCode,
      category: editingRule.category,
      description: editingRule.description,
      active: editingRule.status
    });

    setRules((prev) => prev.map((r) => (r.id === editingRule.id ? editingRule : r)));
    showToast(`Rule ${editingRule.ruleCode} parameters updated on server.`);
    setEditingRule(null);
    void refreshData();
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.name || !newRule.ruleCode) return;

    const code = newRule.ruleCode.toUpperCase();
    const created: AdminRuleItem = {
      id: `rule_${Date.now()}`,
      name: newRule.name,
      ruleCode: code,
      category: newRule.category || 'Mandatory Declarations',
      severity: (newRule.severity as any) || 'High',
      status: true,
      description: newRule.description || '',
      threshold: newRule.threshold || '100% Standard Statutory Validation',
      lastUpdated: new Date().toISOString().slice(0, 10)
    };

    // Save to backend store
    await ComplianceApi.addRule({
      id: created.id,
      code: created.ruleCode,
      title: created.name,
      category: created.category,
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: created.description || 'Packaged Commodities Rules 2011',
      description: created.description || '',
      active: true,
      minThreshold: 100,
      unit: '%',
      penaltySection: 'Section 36(1)'
    });

    setRules([created, ...rules]);
    setIsAddModalOpen(false);
    showToast(`New statutory rule ${created.ruleCode} published to OCR engine.`);
    setNewRule({
      name: '',
      ruleCode: '',
      category: 'Mandatory Declarations',
      severity: 'High',
      status: true,
      description: '',
      threshold: '100% min'
    });
    void refreshData();
  };

  const handleDeleteRule = async (id: string, code: string) => {
    if (window.confirm(`Permanently remove rule ${code} from rulebook and OCR evaluation?`)) {
      await ComplianceApi.deleteRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      showToast(`Rule ${code} deleted.`);
      void refreshData();
    }
  };

  const activeRulesCount = rules.filter((r) => r.status).length;
  const highSevCount = rules.filter((r) => r.severity === 'High' || r.severity === 'Critical').length;
  const categoriesCount = new Set(rules.map((r) => r.category)).size;

  const getSeverityBadge = (sev: AdminRuleItem['severity']) => {
    switch (sev) {
      case 'High':
      case 'Critical':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-400" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-600 dark:bg-sky-400" />
            Medium
          </span>
        );
      case 'Low':
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Low
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Add New Rule Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Active Rulebook Protocols
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage statutory validation rules, legal clauses, and Python OCR evaluation thresholds.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-98 tracking-wide"
        >
          <span className="material-symbols-outlined text-sm font-black">add</span>
          Add New Rule
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOTAL ACTIVE RULES
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{activeRulesCount}</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md flex items-center gap-0.5">
              &uarr; 100% Synced to OCR
            </span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2">
            Across {categoriesCount} protocol categories
          </p>
          <div className="absolute right-4 bottom-4 opacity-10 text-slate-400 dark:text-slate-600 pointer-events-none">
            <span className="material-symbols-outlined text-6xl">fact_check</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              HIGH SEVERITY RULES
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{highSevCount}</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2">
            Triggers mandatory violation notice under Sec 36
          </p>
          <div className="absolute right-4 bottom-4 opacity-15 text-rose-400 dark:text-rose-600 pointer-events-none">
            <span className="material-symbols-outlined text-6xl">warning</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              OCR CORE PROTOCOL ENGINE
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Engine Ensemble: Synchronized</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div className="bg-[#0284C7] h-full rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold block text-right mt-1.5">
              Live Legal Metrology 2026 Rules
            </span>
          </div>
        </div>
      </div>

      {/* Rules Table Container */}
      <div className="bg-white dark:bg-[#0C1526] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter Controls Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Mandatory Declarations">Mandatory Declarations</option>
                <option value="Pricing & Currency">Pricing & Currency</option>
                <option value="Physical">Physical</option>
                <option value="Geometric">Geometric</option>
                <option value="Authentication">Authentication</option>
                <option value="Scanning">Scanning</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-8 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="ALL">All Severities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Showing {filteredRules.length} of {rules.length} Rules
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Rule Code</th>
                <th className="py-3.5 px-6">Rule Title &amp; Clause</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Severity</th>
                <th className="py-3.5 px-6 text-center">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 font-medium">
              {filteredRules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-sky-600 dark:text-sky-400">{r.ruleCode}</td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">{r.name}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-sm mt-0.5">
                      {r.description}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-4 px-6">{getSeverityBadge(r.severity)}</td>
                  <td className="py-4 px-6 text-center">
                    <button
                      type="button"
                      onClick={() => toggleRule(r.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        r.status ? 'bg-[#0284C7]' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          r.status ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRule(r)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Rule"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(r.id, r.ruleCode)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                        title="Delete Rule"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Edit Statutory Rule: {editingRule.ruleCode}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <select
                  value={editingRule.category}
                  onChange={(e) => setEditingRule({ ...editingRule, category: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option>Mandatory Declarations</option>
                  <option>Pricing & Currency</option>
                  <option>Physical</option>
                  <option>Geometric</option>
                  <option>Authentication</option>
                  <option>Scanning</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Description &amp; Legal Clause</label>
                <textarea
                  rows={3}
                  value={editingRule.description}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Rule Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Add New Statutory Protocol</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Rule Code (e.g. RL-STAT-099)</label>
                  <input
                    type="text"
                    required
                    value={newRule.ruleCode}
                    onChange={(e) => setNewRule({ ...newRule, ruleCode: e.target.value })}
                    placeholder="RL-RULE-001"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  >
                    <option>Mandatory Declarations</option>
                    <option>Pricing & Currency</option>
                    <option>Physical</option>
                    <option>Geometric</option>
                    <option>Authentication</option>
                    <option>Scanning</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Rule Title</label>
                <input
                  type="text"
                  required
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g. Customer Care Email & Contact Declaration"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Statutory Clause &amp; Details</label>
                <textarea
                  rows={2}
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Legal Metrology Rules 2011, Rule 6(1)(h) requirement."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-sm"
                >
                  Publish Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRulebookPage;
