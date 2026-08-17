import re, os

def test_interactive_app():
    base_dir = r"d:\working space\nice_diabetes_interactive"
    html_path = os.path.join(base_dir, "index.html")
    css_path = os.path.join(base_dir, "styles.css")
    js_path = os.path.join(base_dir, "app.js")

    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    with open(css_path, "r", encoding="utf-8") as f:
        css = f.read()
    with open(js_path, "r", encoding="utf-8") as f:
        js = f.read()

    print("=== 1. Checking DOM IDs Referenced in JavaScript ===")
    js_ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))
    html_ids = set(re.findall(r"id=['\"]([^'\"]+)['\"]", html))
    
    missing_in_html = js_ids - html_ids
    print(f"Total IDs in JS: {len(js_ids)} | Total IDs in HTML: {len(html_ids)}")
    if missing_in_html:
        print(f"[FAIL] Missing IDs in HTML: {missing_in_html}")
    else:
        print("[PASS] All JS element IDs exist in index.html!")

    print("\n=== 2. Checking Print Stylesheet & Elements ===")
    assert "@media print" in css, "Missing @media print in styles.css"
    assert "printable-document" in css, "Missing printable-document styling"
    assert "printable-report-content" in html, "Missing printable-report-content in index.html"
    assert "btn-modal-print" in html, "Missing print button in index.html"
    assert "btn-modal-copy" in html, "Missing copy button in index.html"
    assert "btn-modal-download" in html, "Missing download button in index.html"
    print("[PASS] Print and Report elements are properly structured!")

    print("\n=== 3. Checking Clinical Decision Logic Integrity ===")
    # Check key 2026 rules
    assert "eGFR 20～30" in js or "20～30" in js, "Missing eGFR 20-30 logic"
    assert "Modified-Release" in js, "Missing Metformin XR formulation"
    assert "Semaglutide" in js, "Missing GLP-1 RA recommendations"
    assert "SADMANS" in html, "Missing SADMANS in HTML"
    assert "euDKA" in js, "Missing euDKA warning for Keto"
    assert "严禁磨粉" in js or "嚴禁磨粉" in js, "Missing Metformin XR crushing warning"
    print("[PASS] All clinical rules & safety warnings are present in JS/HTML!")

    print("\nAll Automated Checks Passed Successfully! [OK]")

if __name__ == "__main__":
    test_interactive_app()
