from pathlib import Path
import re
import subprocess


BASE_DIR = Path(__file__).resolve().parent


def run_command(*args: str) -> None:
    subprocess.run(args, cwd=BASE_DIR, check=True)


def test_interactive_app() -> None:
    html = (BASE_DIR / "index.html").read_text(encoding="utf-8")
    css = (BASE_DIR / "styles.css").read_text(encoding="utf-8")
    js = (BASE_DIR / "app.js").read_text(encoding="utf-8")

    js_ids = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", js))
    html_ids = set(re.findall(r"id=['\"]([^'\"]+)['\"]", html))
    missing_in_html = js_ids - html_ids
    assert not missing_in_html, f"JavaScript references missing DOM IDs: {missing_in_html}"

    assert "@media print" in css
    assert "printable-report-content" in html
    assert html.index('src="clinical-engine.js"') < html.index('src="app.js"')
    assert 'role="dialog"' in html and 'aria-modal="true"' in html
    assert 'role="tablist"' in html and 'role="tabpanel"' in html
    assert 'tabindex="-1"' in html
    assert 'hidden' in html
    assert 'id="numeric-input-error"' in html and 'role="alert"' in html
    assert 'id="toast"' in html and 'role="status"' in html
    assert 'id="calc-sglt-frailty-risk" disabled' in html
    assert 'id="calc-onmdi" disabled' in html
    assert 'id="calc-needsmonitoringhelp" disabled' in html

    run_command("node", "--check", "clinical-engine.js")
    run_command("node", "--check", "app.js")
    run_command("node", "--test", "tests/clinical-engine.test.js")


if __name__ == "__main__":
    test_interactive_app()
    print("Current repository structural, syntax, and clinical engine checks passed.")
