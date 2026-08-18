from pathlib import Path
import re
import subprocess


BASE_DIR = Path(__file__).resolve().parent


def run_debug_scan() -> dict[str, list[str]]:
    html = (BASE_DIR / "index.html").read_text(encoding="utf-8")
    css = (BASE_DIR / "styles.css").read_text(encoding="utf-8")
    js = (BASE_DIR / "app.js").read_text(encoding="utf-8")

    results = {
        "html_audit": [],
        "css_audit": [],
        "js_audit": [],
        "accessibility_audit": [],
        "clinical_engine": [],
    }

    all_ids = re.findall(r'id=["\']([^"\']+)["\']', html)
    duplicates = sorted({item for item in all_ids if all_ids.count(item) > 1})
    assert not duplicates, f"Duplicate IDs: {duplicates}"
    results["html_audit"].append(f"[PASS] {len(set(all_ids))} unique DOM IDs")

    js_ids = set(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', js))
    missing = sorted(js_ids - set(all_ids))
    assert not missing, f"Missing IDs referenced by app.js: {missing}"
    results["html_audit"].append(f"[PASS] All {len(js_ids)} app.js DOM references exist")

    assert "@media print" in css
    assert "overflow-x: auto" in css
    results["css_audit"].append("[PASS] Print and narrow-screen overflow styles exist")

    assert html.index('src="clinical-engine.js"') < html.index('src="app.js"')
    results["js_audit"].append("[PASS] Shared clinical engine loads before the UI")

    assert 'role="dialog"' in html and 'aria-modal="true"' in html
    assert 'role="tablist"' in html and 'role="tabpanel"' in html
    results["accessibility_audit"].append("[PASS] Dialog and tab semantics are present")

    subprocess.run(["node", "--check", "clinical-engine.js"], cwd=BASE_DIR, check=True)
    subprocess.run(["node", "--check", "app.js"], cwd=BASE_DIR, check=True)
    subprocess.run(
        ["node", "--test", "tests/clinical-engine.test.js"],
        cwd=BASE_DIR,
        check=True,
        capture_output=True,
        text=True,
    )
    results["clinical_engine"].append("[PASS] Real JavaScript clinical regression suite exited successfully")

    for category, items in results.items():
        print(f"\n[{category.upper().replace('_', ' ')}]")
        for item in items:
            print(f"  {item}")

    return results


if __name__ == "__main__":
    run_debug_scan()
