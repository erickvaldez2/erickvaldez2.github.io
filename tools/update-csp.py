#!/usr/bin/env python3
"""Rebuild the Content-Security-Policy meta tag on every page.

Each inline <script> is fingerprinted (SHA-256), and only those exact scripts
are allowed to run. Run this after editing any page's JavaScript:

    python3 tools/update-csp.py

A GitHub Action also runs it automatically on every push.
"""
import base64, hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = re.compile(r"<script>(.*?)</script>", re.S)
META = re.compile(r'<meta http-equiv="Content-Security-Policy" content="[^"]*">')

def policy(hashes):
    scripts = " ".join(["'self'"] + [f"'sha256-{h}'" for h in hashes])
    return ("default-src 'self'; "
            f"script-src {scripts}; "
            "style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; "
            "connect-src 'self'; manifest-src 'self'; worker-src 'self'; "
            "object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests")

changed = 0
for page in sorted(ROOT.rglob("*.html")):
    if any(part.startswith(".") or part == "tools" for part in page.relative_to(ROOT).parts):
        continue
    html = page.read_text(encoding="utf-8")
    if not META.search(html):
        print(f"skip (no CSP meta): {page.relative_to(ROOT)}")
        continue
    hashes = []
    for body in SCRIPT.findall(html):
        h = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode()
        if h not in hashes:
            hashes.append(h)
    new = META.sub(lambda _: f'<meta http-equiv="Content-Security-Policy" content="{policy(hashes)}">', html, count=1)
    if new != html:
        page.write_text(new, encoding="utf-8")
        changed += 1
        print(f"updated: {page.relative_to(ROOT)} ({len(hashes)} script hash{'es' if len(hashes) != 1 else ''})")

print(f"{changed} page(s) changed")
sys.exit(0)
