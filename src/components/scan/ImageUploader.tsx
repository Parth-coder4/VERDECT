import React, { useRef, useState } from 'react';

export interface SecondaryPanelUpload {
  id: string;
  label: string;
  file: File | null;
  previewUrl: string | null;
}

interface ImageUploaderProps {
  onImagesSelected: (
    frontFile: File,
    secondaryFiles: File[],
    customFrontPreview?: string,
    customSecondaryPreviews?: string[]
  ) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesSelected }) => {
  const frontInputRef = useRef<HTMLInputElement | null>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [dragOverFront, setDragOverFront] = useState(false);

  // Multi-panel secondary panels state (Back, Side 1, Side 2, Top/Bottom)
  const [secondaryPanels, setSecondaryPanels] = useState<SecondaryPanelUpload[]>([
    {
      id: 'panel_back_0',
      label: 'Back Panel (Statutory Declarations & MRP)',
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
    let nextLabel = `Side Panel ${nextIndex} (Ingredients / FSSAI)`;
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

  const handleStartAnalysis = () => {
    if (!frontFile) {
      setErrorMsg('Please upload at least the Front Label / PDP image for Brand & Logo identification.');
      return;
    }

    const validSecondaryFiles = secondaryPanels
      .map((p) => p.file)
      .filter((f): f is File => f !== null);

    onImagesSelected(frontFile, validSecondaryFiles);
  };

  return (
    <div className="space-y-6 select-none font-sans">
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

      {/* Multi-Panel Ingestion Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Primary Panel: Front Label / PDP (Col 5) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0E1A2E] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/50">
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider block">
                Primary Principal Display Panel (PDP)
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Front Packaging Artwork
              </h3>
            </div>
            <span className="text-[10px] bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              Mandatory Rule 5
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col items-center justify-center">
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
                  className="w-full h-64 object-contain rounded-2xl bg-slate-900/5 dark:bg-black/30 border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1"
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
                    className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[200px]">{frontFile?.name}</span>
                  <span className="font-mono">{((frontFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB</span>
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
                className={`w-full h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                  dragOverFront
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-400 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-2xl">upload_file</span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                  Drop Front PDP Image Here
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                  Scans Brand logo, Net Quantity &amp; Principal Display Area
                </p>
                <span className="mt-3 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold shadow-xs">
                  Browse File
                </span>
              </div>
            )}
          </div>

          <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-sky-600 dark:text-sky-400">verified</span>
            <span>Calculates Area &amp; verifies Minimum Font Size (Rule 5 &amp; 12)</span>
          </div>
        </div>

        {/* Secondary Panels: Back & Side Panels (Col 7) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0E1A2E] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/50">
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                Secondary Statutory Declarations
              </span>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Back &amp; Side Packaging Panels
              </h3>
            </div>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Rule 6 &amp; 7
            </span>
          </div>

          <div className="p-5 flex-1 flex flex-col gap-3 overflow-y-auto max-h-[360px]">
            {secondaryPanels.map((panel, idx) => {
              const fileInputId = `secondary-input-${panel.id}`;
              const isDragActive = dragOverPanelId === panel.id;

              return (
                <div
                  key={panel.id}
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
                  className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isDragActive
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : panel.file
                      ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
                      : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30'
                  }`}
                >
                  <input
                    type="file"
                    id={fileInputId}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSecondaryFileChange(panel.id, f);
                    }}
                  />

                  <div className="flex items-center gap-3">
                    {panel.previewUrl ? (
                      <img
                        src={panel.previewUrl}
                        alt="Panel preview"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-xl">image</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {panel.label}
                      </p>
                      {panel.file ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          {panel.file.name} ({(panel.file.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Drag &amp; drop or browse panel image
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => document.getElementById(fileInputId)?.click()}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-xs"
                    >
                      {panel.file ? 'Replace' : 'Select'}
                    </button>
                    {secondaryPanels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSecondaryPanel(panel.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                        title="Remove Panel Slot"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Another Panel Button */}
            {secondaryPanels.length < 4 && (
              <button
                type="button"
                onClick={handleAddSecondaryPanel}
                className="w-full py-2.5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-base text-slate-400">add_circle</span>
                <span>+ Add Secondary Packaging Panel (Left / Right / Top)</span>
              </button>
            )}
          </div>

          <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400">checklist</span>
              <span>Target: MRP, FSSAI, Batch, Address &amp; Helpline</span>
            </div>
            <span className="font-mono text-slate-400">Up to 4 panels</span>
          </div>
        </div>
      </div>

      {/* Action Execution Button */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Ready to inspect{' '}
          <strong className="text-slate-900 dark:text-white">
            {1 + secondaryPanels.filter((p) => p.file !== null).length} packaging panel(s)
          </strong>{' '}
          simultaneously with VERDECT OCR.
        </div>

        <button
          type="button"
          onClick={handleStartAnalysis}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">document_scanner</span>
          EXECUTE MULTI-PANEL ENFORCEMENT SCAN
        </button>
      </div>
    </div>
  );
};

export default ImageUploader;
