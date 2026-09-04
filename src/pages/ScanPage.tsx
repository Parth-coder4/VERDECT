import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompliance } from '../context/ComplianceContext';
import { WebcamScanner } from '../components/scan/WebcamScanner';
import { ImageUploader } from '../components/scan/ImageUploader';
import { ScanConfigPanel } from '../components/scan/ScanConfigPanel';
import { ComplianceApi } from '../services/api';
import { ScanRecord } from '../types/compliance';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSku = searchParams.get('sku');
  const { addScanRecord, batches } = useCompliance();

  const targetBatch = useMemo(() => {
    if (!targetSku) return null;
    return batches.find((b) => b.sku === targetSku);
  }, [targetSku, batches]);

  const [activeMode, setActiveMode] = useState<'upload' | 'camera'>('upload');
  const [cameraGuide, setCameraGuide] = useState(true);
  const [calibrationObj, setCalibrationObj] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProcessImage = async (
    frontFile: File | Blob,
    secondaryFiles: (File | Blob)[] = [],
    customPreviewUrl?: string,
    customSecondaryPreviews?: string[]
  ) => {
    setIsProcessing(true);
    setErrorMessage(null);
    const localPreviewUrl = customPreviewUrl || URL.createObjectURL(frontFile);
    const formData = new FormData();
    formData.append('front_image', frontFile);

    secondaryFiles.forEach((secFile, idx) => {
      formData.append(`back_image_${idx}`, secFile);
    });

    try {
      const record = await ComplianceApi.submitScan(formData);
      // Ensure the uploaded images are attached for preview
      if (!record.frontImageUrl || record.frontImageUrl.startsWith('/uploads')) {
        record.frontImageUrl = record.frontImageUrl || localPreviewUrl;
      }
      if (secondaryFiles.length > 0 && (!record.backImageUrl || record.backImageUrl.startsWith('/uploads'))) {
        record.backImageUrl = record.backImageUrl || URL.createObjectURL(secondaryFiles[0]);
      }
      addScanRecord(record);
      setTimeout(() => {
        setIsProcessing(false);
        navigate(`/analysis/${record.id}`);
      }, 500);
    } catch (err: any) {
      console.error('Scan submit error:', err);
      setErrorMessage(
        err.message ||
          'The VERDECT OCR microservice is currently unreachable. Please ensure all backend services are running.'
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-[1080px] mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col gap-6 animate-in fade-in duration-200 select-none font-sans">
      {/* Header Section */}
      <section className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider bg-sky-100 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
            VERDECT Vision Pipeline
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Automated Metrology Surveillance
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
          Packaging Scan &amp; Ingestion Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
          Capture high-resolution imagery of the product packaging (Front PDP + Side/Back panels). VERDECT AI will
          instantly extract declarations, measure font geometry, verify MRP, and test against Legal Metrology Rules, 2011.
        </p>
      </section>

      {/* Target Registry SKU Context Banner if launched from Product Registry */}
      {targetBatch && (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-xl">inventory_2</span>
            <div>
              <p className="font-bold text-sky-950 dark:text-sky-200">
                Targeted Commodity Verification: {targetBatch.productName} ({targetBatch.brand})
              </p>
              <p className="text-[11px] text-sky-700 dark:text-sky-400 font-mono mt-0.5">
                SKU: {targetBatch.sku} &bull; Expected MRP: ₹{targetBatch.declaredMRP.toFixed(2)} &bull; Net Qty: {targetBatch.netQuantity} &bull; Batch: {targetBatch.batchNumber}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-sky-200/70 dark:bg-sky-900/70 text-sky-900 dark:text-sky-200 rounded-lg text-[10px] font-bold shrink-0">
            Master Linked
          </span>
        </div>
      )}

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-2xl flex items-start gap-3 text-xs font-semibold animate-in fade-in duration-200 shadow-sm">
          <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg shrink-0">error</span>
          <div className="flex-1">
            <p className="font-bold text-rose-900 dark:text-rose-200">Compliance Inspection Notice</p>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-0.5"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveMode('upload')}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeMode === 'upload'
              ? 'border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">drive_folder_upload</span>
          Multi-Panel Image Uploader
        </button>

        <button
          onClick={() => setActiveMode('camera')}
          className={`px-5 py-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeMode === 'camera'
              ? 'border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">photo_camera</span>
          Live Stream Reticle Camera
        </button>
      </div>

      {/* Settings Config */}
      <ScanConfigPanel
        cameraGuide={cameraGuide}
        setCameraGuide={setCameraGuide}
        calibrationObj={calibrationObj}
        setCalibrationObj={setCalibrationObj}
      />

      {/* Ingestion Canvas / Uploader Area */}
      {isProcessing ? (
        <div className="glass-card rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-xl border border-sky-500/30 dark:border-sky-500/20">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-sky-200 dark:border-sky-900 border-t-sky-600 dark:border-t-sky-400 animate-spin"></div>
            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-sky-600 dark:text-sky-400 text-2xl">
              memory
            </span>
          </div>
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Running VERDECT AI OCR &amp; Geometry Evaluator...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono max-w-md">
              Extracting mandatory tokens &bull; Comparing Table I font height &bull; Evaluating Rule 6(1) &amp; Rule 12 compliance
            </p>
          </div>
        </div>
      ) : activeMode === 'upload' ? (
        <ImageUploader
          onImagesSelected={(front, back) => handleProcessImage(front, back)}
        />
      ) : (
        <div className="space-y-4">
          <WebcamScanner
            isActive={activeMode === 'camera'}
            onCapture={(blob, previewUrl) => handleProcessImage(blob, undefined, previewUrl)}
          />
        </div>
      )}
    </div>
  );
};

export default ScanPage;
