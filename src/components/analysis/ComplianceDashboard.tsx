import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanRecord } from '../../types/compliance';
import { useCompliance } from '../../context/ComplianceContext';
import { RuleMatrixCard } from './RuleMatrixCard';
import { FontGeometryCard } from './FontGeometryCard';
import { CounterfeitRiskCard } from './CounterfeitRiskCard';
import { BrandAuthenticityCard } from './BrandAuthenticityCard';
import { MultilingualDeclarationsCard } from './MultilingualDeclarationsCard';

interface ComplianceDashboardProps {
  scan: ScanRecord;
  activeHoverBoxId: string | null;
  onHoverBox: (boxId: string | null) => void;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  scan,
  activeHoverBoxId,
  onHoverBox
}) => {
  const navigate = useNavigate();
  const { batches, addBatchItem } = useCompliance();

  // Find matching batch in registry by SKU, barcode, productName, or brand
  const matchedBatch = React.useMemo(() => {
    const qName = (scan.productName || '').toLowerCase();
    const qBarcode = (scan.barcode || '').toLowerCase();
    const qBrand = (scan.brandMetrics?.brandDetected || '').toLowerCase();

    return batches.find(
      (b) =>
        (qBarcode && qBarcode !== 'no barcode detected' && b.sku.toLowerCase() === qBarcode) ||
        (qName && b.productName.toLowerCase().includes(qName)) ||
        (qName && qName.includes(b.productName.toLowerCase())) ||
        (qBrand && b.brand.toLowerCase() === qBrand)
    );
  }, [batches, scan]);

  const handleQuickRegister = async () => {
    const newSku = scan.barcode && scan.barcode !== 'No barcode detected'
      ? scan.barcode
      : `890${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const newItem = {
      id: `prod_${Date.now()}`,
      sku: newSku,
      productName: scan.productName || 'Packaged Commodity',
      brand: scan.brandMetrics?.brandDetected || scan.productName.split(' ')[0] || 'Registered Brand',
      category: scan.category || 'Packaged Foods',
      batchNumber: scan.batchNumber || `BATCH-${new Date().getFullYear()}-01`,
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: '2027-12-31',
      declaredMRP: 50,
      netQuantity: '200 g',
      manufacturer: scan.manufacturer || 'Registered FMCG Packager',
      complianceHistory: { scansCount: 1, passedCount: scan.overallVerdict === 'COMPLIANT' ? 1 : 0, violationsCount: scan.overallVerdict === 'NON-COMPLIANT' ? 1 : 0 },
      riskScore: scan.overallVerdict === 'NON-COMPLIANT' ? ('HIGH' as const) : ('LOW' as const),
      registeredDate: new Date().toISOString().slice(0, 10)
    };

    await addBatchItem(newItem);
    navigate('/registry');
  };

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* Product Registry Match Card */}
      {matchedBatch ? (
        <div className="glass-card rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">inventory_2</span>
              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Master Commodity Registry Match
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-mono">
              SKU: {matchedBatch.sku}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-slate-400 text-[10px] block">Registered Brand:</span>
              <strong className="text-slate-800 dark:text-slate-200">{matchedBatch.brand}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Master MRP:</span>
              <strong className="text-slate-800 dark:text-slate-200">₹{matchedBatch.declaredMRP.toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Master Net Qty:</span>
              <strong className="text-slate-800 dark:text-slate-200">{matchedBatch.netQuantity}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Registry Risk:</span>
              <strong className={matchedBatch.riskScore === 'HIGH' ? 'text-rose-600' : 'text-emerald-600'}>
                {matchedBatch.riskScore}
              </strong>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className="text-slate-400 truncate max-w-[70%]">
              Master Address: {matchedBatch.manufacturer}
            </span>
            <button
              onClick={() => navigate(`/registry?search=${encodeURIComponent(matchedBatch.sku)}`)}
              className="text-sky-600 dark:text-sky-400 hover:underline font-bold shrink-0 flex items-center gap-0.5"
            >
              <span>View in Registry</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">app_registration</span>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">New Commodity Unregistered</p>
              <p className="text-[10px] text-slate-400">This scanned SKU is not yet recorded in the Master Commodity Database.</p>
            </div>
          </div>
          <button
            onClick={handleQuickRegister}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[11px] font-bold shadow-xs shrink-0 flex items-center gap-1 transition-all"
          >
            <span className="material-symbols-outlined text-xs">add_box</span>
            Register in Database
          </button>
        </div>
      )}

      {/* Brand Authenticity Card if available */}
      {scan.brandMetrics && (
        <BrandAuthenticityCard
          metrics={scan.brandMetrics}
          isHovered={activeHoverBoxId === 'box_front_brand' || activeHoverBoxId === 'box_brand'}
          onHover={() =>
            onHoverBox(scan.boundingBoxes.find((b) => b.category === 'brand_logo')?.id || null)
          }
          onLeave={() => onHoverBox(null)}
        />
      )}

      {/* Multilingual Indic Declarations Card */}
      <MultilingualDeclarationsCard
        scan={scan}
        activeHoverBoxId={activeHoverBoxId}
        onHoverRule={onHoverBox}
      />

      {/* Rule 6 & 12 Mandatory Declarations & OCR Text Findings */}
      <RuleMatrixCard
        evaluations={scan.ruleEvaluations}
        boundingBoxes={scan.boundingBoxes}
        backBoundingBoxes={scan.backBoundingBoxes}
        activeHoverBoxId={activeHoverBoxId}
        onHoverRule={onHoverBox}
      />

      {/* Rule 12 Font Geometry */}
      <FontGeometryCard
        metrics={scan.fontMetrics}
        isHovered={activeHoverBoxId === 'box_mrp' || activeHoverBoxId === 'box_font_3'}
        onHover={() =>
          onHoverBox(
            scan.boundingBoxes.find((b) => b.category === 'mrp' || b.category === 'font')?.id || null
          )
        }
        onLeave={() => onHoverBox(null)}
      />

      {/* Counterfeit Detection & Risk Score Gauge (1-100) */}
      <CounterfeitRiskCard
        metrics={scan.counterfeitMetrics}
        scanId={scan.id}
        scan={scan}
        isHovered={activeHoverBoxId === 'box_brand' || activeHoverBoxId === 'box_brand_2'}
        onHover={() =>
          onHoverBox(scan.boundingBoxes.find((b) => b.category === 'brand_logo')?.id || null)
        }
        onLeave={() => onHoverBox(null)}
      />
    </div>
  );
};

export default ComplianceDashboard;
