import { ScanRecord, ViolationRecord, RuleTaxonomyItem, ProductBatchItem, CounterfeitMetrics, LiveStreamOcrResult } from '../types/compliance';
import { InspectorOversightItem, SystemAuditLog, RegulatoryReportItem } from '../types/user';
import {
  INITIAL_SCANS,
  INITIAL_VIOLATIONS,
  INITIAL_RULEBOOK,
  INITIAL_BATCHES,
  ADMIN_INSPECTOR_ROSTER,
  INITIAL_AUDIT_LOGS,
  ADMIN_REGULATORY_REPORTS
} from './mockData';

const API_BASE = '/api';

/**
 * Standard authenticated fetch helper that always includes session credentials.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  // Only set application/json if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (response.status === 401) {
    // If unauthenticated, notify session listeners if needed
    console.warn(`[API Auth] 401 Unauthorized from endpoint: ${endpoint}`);
  }

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) errorDetail = errJson.error;
    } catch {
      // Ignored
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const ComplianceApi = {
  /**
   * Submit scan image for Multi-Engine OCR analysis and statutory rule evaluation
   */
  async submitScan(formData: FormData): Promise<ScanRecord> {
    return apiFetch<ScanRecord>('/compliance/scan', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Real-time live camera stream OCR and packaging object detection
   */
  async processLiveStreamFrame(frameBlob: Blob): Promise<LiveStreamOcrResult> {
    const formData = new FormData();
    formData.append('frame', frameBlob, 'stream_frame.jpg');
    return apiFetch<LiveStreamOcrResult>('/compliance/live-stream-ocr', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Submit image for Dedicated Multi-Spectral Forensic Anti-Counterfeit Analysis
   */
  async analyzeCounterfeit(formData: FormData): Promise<CounterfeitMetrics> {
    return apiFetch<CounterfeitMetrics>('/counterfeit/analyze', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Fetch preset benchmark counterfeit samples
   */
  async getCounterfeitPresets(): Promise<any> {
    try {
      return await apiFetch<any>('/counterfeit/presets');
    } catch (e) {
      return null;
    }
  },

  // --- SCAN RECORDS ---
  async getAllScans(status?: string): Promise<ScanRecord[]> {
    try {
      const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
      return await apiFetch<ScanRecord[]>(`/compliance/records${query}`);
    } catch (e) {
      console.warn('ComplianceApi.getAllScans fallback:', e);
      return INITIAL_SCANS;
    }
  },

  async getScanById(id: string): Promise<ScanRecord | undefined> {
    try {
      return await apiFetch<ScanRecord>(`/compliance/records/${id}`);
    } catch (e) {
      return undefined;
    }
  },

  async deleteScan(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/compliance/records/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async deleteMultipleScans(ids: string[]): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean; count: number }>('/compliance/records/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids })
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async clearAllScans(): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>('/compliance/records', {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- VIOLATIONS ---
  async getViolations(status?: string): Promise<ViolationRecord[]> {
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : '';
      return await apiFetch<ViolationRecord[]>(`/violations${query}`);
    } catch (e) {
      return INITIAL_VIOLATIONS;
    }
  },

  async updateViolationStatus(id: string, status: ViolationRecord['status']): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/violations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async deleteViolation(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/violations/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- RULEBOOK ---
  async getRulebook(): Promise<RuleTaxonomyItem[]> {
    try {
      return await apiFetch<RuleTaxonomyItem[]>('/rulebook');
    } catch (e) {
      return INITIAL_RULEBOOK;
    }
  },

  async addRule(rule: Partial<RuleTaxonomyItem>): Promise<RuleTaxonomyItem | null> {
    try {
      return await apiFetch<RuleTaxonomyItem>('/rulebook', {
        method: 'POST',
        body: JSON.stringify(rule)
      });
    } catch (e) {
      console.error('Add rule error:', e);
      return null;
    }
  },

  async updateRule(id: string, rule: Partial<RuleTaxonomyItem>): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/rulebook/${id}`, {
        method: 'PUT',
        body: JSON.stringify(rule)
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async toggleRuleStatus(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/rulebook/${id}/toggle`, {
        method: 'PATCH'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async updateRuleThreshold(id: string, threshold: number): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/rulebook/${id}/threshold`, {
        method: 'PATCH',
        body: JSON.stringify({ threshold })
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async deleteRule(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/rulebook/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- PRODUCT REGISTRY ---
  async getProductRegistry(search?: string): Promise<ProductBatchItem[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return await apiFetch<ProductBatchItem[]>(`/registry${query}`);
    } catch (e) {
      return INITIAL_BATCHES;
    }
  },

  async addBatchItem(item: ProductBatchItem): Promise<ProductBatchItem | null> {
    try {
      return await apiFetch<ProductBatchItem>('/registry', {
        method: 'POST',
        body: JSON.stringify(item)
      });
    } catch (e) {
      return item;
    }
  },

  async updateBatchItem(id: string, item: Partial<ProductBatchItem>): Promise<ProductBatchItem | null> {
    try {
      return await apiFetch<ProductBatchItem>(`/registry/${id}`, {
        method: 'PUT',
        body: JSON.stringify(item)
      });
    } catch (e) {
      return null;
    }
  },

  async deleteBatchItem(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/registry/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async seedRegistryBatches(): Promise<ProductBatchItem[] | null> {
    try {
      return await apiFetch<ProductBatchItem[]>('/registry/seed', {
        method: 'POST'
      });
    } catch (e) {
      return null;
    }
  },

  async importRegistryBatches(items: ProductBatchItem[]): Promise<ProductBatchItem[] | null> {
    try {
      return await apiFetch<ProductBatchItem[]>('/registry/import', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
    } catch (e) {
      return null;
    }
  },

  // --- ADMIN APIs ---
  async getAdminInspectors(): Promise<InspectorOversightItem[]> {
    try {
      return await apiFetch<InspectorOversightItem[]>('/admin/inspectors');
    } catch (e) {
      return ADMIN_INSPECTOR_ROSTER;
    }
  },

  async addAdminInspector(insp: InspectorOversightItem & { password?: string }): Promise<InspectorOversightItem | null> {
    try {
      return await apiFetch<InspectorOversightItem>('/admin/inspectors', {
        method: 'POST',
        body: JSON.stringify(insp)
      });
    } catch (e) {
      console.error('Add inspector error:', e);
      return null;
    }
  },

  async updateAdminInspector(id: string, insp: Partial<InspectorOversightItem>): Promise<InspectorOversightItem | null> {
    try {
      return await apiFetch<InspectorOversightItem>(`/admin/inspectors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(insp)
      });
    } catch (e) {
      return null;
    }
  },

  async deleteAdminInspector(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/admin/inspectors/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async getAdminLogs(search?: string): Promise<SystemAuditLog[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return await apiFetch<SystemAuditLog[]>(`/admin/logs${query}`);
    } catch (e) {
      return INITIAL_AUDIT_LOGS;
    }
  },

  async addAdminLog(log: Partial<SystemAuditLog>): Promise<boolean> {
    try {
      await apiFetch<SystemAuditLog>('/admin/logs', {
        method: 'POST',
        body: JSON.stringify(log)
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async getAdminReports(): Promise<RegulatoryReportItem[]> {
    try {
      return await apiFetch<RegulatoryReportItem[]>('/admin/reports');
    } catch (e) {
      return ADMIN_REGULATORY_REPORTS;
    }
  },

  async createAdminReport(report: Partial<RegulatoryReportItem>): Promise<RegulatoryReportItem | null> {
    try {
      return await apiFetch<RegulatoryReportItem>('/admin/reports', {
        method: 'POST',
        body: JSON.stringify(report)
      });
    } catch (e) {
      return null;
    }
  },

  async deleteAdminReport(id: string): Promise<boolean> {
    try {
      await apiFetch<{ success: boolean }>(`/admin/reports/${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (e) {
      return false;
    }
  }
};
