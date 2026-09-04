import os
import sys
import io
import time
import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app
from core.preprocessor import check_blur, detect_packaging_object_contour

def create_sample_frame(label="CADBURY DAIRY MILK", mrp="85.00", qty="150g", date="01/2025", blur=False):
    img = np.full((720, 1280, 3), 245, dtype=np.uint8)
    # Draw packaging contour box
    cv2.rectangle(img, (200, 100), (1080, 620), (220, 220, 220), -1)
    cv2.rectangle(img, (200, 100), (1080, 620), (180, 180, 180), 3)
    
    cv2.putText(img, label, (300, 220), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (80, 20, 80), 3)
    cv2.putText(img, f"MRP Rs. {mrp} incl. of all taxes", (300, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(img, f"Net Weight: {qty}", (300, 420), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    cv2.putText(img, f"Mfg Date: {date}", (300, 500), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (20, 20, 20), 2)
    
    if blur:
        img = cv2.GaussianBlur(img, (35, 35), 0)
    return img

def run_benchmarks():
    client = app.test_client()
    
    print("=== LIVE IMAGE DETECTION CHECKER BENCHMARK ===")
    
    # 1. Warm-up
    print("\n--- 1. Warmup Frame ---")
    img_warm = create_sample_frame()
    _, buf_warm = cv2.imencode('.jpg', img_warm, [cv2.IMWRITE_JPEG_QUALITY, 75])
    t0 = time.time()
    res_warm = client.post('/api/v2/cv/live-stream-ocr', data={'image': (io.BytesIO(buf_warm.tobytes()), 'frame.jpg')}, content_type='multipart/form-data')
    warm_ms = (time.time() - t0) * 1000.0
    print(f"Warmup Latency: {warm_ms:.1f}ms (HTTP Status: {res_warm.status_code})")
    
    # 2. Steady State Latency Benchmark (10 consecutive frames at 640x360 downscale as sent by WebcamScanner)
    print("\n--- 2. Steady-State Live Frame Inference Latency (10 iterations) ---")
    latencies = []
    res = None
    for i in range(10):
        img = create_sample_frame(mrp=f"{80 + i}.00")
        # Downscale to 640x360 matching WebcamScanner live frame size
        img_small = cv2.resize(img, (640, 360))
        _, buf = cv2.imencode('.jpg', img_small, [cv2.IMWRITE_JPEG_QUALITY, 75])
        
        t_start = time.perf_counter()
        res = client.post('/api/v2/cv/live-stream-ocr', data={'image': (io.BytesIO(buf.tobytes()), 'frame.jpg')}, content_type='multipart/form-data')
        t_end = time.perf_counter()
        
        elapsed_ms = (t_end - t_start) * 1000.0
        latencies.append(elapsed_ms)
        assert res.status_code == 200, f"Frame {i} failed"
    
    avg_latency = np.mean(latencies)
    min_latency = np.min(latencies)
    max_latency = np.max(latencies)
    p95_latency = np.percentile(latencies, 95)
    fps = 1000.0 / avg_latency
    
    print(f"Avg Latency: {avg_latency:.2f} ms")
    print(f"Min Latency: {min_latency:.2f} ms")
    print(f"Max Latency: {max_latency:.2f} ms")
    print(f"95th Percentile: {p95_latency:.2f} ms")
    print(f"Effective Live Throughput: {fps:.1f} FPS")
    print(f"Sub-60ms Target Met: {'YES (PASS)' if avg_latency < 60.0 else 'NO (Optimizing needed)'}")

    # 3. Blur Detection & Gate Rejection
    print("\n--- 3. Blur Detection & Threshold Validation ---")
    sharp_img = create_sample_frame(blur=False)
    blurry_img = create_sample_frame(blur=True)
    
    is_blurry_s, score_s = check_blur(sharp_img, threshold=80.0)
    is_blurry_b, score_b = check_blur(blurry_img, threshold=80.0)
    print(f"Sharp Frame: Focus Score = {score_s:.1f}, Is Blurry = {is_blurry_s}")
    print(f"Blurry Frame: Focus Score = {score_b:.1f}, Is Blurry = {is_blurry_b}")
    
    # Fast check-frame endpoint
    _, b_buf = cv2.imencode('.jpg', blurry_img)
    t_cf = time.perf_counter()
    res_cf = client.post('/api/v2/cv/check-frame', data={'image': (io.BytesIO(b_buf.tobytes()), 'blur.jpg')}, content_type='multipart/form-data')
    cf_ms = (time.perf_counter() - t_cf) * 1000.0
    cf_data = res_cf.get_json()
    print(f"/api/v2/cv/check-frame: {cf_ms:.2f}ms | is_blurry: {cf_data['is_blurry']}, focus_measure: {cf_data['focus_measure']}")

    # 4. Packaging Contour & PDP Boundary Locking
    print("\n--- 4. Packaging Contour Boundary Detection ---")
    contour_res = detect_packaging_object_contour(sharp_img)
    print(f"Contour Detection Result: {contour_res}")
    assert contour_res['detected'] == True
    assert len(contour_res['box']) == 4
    ymin, xmin, ymax, xmax = contour_res['box']
    assert 0.0 <= ymin < ymax <= 1.0
    assert 0.0 <= xmin < xmax <= 1.0
    print(f"Normalized Bounding Box: [ymin={ymin}, xmin={xmin}, ymax={ymax}, xmax={xmax}] -> VALID")

    # 5. Live Statutory Recognition Accuracy
    data = res.get_json()
    print("\n--- 5. Statutory Extraction Accuracy ---")
    print(f"Brand Detected: {data['brand_name']}")
    print(f"Statutory Categories: {data['statutory_categories']}")
    print(f"Feature Count: {len(data['features'])}")
    for f in data['features']:
        print(f"  * {f['category'].upper()}: '{f['text']}' @ box={f['box']}")

if __name__ == '__main__':
    run_benchmarks()
