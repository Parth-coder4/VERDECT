export type ComplianceStatus = 'PASS' | 'ISSUE' | 'REVIEW' | 'NA';
export type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL';

export interface MultilingualToken {
  id: string;
  text: string;
  script: string;
  language: string;
  confidence: number;
  category: string;
  side?: string;
  box?: [number, number, number, number];
  bbox?: [number, number, number, number];
}

export interface BoundingBox {
  id: string;
  label: string;
  ruleCode: string; // e.g. 'RULE_6_1_MRP', 'RULE_6_1_QTY', 'RULE_7_FONT'
  coords: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in normalized 0..1 or pixel coords
  status: ComplianceStatus;
  detectedText: string;
  requiredFormat?: string;
  confidence: number;
  category: 'mrp' | 'address' | 'quantity' | 'helpline' | 'mfg_date' | 'brand_logo' | 'fssai' | 'font' | 'nutrition' | 'ingredients' | 'indic_text' | 'other';
  side?: string; // 'front' | 'back' | 'back_0' | 'back_1' | 'back_2' | 'side_1' etc.
  script?: string; // e.g. 'Devanagari (Hindi/Marathi)', 'Tamil', 'Telugu', 'Latin (English)'
  language?: string; // e.g. 'hi', 'mr', 'ta', 'te', 'en'
  is_multilingual?: boolean;
}

export interface PanelImage {
  id: string;
  side: string;
  label: string;
  imageUrl: string;
  boundingBoxes: BoundingBox[];
}

export interface RuleEvaluation {
  id: string;
  ruleCode: string;
  title: string;
  clause: string;
  status: ComplianceStatus;
  detectedValue: string;
  requiredSpecification: string;
  confidence: number;
  boundingBoxId?: string;
  notes?: string;
  side?: string;
}

export interface FontGeometryMetrics {
  detectedHeightMm: number;
  requiredHeightMm: number;
  packageAreaCm2: number;
  targetField: string;
  status: ComplianceStatus;
  percentage: number;
}

export interface CounterfeitFactorMetrics {
  hologramOpticalScore: number; // 1-100
  packagingGamutFidelity: number; // 1-100
  barcodeGs1Integrity: number; // 1-100
  microprintTypography: number; // 1-100
  tamperSealStatus: 'INTACT' | 'SUSPICIOUS' | 'BROKEN_TAMPERED';
}

export interface CounterfeitMetrics {
  counterfeitScore: number; // 1 to 100 (1-20 Authentic/Low Risk, 21-50 Moderate, 51-100 High Risk Counterfeit)
  verdict: 'AUTHENTIC' | 'SUSPECTED_COUNTERFEIT' | 'CRITICAL_COUNTERFEIT';
  confidence: number;
  factors: CounterfeitFactorMetrics;
  detectedAnomalies: string[];
  forensicNotes: string;
}

export interface BrandAuthenticityMetrics {
  similarityScore: number;
  brandDetected: string;
  registeredOwner: string;
  confidence: number;
  status: 'GENUINE' | 'SUSPECT' | 'COUNTERFEIT';
  details: string[];
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  productName: string;
  category: string;
  batchNumber: string;
  barcode: string;
  manufacturer: string;
  frontImageUrl: string;
  backImageUrl?: string;
  additionalImageUrls?: string[];
  panels?: PanelImage[];
  overallVerdict: 'COMPLIANT' | 'NON-COMPLIANT' | 'UNDER_REVIEW';
  complianceRate: number;
  confidenceScore: number;
  inspectorId: string;
  inspectorName: string;
  notes?: string;
  boundingBoxes: BoundingBox[];
  backBoundingBoxes?: BoundingBox[];
  ruleEvaluations: RuleEvaluation[];
  fontMetrics: FontGeometryMetrics;
  counterfeitMetrics: CounterfeitMetrics;
  brandMetrics?: BrandAuthenticityMetrics;
  penaltyEstimateInr?: number;
  multilingualTokens?: MultilingualToken[];
  multilingual_tokens?: MultilingualToken[];
  detectedLanguages?: string[];
  detected_languages?: string[];
}


export interface ViolationRecord {
  id: string;
  scanId: string;
  productName: string;
  brand: string;
  batchNumber: string;
  clauseViolated: string;
  ruleTitle: string;
  severity: SeverityLevel;
  status: 'PENDING_NOTICE' | 'NOTICE_SERVED' | 'UNDER_APPEAL' | 'RESOLVED';
  detectedDate: string;
  inspectorId: string;
  fineAmountInr: number;
  evidenceThumbnail: string;
  description: string;
}

export interface RuleTaxonomyItem {
  id: string;
  code: string;
  title: string;
  category: string;
  legalAct: string;
  ruleClause: string;
  description: string;
  active: boolean;
  minThreshold: number;
  unit: string;
  penaltySection: string;
}

export interface ProductBatchItem {
  id: string;
  sku: string;
  productName: string;
  brand: string;
  category: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  declaredMRP: number;
  netQuantity: string;
  manufacturer: string;
  complianceHistory: {
    scansCount: number;
    passedCount: number;
    violationsCount: number;
  };
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  fssaiLicense?: string;
  consumerCare?: string;
  originCountry?: string;
  cin?: string;
  registeredDate?: string;
  notes?: string;
  barcodeType?: string;
}

export interface LiveFeatureItem {
  id: string;
  category: 'mrp' | 'address' | 'quantity' | 'helpline' | 'mfg_date' | 'brand_logo' | 'fssai' | 'font' | 'nutrition' | 'ingredients' | 'indic_text' | 'other';
  text: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  confidence: number;
  label: string;
  script?: string;
  language?: string;
  is_multilingual?: boolean;
}

export interface LiveObjectDetection {
  detected: boolean;
  box: [number, number, number, number];
  area_ratio: number;
  label: string;
}

export interface LiveBarcodeDetection {
  detected: boolean;
  code: string;
  format: string;
  gs1Country: string;
  isValidChecksum: boolean;
  box: [number, number, number, number];
}

export interface LiveStreamOcrResult {
  status: string;
  is_blurry: boolean;
  focus_measure: number;
  object: LiveObjectDetection;
  barcode: LiveBarcodeDetection | null;
  features: LiveFeatureItem[];
  brand_name: string;
  statutory_count: number;
  statutory_categories: string[];
  multilingual_tokens?: LiveFeatureItem[];
  multilingualTokens?: LiveFeatureItem[];
  detected_languages?: string[];
  detectedLanguages?: string[];
  has_multilingual?: boolean;
}

