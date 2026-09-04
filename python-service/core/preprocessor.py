"""
Pre-processing pipeline for packaging images:
- Illumination normalization (LAB CLAHE)
- Specular glare / noise reduction (Bilateral filtering)
- Morphological text-ridge deskew
- Multi-scale contrast enhancement
"""

import cv2
import numpy as np
import logging

def normalize_lighting_clahe(img: np.ndarray, clip_limit: float = 2.5, tile_grid_size: tuple = (8, 8)) -> np.ndarray:
    """
    Applies CLAHE on the L-channel in LAB color space to normalize uneven flash/ambient lighting.
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    cl = clahe.apply(l)
    merged = cv2.merge((cl, a, b))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)

def suppress_glare_and_noise(img: np.ndarray) -> np.ndarray:
    """
    Applies edge-preserving bilateral filtering to reduce packaging glossy glare while keeping text edges sharp.
    """
    return cv2.bilateralFilter(img, d=7, sigmaColor=45, sigmaSpace=45)

def estimate_deskew_angle(gray: np.ndarray) -> float:
    """
    Estimates dominant text line skew angle using morphological horizontal close and minAreaRect / Hough lines.
    """
    h, w = gray.shape[:2]
    # Invert binary threshold
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological horizontal dilation to fuse words into text lines
    kernel_len = max(15, int(w * 0.03))
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_len, 3))
    morph = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    # Find contours of text strips
    contours, _ = cv2.findContours(morph, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    angles = []
    
    for cnt in contours:
        if cv2.contourArea(cnt) < 100:
            continue
        rect = cv2.minAreaRect(cnt)
        (cx, cy), (width, height), angle = rect
        
        # Normalize angle to -45..45 degrees
        if width < height:
            angle = angle + 90.0
        if angle > 45.0:
            angle -= 90.0
        elif angle < -45.0:
            angle += 90.0
            
        if -30.0 < angle < 30.0 and abs(angle) > 0.3:
            angles.append(angle)

    if angles:
        median_angle = float(np.median(angles))
        return median_angle
    return 0.0

def deskew_image(img: np.ndarray, angle: float) -> np.ndarray:
    """
    Rotates image by specified angle while expanding canvas bounds to prevent corner clipping.
    """
    if abs(angle) < 0.4:
        return img

    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    
    # Calculate rotation matrix
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    cos = np.abs(M[0, 0])
    sin = np.abs(M[0, 1])
    
    # Compute new bounding dimensions of image
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))
    
    # Adjust rotation matrix to account for translation
    M[0, 2] += (new_w / 2) - center[0]
    M[1, 2] += (new_h / 2) - center[1]
    
    deskewed = cv2.warpAffine(
        img, M, (new_w, new_h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return deskewed

def check_blur(img: np.ndarray, threshold: float = 100.0) -> tuple[bool, float]:
    """
    Checks if an image is blurry using the variance of the Laplacian.
    Returns (is_blurry, focus_measure).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    focus_measure = cv2.Laplacian(gray, cv2.CV_64F).var()
    return focus_measure < threshold, focus_measure

def adaptive_thresholding(gray: np.ndarray) -> np.ndarray:
    """
    Applies adaptive thresholding for better text segmentation in uneven lighting.
    """
    return cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

def document_dewarp(img: np.ndarray) -> np.ndarray:
    """
    Perspective correction / dewarping based on the largest rectangular contour.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)
    
    contours, _ = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return img
        
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    screen_cnt = None
    
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.contourArea(approx) > (img.shape[0] * img.shape[1] * 0.1):
            screen_cnt = approx
            break
            
    if screen_cnt is None:
        return img
        
    pts = screen_cnt.reshape(4, 2)
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
        
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (maxWidth, maxHeight))
    return warped

def apply_unsharp_mask(img: np.ndarray, sigma: float = 1.0, strength: float = 0.8) -> np.ndarray:
    """
    Applies Gaussian unsharp masking to pop fine dot-matrix printed dates/batch codes,
    low-contrast metallic foil stamping, and embossed regulatory numbers.
    """
    blurred = cv2.GaussianBlur(img, (0, 0), sigma)
    sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
    return sharpened

def sanitize_numeric_string(text: str) -> str:
    """
    Pre-validation character sanitizer: replaces common OCR homoglyph misreads
    with true numeric digits (e.g. O->0, I/l->1, S->5, B->8, Z->2, g->9).
    """
    if not text:
        return ""
    homoglyph_map = {
        'O': '0', 'o': '0',
        'I': '1', 'l': '1', 'i': '1', '|': '1',
        'Z': '2', 'z': '2',
        'S': '5', 's': '5',
        'b': '6',
        'B': '8',
        'g': '9', 'q': '9'
    }
    return "".join(homoglyph_map.get(ch, ch) for ch in text)

def preprocess_packaging_image(img: np.ndarray, max_dim: int = 1600, apply_dewarp: bool = False) -> tuple[np.ndarray, float]:
    """
    Full preprocessing pipeline:
    1. Aspect-ratio preserving downscale if image is overly large (using INTER_AREA for text edge preservation)
    2. Optional: Perspective dewarping
    3. LAB CLAHE lighting normalization
    4. Bilateral filter glare suppression
    5. High-pass unsharp masking for dot-matrix text & fine foil labels
    6. Text-ridge angle estimation and deskew
    Returns: (preprocessed_bgr_img, applied_skew_angle)
    """
    h, w = img.shape[:2]
    scale = 1.0
    if max(h, w) > max_dim:
        scale = max_dim / float(max(h, w))
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    if apply_dewarp:
        img = document_dewarp(img)

    # 1. Normalize lighting via LAB CLAHE
    norm_img = normalize_lighting_clahe(img, clip_limit=2.2, tile_grid_size=(8, 8))

    # 2. Glare and noise reduction via bilateral filter
    denoised = suppress_glare_and_noise(norm_img)

    # 3. Enhance text contrast with unsharp masking (enhances dot-matrix dates & metallic foil text)
    enhanced = apply_unsharp_mask(denoised, sigma=1.0, strength=0.75)

    # 4. Estimate skew angle on grayscale representation
    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    skew_angle = estimate_deskew_angle(gray)

    # 5. Deskew if necessary
    deskewed = deskew_image(enhanced, skew_angle)

    return deskewed, skew_angle


def detect_packaging_object_contour(img: np.ndarray) -> dict:
    """
    Real-time packaging contour & object boundary detection for live webcam stream.
    Identifies the primary packaging object / Principal Display Panel (PDP).
    Returns normalized bounding box [ymin, xmin, ymax, xmax] and corner coordinates.
    """
    h, w = img.shape[:2]
    # Downscale for ultra-fast contour search (<5ms)
    scale = 320.0 / max(h, w) if max(h, w) > 320 else 1.0
    sw, sh = max(1, int(w * scale)), max(1, int(h * scale))
    small = cv2.resize(img, (sw, sh), interpolation=cv2.INTER_LINEAR)

    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Adaptive edge and threshold fusion
    edged = cv2.Canny(blurred, 40, 140)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return {
            "detected": False,
            "box": [0.08, 0.08, 0.92, 0.92],
            "area_ratio": 0.0,
            "label": "Seeking Packaging..."
        }

    # Sort by contour area
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    best_cnt = contours[0]
    area = cv2.contourArea(best_cnt)
    total_area = sw * sh
    area_ratio = area / float(total_area)

    # If prominent object found (> 8% of frame area)
    if area_ratio >= 0.08:
        x, y, bw, bh = cv2.boundingRect(best_cnt)
        norm_box = [
            round(float(y) / sh, 4),
            round(float(x) / sw, 4),
            round(float(y + bh) / sh, 4),
            round(float(x + bw) / sw, 4)
        ]
        return {
            "detected": True,
            "box": norm_box,
            "area_ratio": round(area_ratio, 3),
            "label": "Packaged Commodity (PDP Locked)"
        }

    return {
        "detected": False,
        "box": [0.12, 0.12, 0.88, 0.88],
        "area_ratio": round(area_ratio, 3),
        "label": "Align Packaging in Reticle"
    }

