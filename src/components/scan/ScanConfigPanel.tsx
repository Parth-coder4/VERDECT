import React from 'react';

interface ScanConfigPanelProps {
  cameraGuide: boolean;
  setCameraGuide: (val: boolean) => void;
  calibrationObj: boolean;
  setCalibrationObj: (val: boolean) => void;
}

export const ScanConfigPanel: React.FC<ScanConfigPanelProps> = ({
  cameraGuide,
  setCameraGuide,
  calibrationObj,
  setCalibrationObj
}) => {
  return (
    <section className="glass-card rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-xl">tune</span>
          <span className="font-label-sm text-xs font-bold text-on-surface uppercase tracking-wider">
            Capture Configuration
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-container text-on-primary-container border border-primary/20">
          <span className="material-symbols-outlined text-[13px]">translate</span>
          <span>Unified Multilingual (EN + हिंदी / Indic)</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full md:w-auto">
        {/* Camera Guide Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <label className="text-xs text-on-surface-variant flex items-center gap-1.5 cursor-pointer font-medium" htmlFor="camera-guide">
            Real-time camera guide
            <span className="material-symbols-outlined text-[14px] text-outline cursor-help" title="Guides alignment for optimal OCR lighting & angle">
              info
            </span>
          </label>
          <button
            id="camera-guide"
            onClick={() => setCameraGuide(!cameraGuide)}
            className={`w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${
              cameraGuide ? 'bg-secondary' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                cameraGuide ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {/* Reference Calibration Toggle */}
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <label className="text-xs text-on-surface-variant cursor-pointer font-medium" htmlFor="calibration">
            Scale Reference Calibration (10mm Coin/Grid)
          </label>
          <button
            id="calibration"
            onClick={() => setCalibrationObj(!calibrationObj)}
            className={`w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none ${
              calibrationObj ? 'bg-secondary' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 shadow-sm ${
                calibrationObj ? 'right-0.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
};
