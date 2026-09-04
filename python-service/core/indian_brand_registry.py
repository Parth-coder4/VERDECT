"""
Master Indian Brand & Corporate Forensic Registry Module
Authoritative repository of 60+ major Indian FMCG, Pharma, Personal Care, Dairy,
Agrochemical, Electrical, and Automotive corporate entities.
Provides:
1. Bidirectional multi-key corporate lookups (Brand, GS1 Prefix, CIN, FSSAI License).
2. Deep statutory syntactic & cryptographic verification for Indian statutory IDs:
   - 21-character MCA Corporate Identification Number (CIN)
   - 14-digit FSSAI Food Safety & Standards License
   - GS1 India GTIN-8/12/13/14 Modulo-10 Checksum & National Country Code (890)
3. Verified known copycat & counterfeit spoof catalog.
4. Pre-indexed fast lookup structures for sub-millisecond query latency.
"""

import os
import json
import re
import logging
from typing import Dict, List, Any, Optional, Tuple, Set

logger = logging.getLogger(__name__)

# Pre-compiled high-performance regular expressions
_RE_CIN_SYNTAX = re.compile(r'^([LU])([0-9]{5})([A-Z]{2})((?:18|19|20)[0-9]{2})([A-Z]{3})([0-9]{6})$')
_RE_NON_DIGIT = re.compile(r'[^0-9]')
_RE_NON_ALPHANUM = re.compile(r'[^A-Za-z0-9]')
_RE_NORM_KEY = re.compile(r'[^a-z0-9]')
_RE_NON_ALPHA = re.compile(r'[^A-Z]')
_RE_TOKEN_SPLIT = re.compile(r'[a-zA-Z0-9]+')

# State Census / MCA State Code Mapping
STATE_CENSUS_CODES = {
    "00": "Central Licensing Authority / All India (FSSAI HQ)",
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
    "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
    "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
    "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh (Legacy)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar Islands",
    "36": "Telangana", "37": "Andhra Pradesh"
}

STATE_ALPHA_CODES = {
    "JK", "HP", "PB", "CH", "UT", "UR", "HR", "DL", "RJ", "UP", "BR", "SK", "AR",
    "NL", "MN", "MZ", "TR", "ML", "AS", "WB", "JH", "OR", "OD", "CT", "CG", "MP",
    "GJ", "DD", "DN", "MH", "KA", "GA", "LD", "KL", "TN", "PY", "AN", "TG", "TS", "AP"
}

FSSAI_BUSINESS_TYPES = {
    "1": "Central License (Large Scale / Importer / EOU / High Turnover >20Cr)",
    "2": "State License (Medium Scale Manufacturer / Wholesaler / Distributor)",
    "3": "Basic Registration (Petty Food Business / Small Scale Retailer)"
}

MCA_ENTITY_TYPES = {
    "PLC": "Public Limited Company",
    "PTC": "Private Limited Company",
    "FTC": "Subsidiary of a Foreign Company",
    "GOI": "Union Government Company",
    "SGC": "State Government Company",
    "GAP": "General Association Public",
    "GAT": "General Association Private",
    "NPL": "Not For Profit / Section 8 License Company",
    "ULL": "Public Unlimited Liability Company",
    "ULT": "Private Unlimited Liability Company"
}

# Master in-memory registry state
_REGISTRY_DATA: Dict[str, Any] = {}
_COMPANIES_BY_ID: Dict[str, Dict[str, Any]] = {}
_COMPANIES_BY_BRAND: Dict[str, Dict[str, Any]] = {}
_COMPANIES_BY_GS1: Dict[str, Dict[str, Any]] = {}
_COMPANIES_BY_CIN: Dict[str, Dict[str, Any]] = {}
_COMPANIES_BY_FSSAI: Dict[str, Dict[str, Any]] = {}
_KNOWN_BRANDS_LIST: List[str] = []
_KNOWN_BRANDS_LOWER: List[str] = []
_BRAND_TOKEN_INDEX: Dict[str, List[Dict[str, Any]]] = {}
_SPOOF_CATALOG: Dict[str, Dict[str, Any]] = {}
_PANTONE_STANDARDS: List[Dict[str, Any]] = []


def _normalize_key(text: str) -> str:
    """Normalize string key by lowering and stripping non-alphanumeric chars."""
    if not text:
        return ""
    return _RE_NORM_KEY.sub('', text.lower())


def load_brand_registry() -> bool:
    """Loads and compiles indices from the master indian_brand_registry.json."""
    global _REGISTRY_DATA, _COMPANIES_BY_ID, _COMPANIES_BY_BRAND, _COMPANIES_BY_GS1
    global _COMPANIES_BY_CIN, _COMPANIES_BY_FSSAI, _KNOWN_BRANDS_LIST, _KNOWN_BRANDS_LOWER
    global _BRAND_TOKEN_INDEX, _SPOOF_CATALOG, _PANTONE_STANDARDS

    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "indian_brand_registry.json")
    if not os.path.exists(json_path):
        logger.warning(f"indian_brand_registry.json not found at {json_path}")
        return False

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            _REGISTRY_DATA = data
    except Exception as e:
        logger.error(f"Failed to load indian_brand_registry.json: {e}")
        return False

    _COMPANIES_BY_ID.clear()
    _COMPANIES_BY_BRAND.clear()
    _COMPANIES_BY_GS1.clear()
    _COMPANIES_BY_CIN.clear()
    _COMPANIES_BY_FSSAI.clear()
    _KNOWN_BRANDS_LIST.clear()
    _KNOWN_BRANDS_LOWER.clear()
    _BRAND_TOKEN_INDEX.clear()
    _SPOOF_CATALOG.clear()
    _PANTONE_STANDARDS = data.get("pantoneStandards", [])

    companies = data.get("companies", [])
    for comp in companies:
        comp_id = comp.get("id")
        _COMPANIES_BY_ID[comp_id] = comp

        # Index by CIN
        cin = comp.get("cin", "").strip()
        if cin and len(cin) >= 15:
            _COMPANIES_BY_CIN[cin.upper()] = comp

        # Index by GS1 Prefix
        gs1 = comp.get("gs1Prefix", "").strip()
        if gs1:
            _COMPANIES_BY_GS1[gs1] = comp

        # Index by FSSAI License
        fssai = comp.get("fssaiLicense", "").strip()
        if fssai and fssai.isdigit() and len(fssai) == 14:
            _COMPANIES_BY_FSSAI[fssai] = comp

        # Index company name
        comp_name = comp.get("name", "")
        _COMPANIES_BY_BRAND[_normalize_key(comp_name)] = comp
        _KNOWN_BRANDS_LIST.append(comp_name)

        # Index brand tokens for corporate name
        for tok in _RE_TOKEN_SPLIT.findall(comp_name.lower()):
            if len(tok) >= 3 and tok not in ("ltd", "limited", "pvt", "private", "india", "foods", "industries", "products"):
                _BRAND_TOKEN_INDEX.setdefault(tok, []).append(comp)

        # Index brands
        for b in comp.get("brands", []):
            b_clean = b.strip()
            if b_clean:
                _COMPANIES_BY_BRAND[_normalize_key(b_clean)] = comp
                _KNOWN_BRANDS_LIST.append(b_clean)
                for tok in _RE_TOKEN_SPLIT.findall(b_clean.lower()):
                    if len(tok) >= 3:
                        _BRAND_TOKEN_INDEX.setdefault(tok, []).append(comp)

        # Index spoof variants (ensuring no collision with genuine registered brands)
        for sv in comp.get("spoofVariants", []):
            spoof_text = sv.get("spoof", "").strip()
            if spoof_text:
                norm_sp = _normalize_key(spoof_text)
                if norm_sp not in _COMPANIES_BY_BRAND:
                    _SPOOF_CATALOG[norm_sp] = {
                        "spoof": spoof_text,
                        "target": sv.get("target"),
                        "type": sv.get("type"),
                        "risk": sv.get("risk", "HIGH"),
                        "company": comp
                    }

    # Deduplicate and sort brands by length descending
    _KNOWN_BRANDS_LIST = sorted(list(set(_KNOWN_BRANDS_LIST)), key=lambda x: len(x), reverse=True)
    _KNOWN_BRANDS_LOWER = [b.lower() for b in _KNOWN_BRANDS_LIST]

    logger.info(f"Loaded {len(_COMPANIES_BY_ID)} Indian corporate entities and {len(_KNOWN_BRANDS_LIST)} authentic brand signatures.")
    return True


# Initialize registry immediately on import
load_brand_registry()


# ==========================================
# FORENSIC STATUTORY VERIFICATION ENGINES
# ==========================================

def validate_gs1_checksum(code: str) -> bool:
    """
    Validates GS1 standard Modulo-10 Check Digit for GTIN-8, GTIN-12, GTIN-13, and GTIN-14.
    Algorithm:
    Starting from the digit immediately left of check digit moving leftwards,
    alternate weighting * 3 and * 1. Sum mod 10 subtracted from 10 equals check digit.
    """
    if not code or not code.isdigit() or len(code) not in (8, 12, 13, 14):
        return False
    digits = [int(d) for d in code]
    check_digit = digits[-1]
    payload = digits[:-1]

    total = 0
    multiplier = 3
    for d in reversed(payload):
        total += d * multiplier
        multiplier = 1 if multiplier == 3 else 3
    calc = (10 - (total % 10)) % 10
    return calc == check_digit


def validate_gs1_barcode(barcode: str) -> Dict[str, Any]:
    """
    Performs comprehensive GS1 forensic verification on barcodes:
    1. Length & format validation (GTIN-8, GTIN-12, GTIN-13, GTIN-14).
    2. Modulo-10 cryptographic checksum check.
    3. India country prefix (890) verification.
    4. National company prefix lookup in registered database.
    """
    if not barcode:
        return {
            "valid": False,
            "format": "NONE",
            "isValidChecksum": False,
            "isIndiaPrefix890": False,
            "gs1Country": "Unknown",
            "companyMatch": None,
            "notes": "No barcode payload provided for GS1 verification."
        }

    clean_code = _RE_NON_DIGIT.sub('', str(barcode).strip())
    length = len(clean_code)
    format_map = {8: "GTIN-8 (EAN-8)", 12: "GTIN-12 (UPC-A)", 13: "GTIN-13 (EAN-13)", 14: "GTIN-14 (ITF-14)"}
    format_name = format_map.get(length, f"Custom Barcode ({length} digits)")

    if length not in (8, 12, 13, 14):
        return {
            "valid": False,
            "barcode": clean_code,
            "format": format_name,
            "isValidChecksum": False,
            "isIndiaPrefix890": False,
            "gs1Country": "Non-Standard",
            "companyMatch": None,
            "notes": f"Invalid barcode length {length}. Standard GS1 GTIN requires 8, 12, 13, or 14 digits."
        }

    is_checksum_valid = validate_gs1_checksum(clean_code)
    is_india = clean_code.startswith("890")
    country_desc = "GS1 India (National Legal Metrology Compliant)" if is_india else "International GS1 Jurisdiction"

    # Identify company prefix
    matched_company = None
    if is_india and length >= 13:
        prefix_7 = clean_code[:7]
        prefix_8 = clean_code[:8]
        if prefix_7 in _COMPANIES_BY_GS1:
            matched_company = _COMPANIES_BY_GS1[prefix_7]
        elif prefix_8 in _COMPANIES_BY_GS1:
            matched_company = _COMPANIES_BY_GS1[prefix_8]

    notes = []
    if is_checksum_valid:
        notes.append(f"Modulo-10 check digit verification PASSED for {format_name}.")
    else:
        notes.append(f"CRITICAL: Checksum verification FAILED for {format_name}. Barcode may be mathematically forged.")

    if is_india:
        notes.append("GS1 India National Prefix '890' verified.")
    else:
        notes.append(f"Non-India GS1 prefix ({clean_code[:3]}). Imported or foreign registered commodity.")

    if matched_company:
        notes.append(f"Mapped to authentic manufacturer: {matched_company['name']}.")

    return {
        "valid": is_checksum_valid,
        "barcode": clean_code,
        "format": format_name,
        "isValidChecksum": is_checksum_valid,
        "isIndiaPrefix890": is_india,
        "gs1Country": country_desc,
        "companyMatch": {
            "id": matched_company["id"],
            "name": matched_company["name"],
            "cin": matched_company.get("cin"),
            "sector": matched_company.get("sector")
        } if matched_company else None,
        "notes": " ".join(notes)
    }


def validate_fssai_syntax(fssai_str: str) -> Dict[str, Any]:
    """
    Validates Indian 14-digit FSSAI License / Registration Number syntax:
    Format: [1-3] [State Code: 2 digits] [Year: 2 digits] [Registrar: 3 digits] [Serial: 6 digits]
    """
    if not fssai_str:
        return {"valid": False, "reason": "No FSSAI number provided."}

    clean_fssai = _RE_NON_DIGIT.sub('', str(fssai_str).strip())
    if len(clean_fssai) != 14:
        return {
            "valid": False,
            "fssaiNumber": clean_fssai,
            "reason": f"FSSAI license must contain exactly 14 digits (found {len(clean_fssai)} digits)."
        }

    kind_digit = clean_fssai[0]
    if kind_digit not in ("1", "2", "3"):
        return {
            "valid": False,
            "fssaiNumber": clean_fssai,
            "reason": f"Invalid FSSAI leading business classification digit '{kind_digit}'. Must start with 1, 2, or 3."
        }

    state_code = clean_fssai[1:3]
    state_name = STATE_CENSUS_CODES.get(state_code)
    if not state_name:
        return {
            "valid": False,
            "fssaiNumber": clean_fssai,
            "reason": f"Invalid FSSAI state census code '{state_code}'. Must be between 01 and 37."
        }

    year_str = clean_fssai[3:5]
    enrollment_year = 2000 + int(year_str) if int(year_str) <= 40 else 1900 + int(year_str)

    registrar_code = clean_fssai[5:8]
    serial_no = clean_fssai[8:14]

    business_type = FSSAI_BUSINESS_TYPES.get(kind_digit, "Food Business License")

    # Check if matches known corporate registry
    matched_company = _COMPANIES_BY_FSSAI.get(clean_fssai)

    return {
        "valid": True,
        "fssaiNumber": clean_fssai,
        "licenseType": business_type,
        "stateCode": state_code,
        "stateName": state_name,
        "enrollmentYear": enrollment_year,
        "registrarCode": registrar_code,
        "serialNumber": serial_no,
        "companyMatch": {
            "id": matched_company["id"],
            "name": matched_company["name"]
        } if matched_company else None,
        "notes": f"Valid 14-digit FSSAI {business_type} issued in {state_name} (Year: {enrollment_year})."
    }


def validate_cin_syntax(cin_str: str) -> Dict[str, Any]:
    """
    Validates Ministry of Corporate Affairs (MCA) 21-character Corporate Identification Number (CIN):
    Syntax: [L/U] [5 digits NIC] [2 char State] [4 digit Year] [3 char Entity Type] [6 digits Serial]
    Example: L15140MH1933PLC002030 (HUL)
    """
    if not cin_str:
        return {"valid": False, "reason": "No CIN string provided."}

    clean_cin = _RE_NON_ALPHANUM.sub('', str(cin_str).strip()).upper()
    if len(clean_cin) != 21:
        return {
            "valid": False,
            "cin": clean_cin,
            "reason": f"CIN must contain exactly 21 alphanumeric characters (found {len(clean_cin)})."
        }

    match = _RE_CIN_SYNTAX.match(clean_cin)
    if not match:
        return {
            "valid": False,
            "cin": clean_cin,
            "reason": "CIN violates MCA standard structure: [L/U] + 5-digit NIC + 2-letter State + 4-digit Year + 3-letter Type + 6-digit Sequence."
        }

    listing_code, nic_code, state_code, year_code, entity_type, serial_code = match.groups()

    listing_status = "Listed Company (Public)" if listing_code == "L" else "Unlisted Company"
    entity_desc = MCA_ENTITY_TYPES.get(entity_type, f"Special Entity ({entity_type})")

    if state_code not in STATE_ALPHA_CODES:
        return {
            "valid": False,
            "cin": clean_cin,
            "reason": f"Unrecognized MCA state code '{state_code}' in CIN."
        }

    matched_company = _COMPANIES_BY_CIN.get(clean_cin)

    return {
        "valid": True,
        "cin": clean_cin,
        "listingStatus": listing_status,
        "nicCode": nic_code,
        "stateCode": state_code,
        "incorporationYear": int(year_code),
        "entityType": entity_desc,
        "serialNumber": serial_code,
        "companyMatch": {
            "id": matched_company["id"],
            "name": matched_company["name"]
        } if matched_company else None,
        "notes": f"Valid 21-character MCA CIN: {listing_status} incorporated in {year_code} ({state_code}) as {entity_desc}."
    }


def find_company_by_brand(brand_name: str) -> Optional[Dict[str, Any]]:
    """Look up authentic corporate entity by brand or product trade name."""
    if not brand_name:
        return None
    key = _normalize_key(brand_name)
    if key in _COMPANIES_BY_BRAND:
        return _COMPANIES_BY_BRAND[key]

    # Token match for multi-word brands
    tokens = _RE_TOKEN_SPLIT.findall(brand_name.lower())
    for tok in tokens:
        if len(tok) >= 3 and tok in _BRAND_TOKEN_INDEX:
            return _BRAND_TOKEN_INDEX[tok][0]

    return None


def find_company_by_gs1(barcode: str) -> Optional[Dict[str, Any]]:
    """Look up corporate entity by GS1 India barcode prefix."""
    clean = _RE_NON_DIGIT.sub('', str(barcode).strip())
    if clean.startswith("890"):
        p7 = clean[:7]
        p8 = clean[:8]
        if p7 in _COMPANIES_BY_GS1:
            return _COMPANIES_BY_GS1[p7]
        if p8 in _COMPANIES_BY_GS1:
            return _COMPANIES_BY_GS1[p8]
    return None


def find_company_by_cin(cin: str) -> Optional[Dict[str, Any]]:
    """Look up corporate entity by MCA CIN."""
    clean = _RE_NON_ALPHANUM.sub('', str(cin).strip()).upper()
    return _COMPANIES_BY_CIN.get(clean)


def find_company_by_fssai(fssai: str) -> Optional[Dict[str, Any]]:
    """Look up corporate entity by 14-digit FSSAI license."""
    clean = _RE_NON_DIGIT.sub('', str(fssai).strip())
    return _COMPANIES_BY_FSSAI.get(clean)


def get_all_known_brands() -> List[str]:
    """Returns list of all registered authentic brands and parent companies."""
    return list(_KNOWN_BRANDS_LIST)


def get_all_known_brands_lower() -> List[str]:
    """Returns list of lowercase authentic brands for high-speed RapidFuzz lookup."""
    return list(_KNOWN_BRANDS_LOWER)


def get_all_companies() -> List[Dict[str, Any]]:
    """Returns all master corporate entities."""
    return list(_COMPANIES_BY_ID.values())


def get_spoof_catalog() -> Dict[str, Dict[str, Any]]:
    """Returns catalog of known registered brand spoofing variations."""
    return _SPOOF_CATALOG


def get_pantone_standards() -> List[Dict[str, Any]]:
    """Returns master Pantone CIELAB standards."""
    return list(_PANTONE_STANDARDS)
