import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCompliance } from '../context/ComplianceContext';
import { EvidenceCanvas } from '../components/canvas/EvidenceCanvas';
import { CanvasLegend } from '../components/canvas/CanvasLegend';
import { ComplianceDashboard } from '../components/analysis/ComplianceDashboard';
import { ActionButtonBar } from '../components/analysis/ActionButtonBar';
import { StatusPill } from '../components/common/StatusPill';

export const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scans } = useCompliance();

  const [activeHoverBoxId, setActiveHoverBoxId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<string>('front');

  // Find scan or fallback to first available
  const currentScan = useMemo(() => {
    return scans.find((s) => s.id === id) || scans[0];
  }, [scans, id]);

  // Compute all available packaging panels
  const panels = useMemo(() => {
    if (currentScan?.panels && currentScan.panels.length > 0) {
      return currentScan.panels;
    }
    const defaultPanels = [
      {
        id: 'panel_front',
        side: 'front',
        label: 'Front Label (PDP)',
        imageUrl: currentScan?.frontImageUrl || '',
        boundingBoxes: currentScan?.boundingBoxes || []
      }
    ];
    if (currentScan?.backImageUrl) {
      defaultPanels.push({
        id: 'panel_back_0',
        side: 'back_0',
        label: 'Back Panel (Statutory)',
        imageUrl: currentScan.backImageUrl,
        boundingBoxes: currentScan.backBoundingBoxes || []
      });
    }
    return defaultPanels;
  }, [currentScan]);

  // Determine current active panel
  const activePanel = useMemo(() => {
    return (
      panels.find((p) => p.side === activeSide) ||
      panels[0] || {
        id: 'panel_front',
        side: 'front',
        label: 'Front Label (PDP)',
        imageUrl: currentScan?.frontImageUrl || '',
        boundingBoxes: currentScan?.boundingBoxes || []
      }
    );
  }, [panels, activeSide, currentScan]);

  const activeImageUrl = activePanel.imageUrl;
  const activeBoxes = activePanel.boundingBoxes;

  if (!currentScan) {
    return (
      <div className="p-12 text-center select-none">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Inspection Evidence Found</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Please upload a packaging image first.</p>
        <button
          onClick={() => navigate('/scan')}
          className="mt-4 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-xs shadow-md"
        >
          Go to Scan Portal
        </button>
      </div>
    );
  }

  const handleHoverRule = (boxId: string | null) => {
    setActiveHoverBoxId(boxId);
    if (boxId) {
      // Auto-switch to the panel containing the hovered bounding box
      const targetPanel = panels.find((p) => p.boundingBoxes.some((b) => b.id === boxId));
      if (targetPanel && targetPanel.side !== activeSide) {
        setActiveSide(targetPanel.side);
      }
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 animate-in fade-in duration-200 select-none font-sans">
      {/* Header Banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              VERDECT Ref: #{currentScan.id}
            </span>
            <StatusPill status={currentScan.overallVerdict} />
            <Link
              to={`/counterfeit?scanId=${encodeURIComponent(currentScan.id)}`}
              state={{ scanId: currentScan.id, scan: currentScan }}
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1.5 hover:shadow-xs hover:scale-105 active:scale-95 ${
                (currentScan.counterfeitMetrics?.counterfeitScore || 5) > 55
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                  : (currentScan.counterfeitMetrics?.counterfeitScore || 5) > 25
                  ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              Forensic Risk: {currentScan.counterfeitMetrics?.counterfeitScore || 5}/100 ({currentScan.counterfeitMetrics?.verdict || 'AUTHENTIC'})
            </Link>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {currentScan.productName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Batch: {currentScan.batchNumber} &bull; Barcode: {currentScan.barcode} &bull; Inspected: {currentScan.timestamp} &bull; Panels: {panels.length} Sides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={currentScan.id}
            onChange={(e) => navigate(`/analysis/${e.target.value}`)}
            className="text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold font-mono focus:outline-none focus:border-sky-500 shadow-xs"
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} - {s.productName.slice(0, 24)}...
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Bento Layout Grid (Canvas 7 Cols + Breakdown 5 Cols) */}
      <div className="bento-grid">
        {/* Left Column: Visual Evidence Canvas (Col Span 7) */}
        <div className="col-span-12 lg:col-span-7 glass-card rounded-3xl p-4 overflow-hidden flex flex-col relative min-h-[600px] shadow-sm gap-3 border border-slate-200/80 dark:border-slate-800">
          {/* Multi-Panel Switcher Tabs (Front PDP, Back Panel, Side Panel 1, Side Panel 2) */}
          <div className="flex items-center justify-between bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              {panels.map((p, idx) => {
                const isActive = activeSide === p.side;
                return (
                  <button
                    key={p.id || p.side}
                    type="button"
                    onClick={() => setActiveSide(p.side)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm ring-1 ring-sky-500/20'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {idx === 0 ? 'front_hand' : idx === 1 ? 'flip_to_back' : 'view_column'}
                    </span>
                    <span>{p.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-full font-black">
                      {p.boundingBoxes.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 pr-2 hidden sm:inline shrink-0">
              Active: <strong className="text-slate-900 dark:text-white uppercase">{activePanel.label}</strong>
            </span>
          </div>

          <CanvasLegend />

          <EvidenceCanvas
            imageUrl={activeImageUrl}
            boundingBoxes={activeBoxes}
            activeBoxId={activeHoverBoxId}
            onHoverBox={setActiveHoverBoxId}
          />
        </div>

        {/* Right Column: Dual-Engine Compliance Dashboard (Col Span 5) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <ComplianceDashboard
            scan={currentScan}
            activeHoverBoxId={activeHoverBoxId}
            onHoverBox={handleHoverRule}
          />
        </div>
      </div>

      {/* Action Button Bar */}
      <ActionButtonBar scan={currentScan} onRetest={() => navigate('/scan')} />
    </div>
  );
};

export default AnalysisPage;
