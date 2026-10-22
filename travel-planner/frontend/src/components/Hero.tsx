import type { Trip } from "../types/trip";
export default function Hero({ trip }: { trip: Trip }) {
  return (
    <div className="hero-copy">
      <span className="eyebrow">
        {trip.city}
        {trip.country ? `, ${trip.country}` : ""}
      </span>
      <h1>A day in {trip.city}, built together.</h1>
      <p>
        {trip.source === "demo"
          ? "A little rain, still a lovely day. We’ve adjusted your afternoon to keep your plans on track."
          : "Your interests. Your budget. Four perspectives on a day worth exploring."}
      </p>
    </div>
  );
}
