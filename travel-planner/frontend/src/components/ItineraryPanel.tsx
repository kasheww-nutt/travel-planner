import { ChevronLeft, ChevronRight, List, MapPin } from "lucide-react";
import { useState } from "react";
import PlaceRow from "./PlaceRow";
import type { Place, Trip } from "../types/trip";
export default function ItineraryPanel({
  trip,
  selectedId,
  onSelect,
  onDateChange,
  onPlacesChange,
  onReplace,
  onPlan,
  busy,
}: {
  trip: Trip;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDateChange: (date: string) => void;
  onPlacesChange: (places: Place[]) => void;
  onReplace: (id: string) => void;
  onPlan: () => void;
  busy: boolean;
}) {
  const [list, setList] = useState(false);
  const date = new Date(`${trip.dateIso}T12:00:00`);
  const shift = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    onDateChange(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
    );
  };
  return (
    <section
      className="itinerary-panel card"
      aria-labelledby="itinerary-title"
      aria-busy={busy}
    >
      <header className="itinerary-header">
        <h2 id="itinerary-title">Your itinerary</h2>
        <div className="date-picker">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous day"
            disabled={busy}
          >
            <ChevronLeft size={15} />
          </button>
          <time dateTime={trip.dateIso}>
            {date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <button
            onClick={() => shift(1)}
            aria-label="Next day"
            disabled={busy}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <button
          className="list-toggle"
          aria-label={list ? "View timeline" : "View as list"}
          onClick={() => setList(!list)}
          aria-pressed={list}
        >
          <List size={16} />
          <span>{list ? "Timeline" : "View as list"}</span>
        </button>
      </header>
      {trip.places.length ? (
        <div className={`places-timeline ${list ? "list-mode" : ""}`}>
          {trip.places.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              selected={selectedId === place.id}
              busy={busy}
              onSelect={() => onSelect(place.id)}
              onLock={() =>
                onPlacesChange(
                  trip.places.map((p) =>
                    p.id === place.id ? { ...p, isLocked: !p.isLocked } : p,
                  ),
                )
              }
              onReplace={() => onReplace(place.id)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <MapPin size={30} />
          <h3>A new day starts here.</h3>
          <p>Choose your interests and let the team put a plan together.</p>
          <button className="secondary-button" disabled={busy} onClick={onPlan}>
            Plan a day
          </button>
        </div>
      )}
    </section>
  );
}
