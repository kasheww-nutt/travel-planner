import test from "node:test";
import assert from "node:assert/strict";
import { newDemoTrip } from "../src/data/demoTrip.ts";
import { reviewSchedule, validVisitWindow } from "../src/lib/schedule.ts";
import { tripRouteKey } from "../src/lib/routing.ts";

const fixture = () => {
  const trip = newDemoTrip();
  trip.places = trip.places.slice(0, 3);
  [trip.places[0].start, trip.places[0].end] = ["09:00", "10:00"];
  [trip.places[1].start, trip.places[1].end] = ["10:30", "11:30"];
  [trip.places[2].start, trip.places[2].end] = ["12:00", "13:00"];
  return trip;
};
const routeFor = trip => ({ key: tripRouteKey(trip), fromId: trip.places[0].id,
  toId: trip.places[1].id, duration_s: 1201 });

test("checks every nested overlap, including locked and unknown-duration starts", () => {
  const t = fixture();
  t.places[0].end = "14:00";
  t.places[2].end = "";
  t.places[2].isLocked = true;
  const result = reviewSchedule(t, null);
  assert.equal(result.overlaps.length, 2);
  assert.equal(result.missingEnds.length, 1);
  assert.equal(result.unknownLegs.length, 2);
  assert.equal(t.places[2].start, "12:00");
});
test("rounds walking minutes up, applies a visible buffer and checks only the forward pair", () => {
  const t = fixture(), route = routeFor(t);
  const r = reviewSchedule(t, route, 10);
  assert.equal(r.legs[0].status, "tight");
  assert.equal(r.legs[0].required, 31);
  assert.equal(r.legs[1].status, "unknown");
  assert.equal(reviewSchedule(t, route, 5).legs[0].status, "fits");
  assert.equal(reviewSchedule(t, { ...route, fromId: route.toId, toId: route.fromId }).legs[0].status, "unknown");
});
test("location changes invalidate routes while time changes recalculate gaps", () => {
  const t = fixture(), route = routeFor(t);
  t.places[1].start = "11:00";
  assert.equal(reviewSchedule(t, route).legs[0].gap, 60);
  t.places[1].coordinates.lat += .001;
  assert.equal(reviewSchedule(t, route).legs[0].status, "unknown");
});
test("does not infer durations, opening hours, or journeys from a transport allowance", () => {
  const t = fixture();
  t.places[0].end = "";
  t.places[2].category = "transport";
  const r = reviewSchedule(t, routeFor(t));
  assert.equal(r.visits.length, 2);
  assert.equal(r.legs[0].status, "unknown");
  assert.equal(r.legs[0].gap, null);
});
test("rejects overnight, equal, malformed, and out-of-day windows", () => {
  for (const pair of [["09:00", "08:00"], ["22:00", "22:00"], ["07:59", "09:00"], ["21:00", "22:01"], ["bad", ""]])
    assert.equal(validVisitWindow(...pair), false);
  assert.equal(validVisitWindow("09:00", ""), true);
  const t = fixture();
  t.places[0].end = "08:00";
  assert.equal(reviewSchedule(t, routeFor(t)).invalid.length, 1);
  assert.equal(reviewSchedule(t, routeFor(t)).legs[0].status, "unknown");
});
