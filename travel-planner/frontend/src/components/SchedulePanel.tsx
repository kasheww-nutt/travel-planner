import { useState } from "react";
import type { Trip } from "../types/trip";
import type { WalkingRoute } from "../lib/routing";
import { reviewSchedule, validVisitWindow } from "../lib/schedule";

export default function SchedulePanel({ trip, route, busy, onChange, onWalking }: {
  trip: Trip; route: WalkingRoute | null; busy: boolean;
  onChange: (trip: Trip) => void; onWalking: () => void;
}) {
  const [buffer, setBuffer] = useState(10);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const review = reviewSchedule(trip, route, buffer);
  const change = (id: string, start: string, end: string) => {
    if (busy) return;
    const place = trip.places.find(p => p.id === id);
    if (!place || place.isLocked) return;
    if (!validVisitWindow(start, end)) {
      setSaved("");
      setError("Use times between 08:00 and 22:00, with the end after the start. Overnight visits are not supported.");
      return;
    }
    setError("");
    onChange({ ...trip, places: trip.places.map(p => p.id === id ? { ...p, start, end } : p) });
    setSaved(`Updated planned times for ${place.name}.`);
  };
  return <section className="schedule-panel" aria-label="Schedule review">
    <div className="notice">
      {trip.source === "demo" ? "Sample schedule · " : "Schedule review · "}
      {review.overlaps.length + review.tight.length + review.invalid.length} conflict(s), {review.missingEnds.length} missing end time(s), {review.unknownLegs.length} unchecked travel leg(s).
    </div>
    <p>Times are planning assumptions. Opening hours, queues, reservations and transit are unverified. This review does not certify that the day is feasible.</p>
    <label className="data-field">Extra minutes per checked walking leg
      <select value={buffer} onChange={e => setBuffer(Number(e.target.value))}>
        {[0, 5, 10, 15, 20, 30, 60].map(n => <option key={n} value={n}>{n} minutes</option>)}
      </select>
    </label>
    {error && <p role="alert">{error}</p>}
    <p role="status">{saved}</p>
    <h3>Visit windows</h3>
    <p>Set a planned end time to check overlaps and travel gaps. Locked windows stay fixed; unlock a stop in the itinerary before editing it. Transport allowances are excluded.</p>
    {review.visits.map(p => <div className="schedule-visit" key={`${p.id}:${p.start}:${p.end}`}>
      <strong>{p.name}{p.isLocked ? " · Locked" : ""}</strong>
      <form onSubmit={e => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        change(p.id, String(data.get("start") || ""), String(data.get("end") || ""));
      }}>
        <label>Start<input aria-label={`Start for ${p.name}`} type="time" name="start" min="08:00" max="22:00" defaultValue={p.start} required disabled={busy || p.isLocked} /></label>
        <label>End<input aria-label={`End for ${p.name}`} type="time" name="end" min="08:00" max="22:00" defaultValue={p.end} disabled={busy || p.isLocked} /></label>
        {!p.isLocked && <button className="secondary-button" disabled={busy}>Save times</button>}
      </form>
      {!p.end && <small>Duration unknown · travel after this visit cannot be checked.</small>}
    </div>)}
    {!review.visits.length && <p>No visits to review yet.</p>}
    <h3>Conflicts</h3>
    {review.invalid.map(p => <p key={p.id}>{p.name}: invalid visit window. Set valid times before checking this visit.</p>)}
    {review.overlaps.map(o => <p key={`${o.from.id}:${o.to.id}`}>
      {o.from.name} overlaps {o.to.name}{o.minutes ? ` by ${o.minutes} min` : " at the same start time"}{o.to.isLocked || o.from.isLocked ? " · includes a locked stop" : ""}.
    </p>)}
    {!review.overlaps.length && !review.invalid.length && <p>No visit overlaps detected from the supplied windows. Missing end times can hide conflicts.</p>}
    <h3>Travel between visits</h3>
    {review.legs.map(l => <div className={`schedule-leg ${l.status === "tight" ? "schedule-conflict" : ""}`} key={`${l.from.id}:${l.to.id}`}>
      <strong>{l.from.name} → {l.to.name}</strong>
      {l.status === "tight" && <p><strong>Not enough time for this walk</strong></p>}
      <p>{l.gap === null ? "Gap unknown: set valid visit end times." : `${l.gap} min between visits.`} {l.walkMinutes === null
        ? "Walking time unchecked for this direction."
        : `Mapped walk estimate ${l.walkMinutes} min + ${review.buffer} min buffer. ${l.status === "tight" ? `Short by ${l.required! - l.gap!} min.` : l.status === "fits" ? `Fits with ${l.gap! - l.required!} min spare.` : "Set valid visit times to compare."}`}</p>
    </div>)}
    <button className="secondary-button" onClick={onWalking}>Check a walking leg</button>
    <p className="dialog-note">Only the latest calculated walking pair is checked, in its requested direction. Recalculation replaces that pair. Route evidence is temporary and is cleared on reload; times are saved with your trip. The buffer resets to 10 minutes when this review is reopened.</p>
  </section>;
}
