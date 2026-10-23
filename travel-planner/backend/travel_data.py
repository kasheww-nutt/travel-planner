"""Read-only travel data. Provider results never certify a venue or a booking."""
import asyncio
import math
import time
from datetime import date, datetime, timedelta, timezone

import httpx

# Approximate city centres and search areas, not venue coordinates.
CITIES = {
    "Tokyo": (35.6762, 139.6503, (139.40, 35.45, 140.00, 35.95)),
    "Kyoto": (35.0116, 135.7681, (135.50, 34.80, 135.95, 35.25)),
    "Osaka": (34.6937, 135.5023, (135.25, 34.45, 135.75, 34.95)),
}


class TravelDataUnavailable(Exception):
    pass


def weather_label(code):
    if code == 0:
        return "Clear sky"
    if code in (1, 2, 3):
        return "Partly cloudy" if code != 3 else "Overcast"
    if code in (45, 48):
        return "Fog"
    if code in (51, 53, 55, 56, 57):
        return "Drizzle"
    if code in (61, 63, 65, 66, 67, 80, 81, 82):
        return "Rain"
    if code in (71, 73, 75, 77, 85, 86):
        return "Snow"
    if code in (95, 96, 99):
        return "Thunderstorms"
    return "Conditions unavailable"


class TravelData:
    def __init__(self):
        self.cache = {}
        self.locks = {name: asyncio.Lock() for name in ("weather", "places", "walking")}
        self.last_request = {name: 0.0 for name in self.locks}
        self.pending = {name: 0 for name in self.locks}

    async def _json(self, provider, url, params, ttl):
        if self.pending[provider] >= 4:
            raise TravelDataUnavailable("Travel data lookup is busy. Try again shortly.")
        self.pending[provider] += 1
        try:
            return await self._load_json(provider, url, params, ttl)
        finally:
            self.pending[provider] -= 1

    async def _load_json(self, provider, url, params, ttl):
        key = (provider, url, tuple(sorted(params.items())))
        async with self.locks[provider]:
            now = time.monotonic()
            self.cache = {k: v for k, v in self.cache.items() if v[0] > now}
            if key in self.cache:
                return self.cache[key][1]
            # Public geocoder: no autocomplete, no bulk lookups, at most one request/s.
            wait = 1 - (now - self.last_request[provider])
            if wait > 0:
                await asyncio.sleep(wait)
            self.last_request[provider] = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=8, follow_redirects=False) as client:
                    response = await client.get(url, params=params, headers={
                        "User-Agent": "DayTogether-CollegePOC/0.2 (local travel planner)",
                    })
                    response.raise_for_status()
                    data = response.json()
                if not isinstance(data, dict):
                    raise ValueError("Expected an object")
            except (httpx.HTTPError, ValueError) as exc:
                raise TravelDataUnavailable("The data provider is unavailable. Try again later.") from exc
            if len(self.cache) >= 256:
                self.cache.pop(next(iter(self.cache)))
            data["_retrieved_at"] = datetime.now(timezone.utc).isoformat()
            self.cache[key] = (time.monotonic() + ttl, data)
            return data

    async def weather(self, city: str, trip_date: date):
        lat, lng, _ = CITIES[city]
        today = datetime.now(timezone(timedelta(hours=9))).date()
        base = {"city": city, "date": trip_date.isoformat(), "source": "Open-Meteo",
                "source_url": "https://open-meteo.com/", "timezone": "Asia/Tokyo"}
        if not 0 <= (trip_date - today).days <= 15:
            return {**base, "status": "out_of_range", "message":
                    "Forecasts cover today through the next 15 days. Choose a date in that window."}
        raw = await self._json("weather", "https://api.open-meteo.com/v1/forecast", {
            "latitude": lat, "longitude": lng, "timezone": "Asia/Tokyo",
            "daily": "weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max",
            "forecast_days": 16,
        }, 1800)
        try:
            daily = raw["daily"]
            i = daily["time"].index(trip_date.isoformat())
            values = {k: daily[k][i] for k in (
                "weather_code", "temperature_2m_min", "temperature_2m_max", "precipitation_probability_max")}
            if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v)
                   for v in values.values()):
                raise ValueError("Missing daily value")
            if not (0 <= values["precipitation_probability_max"] <= 100):
                raise ValueError("Invalid probability")
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise TravelDataUnavailable("Forecast data is incomplete for this date. Try again later.") from exc
        return {**base, "status": "available", **values,
                "condition": weather_label(values["weather_code"]),
                "fetched_at": raw["_retrieved_at"],
                "message": "City-wide daily forecast, not conditions at an individual stop. No hourly rain time is inferred."}

    async def places(self, city: str, query: str):
        lat, lng, bbox = CITIES[city]
        raw = await self._json("places", "https://photon.komoot.io/api/", {
            "q": query.strip(), "lat": lat, "lon": lng, "lang": "en", "limit": 5,
            "bbox": ",".join(map(str, bbox)),
        }, 86400)
        candidates = []
        features = raw.get("features")
        if not isinstance(features, list):
            raise TravelDataUnavailable("The place provider returned incomplete data. Try again later.")
        for feature in features[:5]:
            try:
                props = feature["properties"]
                coordinates = feature["geometry"]["coordinates"]
                lng, lat = coordinates
                kind = {"N": "node", "W": "way", "R": "relation"}[props["osm_type"]]
                osm_id = props["osm_id"]
                if (not isinstance(osm_id, int) or isinstance(osm_id, bool) or osm_id <= 0
                        or not isinstance(props["name"], str) or not props["name"].strip()
                        or any(isinstance(v, bool) or not isinstance(v, (int, float))
                               or not math.isfinite(v) for v in (lat, lng))
                        or not (bbox[0] <= lng <= bbox[2] and bbox[1] <= lat <= bbox[3])):
                    continue
                address = ", ".join(str(props[k]) for k in ("housenumber", "street", "district", "city", "state", "country") if props.get(k))
                candidates.append({"id": f"{kind}/{osm_id}", "name": props["name"],
                                   "kind": str(props.get("osm_value", "map feature")).replace("_", " "),
                                   "address": address, "coordinates": {"lat": lat, "lng": lng},
                                   "source_url": f"https://www.openstreetmap.org/{kind}/{osm_id}"})
            except (KeyError, TypeError, ValueError):
                continue
        return {"city": city, "query": query.strip(), "candidates": candidates,
                "source": "OpenStreetMap via Photon", "fetched_at": raw["_retrieved_at"],
                "message": "Search matches require your confirmation. Names, opening hours and availability may be outdated."}

    async def walking(self, points):
        coordinates = ";".join(f"{p.lng:.7f},{p.lat:.7f}" for p in points)
        # This dedicated server runs FOSSGIS's foot profile, never the car profile.
        raw = await self._json("walking", f"https://routing.openstreetmap.de/routed-foot/route/v1/foot/{coordinates}", {
            "overview": "simplified", "geometries": "geojson", "steps": "false", "alternatives": "false",
        }, 3600)
        try:
            if raw.get("code") != "Ok":
                raise ValueError("No walking route")
            route = raw["routes"][0]
            waypoints = raw["waypoints"]
            if len(waypoints) != 2 or any(isinstance(p["distance"], bool) or not isinstance(p["distance"], (int, float)) or not 0 <= p["distance"] <= 300 for p in waypoints):
                raise ValueError("Map locations are too far from the walking network")
            duration, distance = route["duration"], route["distance"]
            if any(isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v) or v < 0 for v in (duration, distance)):
                raise ValueError("Invalid distance or duration")
            geometry = route["geometry"]
            if geometry["type"] != "LineString" or not 2 <= len(geometry["coordinates"]) <= 5000:
                raise ValueError("Invalid geometry")
            path = []
            for lng, lat in geometry["coordinates"]:
                if any(isinstance(v, bool) or not isinstance(v, (float, int)) or not math.isfinite(v) for v in (lng, lat)) or not -90 <= lat <= 90 or not -180 <= lng <= 180:
                    raise ValueError("Invalid coordinate")
                path.append([lat, lng])
        except (KeyError, TypeError, IndexError, ValueError) as exc:
            raise TravelDataUnavailable("No usable walking route found. Check the place matches or try again later.") from exc
        return {"source": "FOSSGIS / OSRM", "mode": "walking", "distance_m": distance,
                "duration_s": duration, "path": path, "fetched_at": raw["_retrieved_at"],
                "source_url": "https://routing.openstreetmap.de/about.html"}


travel_data = TravelData()
