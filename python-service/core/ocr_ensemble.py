"""
Multi-Engine Ensemble OCR Pipeline
Combines PaddleOCR (PP-OCRv4) and EasyOCR with spatial line clustering, IoU bounding box fusion, and statutory field classification.
"""

import cv2
import numpy as np
import logging
import re
import os
import sys
import unicodedata

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

# ──────────────────────────────────────────────
# Regex patterns for robust Indian-packaging OCR
# Priority: ingredients > nutrition > mrp > quantity > date > fssai > address > helpline > other
# Single-character keywords removed — pure regex matching used to avoid false positives.
# ──────────────────────────────────────────────
_RE_NUTRITION = re.compile(
    r'(?:'
    r'energy|calories|kcal|protein|(?:total\s+)?fat|carbohydrate|sodium|fibre|fiber'
    r'|per\s+100\s*(?:g|ml)|per\s+serving|serving\s+size'
    r'|saturated|trans\s+fat|cholesterol|total\s+sugars?|dietary'
    r'|vitamins?\s+[a-z]|minerals?|calcium|iron|potassium'
    r'|पोषण|ऊर्जा|प्रोटीन|कार्बोहाइड्रेट|वसा|सोडियम|कैलरी|प्रति\s*[0-9०-९]+'  # Hindi/Devanagari
    r'|ஊட்டச்சத்து|புரதம்|கொழுப்பு|சக்தி'                                   # Tamil
    r'|పోషకాహార(?:ం|లు)?|పోషక|ప్రోటీన్|కొవ్వు|శక్తి'                                   # Telugu
    r'|પૌષ્ટિક|પ્રોટીન|ચરબી|શક્તિ'                                      # Gujarati
    r'|পুষ্টি|প্রোটিন|ফ্যাট|শক্তি'                                      # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_MRP = re.compile(
    r'(?:'
    r'(?:^|\s|\*)mrp(?:\.|\s|[:\?*]|$)|m\.r\.p\.?|maximum\s+retail\s+price|retail\s+price'
    r'|₹\s*[\d०-९,]+(?:\.[\d०-९]+)?'              # ₹40  ₹ 40.00 (Latin/Indic digits)
    r'|rs\.?\s*[\d०-९,]+(?:\.[\d०-९]+)?'          # Rs40  Rs. 40.00
    r'|inr\s*[\d०-९,]+(?:\.[\d०-९]+)?'            # INR 40
    r'|incl(?:usive)?\.?\s*(?:of)?\s*all\s*tax(?:es)?'   # incl. of all tax
    r'|usp(?:\s*per|\s*/|\s*:)?\s*[\d०-९,]+(?:\.[\d०-९]+)?'     # USP: 8.99 per ml
    # ── Multilingual Indic MRP declarations ─────────────────────────────────
    r'|अधिकतम\s*(?:खुदरा|विक्रय)\s*मूल्य|अ\.खू\.मू|एम\.आर\.पी|एमआरपी'  # Hindi/Marathi
    r'|सभी\s*करों\s*सहित|कर\s*सहित|सर्व\s*करांसहित'
    r'|அதிகபட்ச\s*சில்லறை\s*விலை|விலை|அ\.சி\.வி|அனைத்து\s*வரிகளும்\s*உட்பட' # Tamil
    r'|గరిష్ట\s*రిటైల్\s*ధర|ధర|అన్ని\s*పన్నులతో\s*సహా'                       # Telugu
    r'|મહત્તમ\s*છૂટક\s*કિંમત|કિંમત|તમામ\s*કર\s*સહિત'                         # Gujarati
    r'|সর্বোচ্চ\s*খুচরা\s*মূল্য|মূল্য|সকল\s*কর\s*সহ'                        # Bengali
    # ── Common OCR misreads of the ₹ (U+20B9) rupee symbol ──────────────────
    r'|\bR\s+\d{1,5}(?:\.\d{1,2})?\b'    # "R 10"
    r'|\b2\s+\d{1,5}(?:\.\d{1,2})?\b'    # "2 10"
    r'|\bF\s+\d{1,5}(?:\.\d{1,2})?\b'    # "F 10"
    r'|\b[Rr][Ss]\s*\.?\s*\d{1,5}\b'     # "Rs10"
    r'|[?\uFF1A]\s*\d{1,5}\s*(?:/-)?'    # '? 599/-' or '：599/-'
    r'|\b\d{1,5}(?:\.\d{1,2})?\s*/-(?:\s|$)'   # '599/-'
    r')',
    re.IGNORECASE | re.UNICODE
)

# Positional price-tag heuristic:
_RE_PRICE_TAG_NUMBER = re.compile(
    r'^\s*[^a-zA-Z0-9:\u0900-\u0D7F]*\s*([\d०-९]{1,5}(?:\.[\d०-९]{1,2})?)\s*[^a-zA-Z0-9:\u0900-\u0D7F]*$'
)

# Minimum price to avoid matching year numbers like "2024"
_PRICE_MIN, _PRICE_MAX = 1, 9999


_RE_QTY = re.compile(
    r'(?:'
    r'net\s*(?:wt|weight|vol|volume|qty|quantity|contents?)'
    r'|\b[\d०-९]+(?:\.[\d०-९]+)?\s*(?:grams?|kilograms?|millilit(?:re|er)s?|lit(?:re|er)s?)\b'
    r'|\b[\d०-९]+(?:\.[\d०-९]+)?\s*(?:gm|gms|kgs?|mls?|ltrs?|lts?|fl\.?\s*oz\.?)\b'
    r'|\b[\d०-९]+(?:\.[\d०-९]+)?\s*(?:kg|g|l|ml)\b'
    r'|\b[\d०-९]+(?:\.[\d०-९]+)?\s*ml\s*/\s*[\d०-९]+(?:\.[\d०-९]+)?\s*g\b'
    r'|\bnet\s+[\d०-९]'
    # ── Multilingual Indic Net Quantity & Units ─────────────────────────────
    r'|शुद्ध\s*(?:मात्रा|वजन|तोल)|निव्वळ\s*वजन|निकासी\s*मात्रा'          # Hindi / Marathi
    r'|நிகர\s*(?:எடை|அளவு)|அளவு'                                        # Tamil
    r'|నికర\s*(?:పరిమాణం|బరువు)|పరిమాణం'                                  # Telugu
    r'|ચોખ્ખું\s*વજન|વજન'                                               # Gujarati
    r'|মোট\s*ওজন|পরিমাণ'                                               # Bengali
    r'|[\d०-९]+\s*(?:ग्राम|किलोग्राम|मिली|लीटर|मि\.ली|ली\.|ഗ്രാം|கிலோ|கிராம்|మిల్లీ|లీటర్)'
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_DATE = re.compile(
    r'(?:'
    r'mfg\.?\s*(?:date|dt|on)\b|mfg\s*[:\-]|date\s+of\s+(?:mfg|manufacture|manufacturing|packing|mfr)'
    r'|pkd\.?\s*(?:date|dt|on)\b|pkd\s*[:\-]|packing\s+date|packed\s+on'
    r'|best\s+before|use\s+(?:by|before)|expir(?:y|es?|ation)\s*(?:date)?|bb\s*:'
    r'|\b[\d०-९]{1,2}[/\.\-][\d०-९]{1,2}[/\.\-][\d०-९]{2,4}\b'
    r'|\b(?:0[1-9]|1[0-2]|०[१-९]|१[०-२])[/\.\-](?:20\d{2}|\d{2}|२०[०-९]{2})\b'
    r'|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-][\d०-९]{2,4}\b'
    # ── Multilingual Indic Dates ────────────────────────────────────────────
    r'|निर्माण\s*(?:की\s*)?(?:तिथि|दिनांक)|उत्पादन\s*दिनांक|पैकिंग\s*(?:की\s*)?(?:तिथि|दिनांक)|पैक्ड'
    r'|उपयोग\s*की\s*अंतिम\s*तिथि|समाप्ति\s*तिथि|सर्वोत्तम\s*उपयोग'
    r'|தயாரிப்பு\s*தேதி|உபயோகிக்கும்\s*காலம்|காலாவதி\s*தேதி'            # Tamil
    r'|తయారీ\s*తేదీ|ఉత్పత్తి\s*తేదీ|గడువు\s*తేదీ'                     # Telugu
    r'|ઉત્પાદન\s*તારીખ|વાપરવાની\s*છેલ્લી\s*તારીખ'                      # Gujarati
    r'|তৈরির\s*তারিখ|মেয়াদ\s*উত্তীর্ণের\s*তারিখ'                        # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_BATCH = re.compile(
    r'(?:'
    r'batch\s*(?:no|code|num)?\.?\s*:?'
    r'|b\.?\s*no\.?\s*:?'
    r'|\blot\s*(?:no|num)?\.?\s*:?'
    # ── Multilingual Indic Batch Code ───────────────────────────────────────
    r'|बैच\s*(?:संख्या|सं|कोड|नं)?\.?\s*:?'                            # Hindi
    r'|தொகுதி\s*எண்'                                                   # Tamil
    r'|బ్యాచ్\s*(?:నంబర్|సంఖ్య)'                                        # Telugu
    r'|જથ્થા\s*નંબર'                                                   # Gujarati
    r'|ব্যাচ\s*নং'                                                    # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_FSSAI = re.compile(
    r'(?:'
    r'fssai|food\s+safety|f\.s\.s\.a\.i'
    r'|lic(?:ense|ence|\.)\s*(?:no|num|number)?\.?\s*:?'
    r'|m\.?l\.?\s*no\.?|mfg\.?\s*lic\.?\s*no\.?|mfglic\.?\s*no\.?'
    r'|permit\s+no\.?|st\.?\s*ex\.?\s*lic\.?\s*no\.?'
    r'|lic\s*no\.?'
    r'|cm[/\\]l\s*no'
    r'|\bbis\b|\bbis\s*lic|\bbis\s*cert|isi\s+mark|agmark|iso\s*\d{4,5}'
    # ── Multilingual Indic Licensing ────────────────────────────────────────
    r'|एफएसएसएआई|खाद्य\s*सुरक्षा|लाइसेंस\s*(?:सं|संख्या|नं)?\.?\s*:?|परवाना\s*(?:क्रमांक|क्र|नं)?\.?\s*:?'   # Hindi / Marathi
    r'|உரிம\s*எண்'                                                     # Tamil
    r'|లైసెన్స్\s*సంఖ్య'                                                # Telugu
    r'|પરવાના\s*નંબર'                                                  # Gujarati
    r'|লাইসেন্স\s*নং'                                                  # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_ADDRESS = re.compile(
    r'(?:'
    r'mfg\.?\s+by|manufactured\s+by|marketed\s+by|packed\s+by|imported\s+by|distributed\s+by'
    r'|pvt\.?\s*ltd\.?|private\s+limited|limited|llp\b|ltd\b'
    r'|plot\s*(?:no|num)?\.?\s*\d'
    r'|(?:phase|sector|block)\s*[a-z]?\s*[\d\-]'
    r'|\b[1-9]\d{5}\b'                    # 6-digit PIN code (Indian)
    r'|industrial\s+(?:area|estate|zone|plot)|ind\.\s*area'
    r'|midc|gidc|hsiidc|upsidc'
    r'|\bnagar\b|\bmarg\b|\bcolony\b|\blayout\b|\broad\b|\brd\b|\bhighway\b|\bexpressway\b'
    r'|dist(?:rict)?\.?\s*(?:\w+)|tehsil\b|village\b'
    r'|(?:mumbai|delhi|bengaluru|bangalore|hyderabad|chennai|kolkata|pune|ahmedabad|surat|jaipur|lucknow|kanpur|nagpur|coimbatore|indore|thane|bhopal|visakhapatnam|vadodara|agra|ludhiana|nashik|faridabad|meerut|rajkot|varanasi|aurangabad|amritsar|ranchi|guwahati|chandigarh|dehradun|noida|gurugram|gurgaon|alwar|neemrana|rajpura|ropar|hamirpur|sumerpur|vikhroli|khandsa)\b'
    r'|(?:gujarat|maharashtra|rajasthan|haryana|punjab|uttar\s+pradesh|karnataka|tamil\s+nadu|andhra\s+pradesh|telangana|kerala|odisha|jharkhand|west\s+bengal|madhya\s+pradesh|bihar|assam|himachal|uttarakhand)\b'
    r'|india\s*[-–\s]*\d{6}|made\s*in\s*india'
    r'|registered\s+address|regd\.\s*office|godrej|unilever|hindustan\s+unilever|idam|stella|helios|aroma\s+de\s+france'
    # ── Multilingual Indic Address & Manufacturer ───────────────────────────
    r'|निर्माता|उत्पादक|पैकर|द्वारा\s*निर्मित|मार्केटेड\s*बाय|द्वारा\s*पैक|पंजीकृत\s*(?:कार्यालय|पता)|भारत\s*में\s*निर्मित|उत्पत्ति\s*का\s*देश' # Hindi
    r'|தயாரிப்பாளர்|விற்பனையாளர்|உற்பத்தியாளர்|தயாரிப்பு\s*நாடு'         # Tamil
    r'|తయారీదారు|విక్రేత|ఉత్పత్తిదారు'                                    # Telugu
    r'|ઉત્પાદક|વેચાણકર્તા|ઉત્પાદન\s*દેશ'                                  # Gujarati
    r'|প্রস্তুতকারক|কোম্পানি|উৎপাদনকারী'                               # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_HELPLINE = re.compile(
    r'(?:'
    r'consumer\s*(?:care|helpline|services?|affairs?|complaints?)'
    r'|customer\s*(?:care|service|support)'
    r'|helpline|toll[\s\-]*free'
    r'|grievance|feedback\s*(?:no|number|num)?'
    r'|1[\s\-]*800[\s\-]*\d{3,4}[\s\-]*\d{3,5}'        # 1-800-266-0007 / 1800-XXX-XXXX toll-free
    r'|1800\d{6,9}'                        # 18001234567
    r'|\+?91[\s\-]*[6-9]\d{9}'             # +919311732440
    r'|[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,6}'  # email
    r'|www\.[a-z0-9\-]+\.[a-z]{2,}'       # website
    # ── Multilingual Indic Consumer Grievance & Helpline ────────────────────
    r'|ग्राहक\s*(?:सेवा|सहायता|देखभाल)|उपभोक्ता\s*(?:सेवा|मामले|हेल्पलाइन)|हेल्पलाइन|शिकायत\s*(?:निवारण|दर्ज)|टोल\s*फ्री' # Hindi
    r'|வாடிக்கையாளர்\s*சேவை'                                           # Tamil
    r'|వినియోగదారుల\s*సేవ|హెల్ప్‌లైన్'                                   # Telugu
    r'|ગ્રાહક\s*સેવા|હેલ્પલાઇન'                                        # Gujarati
    r'|গ্রাহক\s*সেবা|হেল্পলাইন'                                        # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_INGREDIENTS = re.compile(
    r'(?:'
    r'ingredients?\s*:'
    r'|contains?\s*:'
    r'|made\s+(?:with|from|of)\s*:'
    r'|allergen|may\s+contain'
    r'|alcohol\s*\(\d+%\s*v/v\)|alcohol\s*denat'
    r'|denatured\s+with|denatonium\s+benzoate'
    r'|added\s+(?:colour|color|flavour|flavor|preservative)'
    r'|permitted\s+(?:class|food|natural)'
    # ── Multilingual Indic Ingredients ──────────────────────────────────────
    r'|सामग्री\s*:?|घटक\s*:?|सामग्रियां|घटकांचे\s*प्रमाण'                # Hindi / Marathi
    r'|பொருட்கள்|பொருளடக்கம்'                                            # Tamil
    r'|పదార్థాలు'                                                        # Telugu
    r'|સામગ્રી|ઘટકો'                                                     # Gujarati
    r'|উপাদানসমূহ|উপাদান'                                              # Bengali
    r')',
    re.IGNORECASE | re.UNICODE
)

_RE_COUNTERFEIT_SPELLING = re.compile(
    r'(?:net\s+weigt|best\s+befor|max\s+retale\s+price|inclusiv\s+of|maufactured|manufacured|fssi\b|packd|ingredints)',
    re.IGNORECASE
)


# Specific characters and lexicon for Indic language disambiguation
_MARATHI_GLYPHS = set('\u0933\u0931\u095F')  # 'ळ' (U+0933), 'ऱ' (U+0931 / U+095F)

# Marathi-specific attached grammatical suffixes, postpositions, and inflections
_MARATHI_SUFFIX_RE = re.compile(
    r'[\u0900-\u097F]{2,}(?:च्या|ची|चे|चा|तील|साठी|मध्ये|वरून|कडून|करांसहित)\b'
)

# Marathi lexical markers (Packaging & Commodity)
_MARATHI_LEXICON = {
    'पुलाची', 'प्रसिद्ध', 'भेळ', 'करांसहित', 'निव्वळ', 'उत्पादक', 'दिनांक',
    'जिभेला', 'चव', 'येणारी', 'माणसं', 'स्पेशल', 'वापरा', 'घटकांचे', 'पत्ता', 'संपर्क',
    'आशा', 'चिवडा', 'लाडू', 'चकली', 'मसाले', 'शेव', 'लोणचे', 'पापड', 'आंबटगोड',
    'कुरकुरीत', 'स्वादिष्ट', 'उत्कृष्ट', 'खाद्यपदार्थ', 'विक्रेता', 'ग्राहक', 'सेवा',
    'महाराष्ट्र', 'पुणे', 'मुंबई', 'कोल्हापूर', 'सोलापूर', 'नाशिक', 'नागपूर', 'सातारा', 'सांगली'
}

# Hindi standalone grammatical markers (का, के, की, में, से, पर, द्वारा, लिए)
_HINDI_POSTPOSITIONS_RE = re.compile(
    r'\b(?:का|के|की|में|से|पर|द्वारा|लिए|है|हैं|था|थी|थे)\b'
)

# Hindi lexical markers (Packaging & Commodity)
_HINDI_LEXICON = {
    'सभी करों सहित', 'शुद्ध मात्रा', 'शुद्ध वजन', 'निकासी मात्रा',
    'निर्माण तिथि', 'उत्पादन दिनांक', 'पैकिंग तिथि', 'उपयोग की अंतिम तिथि', 'समाप्ति तिथि',
    'सामग्री', 'सामग्रियां', 'घटक द्रव्य',
    'उपभोक्ता सेवा', 'उपभोक्ता मामले', 'हेल्पलाइन', 'शिकायत निवारण', 'टोल फ्री',
    'निर्माता', 'दुकानदार', 'पंजीकृत कार्यालय', 'उत्पत्ति का देश', 'भारत में निर्मित',
    'बैच संख्या', 'एमआरपी', 'अधिकतम खुदरा मूल्य', 'अ.खू.मू',
    'उत्तर प्रदेश', 'मध्य प्रदेश', 'राजस्थान', 'बिहार', 'हरियाणा', 'उत्तराखंड', 'दिल्ली', 'अलवर', 'हरिद्वार'
}

# Common English Packaging Acronyms / Valid Abbreviations (Not garble)
_VALID_LATIN_ACRONYMS = {
    'mrp', 'mfg', 'pkd', 'exp', 'lic', 'fssai', 'veg', 'non', 'no', 'rs', 'wt', 'qty',
    'gm', 'gms', 'kg', 'kgs', 'ml', 'mls', 'ltr', 'lt', 'cm', 'mm', 'bb', 'd', 'g', 'l', 'b',
    'usp', 'inr', 'net', 'max', 'vol', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    'iso', 'bis', 'isi', 'cin', 'gstin', 'fmcg', 'llp', 'ltd', 'pvt', 'care', 'tel', 'fax', 'regd', 'midc', 'gidc',
    'pack', 'brand', 'plus', 'super', 'pure', 'rich', 'gold', 'real', 'special', 'bhel', 'family'
}

# Regex for known garbled Latin hallucinations produced by Latin OCR on Devanagari text
_RE_GARBLED_LATIN = re.compile(
    r'^(?:RRTO|RRE|TT|IIL|O00|I1l|HHL|ZRR|W0|LL|NN|SS|ER|TET|V1|FF|CC|PP|BB|DD|KK|MM|YY|ZZ|[B-DF-HJ-NP-TV-Z]{2,4})$',
    re.IGNORECASE
)

# Generic commodity and product type descriptors that should not contaminate the core brand name
_COMMODITY_DESCRIPTORS_RE = re.compile(
    r'\b(?:b?iscuits?|riscuits?|cookies?|rusk|namkeen|chips|wafers?|bread|cakes?|juice|chai|tea|coffee|oil|atta|flour|sugar|salt|spices|masala|noodles|snack|snacks|confectionery|candy|toffee|balls|p?remiums?|remiums?|classic|select|gold|special|family\s*pack)\b',
    re.IGNORECASE
)



def disambiguate_devanagari_language(text: str) -> tuple[str, str]:
    """
    Disambiguates Devanagari text between Marathi ('mr') and Hindi ('hi').
    Returns (script_label, lang_code).
    """
    if not text:
        return ('Hindi (हिंदी)', 'hi')

    # 1. Definite Marathi glyph check: 'ळ' (\u0933) or 'ऱ' (\u0931 / \u095F)
    for ch in text:
        if ch in _MARATHI_GLYPHS:
            return ('Marathi (मराठी)', 'mr')

    # 2. Marathi grammatical suffix matching
    if _MARATHI_SUFFIX_RE.search(text):
        return ('Marathi (मराठी)', 'mr')

    # 3. Lexical score calculation
    marathi_score = 0
    hindi_score = 0

    for kw in _MARATHI_LEXICON:
        if kw in text:
            marathi_score += 3

    for kw in _HINDI_LEXICON:
        if kw in text:
            hindi_score += 3

    if _HINDI_POSTPOSITIONS_RE.search(text):
        hindi_score += 2

    if marathi_score > hindi_score:
        return ('Marathi (मराठी)', 'mr')
    elif hindi_score > marathi_score:
        return ('Hindi (हिंदी)', 'hi')
    else:
        # Default to Hindi for standard neutral Devanagari
        return ('Hindi (हिंदी)', 'hi')


def detect_script(text: str) -> dict:
    """
    Detects script family, ISO 639-1 language code, and multilingual flag for a given text token.
    Accurately resolves Latin (English), Devanagari (Marathi & Hindi), Tamil, Telugu, Gujarati,
    Bengali, Kannada, Malayalam, Gurmukhi (Punjabi), and Odia.
    """
    if not text:
        return {'script': 'Latin (English)', 'language': 'en', 'is_multilingual': False, 'script_family': 'Latin'}

    counts = {
        'devanagari': 0,
        'tamil': 0,
        'telugu': 0,
        'gujarati': 0,
        'bengali': 0,
        'kannada': 0,
        'malayalam': 0,
        'gurmukhi': 0,
        'odia': 0,
        'latin': 0,
    }

    for ch in text:
        code = ord(ch)
        if 0x0900 <= code <= 0x097F:
            counts['devanagari'] += 1
        elif 0x0B80 <= code <= 0x0BFF:
            counts['tamil'] += 1
        elif 0x0C00 <= code <= 0x0C7F:
            counts['telugu'] += 1
        elif 0x0A80 <= code <= 0x0AFF:
            counts['gujarati'] += 1
        elif 0x0980 <= code <= 0x09FF:
            counts['bengali'] += 1
        elif 0x0C80 <= code <= 0x0CFF:
            counts['kannada'] += 1
        elif 0x0D00 <= code <= 0x0D7F:
            counts['malayalam'] += 1
        elif 0x0A00 <= code <= 0x0A7F:
            counts['gurmukhi'] += 1
        elif 0x0B00 <= code <= 0x0B7F:
            counts['odia'] += 1
        elif ch.isascii() and ch.isalnum():
            counts['latin'] += 1

    indic_counts = {
        'devanagari': counts['devanagari'],
        'tamil': counts['tamil'],
        'telugu': counts['telugu'],
        'gujarati': counts['gujarati'],
        'bengali': counts['bengali'],
        'kannada': counts['kannada'],
        'malayalam': counts['malayalam'],
        'gurmukhi': counts['gurmukhi'],
        'odia': counts['odia'],
    }

    max_indic_count = max(indic_counts.values())
    total_indic = sum(indic_counts.values())
    total_latin = counts['latin']

    if max_indic_count > 0 and (total_indic >= 2 or total_indic >= total_latin * 0.25):
        dominant = max(indic_counts, key=indic_counts.get)
        if dominant == 'devanagari':
            script_label, lang_code = disambiguate_devanagari_language(text)
            return {'script': script_label, 'language': lang_code, 'is_multilingual': True, 'script_family': 'Devanagari'}
        elif dominant == 'tamil':
            return {'script': 'Tamil (தமிழ்)', 'language': 'ta', 'is_multilingual': True, 'script_family': 'Tamil'}
        elif dominant == 'telugu':
            return {'script': 'Telugu (తెలుగు)', 'language': 'te', 'is_multilingual': True, 'script_family': 'Telugu'}
        elif dominant == 'gujarati':
            return {'script': 'Gujarati (ગુજરાતી)', 'language': 'gu', 'is_multilingual': True, 'script_family': 'Gujarati'}
        elif dominant == 'bengali':
            return {'script': 'Bengali (বাংলা)', 'language': 'bn', 'is_multilingual': True, 'script_family': 'Bengali'}
        elif dominant == 'kannada':
            return {'script': 'Kannada (ಕನ್ನಡ)', 'language': 'kn', 'is_multilingual': True, 'script_family': 'Kannada'}
        elif dominant == 'malayalam':
            return {'script': 'Malayalam (മലയാളം)', 'language': 'ml', 'is_multilingual': True, 'script_family': 'Malayalam'}
        elif dominant == 'gurmukhi':
            return {'script': 'Gurmukhi (ਪੰਜਾਬੀ)', 'language': 'pa', 'is_multilingual': True, 'script_family': 'Gurmukhi'}
        elif dominant == 'odia':
            return {'script': 'Odia (ଓଡ଼ିଆ)', 'language': 'or', 'is_multilingual': True, 'script_family': 'Odia'}

    return {'script': 'Latin (English)', 'language': 'en', 'is_multilingual': False, 'script_family': 'Latin'}


def is_latin_hallucination(text: str, conf: float) -> bool:
    """
    Identifies out-of-vocabulary Latin character hallucinations generated when
    the English OCR engine processes Indic/Devanagari scripts (e.g. 'RRTO', 'RRE', 'TTध', '||||').
    """
    if not text:
        return True

    if not re.search(r'[a-zA-Z0-9\u0900-\u0D7F]', text):
        return True

    if re.fullmatch(r'[lI1|:;~_\-\.]{2,}', text, re.IGNORECASE):
        return True

    clean = re.sub(r'[^a-zA-Z]', '', text).strip()
    if not clean:
        return False

    clean_lower = clean.lower()
    if clean_lower in _VALID_LATIN_ACRONYMS or re.search(r'\d', text):
        return False

    if _RE_GARBLED_LATIN.match(clean):
        return True

    has_vowel = bool(re.search(r'[aeiouyAEIOUY]', clean))
    if not has_vowel and len(clean) >= 2:
        return True

    if len(clean) <= 2 and conf < 0.75:
        return True

    if re.search(r'([bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ])\1', clean) and conf < 0.88:
        return True

    if re.search(r'^[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{2,}', clean) and conf < 0.85:
        return True

    return False


def prune_script_crosstalk(text: str) -> str:
    """
    Prunes out-of-vocabulary cross-talk:
    - If text contains Devanagari/Indic, strips all embedded/stray Latin hallucinations (e.g. 'TTध' -> 'ध', 'कूE' -> 'कू', 'काe TनIध' -> 'कानध').
    - If text is predominantly Latin, strips isolated Indic noise (e.g. 'BATCH NO: ध' -> 'BATCH NO:').
    - Normalizes known Indic packaging phrases and terms.
    """
    if not text:
        return ""

    dev_count = sum(1 for ch in text if 0x0900 <= ord(ch) <= 0x097F)
    latin_count = sum(1 for ch in text if ch.isascii() and ch.isalpha())

    if dev_count >= 1:
        # Strip all stray Latin letters and glyph noise from Devanagari
        cleaned = re.sub(r'[a-zA-Z]+', '', text)
        cleaned = re.sub(r'[,|._\-~`\'"!?:]', '', cleaned)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        text = cleaned if cleaned else text

    # Normalize Devanagari punctuation and diacritic spacing
    text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)  # remove zero-width chars
    text = re.sub(r'\s+', ' ', text).strip()

    if latin_count >= 4 and dev_count <= 1:
        cleaned = re.sub(r'[\u0900-\u097F]', '', text)
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned if cleaned else text

    return text


def arbitrate_crop_script(latin_text: str, latin_conf: float, dev_text: str, dev_conf: float) -> tuple[str, float, dict]:
    """
    Evaluates Latin OCR output vs Devanagari OCR output for a single bounding box crop.
    Arbitrates script candidacy, prunes hallucinations, and returns (best_text, best_conf, script_meta).
    Guarantees zero script collision on English packaging while accurately recovering Indic tokens.
    """
    clean_lat = unicodedata.normalize('NFKC', str(latin_text or '')).strip()
    clean_dev = unicodedata.normalize('NFKC', str(dev_text or '')).strip()
    clean_dev = prune_script_crosstalk(clean_dev)

    dev_meta = detect_script(clean_dev)
    lat_meta = detect_script(clean_lat)

    lat_is_garble = is_latin_hallucination(clean_lat, latin_conf)
    dev_has_indic = dev_meta['is_multilingual']

    dev_indic_chars = sum(1 for ch in clean_dev if 0x0900 <= ord(ch) <= 0x0D7F)
    lat_alpha_chars = sum(1 for ch in clean_lat if ch.isascii() and ch.isalnum())

    # 1. If Latin text is valid English (not garbled and high/moderate confidence)
    if not lat_is_garble and latin_conf >= 0.70 and lat_alpha_chars >= 2:
        # Only override if Devanagari is a substantive multi-character word AND Latin confidence is lower
        if dev_has_indic and dev_indic_chars >= 3 and dev_conf > 0.85 and latin_conf < 0.80:
            return (clean_dev, dev_conf, dev_meta)
        return (clean_lat, latin_conf, lat_meta)

    # 2. If Latin text is garbled hallucination (e.g. 'RRTO', '||||')
    if lat_is_garble:
        if dev_has_indic and dev_indic_chars >= 1 and dev_conf >= 0.25:
            return (clean_dev, max(latin_conf, dev_conf), dev_meta)
        if len(clean_dev) > 0 and dev_conf > latin_conf:
            return (clean_dev, dev_conf, detect_script(clean_dev))

    # 3. If Devanagari text has valid Indic characters and Latin is weak (<0.70)
    if dev_has_indic and dev_indic_chars >= 2 and dev_conf >= 0.35:
        if latin_conf < 0.70 or dev_conf >= latin_conf:
            return (clean_dev, max(latin_conf, dev_conf), dev_meta)

    # 4. Reject isolated single-character Devanagari noise
    if dev_has_indic and dev_indic_chars <= 1 and lat_alpha_chars >= 1:
        return (clean_lat, latin_conf, lat_meta)

    # Default fallback
    if dev_has_indic and dev_indic_chars >= 2 and dev_conf >= 0.40:
        return (clean_dev, dev_conf, dev_meta)
    return (clean_lat, latin_conf, lat_meta)


_clean_indic_text = prune_script_crosstalk
_is_latin_hallucination = is_latin_hallucination


class OCREnsemble:
    def __init__(self):
        logging.info("Initializing OCR Ensemble Engines (RapidOCR + Indic Multilingual)...")
        self.rapid_ocr = None
        self.devanagari_ocr = None

        try:
            from rapidocr_onnxruntime import RapidOCR
            self.rapid_ocr = RapidOCR()
            logging.info("RapidOCR Latin/English engine loaded successfully.")

            # Dedicated low-latency live engine for real-time video stream (<40ms)
            try:
                self.live_rapid_ocr = RapidOCR(det_limit_side_len=320, det_limit_type='max', use_angle_cls=False, intra_op_num_threads=4)
                logging.info("RapidOCR Live Engine (<40ms) loaded successfully.")
            except Exception as le:
                self.live_rapid_ocr = None
                logging.warning(f"Failed to load RapidOCR Live Engine: {le}")

            # Load Devanagari (Hindi/Marathi/Indic) ONNX Model if available
            dev_model = os.path.join(os.path.dirname(__file__), '..', 'models', 'devanagari_rec.onnx')
            dev_dict = os.path.join(os.path.dirname(__file__), '..', 'models', 'devanagari_dict.txt')
            if os.path.exists(dev_model) and os.path.exists(dev_dict):
                try:
                    self.devanagari_ocr = RapidOCR(rec_model_path=dev_model, rec_keys_path=dev_dict)
                    logging.info(f"RapidOCR Devanagari Indic engine loaded successfully from {dev_model}.")
                except Exception as de:
                    logging.warning(f"Failed to load Devanagari OCR model: {de}")
        except Exception as e:
            logging.warning(f"RapidOCR init error: {e}")

    def _run_rapidocr_rotated(self, img: np.ndarray, h: int, w: int, rot_code, is_live: bool = False) -> list[dict]:
        engine = (self.live_rapid_ocr if is_live and self.live_rapid_ocr else self.rapid_ocr)
        if not engine:
            return []
        try:
            import cv2
            if rot_code is not None:
                img_rot = cv2.rotate(img, rot_code)
            else:
                img_rot = img

            res_l, _ = engine(img_rot)
            raw_items = []
            if res_l:
                for line in res_l:
                    box, text, conf = line
                    if text and float(conf) > 0.2:
                        clean_text = unicodedata.normalize('NFKC', str(text)).strip()
                        if not clean_text:
                            continue
                        xs = [p[0] for p in box]
                        ys = [p[1] for p in box]
                        raw_items.append({
                            'text': clean_text,
                            'conf': float(conf),
                            'xmin': max(0, min(xs)),
                            'ymin': max(0, min(ys)),
                            'xmax': min(img_rot.shape[1], max(xs)),
                            'ymax': min(img_rot.shape[0], max(ys)),
                            'yc': (min(ys) + max(ys)) / 2.0,
                            'h': max(ys) - min(ys),
                            '_raw_box': box
                        })

            # Crop-level Devanagari / Indic pass and script arbitration
            if self.devanagari_ocr and raw_items:
                cand_indices = []
                cand_boxes = []
                for idx, it in enumerate(raw_items):
                    t = it['text']
                    c = it['conf']
                    if is_latin_hallucination(t, c) or detect_script(t)['is_multilingual'] or c < 0.88 or not is_live:
                        cand_indices.append(idx)
                        cand_boxes.append(np.array(it['_raw_box'], dtype=np.float32))

                if cand_boxes:
                    try:
                        crops = self.devanagari_ocr.get_crop_img_list(img_rot, cand_boxes)
                        rec_res, _ = self.devanagari_ocr.text_rec(crops)
                        for c_idx, (d_text, d_conf) in zip(cand_indices, rec_res):
                            best_text, best_conf, best_meta = arbitrate_crop_script(
                                raw_items[c_idx]['text'],
                                raw_items[c_idx]['conf'],
                                d_text,
                                float(d_conf) if d_conf is not None else 0.0
                            )
                            raw_items[c_idx]['text'] = best_text
                            raw_items[c_idx]['conf'] = best_conf
                            raw_items[c_idx]['_script_meta'] = best_meta
                    except Exception as e_crop:
                        logging.debug(f"Indic crop recognition & arbitration error: {e_crop}")

            # Dual-engine full detection pass in non-live inspection mode
            if self.devanagari_ocr and not is_live:
                try:
                    res_d, _ = self.devanagari_ocr(img_rot)
                    if res_d:
                        for line in res_d:
                            box, text, conf = line
                            if text and float(conf) > 0.35:
                                clean_d = unicodedata.normalize('NFKC', str(text)).strip()
                                clean_d = prune_script_crosstalk(clean_d)
                                if not clean_d:
                                    continue
                                d_meta = detect_script(clean_d)
                                dev_indic_chars = sum(1 for ch in clean_d if 0x0900 <= ord(ch) <= 0x0D7F)
                                # Only process substantive Indic words (>= 2 characters)
                                if d_meta['is_multilingual'] and dev_indic_chars >= 2:
                                    xs = [p[0] for p in box]
                                    ys = [p[1] for p in box]
                                    dev_box = [max(0, min(xs)), max(0, min(ys)), min(img_rot.shape[1], max(xs)), min(img_rot.shape[0], max(ys))]
                                    
                                    # Check overlap against existing items
                                    overlap = False
                                    for r_it in raw_items:
                                        r_box = [r_it['xmin'], r_it['ymin'], r_it['xmax'], r_it['ymax']]
                                        inter = max(0, min(dev_box[2], r_box[2]) - max(dev_box[0], r_box[0])) * max(0, min(dev_box[3], r_box[3]) - max(dev_box[1], r_box[1]))
                                        area1 = (dev_box[2] - dev_box[0]) * (dev_box[3] - dev_box[1])
                                        area2 = (r_box[2] - r_box[0]) * (r_box[3] - r_box[1])
                                        iou = inter / float(area1 + area2 - inter + 1e-6)
                                        if iou > 0.25:
                                            overlap = True
                                            # Only overwrite if Latin text was a garbled hallucination or weak (<0.70)
                                            if not detect_script(r_it['text'])['is_multilingual']:
                                                if is_latin_hallucination(r_it['text'], r_it['conf']) or r_it['conf'] < 0.70:
                                                    r_it['text'] = clean_d
                                                    r_it['conf'] = max(r_it['conf'], float(conf))
                                                    r_it['_script_meta'] = d_meta
                                            break
                                    if not overlap:
                                        raw_items.append({
                                            'text': clean_d,
                                            'conf': float(conf),
                                            'xmin': dev_box[0],
                                            'ymin': dev_box[1],
                                            'xmax': dev_box[2],
                                            'ymax': dev_box[3],
                                            'yc': (dev_box[1] + dev_box[3]) / 2.0,
                                            'h': dev_box[3] - dev_box[1],
                                            '_script_meta': d_meta
                                        })
                except Exception as e_dev_full:
                    logging.debug(f"Indic full detection pass error: {e_dev_full}")

            # Filter out persistent Latin consonant hallucinations
            cleaned_items = []
            for it in raw_items:
                it.pop('_raw_box', None)
                if is_latin_hallucination(it['text'], it['conf']) and detect_script(it['text'])['language'] == 'en':
                    continue
                cleaned_items.append(it)
            raw_items = cleaned_items

            if not raw_items:
                return []

            lines = self._cluster_into_lines(raw_items, img_rot.shape[1])
            features = self._classify_fields(lines, img_rot.shape[0], img_rot.shape[1])

            # Map features bounding boxes back to the original unrotated image
            for f in features:
                xmin, ymin, xmax, ymax = f['bbox']
                if rot_code == cv2.ROTATE_90_CLOCKWISE:
                    oxmin, oxmax = ymin, ymax
                    oymin, oymax = h - 1 - xmax, h - 1 - xmin
                elif rot_code == cv2.ROTATE_90_COUNTERCLOCKWISE:
                    oxmin, oxmax = w - 1 - ymax, w - 1 - ymin
                    oymin, oymax = xmin, xmax
                else:
                    oxmin, oymin, oxmax, oymax = xmin, ymin, xmax, ymax

                f['bbox'] = [max(0, oxmin), max(0, oymin), min(w, oxmax), min(h, oymax)]
                f['box'] = [
                    round(float(f['bbox'][1]) / h, 4),
                    round(float(f['bbox'][0]) / w, 4),
                    round(float(f['bbox'][3]) / h, 4),
                    round(float(f['bbox'][2]) / w, 4)
                ]

            return features
        except Exception as e:
            logging.warning(f"Rotated RapidOCR error: {e}")
            return []

    def extract_text_and_boxes(self, img: np.ndarray) -> list[dict]:
        """
        Executes OCR detection and recognition, line clustering, and statutory entity classification.
        Pre-scales large input images for fast execution and high accuracy.
        """
        orig_h, orig_w = img.shape[:2]

        # Downscale overly large phone camera photos to max 1500px for speed & crisp text
        max_dim = 1500
        if max(orig_h, orig_w) > max_dim:
            scale = max_dim / float(max(orig_h, orig_w))
            proc_img = cv2.resize(img, (int(orig_w * scale), int(orig_h * scale)), interpolation=cv2.INTER_AREA)
        else:
            proc_img = img

        h, w = proc_img.shape[:2]

        # 1. Base Extraction: RapidOCR at 0 degrees
        all_features = self._run_rapidocr_rotated(proc_img, h, w, None)

        def get_found_cats():
            return set(f['category'] for f in all_features if f['category'] != 'other')

        # 2. Fallbacks: Only trigger 90-degree rotations if 0° pass yielded very few tokens (< 2)
        if len(all_features) < 2:
            import concurrent.futures
            critical = {'mrp', 'address', 'license', 'quantity'}
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
                future_cw = executor.submit(self._run_rapidocr_rotated, proc_img, h, w, cv2.ROTATE_90_CLOCKWISE)
                future_ccw = executor.submit(self._run_rapidocr_rotated, proc_img, h, w, cv2.ROTATE_90_COUNTERCLOCKWISE)
                
                feat_cw = future_cw.result()
                if feat_cw:
                    all_features.extend([f for f in feat_cw if f['category'] in (critical - get_found_cats())])
                
                feat_ccw = future_ccw.result()
                if feat_ccw:
                    all_features.extend([f for f in feat_ccw if f['category'] in (critical - get_found_cats())])

        # 3. Extract and Cluster Brand Name & Logo on Front Panel with Script Separation
        all_features = self._cluster_front_brand_and_logo(all_features, h, w)

        # 4. Map bounding boxes back to original unscaled image dimensions if scaled
        if (h, w) != (orig_h, orig_w):
            sx = float(orig_w) / w
            sy = float(orig_h) / h
            for f in all_features:
                xmin, ymin, xmax, ymax = f['bbox']
                f['bbox'] = [int(xmin * sx), int(ymin * sy), int(xmax * sx), int(ymax * sy)]
                f['box'] = [
                    round(float(f['bbox'][1]) / orig_h, 4),
                    round(float(f['bbox'][0]) / orig_w, 4),
                    round(float(f['bbox'][3]) / orig_h, 4),
                    round(float(f['bbox'][2]) / orig_w, 4)
                ]

        return all_features

    def _cluster_front_brand_and_logo(self, features: list[dict], h: int, w: int) -> list[dict]:
        """
        Font-Prominence & Spatial Proximity Brand/Logo clustering for Front PDP:
        - Separates Devanagari / Indic text from English text so bilingual packaging
          maintains clean separate titles (e.g. Devanagari 'आशा भेळ' and English 'SPECIAL BHEL FAMILY PACK').
        - Evaluates font size (character bounding box height & visual weight).
        - Logos and brand trademarks have the largest relative font height on the packaging.
        - Identifies dominant brand typography anchors per script family.
        - Enforces font-scale consistency (excludes tiny subtext/disclaimers with h < 0.40 * anchor_h).
        - Excludes statutory blacklist terms.
        - Fuses tightly-spaced compound brand words within each script independently.
        """
        import math

        statutory_blacklist = re.compile(
            r'\b(?:mrp|rs|₹|batch|pkg|mfg|pkd|exp|expiry|net\s*wt|net\s*qty|fssai|lic(?:\.|\s*no)?|email|phone|tel|fax|gram|kg|g|ml|l|tax|taxes|servings?|nutrition|ingredients|dosage|instructions|warning|caution|best\s*before|use\s*by)\b',
            re.IGNORECASE
        )

        candidates = []
        for i, f in enumerate(features):
            cat = f.get('category')
            val = f.get('value', '').strip()

            # Skip obvious statutory fields
            if cat in ['mrp', 'quantity', 'mfg_date', 'license', 'address', 'helpline', 'nutrition', 'ingredients', 'batch_number']:
                continue
            if statutory_blacklist.search(val) and len(val) < 25:
                continue

            box = f.get('bbox', [0, 0, 0, 0])
            bx_h = max(4, box[3] - box[1])
            bx_w = max(4, box[2] - box[0])
            y_center = (box[1] + box[3]) / 2.0
            x_center = (box[0] + box[2]) / 2.0
            conf = float(f.get('confidence_score', 0.8))

            # Vertical position score: Logos generally occupy upper/mid-upper 75% of PDP
            pos_ratio = y_center / max(1.0, float(h))
            pos_weight = 1.2 if pos_ratio < 0.45 else (1.0 if pos_ratio < 0.75 else 0.4)

            # Font Prominence Score: Font height is quadratic because logos feature large point sizes
            font_prominence = (bx_h ** 2.2) * math.sqrt(max(1, len(val))) * conf * pos_weight

            script_meta = detect_script(val)

            candidates.append({
                'idx': i,
                'feature': f,
                'text': val,
                'xmin': box[0],
                'ymin': box[1],
                'xmax': box[2],
                'ymax': box[3],
                'w': bx_w,
                'h': bx_h,
                'yc': y_center,
                'xc': x_center,
                'conf': conf,
                'font_prominence': font_prominence,
                'script_meta': script_meta,
                'is_indic': script_meta['is_multilingual'],
                'script_family': script_meta.get('script_family', 'Latin')
            })

        if not candidates:
            largest_f = max(features, key=lambda x: (x['bbox'][3]-x['bbox'][1])) if features else None
            if largest_f and largest_f.get('category') == 'other':
                largest_f['category'] = 'brand_logo'
                largest_f['rule_id'] = 'RL-AUTH-001'
            return features

        # Group candidate tokens by script family (e.g. 'Devanagari' vs 'Latin' vs other Indic)
        script_groups: dict[str, list[dict]] = {}
        for c in candidates:
            fam = c['script_family']
            script_groups.setdefault(fam, []).append(c)

        brand_features = []
        all_used_indices = set()

        for script_fam, group_candidates in script_groups.items():
            if not group_candidates:
                continue

            group_candidates.sort(key=lambda c: c['font_prominence'], reverse=True)
            anchor = group_candidates[0]
            anchor_h = max(10, anchor['h'])

            cluster = [anchor]
            used_in_script = {anchor['idx']}

            expanded = True
            while expanded:
                expanded = False
                for c in group_candidates:
                    if c['idx'] in used_in_script or c['idx'] in all_used_indices:
                        continue

                    if c['h'] < 0.40 * anchor_h:
                        continue

                    # Do not fuse generic commodity/product category descriptors into the brand trademark
                    c_txt = c['text'].strip()
                    if _COMMODITY_DESCRIPTORS_RE.search(c_txt):
                        continue

                    is_connected = False
                    for member in cluster:
                        mem_h = max(10, member['h'])
                        # 1. Horizontal adjacency (same line with tight padding)
                        y_diff = abs(c['yc'] - member['yc'])
                        if y_diff < max(mem_h, c['h']) * 0.75:
                            h_gap = max(0, max(c['xmin'] - member['xmax'], member['xmin'] - c['xmax']))
                            if h_gap < max(mem_h, c['h']) * 1.8:
                                is_connected = True
                                break

                        # 2. Vertical stacked adjacency (stacked logo lines)
                        v_gap = max(0, max(c['ymin'] - member['ymax'], member['ymin'] - c['ymax']))
                        if v_gap < max(mem_h, c['h']) * 1.3:
                            h_overlap = min(c['xmax'], member['xmax']) - max(c['xmin'], member['xmin'])
                            h_dist = abs(c['xc'] - member['xc'])
                            if h_overlap > 0 or h_dist < max(member['w'], c['w']) * 1.1:
                                is_connected = True
                                break

                    if is_connected:
                        cluster.append(c)
                        used_in_script.add(c['idx'])
                        expanded = True

            all_used_indices.update(used_in_script)

            cluster.sort(key=lambda c: (c['ymin'] // max(1, int(anchor_h * 0.75)), c['xmin']))

            clean_cluster_texts = []
            seen_texts = set()
            for c in cluster:
                t = c['text']
                t = re.sub(r'([a-z])([A-Z])', r'\1 \2', t).strip()
                if t and t not in seen_texts:
                    seen_texts.add(t)
                    clean_cluster_texts.append(t)
            if not clean_cluster_texts:
                clean_cluster_texts = [c['text'] for c in cluster]

            merged_brand_text = " ".join(clean_cluster_texts)
            if script_fam == 'Latin':
                merged_brand_text = re.sub(r'\s+', ' ', merged_brand_text).strip()
                merged_brand_text = re.sub(r'[^A-Za-z0-9 ]', '', merged_brand_text)
            else:
                merged_brand_text = re.sub(r'\s+', ' ', merged_brand_text).strip()
                merged_brand_text = re.sub(r'[^\u0900-\u0D7FA-Za-z0-9 ]', '', merged_brand_text)

            min_xmin = min(c['xmin'] for c in cluster)
            min_ymin = min(c['ymin'] for c in cluster)
            max_xmax = max(c['xmax'] for c in cluster)
            max_ymax = max(c['ymax'] for c in cluster)

            merged_box = [
                round(float(min_ymin) / h, 4),
                round(float(min_xmin) / w, 4),
                round(float(max_ymax) / h, 4),
                round(float(max_xmax) / w, 4)
            ]

            _cluster_min_conf = min(c['conf'] for c in cluster)
            _cluster_max_conf = max(c['conf'] for c in cluster)
            brand_script = detect_script(merged_brand_text)

            b_feat = {
                "id": f"box_front_brand_{script_fam.lower()}_{int(min_ymin)}",
                "category": "brand_logo",
                "value": merged_brand_text,
                "confidence_score": round(_cluster_min_conf, 2),
                "confidence_score_max": round(_cluster_max_conf, 2),
                "counterfeit_spelling": False,
                "tampering_suspected": _cluster_min_conf < 0.70,
                "font_height_px": int(anchor_h),
                "script": brand_script['script'],
                "language": brand_script['language'],
                "is_multilingual": brand_script['is_multilingual'],
                "bbox": [int(min_xmin), int(min_ymin), int(max_xmax), int(max_ymax)],
                "box": merged_box,
                "rule_id": "RL-AUTH-001"
            }
            brand_features.append(b_feat)

        filtered_features = [f for i, f in enumerate(features) if i not in all_used_indices]
        for bf in reversed(brand_features):
            filtered_features.insert(0, bf)

        return filtered_features

    def _detect_columns(self, items: list[dict], w: int) -> list[tuple]:
        """
        Detects vertical column boundaries by finding horizontal x-gaps with no text
        box crossing them, wider than ~4% of the image width.

        Algorithm:
          1. Collect all (xmin, xmax) intervals from bounding boxes and sort them.
          2. Merge overlapping intervals into contiguous text-covered x-bands.
          3. Find gaps between merged bands that exceed the gap threshold.
          4. Return a list of (col_x_start, col_x_end) column boundary tuples.

        Returns [(0, w)] when no significant gap is found (single-column layout).
        """
        if w <= 0 or not items:
            return [(0, w)]

        gap_threshold = max(8, int(w * 0.04))  # 4% of image width, minimum 8px

        # Collect and sort x-intervals from all bounding boxes
        intervals = sorted(
            (int(it['xmin']), min(w, int(it['xmax']))) for it in items
        )

        # Merge overlapping/adjacent intervals into contiguous covered bands
        merged: list[list] = []
        for x0, x1 in intervals:
            if merged and x0 <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], x1)
            else:
                merged.append([x0, x1])

        # Walk merged bands and split on gaps wider than the threshold
        columns: list[tuple] = []
        col_start = 0
        for band_x0, band_x1 in merged:
            gap = band_x0 - col_start
            if gap >= gap_threshold and col_start < band_x0:
                columns.append((col_start, band_x0 - 1))
                col_start = band_x0

        # Close the final column up to the image edge
        columns.append((col_start, w))

        return columns if len(columns) > 1 else [(0, w)]

    def _cluster_into_lines(self, items: list[dict], img_w: int = 0) -> list[dict]:
        """
        Groups nearby word bounding boxes along horizontal reading order into text lines.

        When img_w is provided, column boundaries are detected first via _detect_columns().
        Items are then partitioned into columns and line-clustered independently within
        each column.  This prevents two-column layouts (e.g. a nutrition table on the left
        and ingredient/address text on the right) from producing nonsensical cross-column
        lines like "Carbohydrates ENTERPRISES".

        Returns all lines from all columns sorted top-to-bottom, left-to-right.
        """
        if not items:
            return []

        # Detect column boundaries; falls back to single column when img_w == 0
        col_bounds = self._detect_columns(items, img_w) if img_w > 0 else [(0, img_w)]

        all_lines: list[dict] = []

        for col_x0, col_x1 in col_bounds:
            # Assign items to this column by their x-center
            col_items = [
                it for it in items
                if col_x0 <= (it['xmin'] + it['xmax']) / 2.0 <= col_x1
            ]

            if not col_items:
                continue

            # Cluster lines within this column by vertical proximity
            col_items.sort(key=lambda it: it['ymin'])
            used = [False] * len(col_items)

            for i, it in enumerate(col_items):
                if used[i]:
                    continue
                cur_line = [it]
                used[i] = True

                for j in range(i + 1, len(col_items)):
                    if used[j]:
                        continue
                    other = col_items[j]

                    # Script compatibility gating: Do not merge different language/script words into the same line
                    it_lang = detect_script(it['text'])['language']
                    other_lang = detect_script(other['text'])['language']
                    if it_lang != other_lang:
                        continue

                    # Accurate same-line merging criteria:
                    # 1. Substantial vertical overlap (at least 45% of shorter word)
                    v_overlap = max(0, min(it['ymax'], other['ymax']) - max(it['ymin'], other['ymin']))
                    min_h = max(1, min(it['h'], other['h']))
                    v_overlap_ratio = v_overlap / float(min_h)

                    # 2. No massive horizontal overlap (must be distinct sequential words on same line)
                    h_overlap = max(0, min(it['xmax'], other['xmax']) - max(it['xmin'], other['xmin']))
                    min_w = max(1, min(it['xmax'] - it['xmin'], other['xmax'] - other['xmin']))
                    h_overlap_ratio = h_overlap / float(min_w)

                    # 3. Reasonable horizontal reading gap
                    h_gap = max(0, max(it['xmin'] - other['xmax'], other['xmin'] - it['xmax']))

                    if v_overlap_ratio >= 0.45 and h_overlap_ratio < 0.25 and h_gap <= max(it['h'], other['h']) * 3.5:
                        cur_line.append(other)
                        used[j] = True

                cur_line.sort(key=lambda x: x['xmin'])

                line_text = " ".join(x['text'] for x in cur_line)
                line_conf = float(sum(x['conf'] for x in cur_line) / len(cur_line))
                line_xmin = min(x['xmin'] for x in cur_line)
                line_ymin = min(x['ymin'] for x in cur_line)
                line_xmax = max(x['xmax'] for x in cur_line)
                line_ymax = max(x['ymax'] for x in cur_line)

                all_lines.append({
                    'text': line_text,
                    'confidence': line_conf,
                    'bbox': [line_xmin, line_ymin, line_xmax, line_ymax]
                })

        # Final sort: top-to-bottom, then left-to-right by x-center
        all_lines.sort(key=lambda l: (l['bbox'][1], (l['bbox'][0] + l['bbox'][2]) / 2.0))
        return all_lines


    def _classify_fields(self, lines: list[dict], h: int, w: int) -> list[dict]:
        """
        Classifies each line into a statutory category using compiled regex patterns and
        split-column key-value contextual candidate fusion.
        Priority order (highest to lowest):
          ingredients → nutrition → mrp → quantity → mfg_date → batch → license → address → helpline → other
        """
        features = []
        n_lines = len(lines)

        for i, line in enumerate(lines):
            text = line['text']
            cat = "other"
            xmin_raw, ymin_raw, xmax_raw, ymax_raw = line['bbox']

            # 1. Ingredients / allergens list
            if _RE_INGREDIENTS.search(text):
                cat = "ingredients"

            # 2. Nutrition table
            elif _RE_NUTRITION.search(text):
                cat = "nutrition"

            # 3. MRP / Price declaration (includes OCR misreads of ₹ and crossed-out prices)
            elif _RE_MRP.search(text):
                cat = "mrp"

            # 4. Net Quantity / Weight / Volume
            elif _RE_QTY.search(text):
                cat = "quantity"

            # 5. Manufacturing / Expiry / Best Before dates
            elif _RE_DATE.search(text):
                cat = "mfg_date"

            # 6. Batch / Lot Number
            elif _RE_BATCH.search(text):
                cat = "batch_number"

            # 7. FSSAI / BIS / Drug / Cosmetic License number
            elif _RE_FSSAI.search(text):
                cat = "license"

            # 8. Consumer helpline / email / website
            elif _RE_HELPLINE.search(text):
                cat = "helpline"

            # 9. Manufacturer / Packer / Marketer address
            elif _RE_ADDRESS.search(text):
                cat = "address"

            # ── Contextual Key-Value Candidate Fusion for Split Column Layouts ───────
            # If current line is a statutory key header, check adjacent token / line
            if cat == "other" and i > 0:
                prev_text = lines[i - 1]['text'].lower().strip()
                prev_bbox = lines[i - 1]['bbox']
                # Check vertical proximity
                v_prox = abs(ymin_raw - prev_bbox[3]) < (max(10, ymax_raw - ymin_raw) * 2.0)
                
                if v_prox:
                    if any(k in prev_text for k in ['net content', 'net wt', 'net qty', 'net volume', 'शुद्ध मात्रा', 'शुद्ध वजन', 'निव्वळ वजन', 'நிகர எடை', 'పరిమాణం']):
                        if re.search(r'\b[\d०-९]+(?:\.[\d०-९]+)?\s*(?:ml|g|gm|kg|l|fl\.?\s*oz|ग्राम|मिली|लीटर)\b', text, re.IGNORECASE):
                            cat = "quantity"
                    elif any(k in prev_text for k in ['mrp', 'price', 'm.r.p', 'अ.खू.मू', 'अधिकतम खुदरा मूल्य', 'एमआरपी', 'விலை', 'ధర', 'કિંમત', 'মূল্য']):
                        if re.search(r'\b[\d०-९]{1,5}(?:\.[\d०-९]{1,2})?\b', text):
                            cat = "mrp"
                    elif any(k in prev_text for k in ['mfg', 'pkd', 'packed', 'best before', 'use before', 'use by', 'exp', 'निर्माण तिथि', 'उत्पादन दिनांक', 'पैकिंग तिथि', 'उपयोग की अंतिम तिथि', 'தயாரிப்பு தேதி', 'తయారీ తేదీ']):
                        if re.search(r'\b[\d०-९]{1,2}[/\.\-][\d०-९]{2,4}\b|\b[\d०-९]{1,2}\s+(?:months|days|महीने|माह)\b', text, re.IGNORECASE):
                            cat = "mfg_date"
                    elif any(k in prev_text for k in ['batch', 'lot', 'b.no', 'b. no', 'बैच', 'लॉट', 'தொகுதி']):
                        cat = "batch_number"
                    elif any(k in prev_text for k in ['marketed by', 'manufactured by', 'mfg by', 'packed by', 'registered address', 'regd office', 'निर्माता', 'उत्पादक', 'द्वारा निर्मित', 'पंजीकृत', 'தயாரிப்பாளர்', 'తయారీదారు']):
                        cat = "address"

            # ── Positional Price-Tag Heuristic ────────────────────────────────
            if cat == "other":
                y_ratio = float(ymin_raw) / h if h > 0 else 1.0
                x_ratio = float(xmin_raw) / w if w > 0 else 1.0
                m = _RE_PRICE_TAG_NUMBER.match(text)
                if m and y_ratio < 0.30 and x_ratio < 0.45:
                    try:
                        price_val = float(m.group(1))
                        if _PRICE_MIN <= price_val <= _PRICE_MAX:
                            cat = "mrp"
                    except ValueError:
                        pass

            # Normalized bounding box [ymin, xmin, ymax, xmax] in 0..1 coordinates
            xmin, ymin, xmax, ymax = xmin_raw, ymin_raw, xmax_raw, ymax_raw
            norm_box = [
                round(float(ymin) / h, 4),
                round(float(xmin) / w, 4),
                round(float(ymax) / h, 4),
                round(float(xmax) / w, 4)
            ]

            # Counterfeit and tampering checks
            counterfeit_spelling = bool(_RE_COUNTERFEIT_SPELLING.search(text))
            tampering_suspected = line['confidence'] < 0.70
            script_meta = detect_script(text)

            features.append({
                "category": cat,
                "value": text,
                "confidence_score": round(line['confidence'], 3),
                "counterfeit_spelling": counterfeit_spelling,
                "tampering_suspected": tampering_suspected,
                "script": script_meta['script'],
                "language": script_meta['language'],
                "is_multilingual": script_meta['is_multilingual'],
                "bbox": [int(xmin), int(ymin), int(xmax), int(ymax)],
                "box": norm_box,
                "rule_id": f"RL-{cat.upper()}-001"
            })

        return features

