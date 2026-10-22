import {
  ArrowRight,
  ChevronRight,
  CloudRain,
  Umbrella,
  Check,
} from "lucide-react";
import type { Trip } from "../types/trip";
export default function PlanUpdatePanel({
  trip,
  onOpen,
}: {
  trip: Trip;
  onOpen: () => void;
}) {
  const changed = trip.places.find((p) => p.isChanged);
  return (
    <section className="plan-update card">
      <h2>Plan update</h2>
      <button className="update-summary" onClick={onOpen}>
        <span className="weather-badge">
          {trip.weather ? <CloudRain size={28} /> : <Check size={26} />}
        </span>
        <span>
          <strong>
            {trip.weather
              ? "Rainy this afternoon"
              : changed
                ? "A little change of plans"
                : "Your day, brought together"}
          </strong>
          <span>
            {changed
              ? "We’ve adjusted your afternoon while saving your locked plans."
              : "See how your agents put the day together."}
          </span>
        </span>
        <ChevronRight size={16} />
      </button>
      {changed && trip.source === "demo" ? (
        <div className="comparison-row">
          <div className="comparison-card">
            <div className="compare-heading">
              <strong>Original plan</strong>
              <time>14:00 – 15:30</time>
            </div>
            <div className="compare-main">
              <img src="/photos/garden.jpg" alt="Shinjuku Gyoen garden" />
              <span>Shinjuku Gyoen National Garden</span>
            </div>
          </div>
          <ArrowRight className="compare-arrow" size={18} />
          <div className="comparison-card revised">
            <div className="compare-heading">
              <strong>Revised plan</strong>
              <time>
                {changed.start} – {changed.end}
              </time>
            </div>
            <div className="compare-main">
              <img src={changed.image} alt="" />
              <div>
                <span>{changed.name}</span>
                <small>
                  <Umbrella size={10} />
                  Better for rainy weather
                </small>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="plan-note">
          {trip.source === "demo"
            ? "No changes needed. Your selected stops are preserved."
            : "AI-generated estimates. Confirm venues, travel times and availability before you go."}
        </p>
      )}
    </section>
  );
}
