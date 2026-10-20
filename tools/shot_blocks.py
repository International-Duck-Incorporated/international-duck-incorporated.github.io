#!/usr/bin/env python3
"""Screenshot the homepage block-field backdrop from a local static server.

Forces the blocks backdrop deterministically by pinning Math.random before
any page script runs (head-script roll: rare=950 -> no rare event, pool roll
floor(0.95*9)=8 -> blocks). Waits for the WebGL first frame, then captures
the viewport plus console/page errors.

Usage: python3 tools/shot_blocks.py <repo-root> <out.png> [wait_seconds]
"""

import sys, os, threading, functools, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(sys.argv[1])
OUT = os.path.abspath(sys.argv[2])
WAIT = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
PORT = 8123

handler = functools.partial(SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a, **k: None
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-swiftshader",
            "--disable-lcd-text",
        ],
    )
    ctx = browser.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    ctx.add_init_script("""
        Math.random = () => 0.95;
        // headless shells report tiny core/memory hints; don't let the
        // low-end guard swap the backdrop pool out from under the shot
        Object.defineProperty(navigator, 'hardwareConcurrency', {get: () => 8});
        Object.defineProperty(navigator, 'deviceMemory', {get: () => 8});
    """)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on(
        "console", lambda m: errors.append(m.type + ": " + m.text) if m.type in ("error",) else None
    )
    page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="domcontentloaded")
    frame = page.evaluate("document.documentElement.dataset.frame")
    backdrop = page.evaluate("window.IDI_BACKDROP")
    print("data-frame =", frame, "| IDI_BACKDROP =", backdrop)
    assert frame == "blocks", "backdrop picker did not land on blocks"
    page.wait_for_selector("canvas.egg-canvas", timeout=20000)
    page.wait_for_selector("body.egg-ready", timeout=20000)  # first WebGL frame drawn
    webgl = page.evaluate("""() => {
        const c = document.querySelector('canvas.egg-canvas');
        return c ? {w: c.width, h: c.height} : null;
    }""")
    print("canvas =", webgl)
    time.sleep(WAIT)  # let a few frames tumble
    page.screenshot(path=OUT)
    print("shot ->", OUT)
    browser.close()
httpd.shutdown()
bad = [e for e in errors if "net::" not in e and "gitlab" not in e.lower()]
print("console/page errors:", bad if bad else "none")
sys.exit(1 if bad else 0)
