import {
  MapPin,
  MoreHorizontal,
  LockKeyhole,
  Utensils,
  Landmark,
  Image,
  Leaf,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Place } from "../types/trip";
import Tag from "./Tag";
export const categories: Record<Place["category"], string> = {
  historical: "Historical",
  lunch: "Lunch",
  dining: "Dining",
  museum: "Museum",
  cultural: "Cultural",
  dinner: "Dinner",
  transport: "Transport",
  activity: "Activity",
};
export default function PlaceRow({
  place,
  selected,
  onSelect,
  onLock,
  onReplace,
  busy,
}: {
  place: Place;
  selected: boolean;
  onSelect: () => void;
  onLock: () => void;
  onReplace: () => void;
  busy: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (busy) setMenu(false);
  }, [busy]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu) {
        setMenu(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  const Icon = ["lunch", "dinner", "dining"].includes(place.category)
    ? Utensils
    : place.category === "historical"
      ? Landmark
      : place.category === "museum"
        ? Image
        : Leaf;
  return (
    <article
      id={`place-${place.id}`}
      className={`place-row ${place.isChanged ? "changed" : ""} ${selected ? "selected" : ""}`}
    >
      <button
        className={`timeline-marker ${place.isChanged ? "changed" : ""}`}
        onClick={onSelect}
        aria-label={`Select stop ${place.order}: ${place.name}`}
      >
        {place.order}
      </button>
      <time className="place-time">
        {place.start}
        {place.end ? ` – ${place.end}` : ""}
      </time>
      <button
        className="place-photo-button"
        onClick={onSelect}
        aria-label={`View ${place.name}`}
      >
        <img src={place.image} alt="" className="place-photo" loading="lazy" />
      </button>
      <div className="place-info">
        <div className="place-title-line">
          <button onClick={onSelect} className="place-name">
            {place.name}
          </button>
          {place.isChanged && <Tag tone="peach">Changed</Tag>}
          {place.isSample && <Tag>Sample stop</Tag>}
          {place.isLocked && (
            <Tag>
              <LockKeyhole size={11} />
              Locked
            </Tag>
          )}
        </div>
        <p>{place.description}</p>
        {place.isLocked && !place.end && (
          <small>Locked start time · end time unset</small>
        )}
        <div className="place-meta">
          <MapPin size={13} />
          <span>{place.area}</span>
          {place.locationSource && (
            <Tag>
              {place.locationSource.method === "catalogue"
                ? "OSM-listed venue"
                : "Map match confirmed"}
            </Tag>
          )}
          <span className="category-chip">
            <Icon size={12} />
            {categories[place.category]}
          </span>
        </div>
        {place.locationSource && (
          <details className="venue-evidence">
            <summary>Venue source & listed hours</summary>
            <a href={place.locationSource.url} target="_blank" rel="noreferrer">
              {place.locationSource.name} on OpenStreetMap
            </a>
            <p>
              {place.locationSource.openingHours
                ? `Listed hours: ${place.locationSource.openingHours}`
                : "Opening hours are not listed in this record."}
            </p>
            <p>
              Community listing, not a business confirmation. Hours,
              availability and prices remain unverified.
            </p>
          </details>
        )}
      </div>
      <div className="place-actions">
        <button
          ref={trigger}
          disabled={busy}
          className="icon-button"
          onClick={() => setMenu(!menu)}
          aria-label={`Options for ${place.name}`}
          aria-expanded={menu}
        >
          <MoreHorizontal size={19} />
        </button>
        {menu && (
          <div className="place-menu">
            <button
              onClick={() => {
                onLock();
                setMenu(false);
              }}
            >
              {place.isLocked ? "Unlock stop" : "Lock stop"}
            </button>
            <button
              disabled={place.isLocked}
              onClick={() => {
                onReplace();
                setMenu(false);
              }}
            >
              Replace stop
            </button>
            <button onClick={() => setMenu(false)}>Close</button>
          </div>
        )}
      </div>
    </article>
  );
}
