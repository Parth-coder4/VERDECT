"""
Barcode Forensics & GS1 Standard Verification Module
Supports zxing-cpp and pyzbar engines, Modulo-10 checksum calculation, and GS1 country prefix verification.
"""

import cv2
import numpy as np
import logging

try:
    import zxingcpp
    ZXING_AVAILABLE = True
except Exception:
    zxingcpp = None
    ZXING_AVAILABLE = False

try:
    from pyzbar import pyzbar
    PYZBAR_AVAILABLE = True
except Exception:
    pyzbar = None
    PYZBAR_AVAILABLE = False

GS1_COUNTRY_PREFIXES = {
    "890": "GS1 India (National Legal Metrology Compliant)",
    "000": "GS1 US / North America",
    "001": "GS1 US / North America",
    "002": "GS1 US / North America",
    "003": "GS1 US / North America",
    "004": "GS1 US / North America",
    "005": "GS1 US / North America",
    "006": "GS1 US / North America",
    "007": "GS1 US / North America",
    "008": "GS1 US / North America",
    "009": "GS1 US / North America",
    "500": "GS1 UK",
    "501": "GS1 UK",
    "502": "GS1 UK",
    "503": "GS1 UK",
    "504": "GS1 UK",
    "505": "GS1 UK",
    "506": "GS1 UK",
    "509": "GS1 UK",
    "400": "GS1 Germany",
    "690": "GS1 China",
    "691": "GS1 China",
    "692": "GS1 China",
    "693": "GS1 China",
    "694": "GS1 China",
    "695": "GS1 China"
}

def _sanitize_digits(code: str) -> str:
    """Replaces common character homoglyphs in scanned barcode strings."""
    if not code:
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
    clean = "".join(homoglyphs.get(c, c) for c in code.strip())
    # Keep only digits
    return "".join(c for c in clean if c.isdigit())

def validate_ean13_checksum(code: str) -> bool:
    """
    Validates standard EAN-13 Modulo 10 Checksum with homoglyph sanitization:
    Step 1: Sum of digits at odd positions (index 0, 2, 4, 6, 8, 10) * 1
    Step 2: Sum of digits at even positions (index 1, 3, 5, 7, 9, 11) * 3
    Step 3: Total modulo 10 subtracted from 10 equals 13th check digit.
    """
    code = _sanitize_digits(code)
    if len(code) != 13 or not code.isdigit():
        return False
    digits = [int(d) for d in code]
    odd_sum = sum(digits[0:12:2])
    even_sum = sum(digits[1:12:2]) * 3
    checksum = (10 - ((odd_sum + even_sum) % 10)) % 10
    return checksum == digits[12]

def validate_upca_checksum(code: str) -> bool:
    """Validates UPC-A (12-digit) checksum with homoglyph sanitization"""
    code = _sanitize_digits(code)
    if len(code) != 12 or not code.isdigit():
        return False
    digits = [int(d) for d in code]
    odd_sum = sum(digits[0:11:2]) * 3
    even_sum = sum(digits[1:11:2])
    checksum = (10 - ((odd_sum + even_sum) % 10)) % 10
    return checksum == digits[11]

def analyze_barcode(img: np.ndarray) -> dict:
    """
    Locates and decodes barcode symbols using zxing-cpp and pyzbar with fallback image enhancements.
    Returns forensic scoring, decoded payload, bounding box, format, and GS1 registry lookup.
    """
    h, w = img.shape[:2]
    decoded_codes = []

    # 1. Try zxing-cpp (Fast C++ multi-format decoder)
    if ZXING_AVAILABLE:
        try:
            results = zxingcpp.read_barcodes(img)
            for r in results:
                if r.text:
                    pos = r.position
                    pts = [(int(p.x), int(p.y)) for p in [pos.top_left, pos.top_right, pos.bottom_right, pos.bottom_left]]
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    decoded_codes.append({
                        "text": r.text.strip(),
                        "format": str(r.format).replace("BarcodeFormat.", ""),
                        "bbox": [min(xs), min(ys), max(xs), max(ys)],
                        "engine": "zxing-cpp"
                    })
        except Exception as e:
            logging.debug(f"zxing-cpp decode note: {e}")

    # 2. Fallback / supplementary search with pyzbar
    if not decoded_codes and PYZBAR_AVAILABLE:
        try:
            py_results = pyzbar.decode(img)
            for r in py_results:
                text = r.data.decode('utf-8', errors='ignore').strip()
                if text:
                    rect = r.rect
                    decoded_codes.append({
                        "text": text,
                        "format": str(r.type),
                        "bbox": [rect.left, rect.top, rect.left + rect.width, rect.top + rect.height],
                        "engine": "pyzbar"
                    })
        except Exception as e:
            logging.debug(f"pyzbar decode note: {e}")

    # 3. If nothing found, try on high-contrast thresholded image crop
    if not decoded_codes and ZXING_AVAILABLE:
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enhanced = clahe.apply(gray)
            results = zxingcpp.read_barcodes(enhanced)
            for r in results:
                if r.text:
                    pos = r.position
                    pts = [(int(p.x), int(p.y)) for p in [pos.top_left, pos.top_right, pos.bottom_right, pos.bottom_left]]
                    xs = [p[0] for p in pts]
                    ys = [p[1] for p in pts]
                    decoded_codes.append({
                        "text": r.text.strip(),
                        "format": str(r.format).replace("BarcodeFormat.", ""),
                        "bbox": [min(xs), min(ys), max(xs), max(ys)],
                        "engine": "zxing-cpp-enhanced"
                    })
        except Exception:
            pass

    if not decoded_codes:
        return {
            "detected": False,
            "barcode": "",
            "format": "NONE",
            "score": 30,
            "isValidChecksum": False,
            "gs1Country": "Unknown",
            "bbox": [0, 0, 0, 0],
            "normBox": [0, 0, 0, 0],
            "notes": "No standard 1D/2D optical barcode detected on visible packaging panel."
        }

    primary = decoded_codes[0]
    code = primary["text"]
    format_name = primary["format"]
    bbox = primary["bbox"]
    norm_box = [
        round(bbox[1] / float(h), 4),
        round(bbox[0] / float(w), 4),
        round(bbox[3] / float(h), 4),
        round(bbox[2] / float(w), 4)
    ]

    is_valid_checksum = False
    gs1_country = "Standard GS1 Barcode"
    score = 80

    if format_name in ["EAN13", "EAN_13"] or len(code) == 13:
        is_valid_checksum = validate_ean13_checksum(code)
        prefix = code[:3]
        gs1_country = GS1_COUNTRY_PREFIXES.get(prefix, f"GS1 Region Prefix ({prefix})")
        score = 100 if is_valid_checksum else 45
    elif format_name in ["UPCA", "UPC_A"] or len(code) == 12:
        is_valid_checksum = validate_upca_checksum(code)
        score = 95 if is_valid_checksum else 50
    elif format_name in ["QRCODE", "QR_CODE", "DATAMATRIX"]:
        is_valid_checksum = True
        score = 98

    return {
        "detected": True,
        "barcode": code,
        "format": format_name,
        "score": score,
        "isValidChecksum": is_valid_checksum,
        "gs1Country": gs1_country,
        "bbox": bbox,
        "normBox": norm_box,
        "notes": f"Decoded {format_name} payload: {code} [{gs1_country}]. Checksum status: {'VALID' if is_valid_checksum else 'INVALID'}."
    }
