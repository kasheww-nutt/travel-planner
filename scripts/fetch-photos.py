"""Download small Commons reference photos and retain their license metadata."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import html
import json
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "travel-planner/frontend/public/photos"
DEST.mkdir(parents=True, exist_ok=True)
QUERIES = {"sensoji": "Sensoji pagoda temple", "tsukiji": "Tsukiji outer market street", "mori": "Mori Art Museum interior", "tea": "Japanese tea ceremony matcha bowl", "izakaya": "Izakaya restaurant interior Japan", "garden": "Shinjuku Gyoen cherry blossoms", "avatar": "Mount Fuji lake landscape"}
HEADERS = {"User-Agent": "DayTogetherLocalDemo/1.0 (educational UI rebuild; Commons image attribution included)"}

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=40).read()

def clean(value):
    return html.unescape(re.sub(r"<[^>]*>", "", str(value)))

def download(pair):
    key, query = pair
    args = dict(action="query", format="json", generator="search", gsrnamespace=6,
                gsrsearch=query, gsrlimit=5, prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=500)
    data = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(args)))
    pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda x: x.get("index", 99))
    for page in pages:
        info = page.get("imageinfo", [{}])[0]
        meta = info.get("extmetadata", {})
        license_name = meta.get("LicenseShortName", {}).get("value", "")
        if not any(term in license_name for term in ("CC BY", "CC0", "Public domain")) or not info.get("thumburl"):
            continue
        try:
            raw = get(info["thumburl"].split("?")[0])
            if len(raw) < 1000:
                continue
            (DEST / f"{key}.jpg").write_bytes(raw)
            return {"id": key, "title": page["title"], "artist": clean(meta.get("Artist", {}).get("value", "Unknown")), "license": clean(license_name), "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""), "source": info["descriptionurl"], "changes": "Thumbnail cropped by CSS in the interface."}
        except Exception:
            continue
    raise RuntimeError(f"No downloadable licensed image for {key}")

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=3) as pool:
        credits = list(pool.map(download, QUERIES.items()))
    target = ROOT / "travel-planner/frontend/src/data/photoCredits.json"
    target.parent.mkdir(exist_ok=True, parents=True)
    target.write_text(json.dumps(credits, indent=2), encoding="utf-8")
    print("Downloaded and attributed", len(credits), "photos")
