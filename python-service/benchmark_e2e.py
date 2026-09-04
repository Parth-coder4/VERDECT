import os
import sys
import time
import json
import logging
from collections import defaultdict
import cv2
import numpy as np

# Ensure app imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from core.ocr_ensemble import OCREnsemble

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../server/uploads'))

TEST_IMAGES = [
    'dairy_milk_test.jpg',
    'lahore_zeera_test.jpg'
]

# Adding a few more images dynamically if they exist
for file in os.listdir(UPLOAD_DIR):
    if file.startswith('scan_') and file.endswith('.jpg') and len(TEST_IMAGES) < 5:
        if file not in TEST_IMAGES:
            TEST_IMAGES.append(file)

def run_benchmark():
    logging.info("Starting E2E Benchmark...")
    client = app.test_client()
    
    results = []
    
    total_latency = 0.0
    field_detection_counts = defaultdict(int)
    
    for img_name in TEST_IMAGES:
        img_path = os.path.join(UPLOAD_DIR, img_name)
        if not os.path.exists(img_path):
            logging.warning(f"Test image missing: {img_path}")
            continue
            
        logging.info(f"Benchmarking: {img_name}")
        
        import io
        start_time = time.time()
        
        with open(img_path, 'rb') as f:
            img_data = f.read()
            
        response = client.post(
            '/api/v2/cv/extract',
            data={'front_image': (io.BytesIO(img_data), img_name)},
            content_type='multipart/form-data'
        )
        
        latency = time.time() - start_time
        total_latency += latency
        
        if response.status_code == 200:
            data = response.get_json()
            features = data.get('extracted_features', [])
            
            # Count categories
            cats_found = set([f['category'] for f in features if f['category'] != 'other'])
            for cat in cats_found:
                field_detection_counts[cat] += 1
                
            results.append({
                'image': img_name,
                'latency_sec': round(latency, 3),
                'total_features': len(features),
                'categories_found': list(cats_found),
                'overall_verdict': data.get('overallVerdict', 'UNKNOWN'),
                'compliance_rate': data.get('complianceRate', 0)
            })
            logging.info(f"  -> Latency: {latency:.2f}s | Categories: {list(cats_found)}")
        else:
            logging.error(f"  -> Failed: {response.status_code} {response.get_data(as_text=True)}")

    logging.info("="*40)
    logging.info("BENCHMARK SUMMARY")
    logging.info("="*40)
    num_tested = len(results)
    if num_tested > 0:
        avg_latency = total_latency / num_tested
        logging.info(f"Total Images Tested: {num_tested}")
        logging.info(f"Average E2E Latency: {avg_latency:.2f} seconds")
        logging.info("Detection Rates (out of tested):")
        for cat, count in sorted(field_detection_counts.items()):
            rate = (count / num_tested) * 100
            logging.info(f"  - {cat.upper()}: {rate:.1f}% ({count}/{num_tested})")
            
        # Write report to file
        report_path = os.path.join(os.path.dirname(__file__), 'benchmark_report.json')
        with open(report_path, 'w') as f:
            json.dump(results, f, indent=2)
        logging.info(f"Detailed report saved to {report_path}")
    else:
        logging.info("No images were tested.")

if __name__ == '__main__':
    run_benchmark()
