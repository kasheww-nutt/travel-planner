import { MapPin, Clock3, Leaf } from "lucide-react";
import type { Trip } from "../types/trip";
import { money } from "../types/trip";
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export default function TripSummaryPanel({ trip }: { trip: Trip }) {
  const hours =
    trip.places.reduce(
      (sum, p) =>
        sum + (p.end ? Math.max(0, minutes(p.end) - minutes(p.start)) : 0),
      0,
    ) / 60;
  const span = trip.places.length
    ? `${trip.places[0].start} – ${trip.places.at(-1)!.end || trip.places.at(-1)!.start}`
    : "Not planned yet";
  const over = trip.estimatedUsd > trip.budgetUsd;
  return (
    <section className="trip-summary card">
      <div className="summary-title">
        <h2>Trip summary</h2>
        <strong>
          {money(trip.estimatedUsd)} <span>of {money(trip.budgetUsd)}</span>
        </strong>
      </div>
      <meter
        className={`budget-progress ${over ? "over" : ""}`}
        min={0}
        max={trip.budgetUsd}
        value={Math.min(trip.estimatedUsd, trip.budgetUsd)}
        aria-label={`Estimated cost ${money(trip.estimatedUsd)} of ${money(trip.budgetUsd)}`}
      />
      {over && (
        <p className="over-budget">
          Over budget by {money(trip.estimatedUsd - trip.budgetUsd)}
        </p>
      )}
      <dl className="summary-stats">
        <div>
          <MapPin size={18} />
          <div>
            <dt>{trip.places.length} stops</dt>
            <dd>
              {trip.source === "demo"
                ? "Adjusted for sample weather"
                : "Suggested by your team"}
            </dd>
          </div>
        </div>
        <div>
          <Clock3 size={18} />
          <div>
            <dt>
              {trip.source === "live"
                ? "Duration unverified"
                : `${hours.toFixed(1)} hours of activities`}
            </dt>
            <dd>{span}</dd>
          </div>
        </div>
        <div>
          <Leaf size={18} />
          <div>
            <dt>{trip.interest}</dt>
            <dd>A balanced day, at your pace</dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
