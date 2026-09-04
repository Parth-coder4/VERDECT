const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');
const TMP_FILE = path.join(__dirname, 'db.json.tmp');

const INITIAL_DB = {
  scans: [],
  violations: [],
  batches: [
    {
      id: 'prod_01',
      sku: '8901262010053',
      productName: 'Amul Butter 500g (Pasteurised)',
      brand: 'Amul',
      category: 'Dairy & Beverages',
      batchNumber: 'AMUL-B-8902',
      mfgDate: '2026-07-20',
      expiryDate: '2027-01-20',
      declaredMRP: 275.00,
      netQuantity: '500 g',
      manufacturer: 'Gujarat Cooperative Milk Marketing Federation Ltd. (Amul), Anand - 388001, Gujarat',
      fssaiLicense: '10012021000071',
      consumerCare: '1800-258-3333 / customercare@amul.coop',
      originCountry: 'India',
      cin: 'U01111GJ1973PLC002410',
      complianceHistory: { scansCount: 4, passedCount: 4, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-01-15'
    },
    {
      id: 'prod_02',
      sku: '8901233024827',
      productName: "Haldiram's Nagpur Bhujia Sev 400g",
      brand: "Haldiram's",
      category: 'Packaged Foods',
      batchNumber: 'HLD-2026-B88',
      mfgDate: '2026-07-15',
      expiryDate: '2027-01-15',
      declaredMRP: 110.00,
      netQuantity: '400 g',
      manufacturer: 'Haldiram Foods International Pvt. Ltd., Delhi-Jaipur Highway, Gurugram - 122001',
      fssaiLicense: '10013011000889',
      consumerCare: '0124-4066600 / care@haldirams.com',
      originCountry: 'India',
      complianceHistory: { scansCount: 2, passedCount: 0, violationsCount: 2 },
      riskScore: 'HIGH',
      registeredDate: '2026-02-10'
    },
    {
      id: 'prod_03',
      sku: '8901725131012',
      productName: 'India Gate Classic Basmati Rice 5kg Premium Bag',
      brand: 'India Gate',
      category: 'Grains & Pulses',
      batchNumber: 'RICE-2026-B12',
      mfgDate: '2026-06-01',
      expiryDate: '2028-06-01',
      declaredMRP: 650.00,
      netQuantity: '5 kg',
      manufacturer: 'KRBL Limited, 5190, Lahori Gate, Delhi - 110006',
      fssaiLicense: '10012011000199',
      consumerCare: '1800-102-7423 / customercare@krblindia.com',
      originCountry: 'India',
      cin: 'L01111DL1993PLC052845',
      complianceHistory: { scansCount: 3, passedCount: 3, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-02-20'
    },
    {
      id: 'prod_04',
      sku: '8901030383849',
      productName: 'Surf Excel Easy Wash Detergent Powder 1kg',
      brand: 'Surf Excel',
      category: 'Household Chemicals',
      batchNumber: 'HUL-SFX-9011',
      mfgDate: '2026-08-01',
      expiryDate: '2028-08-01',
      declaredMRP: 145.00,
      netQuantity: '1 kg',
      manufacturer: 'Hindustan Unilever Limited, Unilever House, B.D. Sawant Marg, Andheri (E), Mumbai - 400099',
      consumerCare: '1800-10-22-221 / lever.care@unilever.com',
      originCountry: 'India',
      cin: 'L15140MH1933PLC002030',
      complianceHistory: { scansCount: 2, passedCount: 2, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-03-01'
    },
    {
      id: 'prod_05',
      sku: '8901058852331',
      productName: 'Nestlé Maggi 2-Minute Masala Noodles 4-Pack (280g)',
      brand: 'Maggi',
      category: 'Packaged Foods',
      batchNumber: 'MAG-2026-044',
      mfgDate: '2026-06-15',
      expiryDate: '2027-03-15',
      declaredMRP: 60.00,
      netQuantity: '280 g',
      manufacturer: 'Nestlé India Limited, World Trade Centre, Barakhamba Lane, New Delhi - 110001',
      fssaiLicense: '10012011000168',
      consumerCare: '1800-103-1947 / wecare@in.nestle.com',
      originCountry: 'India',
      cin: 'L15202DL1959PLC003786',
      complianceHistory: { scansCount: 1, passedCount: 1, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-03-14'
    },
    {
      id: 'prod_06',
      sku: '8901207040183',
      productName: 'Cadbury Dairy Milk Silk Chocolate Bar 150g',
      brand: 'Cadbury',
      category: 'Packaged Foods',
      batchNumber: 'CAD-SLK-4102',
      mfgDate: '2026-05-18',
      expiryDate: '2027-05-18',
      declaredMRP: 180.00,
      netQuantity: '150 g',
      manufacturer: 'Mondelez India Foods Private Limited, Tower-3, Indiabulls Finance Centre, Mumbai - 400013',
      fssaiLicense: '10014022002711',
      consumerCare: '1800-22-7080 / suggestions@mdlz.com',
      originCountry: 'India',
      cin: 'U15200MH1948PTC006351',
      complianceHistory: { scansCount: 1, passedCount: 0, violationsCount: 1 },
      riskScore: 'MEDIUM',
      registeredDate: '2026-04-05'
    },
    {
      id: 'prod_07',
      sku: '8901396116035',
      productName: 'Dettol Antiseptic Disinfectant Liquid 550ml',
      brand: 'Dettol',
      category: 'Cosmetics & Personal Care',
      batchNumber: 'RB-DTL-550',
      mfgDate: '2026-05-15',
      expiryDate: '2029-05-15',
      declaredMRP: 215.00,
      netQuantity: '550 ml',
      manufacturer: 'Reckitt Benckiser (India) Pvt. Ltd., DLF Cyber Park, Udyog Vihar Phase 3, Gurugram - 122016',
      consumerCare: '1800-102-7245 / consumercare_india@reckitt.com',
      originCountry: 'India',
      complianceHistory: { scansCount: 2, passedCount: 2, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-04-20'
    },
    {
      id: 'prod_08',
      sku: '8906007280014',
      productName: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
      brand: 'Fortune',
      category: 'Edible Oils',
      batchNumber: 'AWL-SNO-1002',
      mfgDate: '2026-07-25',
      expiryDate: '2027-04-25',
      declaredMRP: 140.00,
      netQuantity: '1 L',
      manufacturer: 'Adani Wilmar Limited, Fortune House, Navrangpura, Ahmedabad - 380009, Gujarat',
      fssaiLicense: '10013021000561',
      consumerCare: '1800-233-9999 / care@adaniwilmar.in',
      originCountry: 'India',
      cin: 'L15146GJ1999PLC035320',
      complianceHistory: { scansCount: 0, passedCount: 0, violationsCount: 0 },
      riskScore: 'LOW',
      registeredDate: '2026-05-10'
    }
  ],
  rulebook: [
    {
      id: 'rule_6_1_a',
      code: 'RL-AUTH-001',
      title: 'Manufacturer / Packer / Importer Identity & Address',
      category: 'Mandatory Declarations',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 6(1)(a)',
      description: 'Every package shall bear the name and complete geographical address of the manufacturer, or packer or importer.',
      active: true,
      minThreshold: 100,
      unit: '% match',
      penaltySection: 'Section 36(1) - Up to Rs 25,000 fine for first offense'
    },
    {
      id: 'rule_6_1_e',
      code: 'RL-MAND-007',
      title: 'Maximum Retail Price (MRP) & Tax Inclusion',
      category: 'Pricing & Currency',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 6(1)(e)',
      description: 'The maximum retail price must be in Indian Rupees, accompanied by the mandatory phrase "incl. of all taxes".',
      active: true,
      minThreshold: 100,
      unit: 'exact phrase',
      penaltySection: 'Section 36(1) & Section 36(2)'
    },
    {
      id: 'rule_6_1_f',
      code: 'RL-PHYS-012',
      title: 'Net Quantity Statement & SI Metric Units',
      category: 'Physical Dimensions',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 6(1)(f) & Schedule II',
      description: 'The net quantity must be expressed in standard units of mass or measure (g, kg, ml, l, units).',
      active: true,
      minThreshold: 100,
      unit: 'SI Metric standard',
      penaltySection: 'Section 36(1)'
    },
    {
      id: 'rule_6_1_d',
      code: 'RL-MAND-003',
      title: 'Date of Manufacture / Packaging / Best Before',
      category: 'Mandatory Declarations',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 6(1)(d)',
      description: 'Month and Year of manufacture or pre-packing must be unambiguously declared.',
      active: true,
      minThreshold: 100,
      unit: 'MM/YYYY format',
      penaltySection: 'Section 36(1)'
    },
    {
      id: 'rule_6_1_h',
      code: 'RL-MAND-004',
      title: 'Consumer Care Helpline & Grievance Contact',
      category: 'Mandatory Declarations',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 6(1)(h)',
      description: 'Every package shall bear the telephone number and email address for consumer complaints.',
      active: true,
      minThreshold: 100,
      unit: 'tel & email check',
      penaltySection: 'Section 36(1)'
    },
    {
      id: 'rule_fssai_lic',
      code: 'RL-LIC-005',
      title: 'FSSAI 14-Digit License & Regulatory Mark',
      category: 'Licensing & Food Safety',
      legalAct: 'Food Safety and Standards Act, 2006',
      ruleClause: 'FSS (Packaging and Labelling) Regulations, 2011',
      description: '14-digit FSSAI License Number and logo must be declared on food commodities.',
      active: true,
      minThreshold: 100,
      unit: '14-digit license checksum',
      penaltySection: 'FSS Act Section 58'
    },
    {
      id: 'rule_ingredients',
      code: 'RL-MAND-002',
      title: 'Ingredients Declaration (Descending Order)',
      category: 'Food Safety & Composition',
      legalAct: 'Food Safety and Standards Act, 2006',
      ruleClause: 'FSS Regulations 2011, Regulation 2.2.2',
      description: 'List of ingredients in descending order of weight or volume at the time of manufacture.',
      active: true,
      minThreshold: 100,
      unit: 'descending order check',
      penaltySection: 'FSS Act Section 51'
    },
    {
      id: 'rule_nutrition',
      code: 'RL-NUTR-009',
      title: 'Nutritional Facts & Energy Values',
      category: 'Food Safety & Composition',
      legalAct: 'Food Safety and Standards Act, 2006',
      ruleClause: 'FSS Regulations 2011, Regulation 2.2.2(3)',
      description: 'Nutritional information per 100g or 100ml or per serve must be declared.',
      active: true,
      minThreshold: 100,
      unit: 'tabular declaration',
      penaltySection: 'FSS Act Section 51'
    },
    {
      id: 'rule_7_font',
      code: 'RL-GEOM-008',
      title: 'Minimum Font Height & Area Ratio',
      category: 'Geometric Specifications',
      legalAct: 'Legal Metrology Act, 2009',
      ruleClause: 'Packaged Commodities Rules 2011, Rule 7, Table I & II',
      description: 'Specifies the minimum height of numerals and letters depending on the total area of the Principal Display Panel (PDP).',
      active: true,
      minThreshold: 2.0,
      unit: 'mm height',
      penaltySection: 'Section 36(1)'
    }
  ],

  inspectors: [
    {
      id: 'insp_01',
      name: 'Inspector Vikram Malhotra',
      initials: 'VM',
      idBadge: '9402-INSP',
      totalInspections: 142,
      reportsGenerated: 38,
      currentStatus: 'Active - Field',
      statusType: 'success',
      email: 'vikram.malhotra@metrology.gov.in',
      phone: '+91 98102 34567',
      jurisdiction: 'Northern Metrology Directorate - Sector 4',
      avatarBgColor: 'bg-sky-500',
      lastActiveTime: '12 mins ago',
      accuracyRate: 98.6
    },
    {
      id: 'insp_02',
      name: 'Officer Rajesh Sharma',
      initials: 'RS',
      idBadge: 'LMPC-8841',
      totalInspections: 96,
      reportsGenerated: 21,
      currentStatus: 'Active - Field',
      statusType: 'success',
      email: 'rajesh.sharma@metrology.gov.in',
      phone: '+91 98220 98765',
      jurisdiction: 'Western Metrology Zone - Sector 2',
      avatarBgColor: 'bg-emerald-600',
      lastActiveTime: '45 mins ago',
      accuracyRate: 99.1
    },
    {
      id: 'insp_03',
      name: 'Inspector Priya Nair',
      initials: 'PN',
      idBadge: 'LMPC-4920',
      totalInspections: 210,
      reportsGenerated: 64,
      currentStatus: 'Active - Field',
      statusType: 'success',
      email: 'priya.nair@metrology.gov.in',
      phone: '+91 98450 11223',
      jurisdiction: 'Southern Metrology Zone - Sector 1',
      avatarBgColor: 'bg-indigo-600',
      lastActiveTime: '2 hours ago',
      accuracyRate: 99.4
    }
  ],
  auditLogs: [
    {
      id: 'LOG-AUTH-001',
      timestamp: new Date().toISOString(),
      userId: 'ADMIN-DIR-01',
      userName: 'Director Rajesh Verma',
      action: 'USER_LOGIN',
      targetResource: 'SESSION-ADMINISTRATOR',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      category: 'AUTH',
      details: 'ADMINISTRATOR authenticated via Agency Badge ADMIN-DIR-01.'
    },
    {
      id: 'LOG-AUTH-002',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      userId: '9402-INSP',
      userName: 'Inspector Vikram Malhotra',
      action: 'USER_LOGIN',
      targetResource: 'SESSION-INSPECTOR',
      ipAddress: '192.168.1.45',
      status: 'SUCCESS',
      category: 'AUTH',
      details: 'INSPECTOR authenticated via Agency Badge 9402-INSP.'
    },
    {
      id: 'LOG-SCAN-003',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      userId: '9402-INSP',
      userName: 'Inspector Vikram Malhotra',
      action: 'COMMODITY_SCAN_EVALUATED',
      targetResource: 'SCAN-AMUL-BUTTER-500G',
      ipAddress: '192.168.1.45',
      status: 'SUCCESS',
      category: 'INSPECTION',
      details: 'Completed OCR & OpenCV analysis for Amul Butter 500g (Compliant).'
    },
    {
      id: 'LOG-RULE-004',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      userId: 'ADMIN-DIR-01',
      userName: 'Director Rajesh Verma',
      action: 'STATUTORY_RULE_VERIFIED',
      targetResource: 'RULE-RL-MAND-007',
      ipAddress: '127.0.0.1',
      status: 'SUCCESS',
      category: 'RULE_CHANGE',
      details: 'Verified Maximum Retail Price (MRP) & Tax Inclusion rule parameters under Rule 6(1)(e).'
    }
  ],
  reports: [
    {
      id: 'REP-2026-9041',
      subjectEntity: 'Tata Consumer Products Central Distribution Hub',
      entityInitials: 'TC',
      inspectorName: 'Inspector Vikram Malhotra',
      type: 'Surprise Audit',
      dateGenerated: 'Aug 28, 2026',
      status: 'Violation Found',
      statusType: 'danger',
      location: 'Northern Metrology Zone - Sector 4',
      severityLevel: 'High',
      fineAmountInr: 25000,
      productName: "Haldiram's Masala Chips 250g"
    }
  ],
  users: [
    {
      id: 'ADMIN-DIR-01',
      username: 'ADMIN-DIR-01',
      passwordHash: 'c6e289f81d19842a:36f3a640eef1e04164cc76b361c9bc1aa0c4dbec2555ffe18ff022f6879074db626bf822bfb4bf533d71f736177eac2b062b8b0e2368bbac44ff06cc71b6c02d', // demo-password
      name: 'Director Rajesh Verma',
      badgeNumber: 'ADMIN-DIR-01',
      role: 'ADMINISTRATOR',
      jurisdiction: 'Central Metrology Headquarters, New Delhi',
      email: 'rajesh.verma@metrology.gov.in',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      inspectionsCompleted: 58,
      accuracyRate: 99.8,
      activeStatus: true
    },
    {
      id: '9402-INSP',
      username: '9402-INSP',
      passwordHash: 'c6e289f81d19842a:36f3a640eef1e04164cc76b361c9bc1aa0c4dbec2555ffe18ff022f6879074db626bf822bfb4bf533d71f736177eac2b062b8b0e2368bbac44ff06cc71b6c02d', // demo-password
      name: 'Inspector Vikram Malhotra',
      badgeNumber: '9402-INSP',
      role: 'INSPECTOR',
      jurisdiction: 'Northern Metrology Zone - Sector 4',
      email: 'vikram.malhotra@metrology.gov.in',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      inspectionsCompleted: 342,
      accuracyRate: 99.2,
      activeStatus: true
    },
    {
      id: 'LMPC-8472',
      username: 'LMPC-8472',
      passwordHash: 'c6e289f81d19842a:36f3a640eef1e04164cc76b361c9bc1aa0c4dbec2555ffe18ff022f6879074db626bf822bfb4bf533d71f736177eac2b062b8b0e2368bbac44ff06cc71b6c02d', // demo-password
      name: 'Inspector Elena Rodriguez',
      badgeNumber: 'LMPC-8472',
      role: 'INSPECTOR',
      jurisdiction: 'Northern Metrology Zone - Sector 4',
      email: 'elena.rodriguez@metrology.gov.in',
      avatarUrl: '',
      inspectionsCompleted: 412,
      accuracyRate: 99.6,
      activeStatus: true
    }
  ]
};


function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing initial db.json:', e);
      return INITIAL_DB;
    }
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const existingUsers = Array.isArray(parsed.users) ? parsed.users : [];
    const mergedUsers = [...existingUsers];
    for (const initUser of INITIAL_DB.users) {
      const idx = mergedUsers.findIndex((u) => u.badgeNumber === initUser.badgeNumber);
      if (idx === -1) {
        mergedUsers.push(initUser);
      } else {
        // Ensure valid hash
        mergedUsers[idx].passwordHash = initUser.passwordHash;
      }
    }

    const existingRulebook = Array.isArray(parsed.rulebook) ? parsed.rulebook : [];
    const mergedRulebook = [...existingRulebook];
    for (const initRule of INITIAL_DB.rulebook) {
      const idx = mergedRulebook.findIndex((r) => r.code === initRule.code);
      if (idx === -1) {
        mergedRulebook.push(initRule);
      }
    }

    return {
      scans: parsed.scans || [],
      violations: parsed.violations || [],
      batches: parsed.batches || INITIAL_DB.batches,
      rulebook: mergedRulebook,
      inspectors: parsed.inspectors || INITIAL_DB.inspectors,
      auditLogs: parsed.auditLogs || INITIAL_DB.auditLogs,
      reports: parsed.reports || INITIAL_DB.reports,
      users: mergedUsers
    };


  } catch (err) {
    console.error('Error reading db.json, returning initial store:', err);
    return INITIAL_DB;
  }
}


function saveDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

module.exports = {
  getDb,
  saveDb,
  INITIAL_DB
};
