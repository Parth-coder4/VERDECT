import os
import sys
import io
import time
import unicodedata
import cv2
import numpy as np

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
from core.ocr_ensemble import detect_script, _is_latin_hallucination, _clean_indic_text
from core.preprocessor import check_blur, detect_packaging_object_contour
from core.barcode_forensics import analyze_barcode

def run_comprehensive_audit():
    client = app.test_client()
    print("=====================================================================")
    print("      LIVE IMAGE DETECTION CHECKER & PIPELINE AUDIT SUITE           ")
    print("=====================================================================")

    # -------------------------------------------------------------------------
    # TEST 1: Script Detection & Disambiguation (Marathi vs Hindi vs English vs Indic)
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Script Detection & Language Disambiguation Accuracy")
    test_cases = [
        # English
        ("CADBURY DAIRY MILK", "en", "Latin (English)"),
        ("MRP Rs. 85.00 incl. of all taxes", "en", "Latin (English)"),
        ("Net Weight: 150g", "en", "Latin (English)"),
        ("Mfg Date: 01/2025", "en", "Latin (English)"),
        # Marathi (Devanagari with Marathi-specific chars / keywords)
        ("पुलाची प्रसिद्ध भेळ", "mr", "Marathi (मराठी)"),
        ("निव्वळ वजन: २५० ग्रॅम", "mr", "Marathi (मराठी)"),
        ("सर्व करांसहित ₹ ५०", "mr", "Marathi (मराठी)"),
        ("उत्पादक: आशा एंटरप्रायझेस", "mr", "Marathi (मराठी)"),
        # Hindi (Devanagari standard keywords)
        ("शुद्ध मात्रा: 500 ग्राम", "hi", "Hindi (हिंदी)"),
        ("अधिकतम खुदरा मूल्य ₹ 120 (सभी करों सहित)", "hi", "Hindi (हिंदी)"),
        ("निर्माण तिथि: 12/2024", "hi", "Hindi (हिंदी)"),
        ("उपभोक्ता सेवा: 1800-222-333", "hi", "Hindi (हिंदी)"),
        # Other Indic scripts
        ("நிகர எடை: 100 கிராம்", "ta", "Tamil (தமிழ்)"),
        ("పరిమాణం: 200 గ్రాములు", "te", "Telugu (తెలుగు)"),
        ("ચોખ્ખું વજન: 50 ગ્રામ", "gu", "Gujarati (ગુજરાતી)"),
        ("মোট ওজন: ১৫০ গ্রাম", "bn", "Bengali (বাংলা)"),
    ]

    correct_count = 0
    for text, expected_lang, expected_script in test_cases:
        res = detect_script(text)
        is_ok = (res['language'] == expected_lang)
        correct_count += int(is_ok)
        status_str = "PASS" if is_ok else "FAIL"
        print(f"  * [{status_str}] text: '{text[:30]}' -> lang={res['language']} (expected={expected_lang}), script='{res['script']}'")

    print(f"Script Disambiguation Accuracy: {correct_count}/{len(test_cases)} ({correct_count/len(test_cases)*100:.1f}%)")
    assert correct_count == len(test_cases), "Script detection accuracy failed"

    # -------------------------------------------------------------------------
    # TEST 2: Cross-Script Hallucination Filtering
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Cross-Script Latin Hallucination Filtering")
    hallucinations = ["RRTO", "RRE", "eTT", "||||", ":::", "lIlI", "QWXZP", "bcvxz", "---"]
    valid_tokens = ["CADBURY", "MRP", "150g", "FSSAI", "BEST", "BEFORE", "BATCH", "Rs.", "WEIGHT"]
    
    h_filtered = 0
    for h in hallucinations:
        is_h = _is_latin_hallucination(h, 0.5)
        if is_h:
            h_filtered += 1
        print(f"  * Hallucination '{h}': Filtered={is_h}")
    assert h_filtered >= len(hallucinations) - 1, "Hallucination filter underperformed"

    v_kept = 0
    for v in valid_tokens:
        is_h = _is_latin_hallucination(v, 0.9)
        if not is_h:
            v_kept += 1
        print(f"  * Valid Token '{v}': Preserved={not is_h}")
    assert v_kept == len(valid_tokens), "Valid tokens falsely filtered"

    # -------------------------------------------------------------------------
    # TEST 3: Packaging Contour & PDP Boundary Detection
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Packaging Contour & PDP Boundary Detection")
    test_img = np.full((720, 1280, 3), 240, dtype=np.uint8)
    cv2.rectangle(test_img, (160, 90), (1120, 630), (200, 200, 200), -1)
    cv2.rectangle(test_img, (160, 90), (1120, 630), (140, 140, 140), 4)

    contour_res = detect_packaging_object_contour(test_img)
    print(f"  * Object Detected: {contour_res['detected']}")
    print(f"  * Area Ratio: {contour_res['area_ratio']}")
    print(f"  * Box Coordinates: {contour_res['box']}")
    print(f"  * Label: {contour_res['label']}")
    assert contour_res['detected'] == True
    ymin, xmin, ymax, xmax = contour_res['box']
    assert 0.0 <= ymin < ymax <= 1.0 and 0.0 <= xmin < xmax <= 1.0, "Invalid normalized coordinates"

    # -------------------------------------------------------------------------
    # TEST 4: Motion Blur & Focus Stability Scoring
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Focus Stability & Blur Scoring Validation")
    sharp_img = test_img.copy()
    cv2.putText(sharp_img, "HIGH CONTRAST SHARP TEXT FOR FOCUS", (200, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
    blurry_img = cv2.GaussianBlur(sharp_img, (45, 45), 0)

    is_b_sharp, score_sharp = check_blur(sharp_img, threshold=80.0)
    is_b_blur, score_blur = check_blur(blurry_img, threshold=80.0)
    print(f"  * Sharp Image: Focus Score = {score_sharp:.1f}, Is Blurry = {is_b_sharp} (Expected False)")
    print(f"  * Blurry Image: Focus Score = {score_blur:.1f}, Is Blurry = {is_b_blur} (Expected True)")
    assert not is_b_sharp, "Sharp image misclassified as blurry"
    assert is_b_blur, "Blurry image misclassified as sharp"

    # -------------------------------------------------------------------------
    # TEST 5: Live Stream OCR & AR HUD Generation Throughput
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Live Stream OCR Throughput & AR HUD Coordinates")
    # Generate realistic live stream frame (640x360 downscaled format)
    frame = np.full((360, 640, 3), 245, dtype=np.uint8)
    cv2.rectangle(frame, (80, 40), (560, 320), (225, 225, 225), -1)
    cv2.rectangle(frame, (80, 40), (560, 320), (160, 160, 160), 2)
    cv2.putText(frame, "AMUL BUTTER", (140, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 180), 2)
    cv2.putText(frame, "MRP Rs. 58.00 incl. of all taxes", (140, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(frame, "Net Weight: 100g", (140, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)
    cv2.putText(frame, "Mfg Date: 02/2025", (140, 255), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (20, 20, 20), 2)

    _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])

    # Warm-up request
    client.post('/api/v2/cv/live-stream-ocr', data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')}, content_type='multipart/form-data')

    # Benchmark 10 consecutive frames
    latencies = []
    last_response_data = None
    for i in range(10):
        t0 = time.perf_counter()
        resp = client.post('/api/v2/cv/live-stream-ocr', data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')}, content_type='multipart/form-data')
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)
        assert resp.status_code == 200, f"Frame {i} returned status {resp.status_code}"
        last_response_data = resp.get_json()

    avg_lat = np.mean(latencies)
    min_lat = np.min(latencies)
    max_lat = np.max(latencies)
    p95_lat = np.percentile(latencies, 95)
    fps = 1000.0 / avg_lat

    print(f"  * Average Latency: {avg_lat:.2f} ms")
    print(f"  * Minimum Latency: {min_lat:.2f} ms")
    print(f"  * Maximum Latency: {max_lat:.2f} ms")
    print(f"  * 95th Percentile: {p95_lat:.2f} ms")
    print(f"  * Throughput: {fps:.1f} FPS")
    print(f"  * Status: {last_response_data['status']}")
    print(f"  * Brand Detected: {last_response_data['brand_name']}")
    print(f"  * Statutory Count: {last_response_data['statutory_count']}")
    print(f"  * Features Found: {len(last_response_data['features'])}")

    print("\n  --- AR HUD Bounding Box Verification ---")
    for feat in last_response_data['features']:
        box = feat['box']
        ymin, xmin, ymax, xmax = box
        assert 0.0 <= ymin <= ymax <= 1.0, f"Invalid Y coords in box: {box}"
        assert 0.0 <= xmin <= xmax <= 1.0, f"Invalid X coords in box: {box}"
        lang = feat.get('language', 'en')
        script = feat.get('script', 'Latin (English)')
        print(f"  * [{feat['category'].upper():10s}] '{feat['text']:30s}' | Script: {script} (lang={lang}) | Box: {box}")

    print("\n=====================================================================")
    print("           ALL LIVE DETECTION CHECKER TESTS PASSED                   ")
    print("=====================================================================")

if __name__ == '__main__':
    run_comprehensive_audit()
