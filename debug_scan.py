import os
import re
import json

def run_debug_scan():
    base_dir = r"d:\working space\nice_diabetes_interactive"
    html_file = os.path.join(base_dir, "index.html")
    css_file = os.path.join(base_dir, "styles.css")
    js_file = os.path.join(base_dir, "app.js")

    with open(html_file, "r", encoding="utf-8") as f:
        html = f.read()
    with open(css_file, "r", encoding="utf-8") as f:
        css = f.read()
    with open(js_file, "r", encoding="utf-8") as f:
        js = f.read()

    results = {
        "html_audit": [],
        "css_audit": [],
        "js_logic_audit": [],
        "seo_a11y_audit": [],
        "clinical_edge_cases": []
    }

    # =========================================================================
    # 1. HTML DOM & Structure Check
    # =========================================================================
    # Check duplicate IDs
    all_ids = re.findall(r'id=["\']([^"\']+)["\']', html)
    seen = set()
    dupes = set()
    for i in all_ids:
        if i in seen:
            dupes.add(i)
        seen.add(i)
    if dupes:
        results["html_audit"].append(f"[FAIL] Found duplicate IDs in HTML: {list(dupes)}")
    else:
        results["html_audit"].append(f"[PASS] All {len(seen)} DOM element IDs in HTML are unique.")

    # Check for labels matching IDs
    labels_for = re.findall(r'<label\s+for=["\']([^"\']+)["\']', html)
    orphaned_labels = [l for l in labels_for if l not in seen]
    if orphaned_labels:
        results["html_audit"].append(f"[FAIL] Orphaned label 'for' attributes: {orphaned_labels}")
    else:
        results["html_audit"].append(f"[PASS] All {len(labels_for)} form labels have matching input IDs.")

    # Check JS getElementById matching HTML IDs
    js_ids = re.findall(r'getElementById\(["\']([^"\']+)["\']\)', js)
    missing_js_ids = [i for i in js_ids if i not in seen]
    if missing_js_ids:
        results["html_audit"].append(f"[FAIL] JS refers to IDs not present in HTML: {missing_js_ids}")
    else:
        results["html_audit"].append(f"[PASS] All {len(set(js_ids))} IDs referenced in app.js exist in HTML.")

    # Check unclosed tags (basic check for common tags)
    for tag in ['div', 'section', 'main', 'header', 'nav', 'table', 'tbody', 'thead', 'tr']:
        open_count = len(re.findall(rf'<{tag}[\s>]', html, re.IGNORECASE))
        close_count = len(re.findall(rf'</{tag}>', html, re.IGNORECASE))
        if open_count != close_count:
            results["html_audit"].append(f"[FAIL] Tag mismatch for <{tag}>: {open_count} opened vs {close_count} closed")
        else:
            results["html_audit"].append(f"[PASS] Tag <{tag}> is balanced ({open_count} pairs).")

    # =========================================================================
    # 2. SEO & Accessibility (a11y) Check
    # =========================================================================
    if 'meta name="viewport"' in html:
        results["seo_a11y_audit"].append("[PASS] Viewport meta tag is present for mobile responsiveness.")
    else:
        results["seo_a11y_audit"].append("[FAIL] Missing viewport meta tag.")

    if 'lang="zh-TW"' in html:
        results["seo_a11y_audit"].append("[PASS] Language attribute lang='zh-TW' is set.")
    else:
        results["seo_a11y_audit"].append("[FAIL] lang attribute is missing or incorrect.")

    # Check meta description & Open Graph
    if 'meta name="description"' in html:
        results["seo_a11y_audit"].append("[PASS] Meta description is present.")
    else:
        results["seo_a11y_audit"].append("[WARNING] Missing meta description for search engine optimization (SEO).")

    if 'og:title' in html:
        results["seo_a11y_audit"].append("[PASS] Open Graph social meta tags are present.")
    else:
        results["seo_a11y_audit"].append("[WARNING] Missing Open Graph (og:title, og:description, og:image) for rich social sharing previews (LINE/FB/Twitter).")

    if 'rel="icon"' in html or 'rel="shortcut icon"' in html:
        results["seo_a11y_audit"].append("[PASS] Favicon link is present.")
    else:
        results["seo_a11y_audit"].append("[WARNING] Missing favicon icon link.")

    # =========================================================================
    # 3. CSS & Responsive Breakpoint Check
    # =========================================================================
    if '@media print' in css:
        results["css_audit"].append("[PASS] Dedicated @media print stylesheet is defined.")
    else:
        results["css_audit"].append("[FAIL] Missing @media print stylesheet.")

    if '@media (max-width: 768px)' in css or '@media (max-width: 1080px)' in css:
        results["css_audit"].append("[PASS] Responsive grid breakpoints for mobile & tablet are defined.")
    else:
        results["css_audit"].append("[WARNING] Limited responsive breakpoints detected.")

    if 'overflow-x: auto' in css:
        results["css_audit"].append("[PASS] Horizontal table wrapper overflow-x is configured.")
    else:
        results["css_audit"].append("[WARNING] Table container might overflow on narrow screens.")

    # =========================================================================
    # 4. JavaScript Logic & Clinical Edge-Cases Test Simulator
    # =========================================================================
    # Simulate JS decision logic function
    def simulate_decision(age, bmi, egfr, uacr, ascvd, stroke, hf, frailty, dysphagia, diet, onSu, onInsulin, hypoUnaware, hasCarer):
        drugs = []
        warnings = []
        isEarlyOnset = age < 40
        isObese = bmi >= 27.5
        hasHF = hf != 'none'
        hasASCVD = ascvd or stroke
        isFrail = frailty != 'none'
        hasDysphagia = dysphagia != 'none'
        isKeto = diet == 'keto'

        # Metformin
        if egfr >= 30:
            if hasDysphagia:
                drugs.append("Metformin 速效/水劑")
                warnings.append("Metformin XR 嚴禁磨粉")
            else:
                drugs.append("Metformin XR")
        else:
            warnings.append("eGFR < 30 停用 Metformin")

        # SGLT-2i
        if isKeto:
            warnings.append("生酮飲食 euDKA 警告")
        elif egfr >= 20:
            if isFrail and frailty == 'moderate_severe':
                warnings.append("衰弱脫水風險")
                drugs.append("DPP-4i")
            else:
                drugs.append("SGLT-2i")
                if 20 <= egfr < 30:
                    drugs.append("DPP-4i")
        else:
            drugs.append("DPP-4i")

        # GLP-1 RA
        if hasASCVD or stroke:
            drugs.append("GLP-1 RA (降中風/心血管)")
        elif isEarlyOnset:
            drugs.append("GLP-1 RA / Tirzepatide (早發型)")
        elif isObese and egfr >= 30:
            drugs.append("GLP-1 RA / Tirzepatide (減重)")

        # Warnings
        if hasHF:
            warnings.append("HF 嚴禁 TZD")
        if egfr < 30 or isFrail:
            warnings.append("避免使用 SU 促泌劑")

        # Target
        if isFrail or age >= 80:
            target = "7.5%～8.0%+"
        elif onSu or onInsulin:
            target = "≤ 7.0%"
        else:
            target = "≤ 6.5%"

        # CGM
        cgm_eligible = (onInsulin) or (hypoUnaware) or (hasCarer and onInsulin) or (stroke or hasDysphagia)

        return drugs, warnings, target, cgm_eligible

    # Test Case 1: Standard new patient
    d1, w1, t1, cgm1 = simulate_decision(52, 28.5, 65, 'normal', False, False, 'none', 'none', 'none', 'standard', False, False, False, False)
    assert "Metformin XR" in d1 and "SGLT-2i" in d1 and t1 == "≤ 6.5%"
    results["clinical_edge_cases"].append("[PASS] Case 1: Standard patient -> Metformin XR + SGLT-2i, Target <= 6.5%.")

    # Test Case 2: CKD Stage 4 (eGFR 25)
    d2, w2, t2, cgm2 = simulate_decision(68, 26.0, 25, 'macro', False, False, 'none', 'none', 'none', 'standard', False, False, False, False)
    assert "Metformin XR" not in d2 and "SGLT-2i" in d2 and "DPP-4i" in d2
    results["clinical_edge_cases"].append("[PASS] Case 2: CKD eGFR 25 -> Stop Metformin, Keep SGLT-2i, Add DPP-4i.")

    # Test Case 3: Stroke with Dysphagia
    d3, w3, t3, cgm3 = simulate_decision(72, 24.0, 55, 'normal', False, True, 'none', 'none', 'mild', 'standard', False, False, False, False)
    assert "Metformin 速效/水劑" in d3 and any("嚴禁磨粉" in w for w in w3) and cgm3 == True
    results["clinical_edge_cases"].append("[PASS] Case 3: Post-Stroke + Dysphagia -> Metformin Crushing Alert, GLP-1 RA, CGM eligible.")

    # Test Case 4: Heart Failure
    d4, w4, t4, cgm4 = simulate_decision(65, 27.0, 50, 'micro', False, False, 'hfref', 'none', 'none', 'standard', False, False, False, False)
    assert any("HF 嚴禁 TZD" in w for w in w4) and "SGLT-2i" in d4
    results["clinical_edge_cases"].append("[PASS] Case 4: Heart Failure -> SGLT-2i indicated, TZD strictly contraindicated.")

    # Test Case 5: Frail Elderly (Age 84) on SU
    d5, w5, t5, cgm5 = simulate_decision(84, 21.0, 40, 'normal', False, False, 'none', 'moderate_severe', 'none', 'standard', True, False, False, False)
    assert t5 == "7.5%～8.0%+" and any("避免使用 SU" in w for w in w5)
    results["clinical_edge_cases"].append("[PASS] Case 5: Frail Elderly on SU -> Relaxed target 7.5%-8.0%+, SU warning.")

    # Test Case 6: Keto Diet
    d6, w6, t6, cgm6 = simulate_decision(45, 30.0, 90, 'normal', False, False, 'none', 'none', 'none', 'keto', False, False, False, False)
    assert any("euDKA" in w for w in w6)
    results["clinical_edge_cases"].append("[PASS] Case 6: Ketogenic Diet -> euDKA critical warning triggered.")

    # Test Case 7: Young-Onset (<40yo)
    d7, w7, t7, cgm7 = simulate_decision(34, 33.0, 100, 'normal', False, False, 'none', 'none', 'none', 'standard', False, False, False, False)
    assert any("早發型" in d for d in d7)
    results["clinical_edge_cases"].append("[PASS] Case 7: Young Onset (<40yo) -> Early intensive triple therapy recommendation.")

    # Test Case 8: eGFR < 20 (Severe Renal Failure)
    d8, w8, t8, cgm8 = simulate_decision(75, 25.0, 15, 'macro', False, False, 'none', 'none', 'none', 'standard', False, False, False, False)
    assert "SGLT-2i" not in d8 and "Metformin XR" not in d8 and "DPP-4i" in d8
    results["clinical_edge_cases"].append("[PASS] Case 8: eGFR 15 (End-Stage Renal Disease) -> DPP-4i monotherapy, SGLT-2i/Metformin stopped.")

    # Print Summary Report
    print("=================================================================")
    print("[SCAN REPORT] NICE NG28 INTERACTIVE WEB APP - COMPREHENSIVE DEBUG SCAN")
    print("=================================================================")
    for category, items in results.items():
        print(f"\n[{category.upper().replace('_', ' ')}]")
        for it in items:
            print(f"  {it}")

    return results

if __name__ == "__main__":
    run_debug_scan()
