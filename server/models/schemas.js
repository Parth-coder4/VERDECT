/**
 * Mongoose Schema Definitions for MongoDB Persistence
 * (Also supported via embedded JSON datastore in server/data/store.js)
 */

const ScanRecordSchema = {
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  batchNumber: { type: String, required: true },
  barcode: { type: String, required: true },
  manufacturer: { type: String, required: true },
  frontImageUrl: { type: String, required: true },
  backImageUrl: { type: String },
  overallVerdict: { type: String, enum: ['COMPLIANT', 'NON-COMPLIANT', 'UNDER_REVIEW'], required: true },
  complianceRate: { type: Number, required: true },
  confidenceScore: { type: Number, required: true },
  inspectorId: { type: String, required: true },
  inspectorName: { type: String, required: true },
  notes: { type: String },
  boundingBoxes: [{
    id: String,
    label: String,
    ruleCode: String,
    coords: [Number], // [ymin, xmin, ymax, xmax]
    status: { type: String, enum: ['PASS', 'ISSUE', 'REVIEW', 'NA'] },
    detectedText: String,
    requiredFormat: String,
    confidence: Number,
    category: String
  }],
  ruleEvaluations: [{
    id: String,
    ruleCode: String,
    title: String,
    clause: String,
    status: { type: String, enum: ['PASS', 'ISSUE', 'REVIEW', 'NA'] },
    detectedValue: String,
    requiredSpecification: String,
    confidence: Number,
    boundingBoxId: String,
    notes: String
  }],
  fontMetrics: {
    detectedHeightMm: Number,
    requiredHeightMm: Number,
    packageAreaCm2: Number,
    targetField: String,
    status: String,
    percentage: Number
  },
  brandMetrics: {
    similarityScore: Number,
    brandDetected: String,
    registeredOwner: String,
    confidence: Number,
    status: String,
    details: [String]
  },
  penaltyEstimateInr: Number
};

const RuleTaxonomySchema = {
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  legalAct: { type: String, required: true },
  ruleClause: { type: String, required: true },
  description: { type: String, required: true },
  active: { type: Boolean, default: true },
  minThreshold: { type: Number, required: true },
  unit: { type: String, required: true },
  penaltySection: { type: String, required: true }
};

const AuditLogSchema = {
  id: { type: String, required: true, unique: true },
  timestamp: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  targetResource: { type: String, required: true },
  ipAddress: { type: String, required: true },
  status: { type: String, enum: ['SUCCESS', 'WARNING', 'FAILED'], required: true }
};

module.exports = {
  ScanRecordSchema,
  RuleTaxonomySchema,
  AuditLogSchema
};
