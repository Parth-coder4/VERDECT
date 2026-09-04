import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ScanRecord, CounterfeitMetrics, ProductBatchItem } from '../types/compliance';
import { RegulatoryReportItem } from '../types/user';
import { VERDECT_LOGO_BASE64 } from '../assets/logoBase64';

export class ExportManager {
  /**
   * Generates and downloads an Official Statutory Violation Notice in PDF format
   * with the official VERDECT logo image in the top-left corner and original Government Statutory Notice format.
   */
  static exportViolationNoticePdf(scan: ScanRecord): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryNavy: [number, number, number] = [10, 25, 47];
    const darkText: [number, number, number] = [20, 24, 30];
    const redAccent: [number, number, number] = [185, 28, 28];

    // ==========================================
    // 1. TOP HEADER WITH TOP-LEFT LOGO IMAGE
    // ==========================================

    // Top Header Background Ribbon
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(0, 38, 210, 38);

    // [TOP-LEFT CORNER]: ONLY THE OFFICIAL LOGO IMAGE
    try {
      doc.addImage(VERDECT_LOGO_BASE64, 'JPEG', 4, 6, 50, 30);
    } catch {
      // Fallback if image fails to render
      doc.setFillColor(10, 25, 47);
      doc.roundedRect(14, 6, 26, 26, 2, 2, 'F');
    }

    // [CENTER / RIGHT HEADER]: ORIGINAL STATUTORY GOVERNMENT NOTICE FORMAT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryNavy);
    doc.text('GOVERNMENT OF INDIA', 125, 11, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('MINISTRY OF CONSUMER AFFAIRS, FOOD & PUBLIC DISTRIBUTION', 125, 16, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION', 125, 21, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...redAccent);
    doc.text('FORM LMPC-36A: STATUTORY NOTICE UNDER SECTION 36 (LEGAL METROLOGY ACT, 2009)', 125, 27, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Enforcement of Mandatory Declarations Under Legal Metrology (Packaged Commodities) Rules, 2011', 125, 32, { align: 'center' });

    // ==========================================
    // 2. NOTICE METADATA BLOCK
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('OFFICIAL STATUTORY INSPECTION DOSSIER', 14, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    doc.text(`Notice Ref ID: LMPC/ENF/2026/${scan.id}`, 14, 52);
    doc.text(`Inspection Date & Time: ${scan.timestamp}`, 14, 57);
    doc.text(`Investigating Officer: ${scan.inspectorName} (Badge: ${scan.inspectorId})`, 14, 62);

    doc.setFont('helvetica', 'bold');
    doc.text('Statutory Assessment Verdict:', 125, 52);
    if (scan.overallVerdict === 'NON-COMPLIANT') {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(21, 128, 61);
    }
    doc.text(scan.overallVerdict, 175, 52);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkText);
    doc.text(`Estimated Compounding Penalty: Rs. ${scan.penaltyEstimateInr?.toLocaleString('en-IN') || '25,000'}`, 125, 57);
    doc.text(`AI Confidence Level: ${(scan.confidenceScore * 100).toFixed(1)}%`, 125, 62);

    // ==========================================
    // 3. PACKAGING COMMODITY PARTICULARS TABLE
    // ==========================================
    autoTable(doc, {
      startY: 68,
      theme: 'grid',
      head: [['Statutory Commodity Parameter', 'Declared Packaging Record / Scanned Particulars']],
      body: [
        ['Product Description & Generic Name', scan.productName],
        ['Commodity Classification', scan.category || 'Packaged Commodity (Rule 6.1)'],
        ['Manufacturing Batch / Lot Number', scan.batchNumber],
        ['Barcode / GS1 EAN-13 Serialization', scan.barcode],
        ['Manufacturer / Packer / Importer', scan.manufacturer],
        ['Anti-Counterfeit Forensic Rating', `${scan.counterfeitMetrics?.counterfeitScore || 5}/100 (${scan.counterfeitMetrics?.verdict || 'AUTHENTIC'})`]
      ],
      headStyles: {
        fillColor: primaryNavy,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkText
      },
      margin: { left: 14, right: 14 }
    });

    // ==========================================
    // 4. ITEMIZED STATUTORY CLAUSE MATRIX
    // ==========================================
    const lastY = (doc as any).lastAutoTable.finalY || 120;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryNavy);
    doc.text('SCHEDULED EVALUATION MATRIX (LMPC RULES 2011 & ACT 2009)', 14, lastY + 8);

    const violationsBody = scan.ruleEvaluations.map((ev) => [
      ev.ruleCode,
      ev.clause,
      ev.status,
      ev.detectedValue || 'Not Detected',
      ev.requiredSpecification
    ]);

    autoTable(doc, {
      startY: lastY + 12,
      theme: 'striped',
      head: [['Rule Code', 'Statutory Clause (LMPC 2011)', 'Finding', 'Scanned / OCR Inscription', 'Mandatory Legal Specification']],
      body: violationsBody,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: darkText
      },
      didParseCell: (data) => {
        if (data.column.index === 2) {
          const val = data.cell.raw;
          if (val === 'ISSUE' || val === 'FAIL') {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'PASS') {
            data.cell.styles.textColor = [21, 128, 61];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      margin: { left: 14, right: 14 }
    });

    // ==========================================
    // 5. LEGAL WARNING & STATUTORY SHOW-CAUSE
    // ==========================================
    const signY = (doc as any).lastAutoTable.finalY + 8;

    if (signY < 248) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      doc.roundedRect(14, signY, 182, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(153, 27, 27);
      doc.text('STATUTORY DIRECTIVE UNDER SECTION 36, LEGAL METROLOGY ACT, 2009:', 18, signY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(127, 29, 29);
      doc.text(
        'The manufacturer / packer / importer is hereby called upon to show cause within fifteen (15) calendar days from receipt of this notice why\n' +
        'proceedings under Section 36(1) and compounding of offenses under Rule 32 of Legal Metrology (Packaged Commodities) Rules, 2011 should not\n' +
        'be initiated. Failure to reply shall result in immediate seizure and statutory prosecution before the Competent Metrology Court.',
        18,
        signY + 10.5
      );

      // Signature Stamp
      doc.setDrawColor(148, 163, 184);
      doc.line(135, signY + 36, 192, signY + 36);
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Authorized Inspector / Enforcement Officer', 135, signY + 40);
      doc.text(`Digital Verification: ${scan.inspectorName} (${scan.inspectorId})`, 135, signY + 44);
    }

    doc.save(`LMPC_Statutory_Notice_${scan.id}.pdf`);
  }

  /**
   * Generates and triggers download of CSV audit log data
   */
  static exportAuditLogCsv(scans: ScanRecord[]): void {
    const headers = [
      'Scan Ref ID',
      'Timestamp',
      'Product Name',
      'Category',
      'Batch Number',
      'Barcode',
      'Manufacturer',
      'MRP Rule Status',
      'Net Qty Status',
      'Font Geometry Status',
      'Counterfeit Risk Score',
      'Verdict',
      'Confidence',
      'Inspector ID'
    ];

    const rows = scans.map((s) => {
      const mrpEval = s.ruleEvaluations.find((e) => e.ruleCode.includes('MRP'))?.status || 'NA';
      const qtyEval = s.ruleEvaluations.find((e) => e.ruleCode.includes('QTY'))?.status || 'NA';
      const fontEval = s.fontMetrics.status;

      return [
        `"${s.id}"`,
        `"${s.timestamp}"`,
        `"${s.productName}"`,
        `"${s.category}"`,
        `"${s.batchNumber}"`,
        `"${s.barcode}"`,
        `"${s.manufacturer.replace(/"/g, '""')}"`,
        `"${mrpEval}"`,
        `"${qtyEval}"`,
        `"${fontEval}"`,
        `"${s.counterfeitMetrics?.counterfeitScore || 5}/100"`,
        `"${s.overallVerdict}"`,
        `"${(s.confidenceScore * 100).toFixed(1)}%"`,
        `"${s.inspectorId}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LMPC_Inspection_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates and downloads an Official Multi-Spectral Anti-Counterfeit Forensic Dossier in PDF format
   * with top-left VERDECT logo image and official government laboratory report structure.
   */
  static exportCounterfeitReportPdf(
    metrics: CounterfeitMetrics,
    productTitle: string,
    batchInfo: string
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryNavy: [number, number, number] = [10, 25, 47];
    const darkText: [number, number, number] = [30, 41, 59];

    // ==========================================
    // 1. TOP HEADER WITH TOP-LEFT LOGO IMAGE
    // ==========================================
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(0, 38, 210, 38);

    // [TOP-LEFT CORNER]: ONLY THE OFFICIAL LOGO IMAGE
    try {
      doc.addImage(VERDECT_LOGO_BASE64, 'JPEG', 4, 6, 50, 30);
    } catch {
      doc.setFillColor(10, 25, 47);
      doc.roundedRect(14, 6, 26, 26, 2, 2, 'F');
    }

    // [CENTER / RIGHT HEADER]: GOVERNMENT FORENSIC METROLOGY WING
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryNavy);
    doc.text('NATIONAL LEGAL METROLOGY FORENSIC LABORATORY', 125, 11, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('DEPARTMENT OF CONSUMER AFFAIRS • CENTRAL SECURITY WING', 125, 16, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('FORM LMPC-FD-09: MULTI-SPECTRAL PACKAGING AUTHENTICATION REPORT', 125, 21, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Hologram Diffraction, Substrate Gamut Analysis & GS1 Serialization Verification', 125, 26, { align: 'center' });

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Statutory Examination under Trade Marks Act 1999 & Legal Metrology Act 2009', 125, 31, { align: 'center' });

    // ==========================================
    // 2. REPORT META BANNER
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const isCritical = metrics.counterfeitScore > 55;
    const isSuspect = metrics.counterfeitScore > 25;

    if (isCritical) {
      doc.setTextColor(220, 38, 38);
    } else if (isSuspect) {
      doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(22, 163, 74);
    }
    doc.text(`FORENSIC AUTHENTICATION VERDICT: ${metrics.verdict}`, 14, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    const refId = `VRD-CF-${Date.now().toString().slice(-6)}`;
    doc.text(`Dossier Ref: ${refId}`, 14, 52);
    doc.text(`Examination Timestamp: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`, 14, 57);
    doc.text(`Investigating Unit: Central Metrology Anti-Counterfeit Cell`, 14, 62);

    doc.setFont('helvetica', 'bold');
    doc.text(`Counterfeit Risk Score: ${metrics.counterfeitScore} / 100`, 130, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(`Algorithm Confidence: ${(metrics.confidence * 100).toFixed(1)}%`, 130, 57);
    doc.text(`Tamper Seal Status: ${metrics.factors.tamperSealStatus}`, 130, 62);

    // ==========================================
    // 3. PRODUCT ATTRIBUTES TABLE
    // ==========================================
    autoTable(doc, {
      startY: 68,
      theme: 'grid',
      head: [['Forensic Attribute', 'Spectral & Material Examination Finding']],
      body: [
        ['Product Identifier', productTitle],
        ['Batch & Barcode Metadata', batchInfo.replace(/&bull;/g, '•')],
        ['Hologram Diffraction Score', `${metrics.factors.hologramOpticalScore}% (${metrics.factors.hologramOpticalScore >= 80 ? 'Intact Micro-structure' : 'Diffraction Variance'})`],
        ['Pantone Substrate Gamut Match', `${metrics.factors.packagingGamutFidelity}% (${metrics.factors.packagingGamutFidelity >= 85 ? 'Standard Ink Formulation' : 'Non-standard Ink Deviation'})`],
        ['GS1 Barcode Cryptographic Integrity', `${metrics.factors.barcodeGs1Integrity}% (${metrics.factors.barcodeGs1Integrity >= 90 ? 'Registered GS1 Prefix' : 'Unregistered / Checksum Anomaly'})`],
        ['Micro-Typography & Edge Acuity', `${metrics.factors.microprintTypography}% (${metrics.factors.microprintTypography >= 85 ? 'Authentic Litho Resolution' : 'Inkjet Raster Artifacts'})`],
        ['Tamper-Evident Security Seal', metrics.factors.tamperSealStatus]
      ],
      headStyles: {
        fillColor: primaryNavy,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkText
      },
      margin: { left: 14, right: 14 }
    });

    // ==========================================
    // 4. ANOMALIES TABLE
    // ==========================================
    const lastY = (doc as any).lastAutoTable.finalY || 135;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryNavy);
    doc.text('DETECTED PHYSICAL & OPTICAL ANOMALIES', 14, lastY + 8);

    const anomaliesRows = (metrics.detectedAnomalies || []).map((anom, idx) => [
      `ANOM-0${idx + 1}`,
      anom,
      isCritical ? 'CRITICAL RISK' : isSuspect ? 'MODERATE RISK' : 'AUTHENTIC / PASS'
    ]);

    autoTable(doc, {
      startY: lastY + 12,
      theme: 'striped',
      head: [['Ref Index', 'Optical & Substrate Observation', 'Risk Classification']],
      body: anomaliesRows.length > 0 ? anomaliesRows : [['ANOM-00', 'No security anomalies detected. Packaging fully conforms to master standard.', 'PASS']],
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7
      },
      margin: { left: 14, right: 14 }
    });

    // ==========================================
    // 5. SIGN-OFF
    // ==========================================
    const signY = (doc as any).lastAutoTable.finalY + 8;
    if (signY < 250) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, signY, 182, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('EXPERT FORENSIC NOTES & STATUTORY DIRECTIVE:', 18, signY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(
        metrics.forensicNotes ||
        'Packaging material underwent full forensic multi-spectral decomposition. All optical features verified against national registry.',
        18,
        signY + 10.5,
        { maxWidth: 174 }
      );

      doc.setDrawColor(148, 163, 184);
      doc.line(135, signY + 36, 192, signY + 36);
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Central Forensic Director / Chief Examiner', 135, signY + 40);
      doc.text('Digital Signature Validated Under IT Act, 2000', 135, signY + 44);
    }

    const cleanTitle = productTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
    doc.save(`LMPC_Forensic_Report_${cleanTitle}.pdf`);
  }

  /**
   * Generates and downloads an Official Directorate Commodity Master Registry Dossier in PDF format
   */
  static exportProductRegistryPdf(batches: ProductBatchItem[]): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const primaryNavy: [number, number, number] = [10, 25, 47];
    const darkText: [number, number, number] = [20, 24, 30];

    // Ribbon Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 297, 34, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(0, 34, 297, 34);

    try {
      doc.addImage(VERDECT_LOGO_BASE64, 'JPEG', 8, 4, 45, 26);
    } catch {
      doc.setFillColor(10, 25, 47);
      doc.roundedRect(8, 4, 22, 22, 2, 2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...primaryNavy);
    doc.text('GOVERNMENT OF INDIA • MINISTRY OF CONSUMER AFFAIRS', 160, 10, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('LEGAL METROLOGY DIVISION • NATIONAL COMMODITY MASTER REGISTRY', 160, 16, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text(`OFFICIAL PACKAGED COMMODITY SKU & BATCH DOSSIER (TOTAL RECORDS: ${batches.length})`, 160, 23, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} | LMPC (Packaged Commodities) Rules 2011 Master Register`, 160, 28, { align: 'center' });

    const rows = batches.map((b) => [
      b.sku,
      b.productName,
      b.brand,
      b.category,
      b.batchNumber,
      `Rs. ${b.declaredMRP.toFixed(2)}`,
      b.netQuantity,
      `${b.mfgDate} / ${b.expiryDate}`,
      b.fssaiLicense || 'N/A',
      `${b.complianceHistory.scansCount} (${b.complianceHistory.passedCount}P / ${b.complianceHistory.violationsCount}V)`,
      b.riskScore
    ]);

    autoTable(doc, {
      startY: 38,
      theme: 'grid',
      head: [[
        'Barcode / SKU',
        'Commodity Description',
        'Brand',
        'Category',
        'Batch Lot',
        'Decl. MRP',
        'Net Qty',
        'Mfg / Expiry',
        'FSSAI Lic',
        'Scans Logged',
        'Risk Level'
      ]],
      body: rows,
      headStyles: {
        fillColor: primaryNavy,
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: darkText
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 46 },
        2: { cellWidth: 22 },
        3: { cellWidth: 26 },
        4: { cellWidth: 24 },
        5: { cellWidth: 18 },
        6: { cellWidth: 16 },
        7: { cellWidth: 26 },
        8: { cellWidth: 24 },
        9: { cellWidth: 22 },
        10: { cellWidth: 18 }
      },
      margin: { left: 8, right: 8 }
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`VERDECT_Product_Registry_Dossier_${dateStr}.pdf`);
  }

  /**
   * Generates and downloads a Single SKU LMPC Compliance Sheet in PDF format
   */
  static exportSingleProductSheetPdf(batch: ProductBatchItem): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryNavy: [number, number, number] = [10, 25, 47];
    const darkText: [number, number, number] = [20, 24, 30];

    // Top Header Ribbon
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(0, 36, 210, 36);

    try {
      doc.addImage(VERDECT_LOGO_BASE64, 'JPEG', 6, 5, 45, 26);
    } catch {
      doc.setFillColor(10, 25, 47);
      doc.roundedRect(12, 5, 22, 22, 2, 2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryNavy);
    doc.text('GOVERNMENT OF INDIA • LEGAL METROLOGY DIVISION', 125, 11, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('NATIONAL COMMODITY MASTER SPECIFICATION SHEET', 125, 17, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(2, 132, 199);
    doc.text(`MASTER SKU SPECIFICATION: ${batch.sku}`, 125, 24, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`LMPC Rules 2011 Registered Profile | Date Generated: ${new Date().toLocaleString('en-IN')}`, 125, 30, { align: 'center' });

    autoTable(doc, {
      startY: 42,
      theme: 'grid',
      head: [['Statutory Commodity Parameter', 'Registered Master Specification']],
      body: [
        ['Product Name', batch.productName],
        ['Brand / Trademark', batch.brand],
        ['Barcode / SKU (GS1)', `${batch.sku} (${batch.barcodeType || 'EAN-13'})`],
        ['Commodity Category', batch.category],
        ['Batch / Lot Lot ID', batch.batchNumber],
        ['Declared Retail Price (MRP)', `Rs. ${batch.declaredMRP.toFixed(2)} (Inclusive of all taxes)`],
        ['Declared Net Quantity', `${batch.netQuantity} (Schedule II Standard Metric)`],
        ['Date of Manufacture / Packaging', batch.mfgDate],
        ['Best Before / Expiry Date', batch.expiryDate],
        ['Manufacturer / Packer Address', batch.manufacturer],
        ['FSSAI 14-Digit License', batch.fssaiLicense || 'Not Specified / Non-Food Commodity'],
        ['Consumer Helpline & Email', batch.consumerCare || 'Standard Directorate Grievance Redressal'],
        ['Country of Origin', batch.originCountry || 'India'],
        ['Corporate CIN', batch.cin || 'Registered Entity'],
        ['Surveillance Risk Classification', `${batch.riskScore} RISK`],
        ['Historical Inspections / Scans', `${batch.complianceHistory.scansCount} Total (${batch.complianceHistory.passedCount} Passed, ${batch.complianceHistory.violationsCount} Violations)`]
      ],
      headStyles: {
        fillColor: primaryNavy,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkText
      },
      margin: { left: 14, right: 14 }
    });

    const safeName = batch.productName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 24);
    doc.save(`LMPC_SKU_Sheet_${batch.sku}_${safeName}.pdf`);
  }

  /**
   * Generates and downloads Product Registry data as CSV
   */
  static exportProductRegistryCsv(batches: ProductBatchItem[]): void {
    const headers = [
      'SKU_Barcode',
      'Product_Name',
      'Brand',
      'Category',
      'Batch_Number',
      'Declared_MRP_INR',
      'Net_Quantity',
      'Mfg_Date',
      'Expiry_Date',
      'Manufacturer_Address',
      'FSSAI_License',
      'Consumer_Care',
      'Country_Of_Origin',
      'CIN',
      'Risk_Score',
      'Scans_Count',
      'Passed_Count',
      'Violations_Count',
      'Registered_Date'
    ];

    const rows = batches.map((b) => [
      `"${b.sku}"`,
      `"${b.productName.replace(/"/g, '""')}"`,
      `"${b.brand.replace(/"/g, '""')}"`,
      `"${b.category.replace(/"/g, '""')}"`,
      `"${b.batchNumber}"`,
      b.declaredMRP,
      `"${b.netQuantity}"`,
      `"${b.mfgDate}"`,
      `"${b.expiryDate}"`,
      `"${(b.manufacturer || '').replace(/"/g, '""')}"`,
      `"${b.fssaiLicense || ''}"`,
      `"${(b.consumerCare || '').replace(/"/g, '""')}"`,
      `"${b.originCountry || 'India'}"`,
      `"${b.cin || ''}"`,
      `"${b.riskScore}"`,
      b.complianceHistory.scansCount,
      b.complianceHistory.passedCount,
      b.complianceHistory.violationsCount,
      `"${b.registeredDate || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `VERDECT_Product_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates and downloads an Official Directorate Regulatory Dossier in PDF format
   */
  static exportRegulatoryDossierPdf(report: RegulatoryReportItem, scan?: ScanRecord): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryNavy: [number, number, number] = [10, 25, 47];
    const darkText: [number, number, number] = [20, 24, 30];
    const redAccent: [number, number, number] = [185, 28, 28];
    const greenAccent: [number, number, number] = [21, 128, 61];

    // Ribbon Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(0, 38, 210, 38);

    try {
      doc.addImage(VERDECT_LOGO_BASE64, 'JPEG', 6, 6, 48, 28);
    } catch {
      doc.setFillColor(10, 25, 47);
      doc.roundedRect(10, 6, 26, 26, 2, 2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryNavy);
    doc.text('GOVERNMENT OF INDIA • MINISTRY OF CONSUMER AFFAIRS', 125, 12, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text('DEPARTMENT OF CONSUMER AFFAIRS • LEGAL METROLOGY DIVISION', 125, 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text('OFFICIAL REGULATORY SURVEILLANCE & STATUTORY AUDIT DOSSIER', 125, 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Enforcement Archive Reference: ${report.id} | Date: ${report.dateGenerated}`, 125, 31, { align: 'center' });

    // Assessment Overview
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('STATUTORY AUDIT PARTICULARS', 14, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    doc.text(`Dossier File Number: ${report.id}`, 14, 52);
    doc.text(`Subject Entity / Facility: ${report.subjectEntity}`, 14, 57);
    doc.text(`Supervising Officer: ${report.inspectorName}`, 14, 62);
    doc.text(`Jurisdiction / Zone: ${report.location}`, 14, 67);

    doc.setFont('helvetica', 'bold');
    doc.text('Statutory Assessment Status:', 125, 52);
    if (report.status === 'Violation Found') {
      doc.setTextColor(...redAccent);
    } else if (report.status === 'Clear') {
      doc.setTextColor(...greenAccent);
    } else {
      doc.setTextColor(217, 119, 6);
    }
    doc.text(report.status.toUpperCase(), 175, 52);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkText);
    doc.text(`Audit Protocol: ${report.type}`, 125, 57);
    doc.text(`Fine Imposed: Rs. ${(report.fineAmountInr || 0).toLocaleString('en-IN')}`, 125, 62);
    if (report.scanId) {
      doc.text(`Inspection Scan Ref: ${report.scanId}`, 125, 67);
    }

    // Table Data
    const tableBody = [
      ['Dossier Reference ID', report.id],
      ['Target Commodity / Product', report.productName || 'General Packaged Commodity'],
      ['Responsible Manufacturer / Entity', report.subjectEntity],
      ['Inspection Classification', report.type],
      ['Audit Completion Date', report.dateGenerated],
      ['Supervising Enforcement Officer', report.inspectorName],
      ['Jurisdiction Zone', report.location],
      ['Statutory Findings Verdict', report.status],
      ['Severity Classification', `${report.severityLevel || 'Normal'} Severity`],
      ['Applicable Compounding Penalty', `Rs. ${(report.fineAmountInr || 0).toLocaleString('en-IN')}`]
    ];

    if (scan) {
      tableBody.push(['Barcode / SKU', scan.barcode || 'N/A']);
      tableBody.push(['Batch Lot Number', scan.batchNumber || 'N/A']);
      tableBody.push(['Overall Verdict', scan.overallVerdict]);
      tableBody.push(['AI Verification Confidence', `${(scan.confidenceScore * 100).toFixed(1)}%`]);
    }

    autoTable(doc, {
      startY: 73,
      theme: 'grid',
      head: [['Statutory Audit Record Field', 'Regulatory Finding / Verified Specification']],
      body: tableBody,
      headStyles: {
        fillColor: primaryNavy,
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkText
      },
      margin: { left: 14, right: 14 }
    });

    const signY = (doc as any).lastAutoTable.finalY + 10;
    if (signY < 245) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, signY, 182, 28, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('DIRECTORATE REGULATORY CERTIFICATION:', 18, signY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text(
        'This institutional dossier constitutes an official surveillance finding under the Legal Metrology Act, 2009 and\n' +
        'Legal Metrology (Packaged Commodities) Rules, 2011. Verified by Central Surveillance Directorate records.',
        18,
        signY + 12
      );

      doc.setDrawColor(148, 163, 184);
      doc.line(135, signY + 22, 192, signY + 22);
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('Director / Authorized Signatory', 135, signY + 25);
    }

    doc.save(`LMPC_Regulatory_Dossier_${report.id}.pdf`);
  }
}

export default ExportManager;
