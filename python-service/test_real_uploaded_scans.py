import os
import sys
import io
import json
import cv2
import numpy as np

# Force unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from core.preprocessor import preprocess_packaging_image, check_blur
from core.barcode_forensics import analyze_barcode

IMAGES = {
    "bella_vita_back": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg",
    "park_avenue_side": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg",
    "park_avenue_front": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg",
    "surf_excel_front": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg",
    "surf_excel_back": "C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"
}

def inspect_image_properties():
    print("==================================================================", flush=True)
    print("STEP 1: IMAGE INTEGRITY, RESOLUTION & BLUR CHECKS", flush=True)
    print("==================================================================", flush=True)
    results = {}
    for key, path in IMAGES.items():
        if not os.path.exists(path):
            print(f"[-] Missing: {key} at {path}", flush=True)
            continue
        
        file_size_kb = os.path.getsize(path) / 1024
        img = cv2.imread(path)
        if img is None:
            print(f"[-] Failed to decode: {key}", flush=True)
            continue
            
        h, w, c = img.shape
        aspect_ratio = round(w / h, 3)
        is_blurry, focus_measure = check_blur(img)
        barcode_res = analyze_barcode(img)

        results[key] = {
            "path": path,
            "size_kb": round(file_size_kb, 1),
            "resolution": f"{w}x{h}",
            "channels": c,
            "aspect_ratio": aspect_ratio,
            "focus_measure": round(focus_measure, 2),
            "is_blurry": is_blurry,
            "barcode": barcode_res.get("barcode", "None"),
            "barcode_format": barcode_res.get("format", "N/A"),
            "barcode_detected": barcode_res.get("detected", False)
        }

        print(f"[+] {key}:", flush=True)
        print(f"    - Resolution: {w}x{h} ({c} channels), Aspect Ratio: {aspect_ratio}, Size: {round(file_size_kb, 1)} KB", flush=True)
        print(f"    - Focus Measure: {round(focus_measure, 2)} (Blurry: {is_blurry})", flush=True)
        print(f"    - Barcode: {barcode_res.get('barcode', 'None')} (Format: {barcode_res.get('format', 'N/A')}, Detected: {barcode_res.get('detected', False)})", flush=True)

    return results

def test_dataset_extraction(client, dataset_name, front_path, back_paths):
    print("\n==================================================================", flush=True)
    print(f"TESTING PIPELINE: {dataset_name}", flush=True)
    print("==================================================================", flush=True)
    
    with open(front_path, 'rb') as f_front:
        data = {
            'front_image': (io.BytesIO(f_front.read()), os.path.basename(front_path))
        }
        
        opened_files = []
        for i, b_path in enumerate(back_paths):
            f_back = open(b_path, 'rb')
            opened_files.append(f_back)
            data[f'back_image_{i}'] = (io.BytesIO(f_back.read()), os.path.basename(b_path))

    try:
        response = client.post('/extract', data=data, content_type='multipart/form-data')
    finally:
        for f in opened_files:
            f.close()

    print(f"HTTP Status: {response.status_code}", flush=True)
    if response.status_code != 200:
        print(f"Error: {response.get_data(as_text=True)}", flush=True)
        return None

    res_json = response.get_json()
    print(f"Product Name Detected:      {res_json.get('productName')}", flush=True)
    print(f"Overall Verdict:            {res_json.get('overallVerdict')}", flush=True)
    print(f"Compliance Rate:            {res_json.get('complianceRate')}%", flush=True)
    print(f"Penalty Estimate:           INR {res_json.get('penaltyEstimateInr', 0)}", flush=True)
    print(f"Panels Processed Count:     {res_json.get('panelsCount')}", flush=True)
    print(f"Total Extracted Features:   {len(res_json.get('extracted_features', []))}", flush=True)
    print(f"Total Bounding Boxes:       {len(res_json.get('combinedBoundingBoxes', []))}", flush=True)
    print(f"Barcode:                    {res_json.get('barcode', {}).get('barcode', 'None')} (Checksum Valid: {res_json.get('barcode', {}).get('isValidChecksum')})", flush=True)
    print(f"Counterfeit Status:         {res_json.get('brandMetrics', {}).get('status')}", flush=True)
    
    print("\n--- Key Rule Evaluations ---", flush=True)
    for ev in res_json.get('ruleEvaluations', []):
        print(f"  [{ev.get('status')}] {ev.get('ruleCode')} ({ev.get('title')}): {ev.get('detectedValue') or 'Not Found'} (Side: {ev.get('side', 'N/A')})", flush=True)

    print("\n--- Panels Breakdown ---", flush=True)
    for p in res_json.get('panels', []):
        print(f"  Panel ID: {p.get('id')} | Label: {p.get('label')} | Features: {len(p.get('extracted_features', []))} | Boxes: {len(p.get('boundingBoxes', []))}", flush=True)

    return res_json

def main():
    image_props = inspect_image_properties()
    client = app.test_client()

    # Dataset 1: Park Avenue (Front PDP + Side Statutory)
    res_park = test_dataset_extraction(
        client,
        "Dataset 1: Park Avenue Samurai Perfume (Front PDP + Side Panel)",
        IMAGES["park_avenue_front"],
        [IMAGES["park_avenue_side"]]
    )

    # Dataset 2: Surf Excel Easy Wash (Front PDP + Back Statutory)
    res_surf = test_dataset_extraction(
        client,
        "Dataset 2: Surf Excel Easy Wash Detergent (Front PDP + Back Panel)",
        IMAGES["surf_excel_front"],
        [IMAGES["surf_excel_back"]]
    )

    # Dataset 3: Bella Vita Perfume (Single Back Statutory Panel test)
    res_bella = test_dataset_extraction(
        client,
        "Dataset 3: Bella Vita Perfume (Single Panel Statutory Test)",
        IMAGES["bella_vita_back"],
        []
    )

    print("\n==================================================================", flush=True)
    print("ALL SCAN TESTS COMPLETED SUCCESSFULLY", flush=True)
    print("==================================================================", flush=True)

if __name__ == '__main__':
    main()
