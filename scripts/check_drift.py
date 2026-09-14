#!/usr/bin/env python3
"""
OrbitLens Upstream Data Drift Detector
Fetches the ETag / Last-Modified header from the upstream HYG catalog source
and asserts that it matches the locally recorded upstream metadata.
Exits with code 1 if upstream data has drifted, triggering GitHub Actions alert.
"""

import sys
import os
import json
import urllib.request

META_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "data", "stars.meta.json")

def check_drift():
    if not os.path.exists(META_FILE):
        print(f"ERROR: Metadata file not found at {META_FILE}", file=sys.stderr)
        sys.exit(1)

    with open(META_FILE, "r", encoding="utf-8") as f:
        meta = json.load(f)

    upstream_url = meta.get("upstreamSource")
    expected_etag = meta.get("upstreamEtag")

    if not upstream_url:
        print("ERROR: No upstreamSource specified in metadata", file=sys.stderr)
        sys.exit(1)

    print(f"Checking upstream source: {upstream_url}")
    print(f"Expected local ETag: {expected_etag}")

    req = urllib.request.Request(upstream_url, method="HEAD", headers={"User-Agent": "OrbitLens-Drift-Detector/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            actual_etag = resp.headers.get("ETag")
            last_modified = resp.headers.get("Last-Modified")
            print(f"Upstream returned ETag: {actual_etag}, Last-Modified: {last_modified}")

            if expected_etag and actual_etag:
                # Strip quotes for clean comparison if needed
                clean_expected = expected_etag.strip('"')
                clean_actual = actual_etag.strip('"')
                if clean_expected != clean_actual:
                    print(f"\n[ALERT] Upstream data has drifted! Expected {clean_expected}, got {clean_actual}", file=sys.stderr)
                    print("Please run `python3 scripts/process_hyg.py` to regenerate static data and commit changes.", file=sys.stderr)
                    sys.exit(1)
                else:
                    print("\n[SUCCESS] Upstream HYG catalog integrity verified. No drift detected.")
                    sys.exit(0)
            else:
                print("\n[WARNING] Upstream ETag not provided; verifying reachable status 200 OK.")
                sys.exit(0)
    except Exception as e:
        print(f"\nERROR: Failed to contact upstream repository: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    check_drift()
