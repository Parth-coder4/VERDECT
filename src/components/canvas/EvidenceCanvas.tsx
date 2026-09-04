import React, { useRef, useEffect, useState } from 'react';
import { BoundingBox } from '../../types/compliance';

interface EvidenceCanvasProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  activeBoxId: string | null;
  onHoverBox: (boxId: string | null) => void;
}

export const EvidenceCanvas: React.FC<EvidenceCanvasProps> = ({
  imageUrl,
  boundingBoxes,
  activeBoxId,
  onHoverBox
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    box: BoundingBox | null;
  }>({ visible: false, x: 0, y: 0, box: null });

  const drawBoxes = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayedWidth = img.clientWidth;
    const displayedHeight = img.clientHeight;

    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    boundingBoxes.forEach((box) => {
      const [ymin, xmin, ymax, xmax] = box.coords;

      const x1 = xmin <= 1 ? xmin * displayedWidth : (xmin / img.naturalWidth) * displayedWidth;
      const y1 = ymin <= 1 ? ymin * displayedHeight : (ymin / img.naturalHeight) * displayedHeight;
      const x2 = xmax <= 1 ? xmax * displayedWidth : (xmax / img.naturalWidth) * displayedWidth;
      const y2 = ymax <= 1 ? ymax * displayedHeight : (ymax / img.naturalHeight) * displayedHeight;

      const w = x2 - x1;
      const h = y2 - y1;

      const isActive = box.id === activeBoxId;

      let strokeColor = '#10B981'; // Green (default PASS)
      let fillColor = 'rgba(16, 185, 129, 0.16)';

      if (box.status === 'ISSUE') {
        strokeColor = '#EF4444'; // Red (Non-compliant)
        fillColor = 'rgba(239, 68, 68, 0.22)';
      } else if (box.category === 'brand_logo') {
        strokeColor = '#0EA5E9'; // Sky (Brand & Trademark)
        fillColor = 'rgba(14, 165, 233, 0.18)';
      } else if (box.category === 'nutrition') {
        strokeColor = '#F97316'; // Orange (Nutritional Facts)
        fillColor = 'rgba(249, 115, 22, 0.18)';
      } else if (box.category === 'quantity') {
        strokeColor = '#8B5CF6'; // Purple (Net Quantity & Weight)
        fillColor = 'rgba(139, 92, 246, 0.18)';
      } else if (box.category === 'address') {
        strokeColor = '#06B6D4'; // Cyan (Manufacturer Address)
        fillColor = 'rgba(6, 182, 212, 0.18)';
      } else if (box.category === 'helpline') {
        strokeColor = '#F59E0B'; // Amber (Consumer Helpline)
        fillColor = 'rgba(245, 158, 11, 0.18)';
      } else if (box.category === 'ingredients') {
        strokeColor = '#14B8A6'; // Teal (Ingredients)
        fillColor = 'rgba(20, 184, 166, 0.18)';
      } else if (box.category === 'mfg_date') {
        strokeColor = '#F43F5E'; // Rose (Date of Mfg & Expiry)
        fillColor = 'rgba(244, 63, 94, 0.18)';
      }

      ctx.save();
      if (isActive) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3.5;
        ctx.fillStyle = fillColor.replace(/0\.\d+\)/, '0.35)');
      } else {
        ctx.lineWidth = 2;
        ctx.fillStyle = fillColor;
      }

      // Draw bounding box
      ctx.strokeStyle = strokeColor;
      ctx.beginPath();
      ctx.rect(x1, y1, w, h);
      ctx.fill();
      ctx.stroke();

      // Draw label pill
      ctx.shadowBlur = 0;
      const labelText = `${box.label}`;
      ctx.font = 'bold 11px Inter, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const paddingX = 6;
      const paddingY = 4;
      const tagHeight = 18;
      const tagWidth = textMetrics.width + paddingX * 2;

      ctx.fillStyle = strokeColor;
      ctx.beginPath();
      ctx.roundRect(x1, Math.max(0, y1 - tagHeight - 2), tagWidth, tagHeight, 4);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(labelText, x1 + paddingX, Math.max(12, y1 - 5));

      ctx.restore();
    });
  };

  useEffect(() => {
    drawBoxes();
    const handleResize = () => drawBoxes();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [boundingBoxes, activeBoxId, imageUrl]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let hoveredBox: BoundingBox | null = null;

    for (const box of boundingBoxes) {
      const [ymin, xmin, ymax, xmax] = box.coords;
      const x1 = xmin <= 1 ? xmin * canvas.width : (xmin / img.naturalWidth) * canvas.width;
      const y1 = ymin <= 1 ? ymin * canvas.height : (ymin / img.naturalHeight) * canvas.height;
      const x2 = xmax <= 1 ? xmax * canvas.width : (xmax / img.naturalWidth) * canvas.width;
      const y2 = ymax <= 1 ? ymax * canvas.height : (ymax / img.naturalHeight) * canvas.height;

      if (mouseX >= x1 && mouseX <= x2 && mouseY >= y1 && mouseY <= y2) {
        hoveredBox = box;
        break;
      }
    }

    if (hoveredBox) {
      onHoverBox(hoveredBox.id);
      setTooltip({
        visible: true,
        x: mouseX,
        y: mouseY,
        box: hoveredBox
      });
    } else {
      onHoverBox(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    onHoverBox(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[320px] sm:min-h-[480px] max-h-[640px] bg-slate-50 dark:bg-slate-950/80 rounded-2xl overflow-hidden flex items-center justify-center select-none border border-slate-200 dark:border-slate-800"
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Packaging Evidence"
        className="w-full h-full object-contain max-h-[640px] transition-all"
        onLoad={drawBoxes}
        crossOrigin="anonymous"
      />

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* Floating Tooltip */}
      {tooltip.visible && tooltip.box && (
        <div
          className="absolute z-30 pointer-events-none p-3 bg-slate-950/95 text-white rounded-2xl shadow-2xl border border-slate-700 text-xs backdrop-blur max-w-xs animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: Math.min(tooltip.x + 12, (canvasRef.current?.width || 400) - 240),
            top: Math.min(tooltip.y + 12, (canvasRef.current?.height || 400) - 100)
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-white text-xs">{tooltip.box.label}</span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                tooltip.box.status === 'PASS'
                  ? 'bg-emerald-600 text-white'
                  : tooltip.box.status === 'ISSUE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-sky-600 text-white'
              }`}
            >
              {tooltip.box.status}
            </span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-sans uppercase font-bold tracking-wider">
              Scanned OCR Output:
            </div>
            <p className="text-emerald-300 font-mono text-[12px] font-semibold leading-snug bg-slate-900/90 p-2 rounded-xl border border-slate-800">
              {tooltip.box.detectedText}
            </p>
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
            <span>Confidence: {(tooltip.box.confidence * 100).toFixed(0)}%</span>
            <span className="font-mono">{tooltip.box.ruleCode}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceCanvas;
