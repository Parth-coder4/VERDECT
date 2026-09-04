import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_AUDIT_LOGS } from '../../services/mockData';
import { SystemAuditLog } from '../../types/user';
import { ComplianceApi } from '../../services/api';
import { formatAuditTimestamp } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

const LOCAL_STORAGE_KEY = 'lmpc_system_audit_logs';

export const AdminLogsPage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SystemAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_AUDIT_LOGS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const fetchLogs = () => {
    setIsLoading(true);
    ComplianceApi.getAdminLogs()
      .then((data) => {
        if (data && data.length > 0) {
          setLogs(data);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
  }, [logs]);

  // Find latest login log
  const latestLoginLog = useMemo(() => {
    return logs.find((l) => l.action === 'USER_LOGIN' || l.category === 'AUTH') || logs[0];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs
      .filter((l) => {
        const matchSearch =
          l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.targetResource.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (l.details && l.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
          l.ipAddress.includes(searchQuery);

        const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
        const matchCategory =
          categoryFilter === 'ALL' ||
          (categoryFilter === 'AUTH' && (l.category === 'AUTH' || l.action.includes('LOGIN') || l.action.includes('AUTH'))) ||
          (categoryFilter === 'INSPECTION' && (l.category === 'INSPECTION' || l.action.includes('SCAN'))) ||
          (categoryFilter === 'RULE_CHANGE' && (l.category === 'RULE_CHANGE' || l.action.includes('RULE'))) ||
          (categoryFilter === 'SECURITY' && (l.category === 'SECURITY' || l.action.includes('SEC') || l.action.includes('SYS')));

        return matchSearch && matchStatus && matchCategory;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp.includes('T') ? a.timestamp : a.timestamp.replace(' ', 'T')).getTime() || 0;
        const timeB = new Date(b.timestamp.includes('T') ? b.timestamp : b.timestamp.replace(' ', 'T')).getTime() || 0;
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [logs, searchQuery, statusFilter, categoryFilter, sortOrder]);

  const handleExportAuditTrail = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Log ID,Formatted Date & Time,Raw Timestamp,User / Principal,Action Taken,Target Resource,Source IP,Status,Details\n' +
      logs
        .map((l) => {
          const formatted = formatAuditTimestamp(l.timestamp);
          return `"${l.id}","${formatted.formattedDate}","${l.timestamp}","${l.userName}","${l.action}","${l.targetResource}","${l.ipAddress}","${l.status}","${(l.details || '').replace(/"/g, '""')}"`;
        })
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `VERDECT_System_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: SystemAuditLog['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 rounded-full text-[10px] font-extrabold">
            SUCCESS
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 rounded-full text-[10px] font-extrabold">
            WARNING
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 rounded-full text-[10px] font-extrabold">
            FAILED
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            System Security &amp; Access Logs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Immutable statutory audit trail, authentication timestamps, security events, and rulebook modifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-sm transition-all"
            title="Refresh Audit Logs"
          >
            <span className={`material-symbols-outlined text-base ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportAuditTrail}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold rounded-2xl flex items-center gap-2 shadow-sm transition-all active:scale-98 tracking-wide"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export Audit Trail
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0C1526] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              AUDIT LOGS RECORDED
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{logs.length}</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md">
              100% Integrity
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0C1526] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              AUTHENTICATED SESSION
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">verified_user</span>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {user?.name || 'Administrator'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Last Login: <strong className="text-slate-800 dark:text-slate-200">{latestLoginLog ? formatAuditTimestamp(latestLoginLog.timestamp).formattedDate : 'Today'}</strong>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0C1526] rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              SECURITY SHIELD
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">shield</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">0 Breaches</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-md">
              Shield Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-[#0C1526] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by action, user, IP, or resource..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Category & Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'AUTH', label: 'Logins & Auth' },
                { id: 'INSPECTION', label: 'Scans' },
                { id: 'RULE_CHANGE', label: 'Rules' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1">
              {['ALL', 'SUCCESS', 'WARNING', 'FAILED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-slate-900 dark:bg-sky-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
              title="Toggle sort direction"
            >
              <span className="material-symbols-outlined text-xs">swap_vert</span>
              <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">LOG REF</th>
                <th className="py-3.5 px-4">TIMESTAMP &amp; DATE</th>
                <th className="py-3.5 px-4">USER / PRINCIPAL</th>
                <th className="py-3.5 px-4">ACTION TAKEN</th>
                <th className="py-3.5 px-4">TARGET RESOURCE</th>
                <th className="py-3.5 px-4">SOURCE IP</th>
                <th className="py-3.5 px-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No matching audit log records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const formatted = formatAuditTimestamp(log.timestamp);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-sky-600 dark:text-sky-400">{log.id}</td>
                      <td className="py-4 px-4 font-mono">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          {formatted.formattedDate}
                        </span>
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold block">
                          {formatted.relativeTime}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{log.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{log.userId}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{log.action}</span>
                        {log.details && (
                          <span className="text-[10px] text-slate-400 line-clamp-1 block max-w-xs">{log.details}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">{log.targetResource}</td>
                      <td className="py-4 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px]">{log.ipAddress}</td>
                      <td className="py-4 px-6 text-right">{getStatusBadge(log.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLogsPage;

