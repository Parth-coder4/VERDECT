import React, { createContext, useContext, useState, useEffect } from 'react';
import { ScanRecord, ViolationRecord, RuleTaxonomyItem, ProductBatchItem } from '../types/compliance';
import { INITIAL_SCANS, INITIAL_VIOLATIONS, INITIAL_RULEBOOK, INITIAL_BATCHES } from '../services/mockData';
import { ComplianceApi } from '../services/api';
import { useAuth } from './AuthContext';

const SCANS_STORAGE_KEY = 'lmpc_cached_scans_v2';
const VIOLATIONS_STORAGE_KEY = 'lmpc_cached_violations_v2';
const BATCHES_STORAGE_KEY = 'lmpc_cached_batches_v2';

interface ComplianceContextType {
  scans: ScanRecord[];
  activeScan: ScanRecord | null;
  violations: ViolationRecord[];
  rulebook: RuleTaxonomyItem[];
  batches: ProductBatchItem[];
  activeHoverBoxId: string | null;
  setActiveHoverBoxId: (id: string | null) => void;
  setActiveScan: (scan: ScanRecord | null) => void;
  addScanRecord: (scan: ScanRecord) => void;
  deleteScanRecord: (scanId: string) => Promise<void>;
  deleteMultipleScanRecords: (scanIds: string[]) => Promise<void>;
  clearAllScans: () => Promise<void>;
  updateViolationStatus: (id: string, status: ViolationRecord['status']) => Promise<void>;
  toggleRuleStatus: (ruleId: string) => Promise<void>;
  updateRuleThreshold: (ruleId: string, newThreshold: number) => Promise<void>;
  addBatchItem: (item: ProductBatchItem) => Promise<void>;
  updateBatchItem: (id: string, partial: Partial<ProductBatchItem>) => Promise<void>;
  deleteBatchItem: (batchId: string) => Promise<void>;
  resetBatchesToDefault: () => Promise<void>;
  importBatches: (items: ProductBatchItem[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export const ComplianceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(SCANS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_SCANS;
  });

  const [activeScan, setActiveScan] = useState<ScanRecord | null>(scans[0] || null);

  const [violations, setViolations] = useState<ViolationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(VIOLATIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_VIOLATIONS;
  });

  const [rulebook, setRulebook] = useState<RuleTaxonomyItem[]>(INITIAL_RULEBOOK);
  const [batches, setBatches] = useState<ProductBatchItem[]>(() => {
    try {
      const saved = localStorage.getItem(BATCHES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_BATCHES;
  });
  const [activeHoverBoxId, setActiveHoverBoxId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(scans));
  }, [scans]);

  useEffect(() => {
    localStorage.setItem(VIOLATIONS_STORAGE_KEY, JSON.stringify(violations));
  }, [violations]);

  useEffect(() => {
    localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(batches));
  }, [batches]);

  // Load live data from REST endpoints on mount
  useEffect(() => {
    if (isAuthenticated) void refreshData();
  }, [isAuthenticated]);

  const refreshData = async () => {
    try {
      const [freshScans, freshViolations, freshBatches, freshRules] = await Promise.all([
        ComplianceApi.getAllScans(),
        ComplianceApi.getViolations(),
        ComplianceApi.getProductRegistry(),
        ComplianceApi.getRulebook()
      ]);

      if (freshScans && freshScans.length > 0) {
        setScans(freshScans);
        setActiveScan((prev) => prev || freshScans[0]);
      }
      if (freshViolations && freshViolations.length > 0) {
        setViolations(freshViolations);
      }
      if (freshBatches && freshBatches.length > 0) {
        setBatches(freshBatches);
      }
      if (freshRules && freshRules.length > 0) {
        setRulebook(freshRules);
      }
    } catch (e) {
      console.warn('Initial data refresh note:', e);
    }
  };

  const addScanRecord = (scan: ScanRecord) => {
    setScans((prev) => [scan, ...prev]);
    setActiveScan(scan);

    if (scan.overallVerdict === 'NON-COMPLIANT') {
      const newVio: ViolationRecord = {
        id: `VIO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        scanId: scan.id,
        productName: scan.productName,
        brand: scan.brandMetrics?.brandDetected || scan.productName.split(' ')[0] || 'Packaged Commodity',
        batchNumber: scan.batchNumber,
        clauseViolated: scan.ruleEvaluations?.find((r) => r.status === 'ISSUE')?.clause || 'Rule 6(1)(e) Defect',
        ruleTitle: scan.ruleEvaluations?.find((r) => r.status === 'ISSUE')?.title || 'Compliance Failure',
        severity: 'HIGH',
        status: 'PENDING_NOTICE',
        detectedDate: new Date().toISOString().slice(0, 10),
        inspectorId: scan.inspectorId,
        fineAmountInr: scan.penaltyEstimateInr || 25000,
        evidenceThumbnail: scan.frontImageUrl,
        description: scan.notes || 'Identified statutory non-compliance during AI automated inspection.'
      };
      setViolations((prev) => [newVio, ...prev]);
    }
  };

  const deleteScanRecord = async (scanId: string) => {
    if (!(await ComplianceApi.deleteScan(scanId))) return;
    setScans((prev) => {
      const updated = prev.filter((s) => s.id !== scanId);
      if (activeScan?.id === scanId) {
        setActiveScan(updated[0] || null);
      }
      return updated;
    });
    setViolations((prev) => prev.filter((v) => v.scanId !== scanId));
  };

  const deleteMultipleScanRecords = async (scanIds: string[]) => {
    const setIds = new Set(scanIds);
    if (!(await ComplianceApi.deleteMultipleScans(scanIds))) return;
    setScans((prev) => {
      const updated = prev.filter((s) => !setIds.has(s.id));
      if (activeScan && setIds.has(activeScan.id)) {
        setActiveScan(updated[0] || null);
      }
      return updated;
    });
    setViolations((prev) => prev.filter((v) => !setIds.has(v.scanId)));
  };

  const clearAllScans = async () => {
    if (!(await ComplianceApi.clearAllScans())) return;
    setScans([]);
    setActiveScan(null);
    setViolations([]);
  };

  const updateViolationStatus = async (id: string, status: ViolationRecord['status']) => {
    if (!(await ComplianceApi.updateViolationStatus(id, status))) return;
    setViolations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status } : v))
    );
  };

  const toggleRuleStatus = async (ruleId: string) => {
    if (!(await ComplianceApi.toggleRuleStatus(ruleId))) return;
    setRulebook((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  };

  const updateRuleThreshold = async (ruleId: string, newThreshold: number) => {
    if (!(await ComplianceApi.updateRuleThreshold(ruleId, newThreshold))) return;
    setRulebook((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, minThreshold: newThreshold } : r))
    );
  };

  const addBatchItem = async (item: ProductBatchItem) => {
    const saved = await ComplianceApi.addBatchItem(item);
    setBatches((prev) => [saved || item, ...prev]);
  };

  const updateBatchItem = async (id: string, partial: Partial<ProductBatchItem>) => {
    const updated = await ComplianceApi.updateBatchItem(id, partial);
    setBatches((prev) =>
      prev.map((b) => (b.id === id ? (updated ? { ...b, ...updated } : { ...b, ...partial }) : b))
    );
  };

  const deleteBatchItem = async (batchId: string) => {
    await ComplianceApi.deleteBatchItem(batchId);
    setBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  const resetBatchesToDefault = async () => {
    try {
      const seeded = await ComplianceApi.seedRegistryBatches();
      if (seeded && seeded.length > 0) {
        setBatches(seeded);
        return;
      }
    } catch {
      // Fallback
    }
    setBatches(INITIAL_BATCHES);
    localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(INITIAL_BATCHES));
  };

  const importBatches = async (items: ProductBatchItem[]) => {
    try {
      const imported = await ComplianceApi.importRegistryBatches(items);
      if (imported && imported.length > 0) {
        setBatches(imported);
        return;
      }
    } catch {
      // Fallback
    }
    setBatches((prev) => {
      const existingIds = new Set(prev.map((b) => b.id));
      const newItems = items.filter((b) => !existingIds.has(b.id));
      return [...newItems, ...prev];
    });
  };

  return (
    <ComplianceContext.Provider
      value={{
        scans,
        activeScan,
        violations,
        rulebook,
        batches,
        activeHoverBoxId,
        setActiveHoverBoxId,
        setActiveScan,
        addScanRecord,
        deleteScanRecord,
        deleteMultipleScanRecords,
        clearAllScans,
        updateViolationStatus,
        toggleRuleStatus,
        updateRuleThreshold,
        addBatchItem,
        updateBatchItem,
        deleteBatchItem,
        resetBatchesToDefault,
        importBatches,
        refreshData
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
};

export const useCompliance = () => {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
};
