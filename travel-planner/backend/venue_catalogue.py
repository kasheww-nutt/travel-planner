"""Bounded public OSM discovery, separate from model-generated suggestions."""
import math
import os
from collections import defaultdict
from urllib.parse import urlsplit

from travel_data import CITIES, TravelDataUnavailable, travel_data

CENTRES = {"Tokyo": (35.6812, 139.7671), "Kyoto": (35.0116, 135.7681), "Osaka": (34.6937, 135.5023)}
DINING = {"restaurant", "cafe", "fast_food"}
ACTIVITIES = {"museum", "gallery", "attraction", "park", "castle", "monument"}


def distance_km(lat1, lng1, lat2, lng2):
    a = math.sin(math.radians(lat2-lat1)/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(math.radians(lng2-lng1)/2)**2
    return 6371 * 2 * math.asin(min(1, math.sqrt(a)))


def parse_catalogue(city, raw):
    if raw.get("remark") or not isinstance(raw.get("elements"), list):
        raise TravelDataUnavailable("Venue discovery returned incomplete data. Your previous itinerary is unchanged.")
    centre_lat, centre_lng = CENTRES[city]
    _, _, bbox = CITIES[city]
    found = {}
    for item in raw["elements"][:100]:
        try:
            tags = item["tags"]
            if not isinstance(tags, dict):
                continue
            kind = tags.get("amenity")
            category = "dining" if kind in DINING else "activity"
            if category == "activity":
                kind = next((tags.get(key) for key in ("tourism", "leisure", "historic") if tags.get(key) in ACTIVITIES), None)
                if kind is None:
                    continue
            if tags.get("access") in ("private", "no") or tags.get("disused") == "yes":
                continue
            name = tags.get("name:en") or tags.get("name")
            osm_id, osm_type = item["id"], item["type"]
            point = item if osm_type == "node" else item["center"]
            lat, lng = point["lat"], point["lon"]
            if (not isinstance(name, str) or not name.strip() or len(name) > 200 or
                not isinstance(osm_id, int) or isinstance(osm_id, bool) or osm_id <= 0 or
                osm_type not in ("node", "way", "relation") or
                any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (lat,lng)) or
                not (bbox[0] <= lng <= bbox[2] and bbox[1] <= lat <= bbox[3])):
                continue
            distance = distance_km(centre_lat, centre_lng, lat, lng)
            # Way/relation centres can sit beyond the original around query. Check again.
            if distance > 5:
                continue
            identifier = f"{osm_type}/{osm_id}"
            address = ", ".join(str(tags[k])[:150] for k in ("addr:housenumber", "addr:street", "addr:suburb", "addr:city") if tags.get(k)) or city
            hours = tags.get("opening_hours")
            found[identifier] = {"id": identifier, "name": name.strip(), "category": category,
                "kind": kind, "address": address[:700], "coordinates": {"lat": lat, "lng": lng},
                "source_url": f"https://www.openstreetmap.org/{identifier}",
                "opening_hours": hours[:300] if isinstance(hours, str) else None,
                "fetched_at": raw["_retrieved_at"], "distance_km": round(distance, 2)}
        except (KeyError, TypeError, ValueError):
            continue
    ordered = sorted(found.values(), key=lambda v: v["distance_km"])
    dining = [v for v in ordered if v["category"] == "dining"][:14]
    # Keep a mixture rather than letting one plentiful feature type fill the pool.
    groups = defaultdict(list)
    for venue in ordered:
        if venue["category"] == "activity":
            groups[venue["kind"]].append(venue)
    activities = []
    while groups and len(activities) < 20:
        for kind in list(groups):
            activities.append(groups[kind].pop(0))
            if not groups[kind]:
                del groups[kind]
            if len(activities) == 20:
                break
    if len(dining) < 3 or len(activities) < 3:
        raise TravelDataUnavailable("Not enough usable venue listings were found for this city. No invented venues have been substituted; try again later.")
    return {"city": city, "radius_km": 5, "centre": {"lat":centre_lat,"lng":centre_lng},
            "dining": dining, "activities": activities, "fetched_at": raw["_retrieved_at"],
            "source": "OpenStreetMap via Overpass", "source_url": "https://www.openstreetmap.org/copyright"}


async def discover_venues(city):
    if city not in CENTRES:
        raise TravelDataUnavailable("Source-backed planning currently supports Tokyo, Kyoto and Osaka.")
    lat, lng = CENTRES[city]
    around = f"(around:5000,{lat},{lng})"
    query = f'''[out:json][timeout:20][maxsize:16777216];
nwr{around}["amenity"~"^(restaurant|cafe|fast_food)$"]["name"]; out tags center 24;
nwr{around}["tourism"~"^(museum|gallery)$"]["name"]; out tags center 10;
nwr{around}["tourism"="attraction"]["name"]; out tags center 10;
nwr{around}["leisure"="park"]["name"]; out tags center 10;
nwr{around}["historic"~"^(castle|monument)$"]["name"]; out tags center 8;'''
    endpoint = os.getenv("OVERPASS_API_URL", "https://overpass.private.coffee/api/interpreter").strip()
    try:
        parsed = urlsplit(endpoint)
    except ValueError:
        raise TravelDataUnavailable("Configure a valid HTTPS OVERPASS_API_URL.") from None
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment or parsed.query:
        raise TravelDataUnavailable("Configure a valid HTTPS OVERPASS_API_URL without credentials, query or fragment.")
    raw = await travel_data._json("catalogue", endpoint, {"data": query}, 21600)
    return parse_catalogue(city, raw)
