"""
LMPC Inspect AI — Multi-Engine Ensemble OCR & Computer Vision Microservice
Port: 5001
Supports multi-panel packaging inspection (Front PDP + Multiple Back/Side/Top Statutory Panels).
"""

import os
import sys
import logging
import json
import gc

# Ensure Windows C++ DLLs are found for PyTorch & OpenCV
if sys.platform == 'win32':
    for dll_dir in [
        r"C:\Users\parth\anaconda3\envs\myenv\lib\site-packages\torch\lib",
        r"C:\Users\parth\anaconda3\envs\myenv\Library\bin",
        r"C:\Users\parth\anaconda3\envs\myenv\bin"
    ]:
        if os.path.exists(dll_dir):
            try:
                os.add_dll_directory(dll_dir)
            except Exception:
                pass
    try:
        import torch
    except Exception:
        pass

import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

from core.preprocessor import preprocess_packaging_image, check_blur, detect_packaging_object_contour
from core.ocr_ensemble import OCREnsemble
from core.barcode_forensics import analyze_barcode
from core.texture_analyzer import analyze_packaging_textures_and_discrepancies
from core.block_segmenter import detect_packaging_blocks
from core.statutory_rules import evaluate_statutory_rules
from core.counterfeit_detection import detect_brand_spoofing, compute_calibrated_counterfeit_risk

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)

# Initialize global OCR Ensemble
ocr_engine = OCREnsemble()

def load_images_from_request(req) -> tuple[np.ndarray | None, list[dict], str]:
    """
    Robust multi-panel image loader supporting:
    - Front PDP image via keys: 'front_image', 'image', 'file'
    - Up to 1-4+ secondary panel images via keys:
      'back_image', 'back_image_0', 'back_image_1', 'back_image_2',
      'side_image', 'side_image_0', 'side_image_1',
      or multiple files uploaded under 'back_images'
    - JSON payload with paths: 'front_image_path', 'back_image_paths', 'back_image_path'
    """
    front_img = None
    front_name = "front_label"
    secondary_panels = []

    # 1. Front Image from Multipart
    if 'front_image' in req.files:
        f = req.files['front_image']
        front_name = f.filename or "front_image"
        front_img = cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)
    elif 'image' in req.files:
        f = req.files['image']
        front_name = f.filename or "image"
        front_img = cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)
    elif 'file' in req.files:
        f = req.files['file']
        front_name = f.filename or "file"
        front_img = cv2.imdecode(np.frombuffer(f.read(), np.uint8), cv2.IMREAD_COLOR)

    # 2. Secondary Panel Images from Multipart (back, sides, top/bottom)
    # Check numbered keys: back_image_0, back_image_1, back_image_2, side_image_0, etc.
    secondary_keys = []
    for k in req.files.keys():
        if k not in ['front_image', 'image', 'file']:
            secondary_keys.append(k)

    # Sort keys for consistent panel indexing
    secondary_keys.sort()

    for idx, k in enumerate(secondary_keys):
        file_list = req.files.getlist(k)
        for sub_file in file_list:
            if sub_file and sub_file.filename:
                img_data = cv2.imdecode(np.frombuffer(sub_file.read(), np.uint8), cv2.IMREAD_COLOR)
                if img_data is not None:
                    side_id = f"back_{len(secondary_panels)}"
                    label_name = f"Panel {len(secondary_panels) + 1} (Statutory / Side)"
                    if len(secondary_panels) == 0:
                        label_name = "Back Panel (Statutory & MRP)"
                    elif len(secondary_panels) == 1:
                        label_name = "Side Panel 1 (Ingredients & FSSAI)"
                    elif len(secondary_panels) == 2:
                        label_name = "Side Panel 2 (Nutrition & Address)"

                    secondary_panels.append({
                        "image": img_data,
                        "name": sub_file.filename,
                        "side_key": side_id,
                        "label": label_name,
                        "index": len(secondary_panels)
                    })

    # 3. JSON Paths fallback
    if req.is_json and req.json:
        if 'front_image_path' in req.json and os.path.exists(req.json['front_image_path']):
            front_img = cv2.imread(req.json['front_image_path'])
            front_name = os.path.basename(req.json['front_image_path'])
        elif 'image_path' in req.json and os.path.exists(req.json['image_path']):
            front_img = cv2.imread(req.json['image_path'])
            front_name = os.path.basename(req.json['image_path'])

        # Check back_image_paths list or single back_image_path
        json_back_paths = req.json.get('back_image_paths', [])
        if 'back_image_path' in req.json and req.json['back_image_path']:
            json_back_paths.append(req.json['back_image_path'])

        for b_path in json_back_paths:
            if os.path.exists(b_path):
                img_data = cv2.imread(b_path)
                if img_data is not None:
                    side_id = f"back_{len(secondary_panels)}"
                    secondary_panels.append({
                        "image": img_data,
                        "name": os.path.basename(b_path),
                        "side_key": side_id,
                        "label": f"Panel {len(secondary_panels) + 1} (Statutory)",
                        "index": len(secondary_panels)
                    })

    return front_img, secondary_panels, front_name

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "LMPC-Inspect-AI-OCR-CV",
        "engines": {
            "rapid_ocr": ocr_engine.rapid_ocr is not None,
            "opencv": cv2.__version__
        }
    })

def _no_spoof_result(brand_name: str) -> dict:
    """
    Neutral brand result used when no brand_logo cluster was found on the front panel.
    Spoof analysis is skipped entirely — there is no identifiable brand to compare.
    """
    return {
        "is_spoof": False,
        "status": "GENUINE",
        "detected_brand": brand_name,
        "matched_brand": None,
        "registered_owner": None,
        "similarity_score": 0.0,
        "confidence": 0.0,
        "reason": "No identifiable brand logo cluster found on front panel; spoof analysis skipped.",
        "details": ["No brand_logo cluster extracted from front PDP."],
        "corporateDetails": None,
        "spoof_type": None,
        "homoglyph_match": False,
        "phonetic_match": False
    }


def _low_confidence_brand_result(brand_name: str) -> dict:
    """
    Used when a brand_logo cluster was found but its OCR confidence is below 0.85.
    Spoof analysis is suppressed to prevent false COUNTERFEIT alarms from misreads.
    The UI should prompt the operator to re-scan with better lighting/focus.
    """
    return {
        "is_spoof": False,
        "status": "BRAND_UNCLEAR",
        "detected_brand": brand_name,
        "matched_brand": None,
        "registered_owner": None,
        "similarity_score": 0.0,
        "confidence": 0.0,
        "reason": (
            "Brand cluster OCR confidence is below the required 0.85 threshold. "
            "Spoof detection suppressed to prevent false alarms from misreads. "
            "Please re-scan with improved lighting and focus."
        ),
        "details": [
            "Low-confidence brand text detected: spoof detection suppressed.",
            "Recommended action: Re-scan with improved lighting, sharp focus, and no glare."
        ],
        "corporateDetails": None,
        "spoof_type": None,
        "homoglyph_match": False,
        "phonetic_match": False
    }


@app.route('/extract', methods=['POST'])
@app.route('/api/v2/cv/extract', methods=['POST'])
def extract_evidence():
    """
    Multi-Panel Packaging Statutory Compliance Extraction Pipeline:
    1. Preprocess & extract Front PDP with spatial brand/logo clustering (paddings & margins)
    2. Iterate over 1 to 3+ Secondary Panels (Back, Sides, Top/Bottom) for statutory declarations:
       - MRP, Batch Number, Mfg/Exp Dates, FSSAI Lic No, Address, Helpline, Ingredients, Nutrition
    3. Barcode Forensics & GS1 verification across all panels
    4. Multi-spectral texture & anti-counterfeit analysis
    5. Statutory LMPC Rule Evaluations on the combined multi-panel feature set
    """
    front_img, secondary_panels, front_name = load_images_from_request(request)
    if front_img is None:
        return jsonify({"status": "error", "message": "No valid front packaging image provided."}), 400

    try:
        import concurrent.futures

        # --- 1. MULTI-PANEL CONCURRENT OCR & STATUTORY EXTRACTION ---
        def process_panel(img, side_key, label, is_front=False):
            proc_img, skew = preprocess_packaging_image(img, apply_dewarp=is_front)
            features = ocr_engine.extract_text_and_boxes(proc_img)
            for f in features:
                f['side'] = side_key
                f['panel_label'] = label
            blocks = detect_packaging_blocks(proc_img, features)
            for b in blocks:
                b['side'] = side_key
            
            panel_data = {
                "id": f"panel_{side_key}",
                "side": side_key,
                "label": label,
                "boundingBoxes": blocks,
                "extracted_features": features,
                "skew_angle": round(skew, 2),
                "proc_img": proc_img
            }
            return panel_data, features, blocks

        all_secondary_features = []
        all_secondary_blocks = []
        panels_output = []

        max_workers = min(4, 1 + len(secondary_panels))
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit front panel (with apply_dewarp=True)
            front_future = executor.submit(process_panel, front_img, "front", "Front Label (PDP)", is_front=True)
            
            # Submit secondary panels
            sec_futures = []
            for sec in secondary_panels:
                sec_futures.append(executor.submit(process_panel, sec["image"], sec["side_key"], sec["label"], is_front=False))

            # Retrieve front panel results
            front_panel_data, front_features, front_blocks = front_future.result()
            proc_front = front_panel_data.pop("proc_img")
            panels_output.append(front_panel_data)
            skew_front = front_panel_data["skew_angle"]

            barcode_info = analyze_barcode(front_img)

            # Retrieve secondary panels results
            for i, future in enumerate(sec_futures):
                sec_panel_data, sec_features, sec_blocks = future.result()
                sec_panel_data.pop("proc_img")
                all_secondary_features.extend(sec_features)
                all_secondary_blocks.extend(sec_blocks)
                panels_output.append(sec_panel_data)

                # If barcode was not found, check secondary panel
                if not barcode_info.get("detected") or not barcode_info.get("isValidChecksum"):
                    sec_barcode = analyze_barcode(secondary_panels[i]["image"])
                    if sec_barcode.get("detected"):
                        barcode_info = sec_barcode

        # Combine all extracted features across all panels for holistic statutory rule checking
        all_features = front_features + all_secondary_features

        # --- 3. TEXTURE ANALYSIS & PRINT QUALITY (ON FRONT PDP) ---
        texture_info = analyze_packaging_textures_and_discrepancies(proc_front)

        # --- 4. STATUTORY LMPC RULE EVALUATION ACROSS ALL PANELS ---
        active_rules = json.loads(request.form['rules_json']) if request.form.get('rules_json') else None
        evaluations, font_metrics, overall_verdict, compliance_rate, penalty_inr = evaluate_statutory_rules(
            all_features, package_area_cm2=145.0, active_rules=active_rules
        )

        # Tag evaluations with corresponding panel side if matched
        for ev in evaluations:
            matching_feat = next(
                (f for f in all_features if f.get("category") in ev.get("id", "") or f.get("value") == ev.get("detectedValue")),
                None
            )
            if matching_feat:
                ev['side'] = matching_feat.get('side', 'front')
            else:
                # Statutory items like MRP, address, helpline, license naturally live on secondary panels if present
                ev['side'] = 'back_0' if len(secondary_panels) > 0 else 'front'

        # Build detected product / brand title from Front PDP brand cluster.
        # Only use a category=brand_logo feature; never fall back to arbitrary
        # first-feature text (which may be a nutrition row or garbled multi-line block).
        brand_name = "Packaged FMCG Commodity"
        brand_confidence = 0.0
        for f in front_features:
            if f.get("category") == "brand_logo":
                brand_name = f.get("value", "").strip() or "Packaged FMCG Commodity"
                brand_confidence = float(f.get("confidence_score", 0.0))
                break

        # --- 5. CALIBRATED ANTI-COUNTERFEIT RISK SCORING ---
        is_blurry, focus_measure = check_blur(front_img)

        # Gate brand spoof analysis on both the presence of a brand_logo cluster
        # and the OCR confidence of that cluster (must be >= 0.85 to proceed).
        # This prevents false COUNTERFEIT verdicts from garbled or low-quality OCR output.
        if brand_name == "Packaged FMCG Commodity":
            # No brand_logo cluster was found on the front panel at all.
            brand_spoof_res = _no_spoof_result(brand_name)
            logging.info("Brand spoof gate: no brand_logo cluster found; skipping spoof detection.")
        elif brand_confidence < 0.85:
            # Cluster was found but OCR confidence is too low to trust the reading.
            brand_spoof_res = _low_confidence_brand_result(brand_name)
            logging.info(
                f"Brand spoof gate: brand '{brand_name}' confidence {brand_confidence:.2f} < 0.85; "
                "suppressing spoof detection to prevent false alarm."
            )
        else:
            brand_spoof_res = detect_brand_spoofing(brand_name)

        stat_violations_count = sum(1 for e in evaluations if e.get("status") in ("FAIL", "ISSUE"))

        counterfeit_metrics = compute_calibrated_counterfeit_risk(
            brand_spoof_result=brand_spoof_res,
            barcode_info=barcode_info,
            texture_info=texture_info,
            statutory_violations_count=stat_violations_count,
            is_camera_blurry=is_blurry,
            focus_measure=focus_measure,
            extracted_features=all_features
        )

        brand_metrics = {
            "similarityScore": brand_spoof_res.get("similarity_score", 100.0),
            "brandDetected": brand_spoof_res.get("detected_brand", brand_name),
            "matchedBrand": brand_spoof_res.get("matched_brand") or brand_name,
            "registeredOwner": brand_spoof_res.get("registered_owner") or "Registered Trademark Proprietor",
            "confidence": brand_spoof_res.get("confidence", 0.98),
            "status": brand_spoof_res.get("status", "GENUINE"),
            "details": brand_spoof_res.get("details", []),
            "corporateDetails": brand_spoof_res.get("corporateDetails")
        }

        total_panels_count = 1 + len(secondary_panels)

        # Combined bounding boxes list across all panels
        combined_boxes = front_blocks + all_secondary_blocks

        # Back bounding boxes (all secondary panels)
        back_boxes = all_secondary_blocks

        # ── Multilingual & Other-Language Extraction Summary ─────────────────
        multilingual_tokens = [
            {
                "id": f.get("id", f"ml_{i}"),
                "text": f.get("value", ""),
                "script": f.get("script", "Latin (English)"),
                "language": f.get("language", "en"),
                "confidence": f.get("confidence_score", 0.0),
                "category": f.get("category", "other"),
                "side": f.get("side", "front"),
                "box": f.get("box", [0, 0, 0, 0]),
                "bbox": f.get("bbox", [0, 0, 0, 0])
            }
            for i, f in enumerate(all_features)
            if f.get("is_multilingual") or f.get("script", "").startswith(("Devanagari", "Marathi", "Hindi", "Tamil", "Telugu", "Gujarati", "Bengali"))
        ]

        detected_languages = list(set(
            f.get("script", "Latin (English)") for f in all_features if f.get("script")
        ))
        if not detected_languages:
            detected_languages = ["Latin (English)"]

        return jsonify({
            "status": "success",
            "hasBackImage": len(secondary_panels) > 0,
            "panelsCount": total_panels_count,
            "skew_angle": round(skew_front, 2),
            "productName": brand_name,
            "extracted_features": all_features,
            "front_features": front_features,
            "secondary_features": all_secondary_features,
            "tokens": all_features,
            "multilingual_tokens": multilingual_tokens,
            "multilingualTokens": multilingual_tokens,
            "detected_languages": detected_languages,
            "detectedLanguages": detected_languages,
            "boundingBoxes": front_blocks,
            "frontBoundingBoxes": front_blocks,
            "backBoundingBoxes": back_boxes,
            "combinedBoundingBoxes": combined_boxes,
            "panels": panels_output,
            "ruleEvaluations": evaluations,
            "fontMetrics": font_metrics,
            "counterfeit_metrics": counterfeit_metrics,
            "brandMetrics": brand_metrics,
            "brand_metrics": brand_metrics,
            "corporate_registry_match": brand_spoof_res.get("corporateDetails"),
            "barcode": barcode_info,
            "overallVerdict": overall_verdict,
            "complianceRate": compliance_rate,
            "penaltyEstimateInr": penalty_inr,
            "engine": "Ensemble(PaddleOCR+EasyOCR+OpenCV5+ZxingCPP)"
        })

    except Exception as e:
        logging.error(f"Error processing multi-panel extraction: {e}", exc_info=True)
        return jsonify({"status": "error", "message": str(e)}), 500
    finally:
        gc.collect()

@app.route('/counterfeit/analyze', methods=['POST'])
@app.route('/api/v2/cv/forensic-counterfeit', methods=['POST'])
def counterfeit_analyze():
    """Dedicated endpoint for multi-spectral anti-counterfeit analysis"""
    return extract_evidence()

@app.route('/api/v2/cv/block-segmentation', methods=['POST'])
def block_segmentation():
    """Endpoint for OpenCV visual packaging block decomposition"""
    front_img, _, _ = load_images_from_request(request)
    if front_img is None:
        return jsonify({"status": "error", "message": "No valid image provided."}), 400
    
    proc_img, _ = preprocess_packaging_image(front_img)
    blocks = detect_packaging_blocks(proc_img)
    return jsonify({"status": "success", "blocks": blocks})

@app.route('/api/v2/cv/texture-analysis', methods=['POST'])
def texture_analysis():
    """Endpoint for GLCM, LBP, and color gamut analysis"""
    front_img, _, _ = load_images_from_request(request)
    if front_img is None:
        return jsonify({"status": "error", "message": "No valid image provided."}), 400
    
    proc_img, _ = preprocess_packaging_image(front_img)
    textures = analyze_packaging_textures_and_discrepancies(proc_img)
    return jsonify({"status": "success", "textures": textures})

@app.route('/api/v2/cv/check-frame', methods=['POST'])
def check_frame():
    """Fast endpoint for live video stream to discard blurry frames"""
    front_img, _, _ = load_images_from_request(request)
    if front_img is None:
        return jsonify({"status": "error", "message": "No valid image provided."}), 400
        
    is_blurry, focus_measure = check_blur(front_img)
    return jsonify({
        "status": "success",
        "is_blurry": bool(is_blurry),
        "focus_measure": float(focus_measure)
    })

@app.route('/api/v2/cv/live-stream-ocr', methods=['POST'])
def live_stream_ocr():
    """
    Ultra-Fast Live Webcam Stream OCR & Object Identification Endpoint (<60ms):
    1. Detects packaging object contour & boundary.
    2. Runs high-speed single-pass RapidOCR on the frame.
    3. Extracts and categorizes live statutory fields (Brand, MRP, Net Qty, Dates, FSSAI).
    4. Identifies barcode and GS1 country in real-time.
    5. Returns coordinates for real-time Augmented Reality (AR) HUD overlay.
    """
    frame_img, _, _ = load_images_from_request(request)
    if frame_img is None:
        return jsonify({"status": "error", "message": "No video frame received."}), 400

    orig_h, orig_w = frame_img.shape[:2]
    is_blurry, focus_measure = check_blur(frame_img, threshold=80.0)

    # 1. Real-Time Packaging Object Contour Detection
    object_info = detect_packaging_object_contour(frame_img)

    # 2. Fast Single-Pass RapidOCR (downscaled for high-speed live stream AR overlay)
    live_features = []
    multilingual_live_tokens = []
    brand_detected = None
    if not is_blurry or focus_measure > 40.0:
        max_live_dim = 640
        if max(orig_h, orig_w) > max_live_dim:
            scale = max_live_dim / float(max(orig_h, orig_w))
            live_proc_img = cv2.resize(frame_img, (int(orig_w * scale), int(orig_h * scale)), interpolation=cv2.INTER_AREA)
        else:
            live_proc_img = frame_img

        proc_h, proc_w = live_proc_img.shape[:2]
        raw_features = ocr_engine._run_rapidocr_rotated(live_proc_img, proc_h, proc_w, rot_code=None, is_live=True)
        
        # Cluster brand on the fly if present
        if raw_features:
            raw_features = ocr_engine._cluster_front_brand_and_logo(raw_features, proc_h, proc_w)

        for f in raw_features:
            cat = f.get("category", "other")
            val = f.get("value", "")
            box = f.get("box", [0, 0, 0, 0])
            conf = f.get("confidence_score", 0.9)
            script = f.get("script", "Latin (English)")
            language = f.get("language", "en")
            is_multilingual = f.get("is_multilingual", False)

            if cat == "brand_logo" and not brand_detected:
                brand_detected = val

            feat_item = {
                "id": f.get("id", f"live_{len(live_features)}"),
                "category": cat,
                "text": val,
                "box": box, # [ymin, xmin, ymax, xmax]
                "confidence": conf,
                "script": script,
                "language": language,
                "is_multilingual": is_multilingual,
                "label": cat.upper().replace("_", " ")
            }
            live_features.append(feat_item)

            if is_multilingual or script.startswith(("Devanagari", "Marathi", "Hindi", "Tamil", "Telugu", "Gujarati", "Bengali")):
                multilingual_live_tokens.append(feat_item)

    # 3. Fast Live Barcode Scan
    barcode_data = analyze_barcode(frame_img)
    barcode_summary = None
    if barcode_data.get("detected"):
        barcode_summary = {
            "detected": True,
            "code": barcode_data.get("barcode", ""),
            "format": barcode_data.get("format", ""),
            "gs1Country": barcode_data.get("gs1Country", "Unknown"),
            "isValidChecksum": barcode_data.get("isValidChecksum", False),
            "box": barcode_data.get("normBox", [0, 0, 0, 0])
        }

    # Count identified statutory categories
    statutory_categories = set(f["category"] for f in live_features if f["category"] != "other")
    if barcode_summary and barcode_summary["detected"]:
        statutory_categories.add("barcode")

    live_detected_languages = list(set(f.get("script", "Latin (English)") for f in live_features if f.get("script")))
    if not live_detected_languages:
        live_detected_languages = ["Latin (English)"]

    return jsonify({
        "status": "success",
        "is_blurry": bool(is_blurry),
        "focus_measure": round(float(focus_measure), 1),
        "object": object_info,
        "barcode": barcode_summary,
        "features": live_features,
        "brand_name": brand_detected or "Scanning...",
        "statutory_count": len(statutory_categories),
        "statutory_categories": list(statutory_categories),
        "multilingual_tokens": multilingual_live_tokens,
        "multilingualTokens": multilingual_live_tokens,
        "detected_languages": live_detected_languages,
        "detectedLanguages": live_detected_languages,
        "has_multilingual": len(multilingual_live_tokens) > 0
    })


if __name__ == '__main__':
    logging.info("Starting High-Performance Multi-Panel OCR & Computer Vision Microservice on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)
