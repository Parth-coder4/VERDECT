import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompliance } from '../context/ComplianceContext';
import { Modal } from '../components/common/Modal';
import { ProductBatchItem } from '../types/compliance';
import { INDIAN_BRAND_PRESETS } from '../services/mockData';
import { ExportManager } from '../services/exportManager';

export const RegistryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    batches,
    scans,
    addBatchItem,
    updateBatchItem,
    deleteBatchItem,
    resetBatchesToDefault,
    importBatches
  } = useCompliance();

  // State for search, filters, and sorting
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedScanStatus, setSelectedScanStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'mrp-asc' | 'mrp-desc' | 'risk' | 'scans' | 'mfgDate'>('risk');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<ProductBatchItem | null>(null);
  const [isBarcodeLookupOpen, setIsBarcodeLookupOpen] = useState(false);
  const [barcodeLookupQuery, setBarcodeLookupQuery] = useState('');
  const [barcodeLookupResult, setBarcodeLookupResult] = useState<ProductBatchItem | null | 'NOT_FOUND'>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Hidden file input for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add / Edit
  const [formValues, setFormValues] = useState({
    sku: '',
    productName: '',
    brand: '',
    category: 'Packaged Foods',
    batchNumber: '',
    mfgDate: new Date().toISOString().slice(0, 10),
    expiryDate: '2027-12-31',
    declaredMRP: 50,
    netQuantity: '200 g',
    manufacturer: '',
    fssaiLicense: '',
    consumerCare: '',
    originCountry: 'India',
    cin: '',
    riskScore: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH',
    barcodeType: 'EAN-13',
    notes: ''
  });

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Categories list with counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    batches.forEach((b) => {
      counts[b.category] = (counts[b.category] || 0) + 1;
    });
    return [
      { id: 'ALL', label: 'All Categories', count: batches.length },
      { id: 'Packaged Foods', label: 'Packaged Foods', count: counts['Packaged Foods'] || 0 },
      { id: 'Dairy & Beverages', label: 'Dairy & Beverages', count: counts['Dairy & Beverages'] || 0 },
      { id: 'Grains & Pulses', label: 'Grains & Pulses', count: counts['Grains & Pulses'] || 0 },
      { id: 'Edible Oils', label: 'Edible Oils', count: counts['Edible Oils'] || 0 },
      { id: 'Cosmetics & Personal Care', label: 'Personal Care', count: counts['Cosmetics & Personal Care'] || 0 },
      { id: 'Household Chemicals', label: 'Household', count: counts['Household Chemicals'] || 0 }
    ];
  }, [batches]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = batches.length;
    const highRisk = batches.filter((b) => b.riskScore === 'HIGH').length;
    const mediumRisk = batches.filter((b) => b.riskScore === 'MEDIUM').length;
    const lowRisk = batches.filter((b) => b.riskScore === 'LOW').length;
    const totalScans = batches.reduce((acc, b) => acc + (b.complianceHistory?.scansCount || 0), 0);
    const totalPassed = batches.reduce((acc, b) => acc + (b.complianceHistory?.passedCount || 0), 0);
    const passRate = totalScans > 0 ? ((totalPassed / totalScans) * 100).toFixed(1) : '100.0';
    return { total, highRisk, mediumRisk, lowRisk, totalScans, passRate };
  }, [batches]);

  // Filter and Sort batches
  const filteredBatches = useMemo(() => {
    return batches
      .filter((b) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            b.productName.toLowerCase().includes(q) ||
            b.sku.toLowerCase().includes(q) ||
            b.brand.toLowerCase().includes(q) ||
            b.batchNumber.toLowerCase().includes(q) ||
            b.manufacturer.toLowerCase().includes(q) ||
            (b.fssaiLicense && b.fssaiLicense.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Category filter
        if (selectedCategory !== 'ALL' && b.category !== selectedCategory) {
          return false;
        }

        // Risk filter
        if (selectedRisk !== 'ALL' && b.riskScore !== selectedRisk) {
          return false;
        }

        // Inspection scan status
        if (selectedScanStatus === 'INSPECTED' && (!b.complianceHistory || b.complianceHistory.scansCount === 0)) {
          return false;
        }
        if (selectedScanStatus === 'PENDING' && b.complianceHistory && b.complianceHistory.scansCount > 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.productName.localeCompare(b.productName);
        if (sortBy === 'mrp-asc') return a.declaredMRP - b.declaredMRP;
        if (sortBy === 'mrp-desc') return b.declaredMRP - a.declaredMRP;
        if (sortBy === 'scans') return (b.complianceHistory?.scansCount || 0) - (a.complianceHistory?.scansCount || 0);
        if (sortBy === 'mfgDate') return new Date(b.mfgDate).getTime() - new Date(a.mfgDate).getTime();
        if (sortBy === 'risk') {
          const score = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (score[b.riskScore] || 0) - (score[a.riskScore] || 0);
        }
        return 0;
      });
  }, [batches, search, selectedCategory, selectedRisk, selectedScanStatus, sortBy]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingBatchId(null);
    setFormValues({
      sku: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      productName: '',
      brand: '',
      category: 'Packaged Foods',
      batchNumber: `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: '2027-12-31',
      declaredMRP: 50,
      netQuantity: '200 g',
      manufacturer: '',
      fssaiLicense: '',
      consumerCare: '',
      originCountry: 'India',
      cin: '',
      riskScore: 'LOW',
      barcodeType: 'EAN-13',
      notes: ''
    });
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ProductBatchItem) => {
    setEditingBatchId(item.id);
    setFormValues({
      sku: item.sku,
      productName: item.productName,
      brand: item.brand,
      category: item.category,
      batchNumber: item.batchNumber,
      mfgDate: item.mfgDate,
      expiryDate: item.expiryDate,
      declaredMRP: item.declaredMRP,
      netQuantity: item.netQuantity,
      manufacturer: item.manufacturer,
      fssaiLicense: item.fssaiLicense || '',
      consumerCare: item.consumerCare || '',
      originCountry: item.originCountry || 'India',
      cin: item.cin || '',
      riskScore: item.riskScore,
      barcodeType: item.barcodeType || 'EAN-13',
      notes: item.notes || ''
    });
    setIsAddEditModalOpen(true);
  };

  // Pre-fill from Preset
  const handleSelectPreset = (presetIndex: number) => {
    const preset = INDIAN_BRAND_PRESETS[presetIndex];
    if (preset) {
      setFormValues({
        sku: preset.sku,
        productName: preset.productName,
        brand: preset.brand,
        category: preset.category,
        batchNumber: preset.batchNumber,
        mfgDate: preset.mfgDate,
        expiryDate: preset.expiryDate,
        declaredMRP: preset.declaredMRP,
        netQuantity: preset.netQuantity,
        manufacturer: preset.manufacturer,
        fssaiLicense: preset.fssaiLicense || '',
        consumerCare: preset.consumerCare || '',
        originCountry: preset.originCountry || 'India',
        cin: preset.cin || '',
        riskScore: preset.riskScore,
        barcodeType: preset.barcodeType || 'EAN-13',
        notes: ''
      });
      showToast(`Pre-filled specifications for "${preset.productName}"`, 'info');
    }
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.productName.trim() || !formValues.sku.trim()) {
      showToast('Product Name and Barcode/SKU are required.', 'error');
      return;
    }

    if (editingBatchId) {
      // Update existing
      await updateBatchItem(editingBatchId, {
        sku: formValues.sku.trim(),
        productName: formValues.productName.trim(),
        brand: formValues.brand.trim() || 'Registered Brand',
        category: formValues.category,
        batchNumber: formValues.batchNumber.trim() || `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: formValues.mfgDate,
        expiryDate: formValues.expiryDate,
        declaredMRP: Number(formValues.declaredMRP) || 50,
        netQuantity: formValues.netQuantity.trim() || '100 g',
        manufacturer: formValues.manufacturer.trim(),
        fssaiLicense: formValues.fssaiLicense.trim() || undefined,
        consumerCare: formValues.consumerCare.trim() || undefined,
        originCountry: formValues.originCountry.trim() || 'India',
        cin: formValues.cin.trim() || undefined,
        riskScore: formValues.riskScore,
        barcodeType: formValues.barcodeType,
        notes: formValues.notes.trim() || undefined
      });
      showToast(`Updated master specifications for "${formValues.productName}"`);
    } else {
      // Create new
      const newItem: ProductBatchItem = {
        id: `prod_${Date.now()}`,
        sku: formValues.sku.trim(),
        productName: formValues.productName.trim(),
        brand: formValues.brand.trim() || 'Registered Brand',
        category: formValues.category,
        batchNumber: formValues.batchNumber.trim() || `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: formValues.mfgDate,
        expiryDate: formValues.expiryDate,
        declaredMRP: Number(formValues.declaredMRP) || 50,
        netQuantity: formValues.netQuantity.trim() || '100 g',
        manufacturer: formValues.manufacturer.trim(),
        fssaiLicense: formValues.fssaiLicense.trim() || undefined,
        consumerCare: formValues.consumerCare.trim() || undefined,
        originCountry: formValues.originCountry.trim() || 'India',
        cin: formValues.cin.trim() || undefined,
        complianceHistory: { scansCount: 0, passedCount: 0, violationsCount: 0 },
        riskScore: formValues.riskScore,
        registeredDate: new Date().toISOString().slice(0, 10),
        barcodeType: formValues.barcodeType,
        notes: formValues.notes.trim() || undefined
      };
      await addBatchItem(newItem);
      showToast(`Commodity SKU "${newItem.productName}" registered successfully.`);
    }

    setIsAddEditModalOpen(false);
  };

  // Delete Batch
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove SKU "${name}" from the Master Commodity Registry?`)) {
      await deleteBatchItem(id);
      showToast(`Removed "${name}" from database.`, 'info');
      if (selectedBatchForDetail?.id === id) {
        setSelectedBatchForDetail(null);
      }
    }
  };

  // Barcode Lookup Tool
  const handleBarcodeLookup = () => {
    const q = barcodeLookupQuery.trim().toLowerCase();
    if (!q) {
      setBarcodeLookupResult(null);
      return;
    }
    const found = batches.find(
      (b) =>
        b.sku.toLowerCase() === q ||
        b.sku.replace(/[^0-9]/g, '') === q.replace(/[^0-9]/g, '') ||
        b.batchNumber.toLowerCase() === q ||
        b.productName.toLowerCase().includes(q)
    );
    setBarcodeLookupResult(found || 'NOT_FOUND');
  };

  // Export handlers
  const handleExportPdf = () => {
    setIsExportMenuOpen(false);
    ExportManager.exportProductRegistryPdf(filteredBatches);
    showToast(`Exported ${filteredBatches.length} registry records to PDF.`);
  };

  const handleExportCsv = () => {
    setIsExportMenuOpen(false);
    ExportManager.exportProductRegistryCsv(filteredBatches);
    showToast(`Exported ${filteredBatches.length} registry records to CSV.`);
  };

  const handleExportJson = () => {
    setIsExportMenuOpen(false);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(batches, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `VERDECT_Commodity_Registry_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    showToast(`Exported ${batches.length} registry items as JSON.`);
  };

  // Reset to National FMCG Standards
  const handleSeedStandards = async () => {
    setIsExportMenuOpen(false);
    if (window.confirm('Reset the registry to official National FMCG Brand Standards (Amul, Haldirams, Tata, Nestle, Unilever, Dabur, etc.)?')) {
      await resetBatchesToDefault();
      showToast('Master Commodity Database synchronized with National FMCG standards.');
    }
  };

  // Import JSON / CSV
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            await importBatches(parsed);
            showToast(`Successfully imported ${parsed.length} commodity records from JSON.`);
          }
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split('\n').filter((l) => l.trim().length > 0);
          const importedItems: ProductBatchItem[] = [];

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
            if (cols.length >= 2 && cols[0] && cols[1]) {
              importedItems.push({
                id: `prod_csv_${Date.now()}_${i}`,
                sku: cols[0],
                productName: cols[1],
                brand: cols[2] || 'Imported Brand',
                category: cols[3] || 'Packaged Foods',
                batchNumber: cols[4] || `BATCH-${Date.now().toString().slice(-4)}`,
                declaredMRP: Number(cols[5]) || 50,
                netQuantity: cols[6] || '100 g',
                mfgDate: cols[7] || new Date().toISOString().slice(0, 10),
                expiryDate: cols[8] || '2027-12-31',
                manufacturer: cols[9] || 'Registered FMCG Packager',
                fssaiLicense: cols[10] || undefined,
                consumerCare: cols[11] || undefined,
                originCountry: cols[12] || 'India',
                riskScore: (cols[14] as any) || 'LOW',
                complianceHistory: { scansCount: 0, passedCount: 0, violationsCount: 0 }
              });
            }
          }

          if (importedItems.length > 0) {
            await importBatches(importedItems);
            showToast(`Successfully imported ${importedItems.length} records from CSV.`);
          }
        }
      } catch (err: any) {
        showToast(`Failed to parse file: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to compute expiration status
  const getExpiryStatus = (expiryDateStr: string) => {
    try {
      const exp = new Date(expiryDateStr);
      const now = new Date();
      const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { label: 'EXPIRED', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800' };
      if (diffDays <= 60) return { label: `Expires in ${diffDays}d`, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' };
      return { label: 'Active Batch', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800' };
    } catch {
      return { label: 'Valid', color: 'text-slate-500 bg-slate-100' };
    }
  };

  // Find linked scans for a specific product
  const getLinkedScans = (item: ProductBatchItem) => {
    const qName = item.productName.toLowerCase();
    const qSku = item.sku.toLowerCase();
    const qBrand = item.brand.toLowerCase();
    return scans.filter(
      (s) =>
        s.productName.toLowerCase().includes(qName) ||
        (s.barcode && s.barcode.toLowerCase().includes(qSku)) ||
        (s.brandMetrics?.brandDetected && s.brandMetrics.brandDetected.toLowerCase() === qBrand) ||
        s.batchNumber === item.batchNumber
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-container-max mx-auto space-y-6 animate-in fade-in duration-200 select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200 border ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-700'
              : toastMessage.type === 'info'
              ? 'bg-sky-900 text-white border-sky-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-emerald-400 text-base">
            {toastMessage.type === 'error' ? 'error' : toastMessage.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hidden File Input for CSV/JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json,.csv"
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
              National Metrology Commodity Master Register
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Legal Metrology Act, 2009 &bull; Rule 6 &bull; Schedule II
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Product Registry &amp; Commodity Master Database
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Official central repository of manufacturer packaging specifications, GS1 barcode mappings, statutory declarations, and batch surveillance risk histories.
          </p>
        </div>

        {/* Action Button Header Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Barcode Lookup Button */}
          <button
            onClick={() => {
              setBarcodeLookupQuery('');
              setBarcodeLookupResult(null);
              setIsBarcodeLookupOpen(true);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-98"
          >
            <span className="material-symbols-outlined text-sky-500 text-sm">barcode_scanner</span>
            Barcode Lookup
          </button>

          {/* Export & Import Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Import / Export
              <span className="material-symbols-outlined text-xs">expand_more</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                <button
                  onClick={handleExportPdf}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <span className="material-symbols-outlined text-rose-500 text-sm">picture_as_pdf</span>
                  Export Registry Dossier (PDF)
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <span className="material-symbols-outlined text-emerald-500 text-sm">table_chart</span>
                  Export Master CSV Sheet
                </button>
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <span className="material-symbols-outlined text-sky-500 text-sm">data_object</span>
                  Export JSON Backup
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                <button
                  onClick={() => {
                    setIsExportMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <span className="material-symbols-outlined text-indigo-500 text-sm">upload_file</span>
                  Import CSV / JSON Records
                </button>
                <button
                  onClick={handleSeedStandards}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-amber-500 text-sm">sync</span>
                  Load National FMCG Presets
                </button>
              </div>
            )}
          </div>

          {/* Register New SKU CTA */}
          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-500/25 transition-all active:scale-98"
          >
            <span className="material-symbols-outlined text-sm">add_box</span>
            Register New Product SKU
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Total Commodities
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{metrics.total}</span>
            <span className="material-symbols-outlined text-sky-500 text-lg">inventory_2</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Master SKU Profiles</span>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            High Risk Batches
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{metrics.highRisk}</span>
            <span className="material-symbols-outlined text-rose-500 text-lg">warning</span>
          </div>
          <span className="text-[9px] text-rose-500 mt-1 font-semibold">Priority Field Audit</span>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Medium Risk
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{metrics.mediumRisk}</span>
            <span className="material-symbols-outlined text-amber-500 text-lg">schedule</span>
          </div>
          <span className="text-[9px] text-amber-500 mt-1">Under Surveillance</span>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Low Risk / Compliant
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{metrics.lowRisk}</span>
            <span className="material-symbols-outlined text-emerald-500 text-lg">verified</span>
          </div>
          <span className="text-[9px] text-emerald-500 mt-1">Clear Audit History</span>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Scans Logged
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{metrics.totalScans}</span>
            <span className="material-symbols-outlined text-indigo-500 text-lg">qr_code_scanner</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Total Inspections</span>
        </div>

        <div className="glass-card rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
            Pass Rate %
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-sky-600 dark:text-sky-400 font-mono">{metrics.passRate}%</span>
            <span className="material-symbols-outlined text-sky-500 text-lg">insights</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-1">Registry Compliance</span>
        </div>
      </div>

      {/* Search, Filter & Controls Panel */}
      <div className="glass-card rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        {/* Main Search Bar */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
          <span className="material-symbols-outlined text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product name, SKU barcode (890...), brand, batch lot, manufacturer, or FSSAI license..."
            className="bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 w-full focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-0.5"
            >
              Clear
            </button>
          )}
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    selectedCategory === cat.id
                      ? 'bg-sky-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Right Controls: Risk, Scan Status, Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Selector */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              aria-label="Filter by Risk Level"
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
            </select>

            {/* Scan Status Filter */}
            <select
              value={selectedScanStatus}
              onChange={(e) => setSelectedScanStatus(e.target.value)}
              aria-label="Filter by Inspection Status"
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="INSPECTED">Inspected / Has Scans</option>
              <option value="PENDING">Pending First Scan</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="Sort products by"
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="risk">Sort by: Highest Risk</option>
              <option value="name">Sort by: Name (A-Z)</option>
              <option value="mrp-desc">Sort by: MRP (High-Low)</option>
              <option value="mrp-asc">Sort by: MRP (Low-High)</option>
              <option value="scans">Sort by: Scans Count</option>
              <option value="mfgDate">Sort by: Mfg Date</option>
            </select>

            {/* Grid vs Table View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <span className="material-symbols-outlined text-sm block">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Table View"
              >
                <span className="material-symbols-outlined text-sm block">view_list</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Showing count indicator */}
      <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 px-1 font-semibold">
        <span>
          Showing <strong className="text-slate-800 dark:text-slate-200">{filteredBatches.length}</strong> of{' '}
          <strong className="text-slate-800 dark:text-slate-200">{batches.length}</strong> registered commodity SKU records
        </span>
        {(search || selectedCategory !== 'ALL' || selectedRisk !== 'ALL' || selectedScanStatus !== 'ALL') && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setSelectedRisk('ALL');
              setSelectedScanStatus('ALL');
            }}
            className="text-sky-600 dark:text-sky-400 hover:underline font-bold"
          >
            Reset All Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredBatches.length === 0 && (
        <div className="glass-card rounded-3xl p-12 text-center border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <span className="material-symbols-outlined text-3xl">inventory_2</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Matching Commodities Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            No packaging records match your current search query or filter parameters. Try clearing filters or register a new SKU profile.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
                setSelectedRisk('ALL');
                setSelectedScanStatus('ALL');
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold"
            >
              Clear Filters
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold"
            >
              Register New SKU
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: GRID VIEW */}
      {viewMode === 'grid' && filteredBatches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBatches.map((item) => {
            const expStatus = getExpiryStatus(item.expiryDate);
            const totalScans = item.complianceHistory?.scansCount || 0;
            const passedScans = item.complianceHistory?.passedCount || 0;
            const passPct = totalScans > 0 ? Math.round((passedScans / totalScans) * 100) : 100;

            return (
              <div
                key={item.id}
                className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Bar: Barcode Mono, Category & Risk Pill */}
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                        {item.sku}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        item.riskScore === 'HIGH'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          : item.riskScore === 'MEDIUM'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {item.riskScore} RISK
                    </span>
                  </div>

                  {/* Title & Brand */}
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {item.productName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Brand: <strong className="text-slate-700 dark:text-slate-300">{item.brand}</strong> &bull; {item.originCountry || 'India'}
                  </p>

                  {/* Statutory Parameter Spec Box */}
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-sans">Batch Lot ID:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.batchNumber}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-sans">Declared Net Qty:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.netQuantity}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-sans">Declared MRP:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">₹{item.declaredMRP.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-sans">Mfg / Expiry:</span>
                      <span className="text-slate-700 dark:text-slate-300">{item.mfgDate} / {item.expiryDate}</span>
                    </div>
                    {item.fssaiLicense && (
                      <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-sans">FSSAI License:</span>
                        <span className="font-bold text-sky-600 dark:text-sky-400">{item.fssaiLicense}</span>
                      </div>
                    )}
                  </div>

                  {/* Manufacturer snippet & Expiration status */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px]">
                    <span className="text-slate-400 dark:text-slate-500 truncate max-w-[65%]" title={item.manufacturer}>
                      Mfg: {item.manufacturer}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border font-bold shrink-0 ${expStatus.color}`}>
                      {expStatus.label}
                    </span>
                  </div>

                  {/* Compliance Scorecard Strip */}
                  <div className="mt-3 p-2.5 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-slate-500">Inspection Pass Rate</span>
                      <span className={passPct < 80 ? 'text-rose-500' : 'text-emerald-500'}>
                        {passPct}% ({passedScans}/{totalScans} passed)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${totalScans > 0 ? (passedScans / totalScans) * 100 : 100}%` }}
                      ></div>
                      <div
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${totalScans > 0 ? ((totalScans - passedScans) / totalScans) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => setSelectedBatchForDetail(item)}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View Dossier
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/scan?sku=${encodeURIComponent(item.sku)}`)}
                      className="px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-sky-200 dark:border-sky-800 transition-colors"
                      title="Launch camera scan for this SKU"
                    >
                      <span className="material-symbols-outlined text-xs">photo_camera</span>
                      Scan
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit SKU record"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(item.id, item.productName)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete SKU record"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW */}
      {viewMode === 'table' && filteredBatches.length > 0 && (
        <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-mono font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Barcode / SKU</th>
                  <th className="py-3 px-4">Commodity &amp; Brand</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Batch Lot</th>
                  <th className="py-3 px-4">Decl. MRP</th>
                  <th className="py-3 px-4">Net Qty</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Scans / Pass</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredBatches.map((item) => {
                  const expStatus = getExpiryStatus(item.expiryDate);
                  const totalScans = item.complianceHistory?.scansCount || 0;
                  const passedScans = item.complianceHistory?.passedCount || 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{item.productName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.brand} &bull; {item.manufacturer.slice(0, 32)}...</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {item.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {item.batchNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        ₹{item.declaredMRP.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {item.netQuantity}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${expStatus.color}`}>
                          {item.expiryDate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.riskScore === 'HIGH'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              : item.riskScore === 'MEDIUM'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {item.riskScore}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {totalScans} ({passedScans}P)
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBatchForDetail(item)}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/60 rounded-lg transition-colors"
                            title="View Dossier"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            onClick={() => navigate(`/scan?sku=${encodeURIComponent(item.sku)}`)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors"
                            title="Scan Product"
                          >
                            <span className="material-symbols-outlined text-base">photo_camera</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Record"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.productName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Record"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTER / EDIT PRODUCT SKU */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingBatchId ? 'Edit Master Commodity Specifications' : 'Register Packaging SKU in Master Database'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 text-xs font-sans">
          {/* Preset Selector Banner for Quick Form Filling */}
          {!editingBatchId && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-600 dark:text-sky-400 text-lg">auto_awesome</span>
                <span className="text-sky-900 dark:text-sky-200 font-bold text-[11px]">
                  Quick Pre-Fill from National Brand Standards:
                </span>
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value !== '') {
                    handleSelectPreset(Number(e.target.value));
                  }
                }}
                defaultValue=""
                className="w-full sm:w-auto p-1.5 bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 rounded-xl text-xs font-bold text-sky-900 dark:text-sky-200 focus:outline-none"
              >
                <option value="" disabled>
                  Select Preset Brand...
                </option>
                {INDIAN_BRAND_PRESETS.map((p, idx) => (
                  <option key={idx} value={idx}>
                    {p.brand} - {p.productName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formValues.productName}
                onChange={(e) => setFormValues({ ...formValues, productName: e.target.value })}
                placeholder="e.g. Pure Desi Ghee 500ml"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Brand / Trademark <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formValues.brand}
                onChange={(e) => setFormValues({ ...formValues, brand: e.target.value })}
                placeholder="e.g. Amul"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Barcode SKU & Batch Lot ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Barcode / SKU <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormValues({
                      ...formValues,
                      sku: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`
                    })
                  }
                  className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                >
                  Gen GS1-890
                </button>
              </div>
              <input
                type="text"
                required
                value={formValues.sku}
                onChange={(e) => setFormValues({ ...formValues, sku: e.target.value })}
                placeholder="8901234567890"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Batch / Lot ID <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormValues({
                      ...formValues,
                      batchNumber: `BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
                    })
                  }
                  className="text-[10px] text-sky-600 dark:text-sky-400 font-bold hover:underline"
                >
                  Gen Lot ID
                </button>
              </div>
              <input
                type="text"
                required
                value={formValues.batchNumber}
                onChange={(e) => setFormValues({ ...formValues, batchNumber: e.target.value })}
                placeholder="BATCH-2026-X01"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Category</label>
              <select
                value={formValues.category}
                onChange={(e) => setFormValues({ ...formValues, category: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              >
                <option>Packaged Foods</option>
                <option>Dairy &amp; Beverages</option>
                <option>Grains &amp; Pulses</option>
                <option>Edible Oils</option>
                <option>Cosmetics &amp; Personal Care</option>
                <option>Household Chemicals</option>
                <option>Pharmaceuticals &amp; OTC</option>
              </select>
            </div>
          </div>

          {/* Pricing & Net Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Declared MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={formValues.declaredMRP}
                onChange={(e) => setFormValues({ ...formValues, declaredMRP: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Declared Net Quantity (SI Metric) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formValues.netQuantity}
                onChange={(e) => setFormValues({ ...formValues, netQuantity: e.target.value })}
                placeholder="e.g. 500 g or 1 L or 250 ml"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Dates: Manufacturing & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Date of Manufacture / Packaging <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formValues.mfgDate}
                onChange={(e) => setFormValues({ ...formValues, mfgDate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Best Before / Expiry Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formValues.expiryDate}
                onChange={(e) => setFormValues({ ...formValues, expiryDate: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Manufacturer Address */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Manufacturer / Packer Full Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={formValues.manufacturer}
              onChange={(e) => setFormValues({ ...formValues, manufacturer: e.target.value })}
              placeholder="e.g. Gujarat Cooperative Milk Marketing Federation Ltd., Anand - 388001, Gujarat"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* FSSAI License & Helpline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                FSSAI License (14 Digits)
              </label>
              <input
                type="text"
                maxLength={14}
                value={formValues.fssaiLicense}
                onChange={(e) => setFormValues({ ...formValues, fssaiLicense: e.target.value.replace(/[^0-9]/g, '') })}
                placeholder="10012021000071"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                Consumer Care Helpline / Email
              </label>
              <input
                type="text"
                value={formValues.consumerCare}
                onChange={(e) => setFormValues({ ...formValues, consumerCare: e.target.value })}
                placeholder="1800-258-3333 / care@brand.com"
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Surveillance Risk Score */}
          <div>
            <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Surveillance Risk Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setFormValues({ ...formValues, riskScore: r })}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                    formValues.riskScore === r
                      ? r === 'HIGH'
                        ? 'bg-rose-100 dark:bg-rose-950 border-rose-400 text-rose-800 dark:text-rose-200 font-black'
                        : r === 'MEDIUM'
                        ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-800 dark:text-amber-200 font-black'
                        : 'bg-emerald-100 dark:bg-emerald-950 border-emerald-400 text-emerald-800 dark:text-emerald-200 font-black'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {r} RISK
                </button>
              ))}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddEditModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl font-bold shadow-md transition-all"
            >
              {editingBatchId ? 'Save Specification Changes' : 'Register Commodity SKU'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRODUCT DOSSIER SPECIFICATION DETAIL MODAL */}
      {selectedBatchForDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBatchForDetail(null)}
          title={`Master Specification: ${selectedBatchForDetail.productName}`}
        >
          <div className="space-y-4 text-xs font-sans">
            {/* Top Identity Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                  {selectedBatchForDetail.sku} ({selectedBatchForDetail.barcodeType || 'EAN-13'})
                </span>
                <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                  {selectedBatchForDetail.productName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Brand: <strong>{selectedBatchForDetail.brand}</strong> &bull; Category: <strong>{selectedBatchForDetail.category}</strong>
                </p>
              </div>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  selectedBatchForDetail.riskScore === 'HIGH'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                    : selectedBatchForDetail.riskScore === 'MEDIUM'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {selectedBatchForDetail.riskScore} SURVEILLANCE RISK
              </span>
            </div>

            {/* Statutory Parameters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Declared MRP:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">₹{selectedBatchForDetail.declaredMRP.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Declared Net Quantity:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedBatchForDetail.netQuantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Batch Lot ID:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedBatchForDetail.batchNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of Manufacture:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{selectedBatchForDetail.mfgDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expiry Date:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{selectedBatchForDetail.expiryDate}</span>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">FSSAI License:</span>
                  <span className="font-bold text-sky-600 dark:text-sky-400 font-mono">{selectedBatchForDetail.fssaiLicense || 'N/A (Non-Food)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consumer Helpline:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedBatchForDetail.consumerCare || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Country of Origin:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedBatchForDetail.originCountry || 'India'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Corporate CIN:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedBatchForDetail.cin || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Registration Date:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedBatchForDetail.registeredDate || '2026-01-01'}</span>
                </div>
              </div>
            </div>

            {/* Manufacturer Address */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Registered Geographical Manufacturing Address (Rule 6(1)(a))
              </span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {selectedBatchForDetail.manufacturer}
              </p>
            </div>

            {/* Historical Scan Inspections Linked to This SKU */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Linked Field Surveillance Inspections ({getLinkedScans(selectedBatchForDetail).length})
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  {selectedBatchForDetail.complianceHistory?.passedCount || 0} Passed / {selectedBatchForDetail.complianceHistory?.violationsCount || 0} Violations
                </span>
              </div>

              {getLinkedScans(selectedBatchForDetail).length > 0 ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {getLinkedScans(selectedBatchForDetail).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedBatchForDetail(null);
                        navigate(`/analysis/${s.id}`);
                      }}
                      className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/70 dark:border-slate-700 flex justify-between items-center hover:border-sky-500 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            s.overallVerdict === 'COMPLIANT' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{s.id}</span>
                        <span className="text-slate-400 text-[10px]">{s.timestamp}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          s.overallVerdict === 'COMPLIANT'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {s.overallVerdict}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No automated scans logged yet for this specific SKU.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => ExportManager.exportSingleProductSheetPdf(selectedBatchForDetail)}
                className="px-4 py-2 border border-sky-600 dark:border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                Export SKU Sheet (PDF)
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const item = selectedBatchForDetail;
                    setSelectedBatchForDetail(null);
                    handleOpenEditModal(item);
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Edit Specifications
                </button>
                <button
                  onClick={() => {
                    const sku = selectedBatchForDetail.sku;
                    setSelectedBatchForDetail(null);
                    navigate(`/scan?sku=${encodeURIComponent(sku)}`);
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">photo_camera</span>
                  Launch Packaging Scan
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: QUICK BARCODE LOOKUP & VALIDATOR */}
      <Modal
        isOpen={isBarcodeLookupOpen}
        onClose={() => setIsBarcodeLookupOpen(false)}
        title="GS1 Barcode & SKU Verification Tool"
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-slate-500 dark:text-slate-400">
            Enter or scan a 13-digit GS1 barcode number to verify whether the commodity is registered in the Directorate's Master Database under LMPC Rules 2011.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeLookupQuery}
              onChange={(e) => setBarcodeLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeLookup()}
              placeholder="e.g. 8901262010053 or Amul"
              className="flex-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-sm font-bold text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              onClick={handleBarcodeLookup}
              className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-md"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              Lookup
            </button>
          </div>

          {/* Quick Click Preset Test Barcodes */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400">Try Sample Barcodes:</span>
            {INDIAN_BRAND_PRESETS.slice(0, 4).map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setBarcodeLookupQuery(p.sku);
                  const found = batches.find((b) => b.sku === p.sku);
                  setBarcodeLookupResult(found || 'NOT_FOUND');
                }}
                className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950 text-slate-700 dark:text-slate-300 rounded-md font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700"
              >
                {p.brand} ({p.sku.slice(0, 7)}...)
              </button>
            ))}
          </div>

          {/* Lookup Result View */}
          {barcodeLookupResult && barcodeLookupResult !== 'NOT_FOUND' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <span className="material-symbols-outlined text-xl text-emerald-600">check_circle</span>
                <div>
                  <h4 className="font-bold text-sm">Registered Commodity Verified</h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Official master record found in database</p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900 space-y-1.5">
                <p className="font-bold text-slate-900 dark:text-white text-sm">{barcodeLookupResult.productName}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-700 dark:text-slate-300">
                  <div>SKU: <strong>{barcodeLookupResult.sku}</strong></div>
                  <div>Brand: <strong>{barcodeLookupResult.brand}</strong></div>
                  <div>Declared MRP: <strong>₹{barcodeLookupResult.declaredMRP}</strong></div>
                  <div>Net Qty: <strong>{barcodeLookupResult.netQuantity}</strong></div>
                  <div>Batch: <strong>{barcodeLookupResult.batchNumber}</strong></div>
                  <div>Risk Level: <strong>{barcodeLookupResult.riskScore}</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsBarcodeLookupOpen(false);
                    setSelectedBatchForDetail(barcodeLookupResult);
                  }}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200"
                >
                  View Full Dossier
                </button>
                <button
                  onClick={() => {
                    const sku = barcodeLookupResult.sku;
                    setIsBarcodeLookupOpen(false);
                    navigate(`/scan?sku=${encodeURIComponent(sku)}`);
                  }}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-md"
                >
                  <span className="material-symbols-outlined text-xs">photo_camera</span>
                  Launch Scan for this SKU
                </button>
              </div>
            </div>
          )}

          {barcodeLookupResult === 'NOT_FOUND' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-2 text-rose-800 dark:text-rose-300 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600 text-xl">error</span>
                <h4 className="font-bold text-sm">Unregistered SKU / Barcode</h4>
              </div>
              <p className="text-[11px]">
                No registered packaging profile was found matching &quot;{barcodeLookupQuery}&quot;. You can register it now as a new commodity profile.
              </p>
              <button
                onClick={() => {
                  setIsBarcodeLookupOpen(false);
                  handleOpenAddModal();
                  setFormValues((prev) => ({ ...prev, sku: barcodeLookupQuery }));
                }}
                className="px-4 py-1.5 bg-rose-600 text-white rounded-xl font-bold text-xs"
              >
                Register this Barcode Now
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RegistryPage;
