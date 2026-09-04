"""
End-to-End Evaluation of User Uploaded Real Packaging Images:
1. Bella Vita Perfume (Back Statutory Panel)
2. Park Avenue Samurai (Front PDP + Side Statutory Panel)
3. Surf Excel Easy Wash (Front PDP + Back Statutory Panel)
"""

import os
import sys
import json
import cv2
import numpy as np

# Force UTF-8 for Windows console output
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import app

IMG_BELLA_VITA = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410247.jpg"
IMG_PARK_AVENUE_SIDE = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410309.jpg"
IMG_PARK_AVENUE_FRONT = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410320.jpg"
IMG_SURF_EXCEL_FRONT = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410327.jpg"
IMG_SURF_EXCEL_BACK = r"C:/Users/parth/.gemini/antigravity/brain/2561cd93-a7e5-48c4-aa72-1a70aa1f7ed9/.user_uploaded/media_1788276410328.jpg"

def clean_txt(text):
    if not isinstance(text, str):
        return str(text)
    return text.encode('ascii', 'replace').decode('ascii')

def run_tests():
    client = app.test_client()
    print("======================================================================")
    print("RUNNING END-TO-END PIPELINE AUDIT ON 5 REAL PACKAGING SAMPLES")
    print("======================================================================")

    # Test 1: Park Avenue Samurai Multi-Panel (Front PDP + Side Statutory)
    print("\n--- [TEST 1] Park Avenue Samurai Perfume (Multi-Panel) ---")
    if os.path.exists(IMG_PARK_AVENUE_FRONT) and os.path.exists(IMG_PARK_AVENUE_SIDE):
        with open(IMG_PARK_AVENUE_FRONT, 'rb') as f_front, open(IMG_PARK_AVENUE_SIDE, 'rb') as f_side:
            res = client.post('/extract', data={
                'front_image': (f_front, 'park_avenue_front.jpg'),
                'back_image_0': (f_side, 'park_avenue_side.jpg')
            }, content_type='multipart/form-data')
            
            print(f"Status Code: {res.status_code}")
            data = res.get_json()
            if res.status_code == 200:
                print(f"Product Name:        {clean_txt(data.get('productName'))}")
                print(f"Overall Verdict:     {data.get('overallVerdict')}")
                print(f"Compliance Rate:     {data.get('complianceRate')}%")
                print(f"Counterfeit Verdict: {data.get('counterfeit_metrics', {}).get('verdict')} (Score: {data.get('counterfeit_metrics', {}).get('counterfeitScore')}/100)")
                print(f"Panels Count:        {data.get('panelsCount')}")
                print(f"Barcode Detected:    {data.get('barcode', {}).get('detected')} ({data.get('barcode', {}).get('barcode')})")
                print(f"Total Extracted Features: {len(data.get('extracted_features', []))}")
                for feat in data.get('extracted_features', [])[:10]:
                    print(f"  - [{feat.get('category')} | {feat.get('side')}]: {clean_txt(feat.get('value'))} (conf: {feat.get('confidence_score'):.2f})")
                print("Rule Evaluations:")
                for r in data.get('ruleEvaluations', []):
                    print(f"  * {r.get('ruleCode')} [{r.get('status')}]: {clean_txt(r.get('title'))} -> {clean_txt(r.get('detectedValue'))}")
            else:
                print(f"Error: {data}")

    # Test 2: Surf Excel Easy Wash Multi-Panel (Front PDP + Back Statutory)
    print("\n--- [TEST 2] Surf Excel Easy Wash (Multi-Panel) ---")
    if os.path.exists(IMG_SURF_EXCEL_FRONT) and os.path.exists(IMG_SURF_EXCEL_BACK):
        with open(IMG_SURF_EXCEL_FRONT, 'rb') as f_front, open(IMG_SURF_EXCEL_BACK, 'rb') as f_back:
            res = client.post('/extract', data={
                'front_image': (f_front, 'surf_excel_front.jpg'),
                'back_image_0': (f_back, 'surf_excel_back.jpg')
            }, content_type='multipart/form-data')
            
            print(f"Status Code: {res.status_code}")
            data = res.get_json()
            if res.status_code == 200:
                print(f"Product Name:        {clean_txt(data.get('productName'))}")
                print(f"Overall Verdict:     {data.get('overallVerdict')}")
                print(f"Compliance Rate:     {data.get('complianceRate')}%")
                print(f"Counterfeit Verdict: {data.get('counterfeit_metrics', {}).get('verdict')} (Score: {data.get('counterfeit_metrics', {}).get('counterfeitScore')}/100)")
                print(f"Panels Count:        {data.get('panelsCount')}")
                print(f"Barcode Detected:    {data.get('barcode', {}).get('barcode')}")
                print(f"Total Extracted Features: {len(data.get('extracted_features', []))}")
                for feat in data.get('extracted_features', [])[:10]:
                    print(f"  - [{feat.get('category')} | {feat.get('side')}]: {clean_txt(feat.get('value'))} (conf: {feat.get('confidence_score'):.2f})")
                print("Rule Evaluations:")
                for r in data.get('ruleEvaluations', []):
                    print(f"  * {r.get('ruleCode')} [{r.get('status')}]: {clean_txt(r.get('title'))} -> {clean_txt(r.get('detectedValue'))}")
            else:
                print(f"Error: {data}")

    # Test 3: Bella Vita Perfume Single Statutory Panel
    print("\n--- [TEST 3] Bella Vita Perfume (Statutory Panel) ---")
    if os.path.exists(IMG_BELLA_VITA):
        with open(IMG_BELLA_VITA, 'rb') as f_bella:
            res = client.post('/extract', data={
                'front_image': (f_bella, 'bella_vita_back.jpg')
            }, content_type='multipart/form-data')
            
            print(f"Status Code: {res.status_code}")
            data = res.get_json()
            if res.status_code == 200:
                print(f"Product Name:        {clean_txt(data.get('productName'))}")
                print(f"Overall Verdict:     {data.get('overallVerdict')}")
                print(f"Compliance Rate:     {data.get('complianceRate')}%")
                print(f"Counterfeit Verdict: {data.get('counterfeit_metrics', {}).get('verdict')} (Score: {data.get('counterfeit_metrics', {}).get('counterfeitScore')}/100)")
                print(f"Total Extracted Features: {len(data.get('extracted_features', []))}")
                for feat in data.get('extracted_features', [])[:10]:
                    print(f"  - [{feat.get('category')} | {feat.get('side')}]: {clean_txt(feat.get('value'))} (conf: {feat.get('confidence_score'):.2f})")
            else:
                print(f"Error: {data}")

if __name__ == '__main__':
    run_tests()
