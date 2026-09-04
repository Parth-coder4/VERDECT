import os
import sys
import json
import re
import cv2
import numpy as np

# Ensure Windows C++ DLLs are found
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

from core.ocr_ensemble import OCREnsemble
from core.barcode_forensics import analyze_barcode

images = [
    {
        "id": "img1",
        "title": "Bella Vita Perfume (Back Statutory Panel)",
        "path": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg",
        "ground_truth": {
            "brand": "BELLA VITA",
            "net_quantity": "100ml",
            "mrp": "499",
            "dates": "03/2024",
            "address": "Bella Vita Luxury",
            "helpline": "care@bellavitaorganic.com",
            "license": "M GC/1234",
            "barcode": "8906110531505"
        }
    },
    {
        "id": "img2",
        "title": "Park Avenue Samurai Perfume (Side Statutory Panel)",
        "path": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg",
        "ground_truth": {
            "brand": "PARK AVENUE",
            "net_quantity": "150g",
            "mrp": "250",
            "dates": "05/2024",
            "address": "J.K. Helene Curtis",
            "helpline": "1800 220 120",
            "license": None,
            "barcode": "8901277015431"
        }
    },
    {
        "id": "img3",
        "title": "Park Avenue Samurai Perfume (Front PDP Panel)",
        "path": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg",
        "ground_truth": {
            "brand": "PARK AVENUE",
            "net_quantity": "150 g",
            "mrp": None,
            "dates": None,
            "address": None,
            "helpline": None,
            "license": None,
            "barcode": None
        }
    },
    {
        "id": "img4",
        "title": "Surf Excel Easy Wash (Front PDP Panel)",
        "path": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg",
        "ground_truth": {
            "brand": "SURF EXCEL",
            "net_quantity": "1 kg",
            "mrp": None,
            "dates": None,
            "address": None,
            "helpline": None,
            "license": None,
            "barcode": None
        }
    },
    {
        "id": "img5",
        "title": "Surf Excel Easy Wash (Back Statutory Panel)",
        "path": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg",
        "ground_truth": {
            "brand": "SURF EXCEL",
            "net_quantity": "1 kg",
            "mrp": "140.00",
            "dates": "04/24",
            "address": "Hindustan Unilever",
            "helpline": "1800-10-22-221",
            "license": None,
            "barcode": "8901030383845"
        }
    }
]

def run_evaluation():
    ocr = OCREnsemble()
    
    total_fields_expected = 0
    total_fields_matched = 0
    field_breakdown = {}
    
    results = []
    
    for item in images:
        img_path = item["path"]
        print(f"\n=======================================================")
        print(f"EVALUATING: {item['title']}")
        print(f"Path: {img_path}")
        print(f"=======================================================")
        
        img = cv2.imread(img_path)
        if img is None:
            print("Failed to read image!")
            continue
            
        h, w = img.shape[:2]
        barcode_res = analyze_barcode(img)
        features = ocr.extract_text_and_boxes(img)
        
        extracted_by_cat = {}
        for f in features:
            cat = f['category']
            val = f['value']
            conf = f.get('confidence_score', 0)
            if cat not in extracted_by_cat:
                extracted_by_cat[cat] = []
            extracted_by_cat[cat].append({'text': val, 'conf': conf, 'bbox': f.get('bbox')})
            
        print(f"Image Size: {w}x{h} | OCR Extracted Tokens: {len(features)}")
        print("Extracted Categories & Values:")
        for cat, items_list in extracted_by_cat.items():
            print(f"  [{cat}]:")
            for it in items_list:
                print(f"     - '{it['text']}' (Conf: {it['conf']})")
                
        # Compare with ground truth
        gt = item["ground_truth"]
        item_eval = {"id": item["id"], "title": item["title"], "fields": {}}
        
        # 1. Brand
        if gt.get("brand"):
            total_fields_expected += 1
            brand_f = extracted_by_cat.get("brand_logo")
            matched = False
            extracted_text = ""
            conf = 0.0
            if brand_f:
                extracted_text = brand_f[0]['text']
                conf = brand_f[0]['conf']
                matched = gt["brand"].upper() in extracted_text.upper()
            elif any(gt["brand"].upper() in f['value'].upper() for f in features):
                matched = True
                extracted_text = [f['value'] for f in features if gt["brand"].upper() in f['value'].upper()][0]
            if matched: total_fields_matched += 1
            item_eval["fields"]["brand"] = {"expected": gt["brand"], "extracted": extracted_text, "matched": matched, "conf": conf}
            
        # 2. Net Quantity
        if gt.get("net_quantity"):
            total_fields_expected += 1
            qty_f = extracted_by_cat.get("quantity")
            matched = False
            extracted_text = ""
            conf = 0.0
            if qty_f:
                extracted_text = qty_f[0]['text']
                conf = qty_f[0]['conf']
                # check if ground truth quantity is in extracted text
                clean_gt = re.sub(r'\s+', '', gt["net_quantity"].lower())
                clean_ext = re.sub(r'\s+', '', extracted_text.lower())
                matched = clean_gt in clean_ext or any(clean_gt in re.sub(r'\s+', '', q['text'].lower()) for q in qty_f)
            if matched: total_fields_matched += 1
            item_eval["fields"]["net_quantity"] = {"expected": gt["net_quantity"], "extracted": extracted_text, "matched": matched, "conf": conf}

        # 3. MRP
        if gt.get("mrp"):
            total_fields_expected += 1
            mrp_f = extracted_by_cat.get("mrp")
            matched = False
            extracted_text = ""
            conf = 0.0
            if mrp_f:
                extracted_text = mrp_f[0]['text']
                conf = mrp_f[0]['conf']
                matched = gt["mrp"] in extracted_text or any(gt["mrp"] in m['text'] for m in mrp_f)
            if matched: total_fields_matched += 1
            item_eval["fields"]["mrp"] = {"expected": gt["mrp"], "extracted": extracted_text, "matched": matched, "conf": conf}

        # 4. Dates
        if gt.get("dates"):
            total_fields_expected += 1
            date_f = extracted_by_cat.get("mfg_date")
            matched = False
            extracted_text = ""
            conf = 0.0
            if date_f:
                extracted_text = date_f[0]['text']
                conf = date_f[0]['conf']
                matched = gt["dates"] in extracted_text or any(gt["dates"] in d['text'] for d in date_f)
            if matched: total_fields_matched += 1
            item_eval["fields"]["dates"] = {"expected": gt["dates"], "extracted": extracted_text, "matched": matched, "conf": conf}

        # 5. Address
        if gt.get("address"):
            total_fields_expected += 1
            addr_f = extracted_by_cat.get("address")
            matched = False
            extracted_text = ""
            conf = 0.0
            if addr_f:
                extracted_text = addr_f[0]['text']
                conf = addr_f[0]['conf']
                matched = any(gt["address"].lower() in a['text'].lower() for a in addr_f)
            if matched: total_fields_matched += 1
            item_eval["fields"]["address"] = {"expected": gt["address"], "extracted": extracted_text, "matched": matched, "conf": conf}

        # 6. Helpline
        if gt.get("helpline"):
            total_fields_expected += 1
            help_f = extracted_by_cat.get("helpline")
            matched = False
            extracted_text = ""
            conf = 0.0
            if help_f:
                extracted_text = help_f[0]['text']
                conf = help_f[0]['conf']
                clean_gt = re.sub(r'[\s\-+]', '', gt["helpline"].lower())
                clean_ext = re.sub(r'[\s\-+]', '', extracted_text.lower())
                matched = clean_gt in clean_ext or any(clean_gt in re.sub(r'[\s\-+]', '', h['text'].lower()) for h in help_f)
            if matched: total_fields_matched += 1
            item_eval["fields"]["helpline"] = {"expected": gt["helpline"], "extracted": extracted_text, "matched": matched, "conf": conf}

        # 7. Barcode
        if gt.get("barcode"):
            total_fields_expected += 1
            bc_val = barcode_res.get("barcode")
            matched = (bc_val == gt["barcode"])
            if matched: total_fields_matched += 1
            item_eval["fields"]["barcode"] = {"expected": gt["barcode"], "extracted": bc_val, "matched": matched, "conf": 1.0 if matched else 0.0}

        results.append(item_eval)
        
    print("\n=======================================================")
    print("           GROUND TRUTH EVALUATION SUMMARY             ")
    print("=======================================================")
    print(f"Total Mandatory Statutory Fields Expected: {total_fields_expected}")
    print(f"Total Mandatory Statutory Fields Correctly Matched: {total_fields_matched}")
    overall_accuracy = (total_fields_matched / total_fields_expected) * 100.0 if total_fields_expected > 0 else 0
    print(f"Overall Statutory Field Recognition Accuracy: {overall_accuracy:.2f}%")
    
    with open(r"d:/sih-v2/python-service/ground_truth_eval_5_images.json", "w", encoding="utf-8") as f:
        json.dump({
            "total_expected": total_fields_expected,
            "total_matched": total_fields_matched,
            "accuracy_percent": round(overall_accuracy, 2),
            "evaluations": results
        }, f, indent=2, ensure_ascii=False)
    print("Saved ground truth evaluation to ground_truth_eval_5_images.json")

if __name__ == '__main__':
    run_evaluation()
