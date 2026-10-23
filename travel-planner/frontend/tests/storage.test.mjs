import test from "node:test";
import assert from "node:assert/strict";
import {
  snapshot,
  parseExport,
  readCurrent,
  writeCurrent,
  CURRENT_KEY,
} from "../src/lib/storage.ts";
import { newDemoTrip } from "../src/data/demoTrip.ts";
import { livePlaces } from "../src/lib/planning.ts";
import { tripRouteKey, walkingSchema } from "../src/lib/routing.ts";

test("current trip roundtrips locks and map provenance, recalculating totals", () => {
  const trip = newDemoTrip();
  trip.estimatedUsd = 999;
  trip.places[0].locationSource = {
    name: "Temple",
    address: "Tokyo",
    url: "https://www.openstreetmap.org/node/1",
    confirmedAt: new Date().toISOString(),
  };
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value),
  };
  writeCurrent(storage, trip);
  const restored = readCurrent(storage);
  assert.equal(restored.estimatedUsd, 96);
  assert.equal(restored.places[3].isLocked, true);
  assert.equal(
    restored.places[0].locationSource.url,
    trip.places[0].locationSource.url,
  );
  assert.ok(data.has(CURRENT_KEY));
});
test("import rejects active content and invalid dates without trusting totals", () => {
  const valid = {
    version: 1,
    id: "test",
    name: "Tokyo trip",
    savedAt: new Date().toISOString(),
    trip: newDemoTrip(),
  };
  assert.equal(parseExport(JSON.stringify(valid)).trip.city, "Tokyo");
  for (const mutate of [
    (t) => (t.places[0].image = "https://attacker.example/track"),
    (t) =>
      (t.places[0].locationSource = {
        name: "X",
        address: "X",
        url: "javascript:alert(1)",
        confirmedAt: "now",
      }),
    (t) => (t.dateIso = "2026-02-30"),
    (t) => (t.places[0].costUsd = -1),
  ]) {
    const value = structuredClone(valid);
    mutate(value.trip);
    assert.throws(() => parseExport(JSON.stringify(value)));
  }
  assert.throws(() => parseExport(" ".repeat(1000001)));
});
test("storage errors surface and interrupted runs restore idle", () => {
  const trip = newDemoTrip();
  trip.agents[0].status = "working";
  assert.equal(snapshot(trip).agents[0].status, "idle");
  assert.throws(
    () =>
      writeCurrent(
        {
          setItem() {
            throw new Error("quota");
          },
        },
        trip,
      ),
    /quota/,
  );
  assert.throws(() =>
    readCurrent({
      getItem() {
        return "{bad json";
      },
    }),
  );
});
test("live result restores original locked metadata and rejects altered locks", () => {
  const original = newDemoTrip().places;
  const locked = original.find((p) => p.isLocked);
  const result = {
    city: "Tokyo",
    total_cost: locked.costUsd,
    items: [
      {
        locked_id: locked.id,
        time: locked.start,
        end_time: locked.end,
        title: locked.name,
        description: locked.description,
        cost: locked.costUsd,
        category: "activity",
      },
    ],
  };
  const places = livePlaces(JSON.stringify(result), original);
  assert.deepEqual(places[0], { ...locked, order: 1 });
  result.items[0].cost++;
  assert.throws(
    () => livePlaces(JSON.stringify(result), original),
    /locked stops/,
  );
  assert.throws(() =>
    livePlaces(JSON.stringify({ ...result, items: [] }), original),
  );
});
test("walking route state invalidates when a matched location changes", () => {
  const trip = newDemoTrip(),
    before = tripRouteKey(trip);
  trip.places[0].coordinates.lat += 0.001;
  assert.notEqual(tripRouteKey(trip), before);
  assert.throws(() =>
    walkingSchema.parse({
      source: "FOSSGIS / OSRM",
      mode: "driving",
      distance_m: 10,
      duration_s: 10,
      path: [
        [35, 139],
        [36, 140],
      ],
      fetched_at: "now",
      source_url: "https://routing.openstreetmap.de/about.html",
    }),
  );
});
test("source-backed venues carry listed hours through conversion and storage", () => {
  const venue = {
    id: "node/123",
    name: "Synthetic fixture museum",
    kind: "museum",
    address: "Tokyo",
    coordinates: { lat: 35.68, lng: 139.76 },
    source_url: "https://www.openstreetmap.org/node/123",
    opening_hours: "Mo-Fr 09:00-17:00",
    fetched_at: "2026-10-23T00:00:00Z",
  };
  const plan = {
    city: "Tokyo",
    items: [
      {
        time: "09:00",
        title: venue.name,
        description: "Fixture",
        cost: 5,
        category: "activity",
        venue,
      },
    ],
    total_cost: 5,
  };
  const trip = newDemoTrip();
  trip.source = "live";
  trip.places = livePlaces(JSON.stringify(plan));
  assert.equal(trip.places[0].locationSource.method, "catalogue");
  assert.equal(
    snapshot(trip).places[0].locationSource.openingHours,
    venue.opening_hours,
  );
  assert.equal(trip.places[0].coordinates.lat, 35.68);
  plan.items[0].venue.source_url = "https://attacker.example/fake";
  assert.throws(() => livePlaces(JSON.stringify(plan)));
});
