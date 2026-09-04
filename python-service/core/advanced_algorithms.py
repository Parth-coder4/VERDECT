"""
Advanced algorithms for Legal Metrology (Packaged Commodities) Rules 2011 compliance verification.
Includes:
1. Fuzzy statutory entity extraction with RapidFuzz.
2. GS1 prefix & Modulo-10 barcode checksum validation.
3. 2D spatial text clustering for reading order reconstruction.
4. Dynamic PDP area & reference font-height compliance calculation (Rule 7).
"""

from typing import Dict, List, Optional, Tuple
import numpy as np

try:
    from rapidfuzz import process, fuzz
except ImportError:
    process = None
    fuzz = None

try:
    from sklearn.cluster import DBSCAN
except ImportError:
    DBSCAN = None

# Comprehensive statutory alias dictionary for Indian commodity packages (Multilingual)
STATUTORY_ALIASES = {
    "mrp": [
        "mrp", "m.r.p", "maximum retail price", "max retail price",
        "incl. of all taxes", "inclusive of all taxes", "incl of taxes", "price",
        "अधिकतम खुदरा मूल्य", "अ.खू.मू", "एम.आर.पी", "एमआरपी", "कर सहित", "सभी करों सहित",
        "அதிகபட்ச சில்லறை விலை", "விலை", "அ.சி.வி", "அனைத்து வரிகளும் உட்பட",
        "గరిష్ట రిటైల్ ధర", "ధర", "అన్ని పన్నులతో సహా",
        "મહત્તમ છૂટક કિંમત", "કિંમત", "તમામ કર સહિત",
        "সর্বোচ্চ খুচরা মূল্য", "মূল্য", "সকল কর সহ"
    ],
    "net_qty": [
        "net weight", "net wt", "net quantity", "net qty", "net volume",
        "net contents", "weight", "volume", "quantity", "contents",
        "शुद्ध मात्रा", "शुद्ध वजन", "निव्वळ वजन", "मात्रा", "वजन",
        "நிகர எடை", "நிகர அளவு", "அளவு",
        "నికర పరిమాణం", "నికర బరువు", "పరిమాణం",
        "ચોખ્ખું વજન", "વજન",
        "মোট ওজন", "পরিমাণ"
    ],
    "mfg_date": [
        "mfg date", "mfg", "pkd", "pkd on", "packed on", "date of mfg",
        "date of manufacture", "manufacturing date", "manufactured on",
        "निर्माण तिथि", "उत्पादन दिनांक", "पैकिंग तिथि", "पैक्ड",
        "தயாரிப்பு தேதி", "உற்பத்தி தேதி", "తయారీ తేదీ", "ఉత్పత్తి తేదీ",
        "ઉત્પાદન તારીખ", "તૈયાર કર્યા તારીખ", "তৈরির তারিখ"
    ],
    "expiry_date": [
        "best before", "expiry date", "exp date", "use by", "expiry",
        "use before", "best before date", "exp",
        "उपयोग की अंतिम तिथि", "समाप्ति तिथि", "सर्वोत्तम उपयोग",
        "உபயோகிக்கும் காலம்", "காலாவதி தேதி", "గడువు తేదీ",
        "વાપરવાની છેલ્લી તારીખ", "মেয়াদ উত্তীর্ণের তারিখ"
    ],
    "manufacturer": [
        "mfd by", "manufactured by", "packed by", "pkd by", "marketed by",
        "mktd by", "imported by", "consumer care", "customer care",
        "निर्माता", "उत्पादक", "पैकर", "द्वारा निर्मित", "पंजीकृत कार्यालय",
        "தயாரிப்பாளர்", "விற்பனையாளர்", "உற்பத்தியாளர்", "తయారీదారు", "విక్రేత",
        "ઉત્પાદક", "વેચાણકર્તા", "প্রস্তুতকারক", "কোম্পানি"
    ],
    "country_of_origin": [
        "country of origin", "made in", "origin", "produced in", "manufactured in",
        "उत्पत्ति का देश", "भारत में निर्मित", "स्वदेशी", "தயாரிப்பு நாடு", "ఉత్పత్తి దేశం", "ઉત્પાદન દેશ"
    ]
}

# GS1 Country Code prefix mappings
GS1_PREFIXES = {
    "890": "India",
    "000": "USA/Canada", "001": "USA/Canada", "019": "USA/Canada",
    "400": "Germany", "440": "Germany",
    "450": "Japan", "490": "Japan",
    "500": "United Kingdom", "509": "United Kingdom",
    "690": "China", "691": "China", "692": "China", "693": "China", "694": "China", "695": "China",
    "779": "Argentina",
    "789": "Brazil",
    "880": "South Korea",
    "885": "Thailand",
    "888": "Singapore",
    "930": "Australia"
}


def extract_statutory_entities_fuzzy(ocr_texts: List[str], threshold: float = 75.0) -> Dict[str, List[Dict]]:
    """
    Fuzzy matches OCR text lines against statutory keywords to extract entities robustly.
    Returns categorized matches with scores.
    """
    results: Dict[str, List[Dict]] = {k: [] for k in STATUTORY_ALIASES}
    if not ocr_texts:
        return results

    for text in ocr_texts:
        if not text or len(text.strip()) < 2:
            continue
        text_lower = text.lower().strip()

        for category, aliases in STATUTORY_ALIASES.items():
            if fuzz is not None:
                match = process.extractOne(text_lower, aliases, scorer=fuzz.partial_ratio)
                if match:
                    alias_str, score, _ = match
                    if score >= threshold:
                        results[category].append({
                            "text": text,
                            "matched_alias": alias_str,
                            "confidence": round(float(score), 2)
                        })
            else:
                # Fallback to simple substring match if rapidfuzz is not installed
                for alias in aliases:
                    if alias in text_lower:
                        results[category].append({
                            "text": text,
                            "matched_alias": alias,
                            "confidence": 100.0
                        })
                        break

    return results


def sanitize_numeric_barcode(barcode: str) -> str:
    """Replaces OCR numeric homoglyphs with digits."""
    if not barcode:
        return ""
    homoglyphs = {
        'O': '0', 'o': '0', 'D': '0',
        'I': '1', 'l': '1', 'i': '1', '|': '1',
        'Z': '2', 'z': '2',
        'S': '5', 's': '5',
        'b': '6',
        'B': '8',
        'g': '9', 'q': '9'
    }
    clean = "".join(homoglyphs.get(c, c) for c in barcode.strip())
    return "".join(c for c in clean if c.isdigit())

def validate_ean13_barcode(barcode: str) -> Tuple[bool, str, str]:
    """
    Validates EAN-13 barcode using Modulo-10 checksum and identifies Country of Origin.
    Time Complexity: O(1)
    Returns: (is_valid, country_of_origin, status_message)
    """
    barcode = sanitize_numeric_barcode(barcode)
    if not barcode or not barcode.isdigit() or len(barcode) != 13:
        return False, "Unknown", f"Invalid format: Barcode '{barcode}' must be 13 digits."

    digits = [int(d) for d in barcode]
    sum_even_pos = sum(digits[1:12:2])  # 2nd, 4th, 6th, 8th, 10th, 12th digits
    sum_odd_pos = sum(digits[0:12:2])   # 1st, 3rd, 5th, 7th, 9th, 11th digits
    
    total = (sum_even_pos * 3) + sum_odd_pos
    checksum = (10 - (total % 10)) % 10
    
    is_valid = (checksum == digits[12])
    
    # GS1 Prefix matching
    prefix = barcode[:3]
    country = GS1_PREFIXES.get(prefix, "Unknown / Global")
    
    if not is_valid:
        return False, country, f"Checksum failed. Expected check digit {checksum}, got {digits[12]}"
        
    return True, country, f"Valid EAN-13 barcode from {country}."


def cluster_text_lines(bounding_boxes: List[Dict], eps_y: float = 15.0) -> List[List[Dict]]:
    """
    Groups scattered bounding boxes into cohesive horizontal text lines using spatial baseline clustering.
    bounding_boxes: List of dicts containing 'bbox': [x_min, y_min, x_max, y_max] and 'text'.
    Time Complexity: O(N log N)
    """
    if not bounding_boxes:
        return []

    # Sort boxes primarily by vertical midpoint
    def get_y_mid(b):
        bbox = b.get('bbox', [0, 0, 0, 0])
        return (bbox[1] + bbox[3]) / 2.0

    def get_x_min(b):
        return b.get('bbox', [0, 0, 0, 0])[0]

    sorted_boxes = sorted(bounding_boxes, key=get_y_mid)

    lines: List[List[Dict]] = []
    line_y_centers: List[float] = []

    for box in sorted_boxes:
        y_mid = get_y_mid(box)
        # Find if box belongs to existing line
        assigned = False
        for idx, center in enumerate(line_y_centers):
            if abs(y_mid - center) <= eps_y:
                lines[idx].append(box)
                # Update rolling center
                line_y_centers[idx] = sum(get_y_mid(b) for b in lines[idx]) / len(lines[idx])
                assigned = True
                break
        if not assigned:
            lines.append([box])
            line_y_centers.append(y_mid)

    # Sort items within each line from left to right (x_min)
    for line in lines:
        line.sort(key=get_x_min)

    # Sort lines from top to bottom
    lines.sort(key=lambda l: sum(get_y_mid(b) for b in l) / len(l))
    return lines


def calculate_pdp_and_font_compliance(
    package_dims_pixels: Tuple[float, float],
    reference_width_pixels: float,
    reference_width_mm: float,
    text_height_pixels: float
) -> Dict:
    """
    Dynamically calculates Principal Display Panel (PDP) area and verifies font height compliance (Rule 7).
    """
    ppm = reference_width_pixels / reference_width_mm if reference_width_mm > 0 else 1.0
    
    pkg_width_mm = package_dims_pixels[0] / ppm
    pkg_height_mm = package_dims_pixels[1] / ppm
    
    # PDP Area in cm^2 (H_mm * W_mm / 100)
    pdp_area_cm2 = (pkg_width_mm * pkg_height_mm) / 100.0
    actual_font_height_mm = text_height_pixels / ppm
    
    # Legal Metrology 2011 Rule 7 minimum numeral/letter height scale
    if pdp_area_cm2 <= 50:
        required_height_mm = 1.0
    elif pdp_area_cm2 <= 200:
        required_height_mm = 2.0
    elif pdp_area_cm2 <= 500:
        required_height_mm = 4.0
    else:
        required_height_mm = 6.0
        
    is_compliant = actual_font_height_mm >= required_height_mm
    
    return {
        "pdp_area_cm2": round(pdp_area_cm2, 2),
        "ppm": round(ppm, 4),
        "actual_font_height_mm": round(actual_font_height_mm, 2),
        "required_font_height_mm": required_height_mm,
        "rule_7_compliant": is_compliant
    }
