#!/usr/bin/env python3
"""Optional: fetch Poly Haven CC0 texture sets (1k diffuse, roughness, GL normal) that build.py asks for with
K.scan(name, "<polyhaven id>", fallback). Files go to $PBF_ASSETS (default ~/.pbf/polyhaven), never into the repo or
docs/; a fresh copy without them still builds with the procedural fallbacks.

    python3 <skill>/scripts/fetch-assets.py <project>        reads <project>/assets.json: {"textures": ["rock_wall_08", ...]}
    python3 <skill>/scripts/fetch-assets.py --id rock_wall_08
"""
import argparse
import json
import os
import urllib.request

ASSETS = os.environ.get("PBF_ASSETS", os.path.join(os.path.expanduser("~"), ".pbf", "polyhaven"))
API = "https://api.polyhaven.com/files/"
MAPS = {"diff": ["Diffuse", "diff"], "rough": ["Rough", "rough"], "nor_gl": ["nor_gl"]}


def fetch(pid):
    d = os.path.join(ASSETS, pid)
    os.makedirs(d, exist_ok=True)
    req = urllib.request.Request(API + pid, headers={"User-Agent": "plan-build-film"})
    info = json.load(urllib.request.urlopen(req, timeout=30))
    got = []
    for key, names in MAPS.items():
        dst = os.path.join(d, f"{pid}_{key}_1k.jpg")
        if os.path.exists(dst):
            got.append(key)
            continue
        node = next((info[n] for n in names if n in info), None)
        url = node and node.get("1k", {}).get("jpg", {}).get("url")
        if not url:
            continue
        r = urllib.request.Request(url, headers={"User-Agent": "plan-build-film"})
        open(dst, "wb").write(urllib.request.urlopen(r, timeout=60).read())
        got.append(key)
    print(f"{pid}: {', '.join(got) or 'nothing'} in {d}  (CC0, https://polyhaven.com/a/{pid})")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", nargs="?")
    ap.add_argument("--id", action="append", default=[])
    a = ap.parse_args()
    ids = list(a.id)
    if a.project:
        ids += json.load(open(os.path.join(a.project, "assets.json")))["textures"]
    for pid in ids:
        fetch(pid)


if __name__ == "__main__":
    main()
