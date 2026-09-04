import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_REGULATORY_REPORTS } from '../../services/mockData';
import { RegulatoryReportItem } from '../../types/user';
import { useCompliance } from '../../context/ComplianceContext';
import { ComplianceApi } from '../../services/api';
import { ExportManager } from '../../services/exportManager';

const LOCAL_STORAGE_KEY = 'lmpc_admin_reports_store';

export const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { scans, violations } = useCompliance();
  const [reports, setReports] = useState<RegulatoryReportItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return ADMIN_REGULATORY_REPORTS;
  });

  const refreshReports = async () => {
    try {
      const data = await ComplianceApi.getAdminReports();
      if (data && data.length > 0) {
        setReports(data);
      }
    } catch (e) {
      console.warn('Could not fetch admin reports:', e);
    }
  };

  useEffect(() => {
    void refreshReports();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  // Combine live scans with reports so field scans are always instantly represented
  const unifiedReports: RegulatoryReportItem[] = useMemo(() => {
    const existingScanIds = new Set(
      reports.map((r) => r.scanId).filter(Boolean) as string[]
    );

    const extraFromScans: RegulatoryReportItem[] = scans
      .filter((s) => !existingScanIds.has(s.id))
      .map((s) => {
        const isViolation = s.overallVerdict === 'NON-COMPLIANT';
        const isUnderReview = s.overallVerdict === 'UNDER_REVIEW';
        const status = isViolation ? 'Violation Found' : isUnderReview ? 'Pending Review' : 'Clear';
        const statusType = isViolation ? 'danger' : isUnderReview ? 'warning' : 'success';

        let entity = s.manufacturer;
        if (!entity || entity === 'Registered Packager / Importer') {
          entity = s.brandMetrics?.brandDetected || s.productName || 'Packaged Commodity';
        }

        const words = entity.trim().split(/\s+/);
        const initials =
          words.length > 1
            ? (words[0][0] + words[1][0]).toUpperCase()
            : words[0].slice(0, 2).toUpperCase();

        return {
          id: `REP-${s.id.replace(/^INS-/, '')}`,
          subjectEntity: entity,
          entityInitials: initials || 'RC',
          inspectorName: s.inspectorName || 'Inspector Vikram Malhotra',
          type: isViolation ? 'Surprise Audit' : 'Routine Inspection',
          dateGenerated: String(s.timestamp || new Date().toISOString()).slice(0, 10),
          status: status,
          statusType: statusType,
          location:
            s.manufacturer && s.manufacturer.includes(',')
              ? s.manufacturer.split(',').slice(-2).join(',').trim()
              : 'Northern Metrology Zone - Sector 4',
          severityLevel: isViolation ? 'High' : 'Low',
          fineAmountInr: s.penaltyEstimateInr || (isViolation ? 25000 : 0),
          productName: s.productName,
          scanId: s.id,
          source: 'SCAN'
        };
      });

    return [...reports, ...extraFromScans];
  }, [reports, scans]);

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('All Time');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SCAN' | 'INSTITUTIONAL'>('ALL');
  const [inspectorFilter, setInspectorFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState<RegulatoryReportItem | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newReportEntity, setNewReportEntity] = useState('');
  const [newReportType, setNewReportType] = useState<RegulatoryReportItem['type']>('Routine Inspection');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredReports = useMemo(() => {
    return unifiedReports.filter((report) => {
      const matchesSearch =
        report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.subjectEntity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.inspectorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (report.productName && report.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (report.scanId && report.scanId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || report.type === typeFilter;
      const matchesInspector = inspectorFilter === 'ALL' || report.inspectorName === inspectorFilter;
      const matchesSource =
        sourceFilter === 'ALL' ||
        (sourceFilter === 'SCAN' && report.source === 'SCAN') ||
        (sourceFilter === 'INSTITUTIONAL' && report.source !== 'SCAN');

      return matchesSearch && matchesType && matchesInspector && matchesSource;
    });
  }, [unifiedReports, searchQuery, typeFilter, inspectorFilter, sourceFilter]);

  const handleExportAll = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Report ID,Origin,Subject Entity,Assessed Product,Type,Date Generated,Inspector,Status,Fine INR,Scan Ref\n' +
      unifiedReports
        .map(
          (r) =>
            `"${r.id}","${r.source || 'INSTITUTIONAL'}","${(r.subjectEntity || '').replace(/"/g, '""')}","${(r.productName || '').replace(/"/g, '""')}","${r.type}","${r.dateGenerated}","${r.inspectorName}","${r.status}","${r.fineAmountInr || 0}","${r.scanId || ''}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LMPC_Regulatory_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported complete regulatory audit dossier archive.');
  };

  const handleDownloadReportPdf = (report: RegulatoryReportItem) => {
    const matchingScan = report.scanId ? scans.find((s) => s.id === report.scanId) : undefined;
    ExportManager.exportRegulatoryDossierPdf(report, matchingScan);
    showToast(`Downloading Statutory Dossier (${report.id})...`);
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportEntity) return;

    const initials = newReportEntity
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const created: RegulatoryReportItem = {
      id: `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      subjectEntity: newReportEntity,
      entityInitials: initials || 'RE',
      inspectorName: 'Director Rajesh Verma',
      type: newReportType,
      dateGenerated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Clear',
      statusType: 'success',
      location: 'Regional Central Enforcement Command',
      source: 'INSTITUTIONAL'
    };

    const saved = await ComplianceApi.createAdminReport(created);
    setReports([saved || created, ...reports]);
    setIsGenerateModalOpen(false);
    setNewReportEntity('');
    showToast(`Report ${(saved || created).id} generated successfully.`);
    void refreshReports();
  };

  const handleDeleteReport = async (id: string) => {
    await ComplianceApi.deleteAdminReport(id);
    setReports((prev) => prev.filter((r) => r.id !== id));
    if (selectedReport?.id === id) setSelectedReport(null);
    showToast(`Report ${id} deleted.`);
    void refreshReports();
  };

  const totalReportsCount = unifiedReports.length;
  const scanReportsCount = unifiedReports.filter((r) => r.source === 'SCAN').length;
  const pendingReviewsCount = unifiedReports.filter((r) => r.status === 'Pending Review').length;
  const violationsFlaggedCount = unifiedReports.filter((r) => r.status === 'Violation Found').length;

  const getStatusBadge = (status: RegulatoryReportItem['status']) => {
    switch (status) {
      case 'Violation Found':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            Violation Found
          </span>
        );
      case 'Clear':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            Clear
          </span>
        );
      case 'Pending Review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
            Pending Review
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

      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Regulatory Reports &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Comprehensive overview of compliance metrics, statutory audits, and generated findings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAll}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-extrabold rounded-xl flex items-center gap-2 shadow-sm transition-all active:scale-98 tracking-wide"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export All Data
          </button>

          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm transition-all active:scale-98 tracking-wide"
          >
            <span className="material-symbols-outlined text-sm font-black">add</span>
            Generate New Report
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Reports */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              Total
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">All Dossiers Recorded</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5 block">
              {totalReportsCount}
            </span>
          </div>
        </div>

        {/* Card 2: AI Packaging Scans */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-xl">document_scanner</span>
            </div>
            <span className="px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-bold rounded-md">
              AI Vision
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Field Packaging Scans</span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight mt-0.5 block">
              {scanReportsCount}
            </span>
          </div>
        </div>

        {/* Card 3: Violations Flagged */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-extrabold rounded-md uppercase tracking-wider">
              Infractions
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Violations Flagged</span>
            <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-0.5 block">
              {violationsFlaggedCount}
            </span>
          </div>
        </div>

        {/* Card 4: Pending Reviews */}
        <div className="bg-white dark:bg-[#0C1526] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">pending_actions</span>
            </div>
            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-md">
              Awaiting
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">Pending Reviews</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight mt-0.5 block">
              {pendingReviewsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Reports Table Container */}
      <div className="bg-white dark:bg-[#0C1526] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter Controls Row */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Report ID, Product, Brand, or Inspector..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
            />
          </div>

          {/* Source Filter Dropdown */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Sources (Scans + Audits)</option>
              <option value="SCAN">Field Packaging Scans (AI Vision)</option>
              <option value="INSTITUTIONAL">Institutional Audits (Manual)</option>
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
              category
            </span>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Report Type Dropdown */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="ALL">All Inspection Types</option>
              <option value="Routine Inspection">Routine Inspection</option>
              <option value="Surprise Audit">Surprise Audit</option>
              <option value="Follow-up">Follow-up</option>
              <option value="High Risk Investigation">High Risk Investigation</option>
            </select>
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none">
              description
            </span>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
              expand_more
            </span>
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setSourceFilter('ALL');
            }}
            className="p-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">REPORT REF</th>
                <th className="py-3.5 px-4">ORIGIN</th>
                <th className="py-3.5 px-4">COMMODITY / TARGET ENTITY</th>
                <th className="py-3.5 px-4">AUDIT TYPE</th>
                <th className="py-3.5 px-4">DATE</th>
                <th className="py-3.5 px-4">FINDINGS</th>
                <th className="py-3.5 px-6 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs font-semibold">
                    No regulatory reports recorded in current view.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-6 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {report.id}
                      {report.scanId && (
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">
                          {report.scanId}
                        </span>
                      )}
                    </td>

                    {/* Origin Badge */}
                    <td className="py-3.5 px-4">
                      {report.source === 'SCAN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <span className="material-symbols-outlined text-[12px]">photo_camera</span>
                          Field Scan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <span className="material-symbols-outlined text-[12px]">gavel</span>
                          Institutional
                        </span>
                      )}
                    </td>

                    {/* Commodity / Entity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                          {report.entityInitials}
                        </div>
                        <div className="max-w-[260px]">
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs truncate">
                            {report.productName || report.subjectEntity}
                          </h4>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate block">
                            {report.subjectEntity} &bull; {report.inspectorName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">{report.type}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{report.dateGenerated}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(report.status)}</td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {report.scanId && (
                          <button
                            onClick={() => navigate(`/analysis/${report.scanId}`)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition-colors"
                            title="Open Evidence Canvas & Analysis"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadReportPdf(report)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                          title="Download Official PDF Dossier"
                        >
                          <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`Remove regulatory dossier record ${report.id}?`)) {
                              handleDeleteReport(report.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Delete Report"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Showing {filteredReports.length} of {unifiedReports.length} regulatory dossiers</span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">Synchronized with Legal Metrology Central Database</span>
          </div>
        </div>
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500 font-bold">
                    {selectedReport.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedReport.source === 'SCAN' ? 'Field Packaging Scan' : 'Institutional Audit'}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">
                  {selectedReport.productName || selectedReport.subjectEntity}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Inspection Protocol
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReport.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Audit Date
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{selectedReport.dateGenerated}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Supervising Officer
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedReport.inspectorName}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    Statutory Findings
                  </span>
                  <div className="mt-0.5">{getStatusBadge(selectedReport.status)}</div>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-xl space-y-1.5 text-slate-700 dark:text-slate-300">
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Responsible Entity:</strong>{' '}
                  {selectedReport.subjectEntity}
                </p>
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Jurisdiction / Location:</strong>{' '}
                  {selectedReport.location}
                </p>
                {selectedReport.productName && (
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Assessed Commodity:</strong>{' '}
                    {selectedReport.productName}
                  </p>
                )}
                {selectedReport.fineAmountInr ? (
                  <p className="text-rose-600 dark:text-rose-400 font-bold">
                    Statutory Fine Imposed: ₹{selectedReport.fineAmountInr.toLocaleString('en-IN')} (Section 36, LMPC Act)
                  </p>
                ) : null}
                {selectedReport.scanId && (
                  <p className="font-mono text-[11px] text-sky-600 dark:text-sky-400">
                    Scan Evidence Ref: {selectedReport.scanId}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                {selectedReport.scanId && (
                  <button
                    onClick={() => {
                      const sId = selectedReport.scanId;
                      setSelectedReport(null);
                      navigate(`/analysis/${sId}`);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    Open Evidence Canvas
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDownloadReportPdf(selectedReport);
                    setSelectedReport(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  Download Official PDF Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E1A2E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Generate Institutional Report
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Entity / Facility Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Consumer Products Central Hub"
                  value={newReportEntity}
                  onChange={(e) => setNewReportEntity(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Inspection Protocol Type</label>
                <select
                  value={newReportType}
                  onChange={(e) => setNewReportType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Routine Inspection">Routine Inspection</option>
                  <option value="Surprise Audit">Surprise Audit</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="High Risk Investigation">High Risk Investigation</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl shadow-sm"
                >
                  Generate &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReportsPage;
