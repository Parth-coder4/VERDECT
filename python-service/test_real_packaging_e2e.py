import cv2
import numpy as np
import os
import sys
import time
import json

# Force UTF-8 on stdout
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from core.ocr_ensemble import OCREnsemble

TEST_PAIRS = [
    {
        "name": "Bella Vita Perfume (Back Panel)",
        "front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg",
        "backs": []
    },
    {
        "name": "Park Avenue Samurai (Front PDP + Side Panel)",
        "front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg",
        "backs": [
            r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"
        ]
    },
    {
        "name": "Surf Excel Easy Wash (Front PDP + Back Panel)",
        "front": r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg",
        "backs": [
            r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"
        ]
    }
]

def run_tests():
    client = app.test_client()
    print("="*70)
    print("RUNNING REAL PACKAGING E2E BENCHMARK")
    print("="*70)
    
    total_latency = 0.0
    summary_results = []
    
    for idx, test_case in enumerate(TEST_PAIRS, 1):
        print(f"\n[{idx}/{len(TEST_PAIRS)}] Testing: {test_case['name']}")
        
        # Prepare multipart payload
        import io
        data = {}
        with open(test_case['front'], 'rb') as f:
            data['front_image'] = (io.BytesIO(f.read()), os.path.basename(test_case['front']))
            
        for b_idx, b_path in enumerate(test_case['backs']):
            with open(b_path, 'rb') as f:
                data[f'back_image_{b_idx}'] = (io.BytesIO(f.read()), os.path.basename(b_path))
                
        t0 = time.time()
        res = client.post('/api/v2/cv/extract', data=data, content_type='multipart/form-data')
        latency = time.time() - t0
        total_latency += latency
        
        if res.status_code == 200:
            json_res = res.get_json()
            features = json_res.get('extracted_features', [])
            evals = json_res.get('ruleEvaluations', [])
            verdict = json_res.get('overallVerdict')
            comp_rate = json_res.get('complianceRate')
            brand_res = json_res.get('brandVerification', {})
            
            print(f"  -> Latency: {latency:.2f}s | Verdict: {verdict} | Compliance: {comp_rate}%")
            print(f"  -> Detected Brand: '{brand_res.get('detected_brand')}' [Status: {brand_res.get('status')}]")
            print(f"  -> Extracted Features ({len(features)} total):")
            
            cats = {}
            for feat in features:
                c = feat.get('category')
                cats.setdefault(c, []).append(feat.get('value'))
                
            for c, vals in cats.items():
                print(f"       * {c:14s}: {vals[:2]}")
                
            print("  -> Statutory Rule Evaluations:")
            for ev in evals:
                status_sym = "[PASS]" if ev['status'] == 'PASS' else f"[{ev['status']}]"
                print(f"       {status_sym:8s} {ev['title'][:40]:40s} -> '{ev['detectedValue'][:45]}'")
                
            summary_results.append({
                "test": test_case['name'],
                "latency": round(latency, 2),
                "verdict": verdict,
                "compliance": comp_rate,
                "brand": brand_res.get('detected_brand'),
                "rules_passed": sum(1 for e in evals if e['status'] == 'PASS'),
                "rules_total": len(evals)
            })
        else:
            print(f"  -> ERROR {res.status_code}: {res.get_data(as_text=True)}")
            
    print("\n" + "="*70)
    print("BENCHMARK SUMMARY TABLE")
    print("="*70)
    for r in summary_results:
        print(f"  * {r['test'][:35]:35s} | {r['latency']:5.2f}s | {r['verdict']:14s} | {r['compliance']}% ({r['rules_passed']}/{r['rules_total']}) | Brand: {r['brand']}")
        
    avg_latency = total_latency / len(summary_results) if summary_results else 0
    print(f"\nAverage E2E Latency: {avg_latency:.2f}s across {len(summary_results)} multi-panel packages.")

if __name__ == '__main__':
    run_tests()
