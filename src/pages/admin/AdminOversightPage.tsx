import React, { useState, useMemo, useEffect } from 'react';
import { ADMIN_INSPECTOR_ROSTER } from '../../services/mockData';
import { InspectorOversightItem } from '../../types/user';
import { useCompliance } from '../../context/ComplianceContext';
import { ComplianceApi } from '../../services/api';
import { formatAuditTimestamp } from '../../utils/dateUtils';

const LOCAL_STORAGE_KEY = 'lmpc_admin_inspectors_roster';

export const AdminOversightPage: React.FC = () => {
  const { scans, violations } = useCompliance();
  const [inspectors, setInspectors] = useState<InspectorOversightItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return ADMIN_INSPECTOR_ROSTER;
  });

  useEffect(() => {
    ComplianceApi.getAdminInspectors().then((data) => {
      if (data && data.length > 0) {
        setInspectors(data);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inspectors));
  }, [inspectors]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInspector, setSelectedInspector] = useState<InspectorOversightItem | null>(null);
  const [editingInspector, setEditingInspector] = useState<InspectorOversightItem | null>(null);
  const [inspectorToDelete, setInspectorToDelete] = useState<InspectorOversightItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);

  // New Inspector form state
  const [newInspector, setNewInspector] = useState<Partial<InspectorOversightItem>>({
    name: '',
    idBadge: `LMPC-${Math.floor(1000 + Math.random() * 9000)}`,
    currentStatus: 'Active - Field',
    jurisdiction: 'Northern Metrology Zone - Sector 4',
    email: '',
    phone: '+91 98',
    totalInspections: 0,
    reportsGenerated: 0
  });

  const showNotificationMsg = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredInspectors = useMemo(() => {
    return inspectors.filter((insp) => {
      const matchesSearch =
        insp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insp.idBadge.toLowerCase().includes(searchQuery.toLowerCase()) ||
        insp.jurisdiction.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' || insp.currentStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [inspectors, searchQuery, statusFilter]);

  const handleAddInspector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInspector.name || !newInspector.idBadge) return;

    const initials = newInspector.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const colors = ['bg-sky-500', 'bg-emerald-600', 'bg-indigo-600', 'bg-purple-600', 'bg-teal-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const created: InspectorOversightItem = {
      id: `insp_${Date.now()}`,
      name: newInspector.name,
      initials: initials || 'IN',
      idBadge: newInspector.idBadge.toUpperCase(),
      totalInspections: Number(newInspector.totalInspections) || 0,
      reportsGenerated: Number(newInspector.reportsGenerated) || 0,
      currentStatus: (newInspector.currentStatus as any) || 'Active - Field',
      statusType:
        newInspector.currentStatus === 'Review Required'
          ? 'danger'
          : newInspector.currentStatus === 'Off Duty'
          ? 'neutral'
          : 'success',
      email: newInspector.email || `${newInspector.name.toLowerCase().replace(/\s+/g, '.')}@metrology.gov.in`,
      phone: newInspector.phone || '+91 98000 00000',
      jurisdiction: newInspector.jurisdiction || 'Regional Metrology Directorate',
      avatarBgColor: randomColor,
      lastActiveTime: 'Just onboarded',
      accuracyRate: 99.0
    };

    ComplianceApi.addAdminInspector(created);
    setInspectors([created, ...inspectors]);
    setIsAddModalOpen(false);
    showNotificationMsg(`Inspector ${created.name} (${created.idBadge}) added successfully.`);
    setNewInspector({
      name: '',
      idBadge: `LMPC-${Math.floor(1000 + Math.random() * 9000)}`,
      currentStatus: 'Active - Field',
      jurisdiction: 'Northern Metrology Zone - Sector 4',
      email: '',
      phone: '+91 98',
      totalInspections: 0,
      reportsGenerated: 0
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspector) return;

    await ComplianceApi.updateAdminInspector(editingInspector.id, editingInspector);
    setInspectors((prev) =>
      prev.map((i) => (i.id === editingInspector.id ? editingInspector : i))
    );
    if (selectedInspector?.id === editingInspector.id) {
      setSelectedInspector(editingInspector);
    }
    showNotificationMsg(`Personnel records for ${editingInspector.name} updated.`);
    setEditingInspector(null);
  };

  const confirmDeleteInspector = () => {
    if (!inspectorToDelete) return;
    const deletedName = inspectorToDelete.name;
    const deletedBadge = inspectorToDelete.idBadge;
    const deletedId = inspectorToDelete.id;

    ComplianceApi.deleteAdminInspector(deletedId);
    setInspectors((prev) => prev.filter((i) => i.id !== deletedId));
    if (selectedInspector?.id === deletedId) {
      setSelectedInspector(null);
    }
    setInspectorToDelete(null);
    showNotificationMsg(`Inspector ${deletedName} (${deletedBadge}) was revoked and deleted from roster.`);
  };

  const handleExportRoster = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Name,Badge ID,Total Inspections,Reports Generated,Current Status,Jurisdiction,Email,Phone\n' +
      inspectors
        .map(
          (i) =>
            `"${i.name}","${i.idBadge}",${i.totalInspections},${i.reportsGenerated},"${i.currentStatus}","${i.jurisdiction}","${i.email}","${i.phone}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'LMPC_Inspector_Roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: InspectorOversightItem['currentStatus']) => {
    switch (status) {
      case 'Active - Field':
        return (
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded-full text-xs font-bold tracking-tight">
            Active - Field
          </span>
        );
      case 'Active - Lab':
        return (
          <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded-full text-xs font-bold tracking-tight">
            Active - Lab
          </span>
        );
      case 'Review Required':
        return (
          <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 rounded-full text-xs font-bold tracking-tight">
            Review Required
          </span>
        );
      case 'Off Duty':
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold tracking-tight">
            Off Duty
          </span>
        );
    }
  };

  const totalInspectionsSum = inspectors.reduce((sum, i) => sum + (i.totalInspections || 0), 0) + scans.length;
  const activeCount = inspectors.filter(
    (i) => i.currentStatus === 'Active - Field' || i.currentStatus === 'Active - Lab'
  ).length;
  const reportsPendingCount = violations.length + inspectors.reduce((acc, i) => acc + (i.reportsGenerated || 0), 0);
  const criticalCount = violations.filter((v) => v.severity === 'CRITICAL' || v.severity === 'HIGH').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 border border-slate-700">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Inspector Oversight
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Monitor, deploy, and manage field inspection personnel &amp; credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportRoster}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-98 tracking-wide uppercase"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export Roster
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-98 tracking-wide"
          >
            <span className="material-symbols-outlined text-sm font-black">person_add</span>
            Add Inspector
          </button>
        </div>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: TOTAL INSPECTIONS TODAY */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              TOTAL INSPECTIONS TODAY
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">fact_check</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {totalInspectionsSum.toLocaleString()}
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md">
              Live Feed
            </span>
          </div>
        </div>

        {/* Card 2: ACTIVE INSPECTORS */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ACTIVE INSPECTORS
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">badge</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeCount}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                / {inspectors.length} Registered
              </span>
            </div>
            {/* Blue Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className="bg-[#0284C7] h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (activeCount / (inspectors.length || 1)) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: REPORTS PENDING APPROVAL */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              REPORTS PENDING APPROVAL
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{reportsPendingCount}</span>
            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-md">
              Active Notices: {criticalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#0C1526] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Search & Filter Bar Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID badge, or jurisdiction..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const nextStatus =
                  statusFilter === 'ALL'
                    ? 'active - field'
                    : statusFilter === 'active - field'
                    ? 'review required'
                    : statusFilter === 'review required'
                    ? 'off duty'
                    : 'ALL';
                setStatusFilter(nextStatus);
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span>Filter {statusFilter !== 'ALL' ? `(${statusFilter})` : ''}</span>
            </button>

            <button
              onClick={() => {
                setInspectors((prev) => [...prev].reverse());
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">swap_vert</span>
              <span>Sort</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">INSPECTOR</th>
                <th className="py-3.5 px-4">ID BADGE</th>
                <th className="py-3.5 px-4">TOTAL INSPECTIONS</th>
                <th className="py-3.5 px-4">REPORTS GEN.</th>
                <th className="py-3.5 px-4">CURRENT STATUS</th>
                <th className="py-3.5 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filteredInspectors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-semibold">
                    No matching personnel found in roster.
                  </td>
                </tr>
              ) : (
                filteredInspectors.map((insp) => (
                  <tr
                    key={insp.id}
                    onClick={() => setSelectedInspector(insp)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full ${
                            insp.avatarBgColor || 'bg-sky-500'
                          } text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0`}
                        >
                          {insp.initials}
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white text-xs block">
                            {insp.name}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-normal">
                            {insp.jurisdiction}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">{insp.idBadge}</td>
                    <td className="py-4 px-4 font-extrabold text-slate-900 dark:text-white">{insp.totalInspections}</td>
                    <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">{insp.reportsGenerated}</td>
                    <td className="py-4 px-4">{getStatusBadge(insp.currentStatus)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Quick Delete Button */}
                        <button
                          type="button"
                          onClick={() => setInspectorToDelete(insp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                          title="Revoke & Delete Inspector"
                        >
                          <span className="material-symbols-outlined text-[17px]">delete</span>
                        </button>

                        {/* View Chevron */}
                        <button
                          type="button"
                          onClick={() => setSelectedInspector(insp)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="View Inspector Profile"
                        >
                          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Showing 1 to {filteredInspectors.length} of {inspectors.length} entries</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              &lt;
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                currentPage === 1
                  ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                currentPage === 2
                  ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold ${
                currentPage === 3
                  ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-300 dark:border-sky-700'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              3
            </button>
            <span className="px-1 text-slate-400">...</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Add New Inspector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Onboard New Field Inspector / Officer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign statutory badge number and regional deployment posting.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddInspector} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Officer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Officer Sunita Rao"
                    value={newInspector.name}
                    onChange={(e) => setNewInspector({ ...newInspector, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Badge ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LMPC-7721"
                    value={newInspector.idBadge}
                    onChange={(e) => setNewInspector({ ...newInspector, idBadge: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Deployment Status</label>
                  <select
                    value={newInspector.currentStatus}
                    onChange={(e) => setNewInspector({ ...newInspector, currentStatus: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Active - Field">Active - Field</option>
                    <option value="Active - Lab">Active - Lab</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Review Required">Review Required</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Jurisdiction / Zone</label>
                  <select
                    value={newInspector.jurisdiction}
                    onChange={(e) => setNewInspector({ ...newInspector, jurisdiction: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Northern Metrology Zone - Sector 4">Northern Metrology Zone - Sector 4</option>
                    <option value="Western Directorate - Mumbai Central">Western Directorate - Mumbai Central</option>
                    <option value="Southern Regional Hub - Bengaluru">Southern Regional Hub - Bengaluru</option>
                    <option value="Eastern Command - Kolkata Port">Eastern Command - Kolkata Port</option>
                    <option value="Central Verification Lab">Central Verification Lab</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email Address</label>
                  <input
                    type="email"
                    placeholder="s.rao@metrology.gov.in"
                    value={newInspector.email}
                    onChange={(e) => setNewInspector({ ...newInspector, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Direct Secure Line</label>
                  <input
                    type="text"
                    placeholder="+91 98201 00000"
                    value={newInspector.phone}
                    onChange={(e) => setNewInspector({ ...newInspector, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Create Inspector Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {inspectorToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Revoke &amp; Delete Inspector</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {inspectorToDelete.idBadge} &bull; {inspectorToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Are you sure you want to revoke credentials for <strong className="text-slate-900 dark:text-white">{inspectorToDelete.name}</strong>? This officer will immediately lose scanning access and will be permanently removed from the active regulatory roster.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInspectorToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteInspector}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Details / Edit Dossier Modal */}
      {selectedInspector && !editingInspector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full ${
                    selectedInspector.avatarBgColor || 'bg-sky-500'
                  } text-white font-black text-sm flex items-center justify-center shadow-sm`}
                >
                  {selectedInspector.initials}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedInspector.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    Badge: {selectedInspector.idBadge} &bull; {selectedInspector.jurisdiction}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInspector(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Total Inspections
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedInspector.totalInspections}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Reports Generated
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {selectedInspector.reportsGenerated}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Accuracy Rate
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {selectedInspector.accuracyRate || 98.4}%
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Deployment Status
                </span>
                <div className="mt-1">{getStatusBadge(selectedInspector.currentStatus)}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Email:</strong> {selectedInspector.email}
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Direct Comms:</strong> {selectedInspector.phone}
              </p>
              <p>
                <strong className="text-slate-800 dark:text-slate-200">Last Active / Login:</strong>{' '}
                {selectedInspector.lastLogin
                  ? `${formatAuditTimestamp(selectedInspector.lastLogin).formattedDate} (${formatAuditTimestamp(selectedInspector.lastLogin).relativeTime})`
                  : selectedInspector.lastActiveTime || 'Active now'}
              </p>
            </div>

            <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              {/* Delete Button inside modal */}
              <button
                onClick={() => {
                  setInspectorToDelete(selectedInspector);
                }}
                className="px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete Officer
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingInspector(selectedInspector)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Details
                </button>
                <button
                  onClick={() => {
                    showNotificationMsg(`Comms channel connected with ${selectedInspector.name}`);
                    setSelectedInspector(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  Message Officer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inspector Details Modal */}
      {editingInspector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Edit Personnel Record
                </h3>
                <p className="text-xs text-slate-400 font-mono">{editingInspector.idBadge}</p>
              </div>
              <button
                onClick={() => setEditingInspector(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Officer Full Name</label>
                <input
                  type="text"
                  required
                  value={editingInspector.name}
                  onChange={(e) => setEditingInspector({ ...editingInspector, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Current Status</label>
                  <select
                    value={editingInspector.currentStatus}
                    onChange={(e) =>
                      setEditingInspector({
                        ...editingInspector,
                        currentStatus: e.target.value as any,
                        statusType:
                          e.target.value === 'Review Required'
                            ? 'danger'
                            : e.target.value === 'Off Duty'
                            ? 'neutral'
                            : 'success'
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Active - Field">Active - Field</option>
                    <option value="Active - Lab">Active - Lab</option>
                    <option value="Off Duty">Off Duty</option>
                    <option value="Review Required">Review Required</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={editingInspector.jurisdiction}
                    onChange={(e) =>
                      setEditingInspector({ ...editingInspector, jurisdiction: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editingInspector.email}
                    onChange={(e) =>
                      setEditingInspector({ ...editingInspector, email: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingInspector.phone}
                    onChange={(e) =>
                      setEditingInspector({ ...editingInspector, phone: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingInspector(null)}
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
    </div>
  );
};

export default AdminOversightPage;
