import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';

export interface SecondaryPanelUpload {
  id: string;
  label: string;
  file: File | null;
  previewUrl: string | null;
}

interface MultiPanelCounterfeitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (frontFile: File, secondaryFiles: File[]) => void;
}

export const MultiPanelCounterfeitModal: React.FC<MultiPanelCounterfeitModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const frontInputRef = useRef<HTMLInputElement | null>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [dragOverFront, setDragOverFront] = useState(false);

  // Multi-panel secondary panels state (Back, Side, Top/Bottom)
  const [secondaryPanels, setSecondaryPanels] = useState<SecondaryPanelUpload[]>([
    {
      id: 'panel_back_0',
      label: 'Back Panel (Statutory Declarations, Barcode & MRP)',
      file: null,
      previewUrl: null
    }
  ]);

  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setErrorMsg(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload PNG, JPG, or WEBP.');
      return false;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('File exceeds 15MB limit.');
      return false;
    }
    return true;
  };

  const handleFrontFileChange = (file: File) => {
    if (!validateFile(file)) return;
    setFrontFile(file);
    setFrontPreview(URL.createObjectURL(file));
  };

  const handleSecondaryFileChange = (panelId: string, file: File) => {
    if (!validateFile(file)) return;
    const preview = URL.createObjectURL(file);
    setSecondaryPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, file, previewUrl: preview } : p))
    );
  };

  const handleAddSecondaryPanel = () => {
    if (secondaryPanels.length >= 4) {
      setErrorMsg('Maximum 4 secondary panels allowed per packaging inspection.');
      return;
    }

    const nextIndex = secondaryPanels.length;
    let nextLabel = `Side Panel ${nextIndex} (Ingredients & FSSAI)`;
    if (nextIndex === 2) nextLabel = 'Side Panel 2 (Nutrition & Manufacturer Address)';
    else if (nextIndex === 3) nextLabel = 'Top / Bottom Panel (Barcode & Tamper Seal)';

    setSecondaryPanels((prev) => [
      ...prev,
      {
        id: `panel_back_${Date.now()}`,
        label: nextLabel,
        file: null,
        previewUrl: null
      }
    ]);
  };

  const handleRemoveSecondaryPanel = (panelId: string) => {
    setSecondaryPanels((prev) => {
      if (prev.length <= 1) {
        return [{ ...prev[0], file: null, previewUrl: null }];
      }
      return prev.filter((p) => p.id !== panelId);
    });
  };

  const handleReset = () => {
    setFrontFile(null);
    setFrontPreview(null);
    setSecondaryPanels([
      {
        id: 'panel_back_0',
        label: 'Back Panel (Statutory Declarations, Barcode & MRP)',
        file: null,
        previewUrl: null
      }
    ]);
    setErrorMsg(null);
  };

  const handleStartScan = () => {
    if (!frontFile) {
      setErrorMsg('Please upload at least the Front Label / PDP image for Brand & Logo identification.');
      return;
    }

    const validSecondaryFiles = secondaryPanels
      .map((p) => p.file)
      .filter((f): f is File => f !== null);

    onSubmit(frontFile, validSecondaryFiles);
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Multi-Panel Packaging Forensic Ingestion"
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-5 select-none font-sans">
        {/* Subtitle guidance */}
        <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-2xl border border-sky-200 dark:border-sky-800 text-xs flex items-start gap-2.5">
          <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-base shrink-0 mt-0.5">
            fingerprint
          </span>
          <div className="text-slate-700 dark:text-slate-300">
            <span className="font-bold text-sky-950 dark:text-sky-200">
              Multi-Spectral Forensic Ingestion Portal:
            </span>{' '}
            Upload multiple packaging facets for comprehensive anti-counterfeit analysis. The system inspects
            the <strong>Front Panel</strong> for brand trademark, color gamut, and typography, and the{' '}
            <strong>Back / Side Panels</strong> for GS1 Modulo-10 barcode checksums, FSSAI syntax, and tamper seals.
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Multi-Panel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Primary Front PDP Panel */}
          <div className="md:col-span-6 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                    Panel 1 &bull; Mandatory
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Front Label / PDP Artwork
                  </h4>
                </div>
                <span className="text-[10px] bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                  Brand &amp; Logo
                </span>
              </div>

              <input
                type="file"
                ref={frontInputRef}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFrontFileChange(f);
                }}
              />

              {frontPreview ? (
                <div className="w-full relative group">
                  <img
                    src={frontPreview}
                    alt="Front Label Preview"
                    className="w-full h-52 object-contain rounded-xl bg-slate-900/5 dark:bg-black/30 border border-slate-200 dark:border-slate-700"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">cached</span>
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFrontFile(null);
                        setFrontPreview(null);
                      }}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFront(true);
                  }}
                  onDragLeave={() => setDragOverFront(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFront(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFrontFileChange(f);
                  }}
                  onClick={() => frontInputRef.current?.click()}
                  className={`w-full h-52 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                    dragOverFront
                      ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                      : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Upload Front Panel (PDP)
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Drag &amp; drop or click to browse (PNG, JPG &bull; &lt;15MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
              <span>Status:</span>
              <span className={`font-bold ${frontFile ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                {frontFile ? 'Ready for Analysis' : 'Awaiting Front Image'}
              </span>
            </div>
          </div>

          {/* Secondary Panels (Back & Sides) */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-3">
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {secondaryPanels.map((panel, idx) => {
                const secInputRef = React.createRef<HTMLInputElement>();
                return (
                  <div
                    key={panel.id}
                    className="bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          Panel {idx + 2} &bull; Optional
                        </span>
                        <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {panel.label}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSecondaryPanel(panel.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove panel"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={secInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleSecondaryFileChange(panel.id, f);
                      }}
                    />

                    {panel.previewUrl ? (
                      <div className="w-full relative group">
                        <img
                          src={panel.previewUrl}
                          alt={panel.label}
                          className="w-full h-28 object-contain rounded-xl bg-slate-900/5 dark:bg-black/30 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => secInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white text-slate-900 rounded-lg text-[11px] font-bold shadow-md hover:bg-slate-100 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">cached</span>
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSecondaryPanel(panel.id)}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-bold shadow-md hover:bg-rose-700 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">delete</span>
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverPanelId(panel.id);
                        }}
                        onDragLeave={() => setDragOverPanelId(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverPanelId(null);
                          const f = e.dataTransfer.files?.[0];
                          if (f) handleSecondaryFileChange(panel.id, f);
                        }}
                        onClick={() => secInputRef.current?.click()}
                        className={`w-full h-28 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 cursor-pointer transition-all ${
                          dragOverPanelId === panel.id
                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                            : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="material-symbols-outlined text-slate-400 text-xl">upload_file</span>
                        <div className="text-left">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Upload Panel Image
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Barcode, FSSAI &amp; Declarations
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Secondary Panel Button */}
            {secondaryPanels.length < 4 && (
              <button
                type="button"
                onClick={handleAddSecondaryPanel}
                className="w-full py-2 px-3 border border-dashed border-sky-400/80 dark:border-sky-600/80 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Add Another Packaging Panel (Side / Barcode / Top)
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!frontFile}
            onClick={handleStartScan}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
              frontFile
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-sky-500/25 active:scale-95'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">fingerprint</span>
            Launch Multi-Panel Forensic Deep Scan
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default MultiPanelCounterfeitModal;
