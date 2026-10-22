"""Provider contract/error tests; no external traffic or credentials."""
import json
import unittest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

import main
from models import UserInput
from message_bus import MessageBus
from orchestrator import Orchestrator
from test_workflow import fixture
from travel_data import TravelData, TravelDataUnavailable


def today_japan():
    return datetime.now(timezone(timedelta(hours=9))).date()


class TravelDataTests(unittest.IsolatedAsyncioTestCase):
    async def test_lookup_capacity_is_bounded(self):
        service = TravelData()
        service.pending["places"] = 4
        with patch.object(service, "_load_json", new_callable=AsyncMock) as provider:
            with self.assertRaisesRegex(TravelDataUnavailable, "busy"):
                await service.places("Tokyo", "Museum")
            provider.assert_not_called()
        service.pending["places"] = 0
        with patch.object(service, "_load_json", new_callable=AsyncMock, side_effect=TravelDataUnavailable()):
            with self.assertRaises(TravelDataUnavailable):
                await service.places("Tokyo", "Museum")
            self.assertEqual(service.pending["places"], 0)

    async def test_historical_and_far_future_dates_do_not_call_provider(self):
        service = TravelData()
        with patch.object(service, "_json", new_callable=AsyncMock) as provider:
            for day in (today_japan() - timedelta(days=1), today_japan() + timedelta(days=16)):
                result = await service.weather("Tokyo", day)
                self.assertEqual(result["status"], "out_of_range")
                self.assertNotIn("weather_code", result)
            provider.assert_not_called()

    async def test_forecast_uses_requested_date_not_first_day(self):
        service = TravelData()
        today = today_japan()
        raw = {"_retrieved_at": "2026-01-01T00:00:00Z", "daily": {
            "time": [today.isoformat(), (today + timedelta(days=1)).isoformat()],
            "weather_code": [0, 61], "temperature_2m_min": [10, 12],
            "temperature_2m_max": [20, 18], "precipitation_probability_max": [5, 80],
        }}
        with patch.object(service, "_json", new_callable=AsyncMock, return_value=raw):
            result = await service.weather("Tokyo", today + timedelta(days=1))
            self.assertEqual(result["condition"], "Rain")
            self.assertEqual(result["precipitation_probability_max"], 80)
            self.assertEqual(result["fetched_at"], raw["_retrieved_at"])
            raw["daily"]["temperature_2m_max"][1] = None
            with self.assertRaises(TravelDataUnavailable):
                await service.weather("Tokyo", today + timedelta(days=1))

    async def test_geocoder_discards_wrong_region_and_malformed_coordinates(self):
        service = TravelData()
        def feature(coords, osm_type="N", osm_id=123):
            return {"geometry": {"coordinates": coords}, "properties": {
                "name": "Museum", "osm_type": osm_type, "osm_id": osm_id, "city": "Tokyo"}}
        raw = {"_retrieved_at": "2026-01-01T00:00:00Z", "features": [
            feature([139.75, 35.70]), feature([135.50, 34.69]),
            feature([139.75, float("nan")]), feature([139.75, 35.7], "X"),
            feature([139.75, 35.7], osm_id="<script>"),
        ]}
        with patch.object(service, "_json", new_callable=AsyncMock, return_value=raw) as provider:
            result = await service.places("Tokyo", "Museum")
            self.assertEqual(len(result["candidates"]), 1)
            self.assertEqual(result["candidates"][0]["source_url"], "https://www.openstreetmap.org/node/123")
            self.assertIn("bbox", provider.call_args.args[2])

    async def test_empty_results_remain_empty(self):
        service = TravelData()
        with patch.object(service, "_json", new_callable=AsyncMock, return_value={"features": [], "_retrieved_at": "now"}):
            self.assertEqual((await service.places("Tokyo", "Imaginary venue"))["candidates"], [])

    async def test_provider_cache_and_timeout(self):
        service = TravelData()
        response = httpx.Response(200, json={"features": []}, request=httpx.Request("GET", "https://photon.komoot.io/api/"))
        with patch("travel_data.httpx.AsyncClient.get", new_callable=AsyncMock, return_value=response) as get:
            first = await service.places("Tokyo", "Museum")
            second = await service.places("Tokyo", "Museum")
            self.assertEqual(first["fetched_at"], second["fetched_at"])
            self.assertEqual(get.await_count, 1)
        service = TravelData()
        with patch("travel_data.httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=httpx.ReadTimeout("secret upstream detail")):
            with self.assertRaisesRegex(TravelDataUnavailable, "provider is unavailable"):
                await service.places("Tokyo", "Museum")

    async def test_actual_forecast_context_is_sent_to_all_specialists(self):
        bus = MessageBus()
        agents = fixture(bus)
        forecast = {"status": "available", "condition": "Rain", "temperature_2m_min": 12,
                    "temperature_2m_max": 18, "precipitation_probability_max": 80}
        with patch("orchestrator.travel_data.weather", new_callable=AsyncMock, return_value=forecast):
            await Orchestrator(agents, bus).run(UserInput(city="Tokyo", budget=100, date=today_japan()))
        for name in ("transport", "dining", "activities"):
            self.assertIn(today_japan().isoformat(), agents[name].calls[0])
            self.assertIn("Open-Meteo city-wide daily forecast: Rain", agents[name].calls[0])
        self.assertEqual(bus.log[0].metadata["weather"], forecast)

    async def test_forecast_failure_does_not_stop_agent_planning(self):
        bus = MessageBus()
        agents = fixture(bus)
        with patch("orchestrator.travel_data.weather", new_callable=AsyncMock, side_effect=TravelDataUnavailable()):
            result = json.loads(await Orchestrator(agents, bus).run(UserInput(city="Tokyo", budget=100, date=today_japan())))
        self.assertEqual(len(result["items"]), 3)
        self.assertIn("Forecast unavailable", agents["activities"].calls[0])


class DataApiTests(unittest.TestCase):
    def test_input_validation_and_upstream_failure(self):
        with TestClient(main.app) as client:
            self.assertEqual(client.get("/api/weather", params={"city": "Tokyo", "date": "invalid"}).status_code, 422)
            self.assertEqual(client.get("/api/weather", params={"city": "Paris", "date": "2026-01-01"}).status_code, 422)
            self.assertEqual(client.get("/api/places/search", params={"city": "Tokyo", "q": "  "}).status_code, 422)
            with patch("main.travel_data.places", new_callable=AsyncMock, side_effect=TravelDataUnavailable("Provider unavailable.")):
                response = client.get("/api/places/search", params={"city": "Tokyo", "q": "Museum"})
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()["detail"], "Provider unavailable.")


if __name__ == "__main__":
    unittest.main()
