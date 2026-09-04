export type UserRole =
  | 'ADMINISTRATOR'
  | 'SYSTEM_ADMIN'
  | 'SENIOR_INSPECTOR'
  | 'FIELD_OFFICER'
  | 'COMPLIANCE_DIRECTOR'
  | 'INSPECTOR';

export interface UserProfile {
  id: string;
  name: string;
  badgeNumber: string;
  role: UserRole;
  jurisdiction: string;
  email: string;
  avatarUrl: string;
  inspectionsCompleted: number;
  accuracyRate: number;
  activeStatus: boolean;
  department?: string;
  lastLogin?: string;
}

export interface InspectorOversightItem {
  id: string;
  name: string;
  initials: string;
  idBadge: string;
  totalInspections: number;
  reportsGenerated: number;
  currentStatus: 'Active - Field' | 'Active - Lab' | 'Off Duty' | 'Review Required';
  statusType: 'success' | 'info' | 'neutral' | 'warning' | 'danger';
  email: string;
  phone: string;
  jurisdiction: string;
  avatarBgColor?: string;
  lastActiveTime?: string;
  lastLogin?: string;
  accuracyRate?: number;
}

export interface AdminRuleItem {
  id: string;
  ruleCode: string;
  name: string;
  category: 'Authentication' | 'Scanning' | 'Physical' | 'Mandatory Declarations' | 'Pricing & Currency' | 'Geometric' | string;
  severity: 'High' | 'Medium' | 'Low' | 'Critical';
  status: boolean; // active / inactive
  description: string;
  threshold?: string;
  lastUpdated?: string;
}

export interface RegulatoryReportItem {
  id: string;
  subjectEntity: string;
  entityInitials: string;
  inspectorName: string;
  type: 'Routine Inspection' | 'Surprise Audit' | 'Follow-up' | 'High Risk Investigation';
  dateGenerated: string;
  status: 'Violation Found' | 'Clear' | 'Pending Review' | 'Under Investigation';
  statusType: 'danger' | 'success' | 'warning' | 'info';
  location: string;
  severityLevel?: 'High' | 'Medium' | 'Low';
  fineAmountInr?: number;
  productName?: string;
  scanId?: string;
  source?: 'SCAN' | 'INSTITUTIONAL';
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  targetResource: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  category?: 'AUTH' | 'RULE_CHANGE' | 'INSPECTION' | 'EXPORT' | 'SECURITY';
  details?: string;
}
