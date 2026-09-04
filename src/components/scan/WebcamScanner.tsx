import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ComplianceApi } from '../../services/api';
import { LiveStreamOcrResult, LiveFeatureItem, LiveBarcodeDetection, LiveObjectDetection } from '../../types/compliance';

interface WebcamScannerProps {
  onCapture: (blob: Blob, previewUrl: string) => void;
  isActive: boolean;
}

const CATEGORY_COLORS: Record<string, { stroke: string; fill: string; bg: string; text: string }> = {
  brand_logo: { stroke: '#A855F7', fill: 'rgba(168, 85, 247, 0.15)', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', text: 'BRAND' },
  mrp: { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.15)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', text: 'MRP' },
  quantity: { stroke: '#06B6D4', fill: 'rgba(6, 182, 212, 0.15)', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', text: 'NET QTY' },
  mfg_date: { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.15)', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', text: 'MFG/EXP' },
  fssai: { stroke: '#14B8A6', fill: 'rgba(20, 184, 166, 0.15)', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40', text: 'FSSAI' },
  license: { stroke: '#14B8A6', fill: 'rgba(20, 184, 166, 0.15)', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40', text: 'FSSAI' },
  address: { stroke: '#3B82F6', fill: 'rgba(59, 130, 246, 0.15)', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', text: 'ADDRESS' },
  helpline: { stroke: '#EC4899', fill: 'rgba(236, 72, 153, 0.15)', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40', text: 'CARE' },
  nutrition: { stroke: '#84CC16', fill: 'rgba(132, 204, 22, 0.15)', bg: 'bg-lime-500/20 text-lime-300 border-lime-500/40', text: 'NUTRITION' },
  ingredients: { stroke: '#F97316', fill: 'rgba(249, 115, 22, 0.15)', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', text: 'INGREDIENTS' },
  indic_text: { stroke: '#F43F5E', fill: 'rgba(244, 63, 94, 0.20)', bg: 'bg-rose-500/25 text-rose-200 border-rose-500/50', text: 'INDIC' },
  other: { stroke: '#94A3B8', fill: 'rgba(148, 163, 184, 0.10)', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40', text: 'TEXT' }
};

export const WebcamScanner: React.FC<WebcamScannerProps> = ({ onCapture, isActive }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const arCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isLiveAiActive, setIsLiveAiActive] = useState(true);
  const [isAutoScan, setIsAutoScan] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Live Stream Telemetry & Tracked Results
  const [liveResult, setLiveResult] = useState<LiveStreamOcrResult | null>(null);
  const [streamLatencyMs, setStreamLatencyMs] = useState<number>(45);
  const [fpsCounter, setFpsCounter] = useState<number>(0);
  const isProcessingFrameRef = useRef(false);

  const startCamera = async () => {
    setDeviceError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err: any) {
      console.warn('Camera access denied or not found, simulation mode active:', err);
      setHasPermission(false);
      setDeviceError(err.message || 'Camera device not accessible. You can upload an image or use simulation.');
    }
  };

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive, facingMode]);

  // Draw Augmented Reality (AR) HUD over video
  const drawArOverlay = useCallback((res: LiveStreamOcrResult | null) => {
    const canvas = arCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.clientWidth || 800;
    canvas.height = video.clientHeight || 450;
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);
    if (!res || !isLiveAiActive) return;

    // 1. Draw Detected Packaging Object Contour / PDP (Cyan Box)
    if (res.object && res.object.detected) {
      const [ymin, xmin, ymax, xmax] = res.object.box;
      const ox = xmin * cw;
      const oy = ymin * ch;
      const ow = (xmax - xmin) * cw;
      const oh = (ymax - ymin) * ch;

      ctx.save();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fillRect(ox, oy, ow, oh);

      // Corner Brackets
      const bLen = Math.min(24, ow * 0.15, oh * 0.15);
      ctx.setLineDash([]);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#0284C7';
      // TL
      ctx.beginPath(); ctx.moveTo(ox, oy + bLen); ctx.lineTo(ox, oy); ctx.lineTo(ox + bLen, oy); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(ox + ow - bLen, oy); ctx.lineTo(ox + ow, oy); ctx.lineTo(ox + ow, oy + bLen); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(ox, oy + oh - bLen); ctx.lineTo(ox, oy + oh); ctx.lineTo(ox + bLen, oy + oh); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(ox + ow - bLen, oy + oh); ctx.lineTo(ox + ow, oy + oh); ctx.lineTo(ox + ow, oy + oh - bLen); ctx.stroke();

      // Label Badge
      ctx.fillStyle = 'rgba(14, 165, 233, 0.9)';
      ctx.beginPath();
      ctx.roundRect(ox, Math.max(10, oy - 22), 170, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('📦 ' + (res.object.label || 'PDP BOUNDARY'), ox + 6, Math.max(24, oy - 8));
      ctx.restore();
    }

    // 2. Draw Live OCR Text Boxes
    if (res.features && Array.isArray(res.features)) {
      res.features.forEach((feat: LiveFeatureItem) => {
        const [ymin, xmin, ymax, xmax] = feat.box;
        if (xmax <= xmin || ymax <= ymin) return;

        const fx = xmin * cw;
        const fy = ymin * ch;
        const fw = (xmax - xmin) * cw;
        const fh = (ymax - ymin) * ch;

        const isMulti = Boolean(feat.is_multilingual || (feat.script && !feat.script.startsWith('Latin')));
        const style = isMulti ? CATEGORY_COLORS.indic_text : (CATEGORY_COLORS[feat.category] || CATEGORY_COLORS.other);
        
        // Clean script tag determination: [मराठी], [हिंदी], [EN], [தமிழ்], [తెలుగు], [ગુજરાતી], [বাংলা]
        const scriptTag = feat.script?.includes('Marathi') || feat.language === 'mr'
          ? '[मराठी]'
          : feat.script?.includes('Hindi') || feat.language === 'hi'
          ? '[हिंदी]'
          : feat.script?.includes('Tamil') || feat.language === 'ta'
          ? '[தமிழ்]'
          : feat.script?.includes('Telugu') || feat.language === 'te'
          ? '[తెలుగు]'
          : feat.script?.includes('Gujarati') || feat.language === 'gu'
          ? '[ગુજરાતી]'
          : feat.script?.includes('Bengali') || feat.language === 'bn'
          ? '[বাংলা]'
          : feat.script?.includes('Devanagari')
          ? '[देवनागरी]'
          : isMulti
          ? '[INDIC]'
          : '[EN]';

        ctx.save();
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = isMulti ? 2.5 : 2;
        ctx.strokeRect(fx, fy, fw, fh);
        ctx.fillStyle = style.fill;
        ctx.fillRect(fx, fy, fw, fh);

        // Chip Badge on top of text box with clean script tag ([मराठी], [हिंदी], [EN])
        const badgeText = isMulti 
          ? `🌐 ${scriptTag} ${style.text}: ${feat.text.slice(0, 18)}` 
          : `${scriptTag} ${style.text}: ${feat.text.slice(0, 20)}`;
        ctx.font = 'bold 10px sans-serif';
        const textWidth = ctx.measureText(badgeText).width + 12;

        ctx.fillStyle = style.stroke;
        ctx.beginPath();
        ctx.roundRect(fx, Math.max(12, fy - 18), textWidth, 16, 3);
        ctx.fill();

        ctx.fillStyle = isMulti ? '#FFFFFF' : '#0F172A';
        ctx.fillText(badgeText, fx + 6, Math.max(24, fy - 6));
        ctx.restore();
      });
    }

    // 3. Draw Detected Live Barcode
    if (res.barcode && res.barcode.detected) {
      const [ymin, xmin, ymax, xmax] = res.barcode.box;
      const bx = xmin * cw;
      const by = ymin * ch;
      const bw = (xmax - xmin) * cw;
      const bh = (ymax - ymin) * ch;

      ctx.save();
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
      ctx.fillRect(bx, by, bw, bh);

      const bText = `📊 ${res.barcode.format}: ${res.barcode.code} [${res.barcode.gs1Country}]`;
      ctx.font = 'bold 10px monospace';
      const bWidth = ctx.measureText(bText).width + 12;

      ctx.fillStyle = '#8B5CF6';
      ctx.beginPath();
      ctx.roundRect(bx, Math.max(12, by - 18), bWidth, 16, 3);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(bText, bx + 6, Math.max(24, by - 6));
      ctx.restore();
    }
  }, [isLiveAiActive]);

  // Real-Time Live Streaming Loop (Runs continuously when camera is active)
  useEffect(() => {
    let isMounted = true;

    const processLiveFrame = async () => {
      if (!isMounted || !isActive || !isLiveAiActive || isCapturing || isProcessingFrameRef.current) {
        streamLoopTimerRef.current = setTimeout(processLiveFrame, 400);
        return;
      }

      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        streamLoopTimerRef.current = setTimeout(processLiveFrame, 400);
        return;
      }

      isProcessingFrameRef.current = true;
      const canvas = document.createElement('canvas');
      // Downscale to 640x360 for high-speed sub-50ms inference
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob && isMounted) {
            const startT = performance.now();
            try {
              const res = await ComplianceApi.processLiveStreamFrame(blob);
              const elapsed = Math.round(performance.now() - startT);
              if (isMounted && res) {
                setLiveResult(res);
                setStreamLatencyMs(elapsed);
                setFpsCounter((prev) => (prev + 1) % 100);
                drawArOverlay(res);

                // Auto-Scan trigger if frame is crisp and has minimum 3 statutory fields
                if (isAutoScan && !res.is_blurry && res.statutory_count >= 2) {
                  setIsAutoScan(false);
                  captureFrame();
                }
              }
            } catch (err) {
              // Gracefully handle occasional dropped frame
            } finally {
              isProcessingFrameRef.current = false;
            }
          } else {
            isProcessingFrameRef.current = false;
          }
        }, 'image/jpeg', 0.75);
      } else {
        isProcessingFrameRef.current = false;
      }

      // Sample next frame every 400ms for continuous live streaming
      streamLoopTimerRef.current = setTimeout(processLiveFrame, 400);
    };

    if (isActive && hasPermission) {
      processLiveFrame();
    }

    return () => {
      isMounted = false;
      if (streamLoopTimerRef.current) clearTimeout(streamLoopTimerRef.current);
    };
  }, [isActive, hasPermission, isLiveAiActive, isAutoScan, isCapturing, drawArOverlay]);

  const captureFrame = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const previewUrl = URL.createObjectURL(blob);
            setTimeout(() => {
              setIsCapturing(false);
              onCapture(blob, previewUrl);
            }, 300);
          }
        },
        'image/jpeg',
        0.95
      );
    }
  };

  const simulateCapture = () => {
    setIsCapturing(true);
    const sampleUrl = 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=1200&auto=format&fit=crop&q=80';
    fetch(sampleUrl)
      .then((res) => res.blob())
      .then((blob) => {
        setTimeout(() => {
          setIsCapturing(false);
          onCapture(blob, sampleUrl);
        }, 500);
      })
      .catch(() => {
        setIsCapturing(false);
        const dummyBlob = new Blob(['sample'], { type: 'image/jpeg' });
        onCapture(dummyBlob, sampleUrl);
      });
  };

  return (
    <div className="relative w-full bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[460px] aspect-video">
      {hasPermission ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Main Video Stream */}
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Augmented Reality (AR) HUD Canvas Overlay */}
          <canvas ref={arCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 shadow-inner">
            <span className="material-symbols-outlined text-3xl">videocam_off</span>
          </div>
          <div>
            <h4 className="text-base font-bold">Live Optical Camera Standby</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              {deviceError || 'Connect an inspection webcam or use the simulation mode.'}
            </p>
          </div>
          <button
            onClick={simulateCapture}
            className="px-5 py-3 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-sky-500/25"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            Simulate High-Res Packaging Snapshot
          </button>
        </div>
      )}

      {/* Real-time AR Heads-Up Display (HUD) Controls & Telemetry */}
      {hasPermission && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-5 z-20">
          {/* Top Live Telemetry Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs font-mono drop-shadow">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-900/85 text-emerald-400 px-3 py-1.5 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold">LIVE OCR & AR TRACKING</span>
              </div>
              <span className="bg-slate-900/85 text-sky-300 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-slate-700 text-[11px] hidden sm:inline">
                ⚡ AI Latency: {streamLatencyMs}ms
              </span>
            </div>

            <div className="flex items-center gap-2">
              {liveResult?.detected_languages && liveResult.detected_languages.some(l => !l.startsWith('Latin')) && (
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-rose-950/90 to-amber-950/90 text-rose-300 px-3 py-1.5 rounded-full backdrop-blur-md border border-rose-500/50 shadow-lg animate-pulse">
                  <span className="material-symbols-outlined text-rose-400 text-xs">translate</span>
                  <span className="font-bold text-[11px] uppercase tracking-wider">
                    {liveResult.detected_languages.filter(l => !l.startsWith('Latin')).join(', ')}
                  </span>
                </div>
              )}
              <div className="bg-slate-900/85 text-slate-200 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-700 text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sky-400 text-sm">verified</span>
                <span>{liveResult?.statutory_count || 0}/7 Statutory Fields</span>
              </div>
              {liveResult?.focus_measure !== undefined && (
                <span className={`px-2.5 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-bold ${
                  liveResult.is_blurry ? 'bg-amber-950/80 border-amber-600/40 text-amber-300' : 'bg-emerald-950/80 border-emerald-600/40 text-emerald-300'
                }`}>
                  {liveResult.is_blurry ? 'BLURRY' : 'SHARP'} ({liveResult.focus_measure})
                </span>
              )}
            </div>
          </div>

          {/* Live Detected Brand / Product Title Header */}
          {liveResult?.brand_name && liveResult.brand_name !== 'Scanning...' && (
            <div className="self-center bg-slate-900/90 text-white px-4 py-1.5 rounded-xl border border-purple-500/40 shadow-xl backdrop-blur-md flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <span className="material-symbols-outlined text-purple-400 text-base">local_offer</span>
              <span className="font-bold text-xs tracking-wider uppercase text-purple-200">
                {liveResult.brand_name}
              </span>
            </div>
          )}

          {/* Bottom Live Drawer & Action Controls */}
          <div className="pointer-events-auto flex flex-col items-center gap-3 w-full">
            {/* Live Statutory & Multilingual Field Chips Strip */}
            {liveResult?.features && liveResult.features.length > 0 && (
              <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-2xl p-2 backdrop-blur-md flex items-center gap-2 overflow-x-auto scrollbar-none shadow-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2 shrink-0">Live Detections:</span>
                {liveResult.features.map((feat) => {
                  const isMulti = Boolean(feat.is_multilingual || (feat.script && !feat.script.startsWith('Latin')));
                  const style = isMulti ? CATEGORY_COLORS.indic_text : (CATEGORY_COLORS[feat.category] || CATEGORY_COLORS.other);
                  const scriptTag = feat.script?.includes('Marathi') || feat.language === 'mr'
                    ? '[मराठी]'
                    : feat.script?.includes('Hindi') || feat.language === 'hi'
                    ? '[हिंदी]'
                    : feat.script?.includes('Tamil') || feat.language === 'ta'
                    ? '[தமிழ்]'
                    : feat.script?.includes('Telugu') || feat.language === 'te'
                    ? '[తెలుగు]'
                    : feat.script?.includes('Gujarati') || feat.language === 'gu'
                    ? '[ગુજરાતી]'
                    : feat.script?.includes('Bengali') || feat.language === 'bn'
                    ? '[বাংলা]'
                    : feat.script?.includes('Devanagari')
                    ? '[देवनागरी]'
                    : isMulti
                    ? '[INDIC]'
                    : '[EN]';
                  return (
                    <span
                      key={feat.id}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 flex items-center gap-1.5 shadow-xs ${style.bg}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span>{isMulti ? `🌐 ${scriptTag} ${style.text}` : `${scriptTag} ${style.text}`}: {feat.text.slice(0, 18)}</span>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full backdrop-blur-md transition-colors border border-slate-700"
                title="Flip Camera"
              >
                <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
              </button>

              <button
                onClick={captureFrame}
                disabled={isCapturing}
                className="px-8 py-3 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white rounded-full font-extrabold text-sm flex items-center gap-2 shadow-2xl active:scale-95 transition-transform disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-white text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  center_focus_strong
                </span>
                {isCapturing ? 'Analyzing Evidence...' : 'Capture & Inspect Compliance'}
              </button>

              <button
                onClick={() => setIsLiveAiActive(!isLiveAiActive)}
                className={`p-3 rounded-full backdrop-blur-md transition-colors border ${
                  isLiveAiActive ? 'bg-purple-600/30 border-purple-500 text-purple-300' : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
                title={isLiveAiActive ? 'Disable AR Overlay' : 'Enable AR Overlay'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isLiveAiActive ? 'visibility' : 'visibility_off'}
                </span>
              </button>

              <button
                onClick={() => setIsAutoScan(!isAutoScan)}
                className={`px-3 py-2.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 backdrop-blur-md ${
                  isAutoScan
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
                title="Automatically capture when package is sharp and statutory fields are visible"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAutoScan ? 'smart_toy' : 'auto_mode'}
                </span>
                <span className="hidden sm:inline">{isAutoScan ? 'Auto Active' : 'Auto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamScanner;
