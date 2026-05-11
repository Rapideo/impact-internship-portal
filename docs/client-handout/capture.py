"""Capture screenshots of the IMPACT prototype for the client handout."""
from pathlib import Path
from playwright.sync_api import sync_playwright

PROTO = Path(__file__).resolve().parents[2] / "Prototypes" / "PROTOTYPE"
OUT = Path(__file__).resolve().parent / "screens"
OUT.mkdir(exist_ok=True)

# (filename, page, full_page, optional pre-action callback name, optional viewport-height override)
SHOTS = [
    ("01-landing.png",      "index.html",                False, None,            900),
    ("02-chooser.png",      "intern-assessments.html",   True,  None,            None),
    ("03-personal-goals.png","personal-goals.html",      False, None,            900),
    ("04-confirmation.png", "assessment-confirmation.html?type=personal-goals", False, None, 700),
    ("05-admin-home.png",   "admin.html",                False, None,            950),
    ("06-interns.png",      "interns-dashboard.html",    False, None,            900),
    ("07-intern-record.png","intern-record.html?id=evans", False, None,     1000),
    ("08-assessments-hub.png","assessments.html",        False, None,            850),
    ("09-competency.png",   "competency-new.html?internId=evans", False, None, 950),
    ("10-reports.png",      "reports.html",              False, None,            900),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fname, page_path, full, _action, vh in SHOTS:
            ctx = browser.new_context(viewport={"width": 1320, "height": vh or 900},
                                      device_scale_factor=2)
            page = ctx.new_page()
            url = (PROTO / page_path.split("?")[0]).as_uri()
            if "?" in page_path:
                url += "?" + page_path.split("?", 1)[1]
            page.goto(url, wait_until="networkidle")
            # Give web fonts a beat to settle
            page.wait_for_timeout(400)
            out = OUT / fname
            page.screenshot(path=str(out), full_page=full)
            print(f"  {fname}  ->  {out.stat().st_size // 1024} KB")
            ctx.close()
        browser.close()

if __name__ == "__main__":
    main()
