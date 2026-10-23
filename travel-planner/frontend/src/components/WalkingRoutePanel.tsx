import { useEffect, useRef, useState } from "react";
import type { Trip } from "../types/trip";
import { tripRouteKey, walkingSchema, type WalkingRoute } from "../lib/routing";

export default function WalkingRoutePanel({
  trip,
  onRoute,
}: {
  trip: Trip;
  onRoute: (route: WalkingRoute | null) => void;
}) {
  const located = trip.places.filter((p) => p.coordinates && p.locationSource);
  const [fromId, setFrom] = useState(located[0]?.id || "");
  const [toId, setTo] = useState(located[1]?.id || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const clear = () => {
    controller.current?.abort();
    setPending(false);
    setRoute(null);
    setError("");
    onRoute(null);
  };
  const lookup = async () => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const from = located.find((p) => p.id === fromId),
      to = located.find((p) => p.id === toId);
    if (!from || !to || fromId === toId) return;
    setPending(true);
    setError("");
    setRoute(null);
    onRoute(null);
    const timer = setTimeout(() => abort.abort("timeout"), 15000);
    try {
      const response = await fetch("/api/route/walking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: trip.city,
          points: [from.coordinates, to.coordinates],
        }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Walking route unavailable.",
        );
      const result = {
        ...walkingSchema.parse(data),
        key: tripRouteKey(trip),
        fromId,
        toId,
      };
      if (!abort.signal.aborted) {
        setRoute(result);
        onRoute(result);
      }
    } catch (err) {
      if (!abort.signal.aborted || abort.signal.reason === "timeout")
        setError(
          abort.signal.aborted
            ? "Route lookup timed out. Try again."
            : err instanceof Error
              ? err.message
              : "Walking route unavailable.",
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) setPending(false);
    }
  };
  return (
    <section className="walking-route-panel" aria-label="Walking route lookup">
      <h3>A real walking route, between two places.</h3>
      <p>
        Only confirmed map matches can be routed. This checks the selected pair,
        not the whole day's schedule. The route follows mapped footpaths; access
        restrictions and actual walking pace can differ.
      </p>
      {located.length < 2 ? (
        <p>Confirm at least two locations in Places & forecast first.</p>
      ) : (
        <>
          <label className="data-field">
            Walk from
            <select
              value={fromId}
              onChange={(e) => {
                clear();
                setFrom(e.target.value);
              }}
            >
              {located.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.order}. {p.locationSource!.name}
                </option>
              ))}
            </select>
          </label>
          <label className="data-field">
            Walk to
            <select
              value={toId}
              onChange={(e) => {
                clear();
                setTo(e.target.value);
              }}
            >
              {located.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.order}. {p.locationSource!.name}
                </option>
              ))}
            </select>
          </label>
          <p className="dialog-note">
            Pressing Calculate sends the two venue coordinates to FOSSGIS's
            routing service. No device location is used.
          </p>
          <button
            className="secondary-button"
            disabled={pending || fromId === toId}
            onClick={() => void lookup()}
          >
            {pending ? "Checking walking route…" : "Calculate walking route"}
          </button>
          <div aria-live="polite">
            {error && <p role="alert">{error}</p>}
            {route && (
              <p>
                <strong>
                  {(route.distance_m / 1000).toFixed(1)} km · about{" "}
                  {Math.ceil(route.duration_s / 60)} min walking
                </strong>
                <br />
                The blue line on the map shows this pair only. Your stop times
                have not been changed.
              </p>
            )}
          </div>
        </>
      )}
      <p className="dialog-note">
        Routing by{" "}
        <a
          href="https://routing.openstreetmap.de/about.html"
          target="_blank"
          rel="noreferrer"
        >
          FOSSGIS / OSRM
        </a>
        , map data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
        .{" "}
        <a
          href="https://www.openstreetmap.org/fixthemap"
          target="_blank"
          rel="noreferrer"
        >
          Fix the map
        </a>
        .
      </p>
    </section>
  );
}
