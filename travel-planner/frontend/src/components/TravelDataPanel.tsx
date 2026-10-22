import { useEffect, useRef, useState } from "react";
import type { Place, Trip } from "../types/trip";
import {
  getTravelData,
  searchSchema,
  type Candidate,
  type Forecast,
} from "../lib/travelData";

export default function TravelDataPanel({
  trip,
  busy,
  forecast,
  loading,
  error,
  onRetry,
  onDate,
  onConfirm,
  onClear,
}: {
  trip: Trip;
  busy: boolean;
  forecast?: Forecast;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onDate: (date: string) => void;
  onConfirm: (id: string, candidate: Candidate) => void;
  onClear: (id: string) => void;
}) {
  const [placeId, setPlaceId] = useState(trip.places[0]?.id || "");
  const [query, setQuery] = useState(trip.places[0]?.name || "");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
      controller.current?.abort();
    },
    [],
  );
  const selected = trip.places.find((p) => p.id === placeId);
  const clearSearch = () => {
    request.current++;
    controller.current?.abort();
    setSearching(false);
    setResults(null);
    setSearchError("");
  };
  const chooseStop = (p?: Place) => {
    clearSearch();
    setPlaceId(p?.id || "");
    setQuery(p?.locationSource?.name || p?.name || "");
  };
  const search = async () => {
    clearSearch();
    if (query.trim().length < 2) {
      setSearchError("Enter at least two characters.");
      return;
    }
    const current = ++request.current;
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort("timeout"), 15000);
    setSearching(true);
    try {
      const result = searchSchema.parse(
        await getTravelData(
          `/api/places/search?${new URLSearchParams({ city: trip.city, q: query.trim() })}`,
          abort.signal,
        ),
      );
      if (request.current === current) setResults(result.candidates);
    } catch (err) {
      if (request.current === current)
        setSearchError(
          abort.signal.aborted
            ? "Place lookup timed out. Try again."
            : err instanceof Error
              ? err.message
              : "Place lookup failed.",
        );
    } finally {
      clearTimeout(timer);
      if (request.current === current) setSearching(false);
    }
  };
  return (
    <div className="travel-data-panel">
      <section aria-label="Real forecast">
        <span className="eyebrow">CITY FORECAST · OPEN-METEO</span>
        <h3>A date makes a difference.</h3>
        <label className="data-field">
          Trip date
          <input
            type="date"
            value={trip.dateIso}
            disabled={busy}
            onInput={(e) => {
              if (e.currentTarget.value) onDate(e.currentTarget.value);
            }}
          />
        </label>
        <button
          className="text-link"
          disabled={busy}
          onClick={() =>
            onDate(
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date()),
            )
          }
        >
          Use today in Japan
        </button>
        <div aria-live="polite">
          {loading ? (
            <p>Checking the forecast for {trip.city}…</p>
          ) : error ? (
            <p role="alert">
              {error}{" "}
              <button className="text-link" onClick={onRetry}>
                Retry forecast
              </button>
            </p>
          ) : forecast?.status === "available" ? (
            <>
              <strong>
                {forecast.condition} · {forecast.temperature_2m_min}–
                {forecast.temperature_2m_max} °C
              </strong>
              <p>
                Maximum daily precipitation probability:{" "}
                {forecast.precipitation_probability_max}%.
              </p>
              <small>
                {forecast.city} · {forecast.date} · {forecast.timezone}.
                Retrieved {new Date(forecast.fetched_at).toLocaleString()}.
              </small>
            </>
          ) : (
            <p>{forecast?.message || "Forecast unavailable."}</p>
          )}
        </div>
        <p className="dialog-note">
          Daily conditions at the city centre. This does not predict a rain time
          or automatically replace a stop. Changing the date refreshes this
          forecast; generate again to update the AI itinerary.{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo
          </a>
          .
        </p>
      </section>
      <section aria-label="Confirm a place">
        <span className="eyebrow">PLACE LOOKUP · OPENSTREETMAP VIA PHOTON</span>
        <h3>Put the right place on your map.</h3>
        <p>
          Search names near {trip.city}, inspect the source, then choose the
          intended match. This confirms a map location only; prices, hours and
          reservations remain unverified.
        </p>
        {!trip.places.length ? (
          <p>Generate an itinerary first to attach locations to its stops.</p>
        ) : (
          <>
            <label className="data-field">
              Itinerary stop
              <select
                value={placeId}
                onChange={(e) =>
                  chooseStop(trip.places.find((p) => p.id === e.target.value))
                }
              >
                {trip.places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.order}. {p.name}
                  </option>
                ))}
              </select>
            </label>
            {selected?.locationSource && (
              <div className="notice">
                <span>
                  Confirmed map match:{" "}
                  <a
                    href={selected.locationSource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {selected.locationSource.name}
                  </a>
                  <br />
                  {selected.locationSource.address}
                </span>
                <button
                  className="text-link"
                  disabled={busy || selected.isLocked}
                  onClick={() => onClear(selected.id)}
                >
                  Remove match
                </button>
              </div>
            )}
            <form
              className="place-search-form"
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <label className="data-field">
                Place name
                <input
                  value={query}
                  maxLength={150}
                  onChange={(e) => {
                    clearSearch();
                    setQuery(e.target.value);
                  }}
                  placeholder="A specific museum or restaurant"
                />
              </label>
              <button
                className="secondary-button"
                disabled={searching || busy || query.trim().length < 2}
              >
                {searching ? "Searching…" : "Search places"}
              </button>
            </form>
            {selected?.isLocked && (
              <p className="dialog-note">
                Unlock this stop before changing its map location.
              </p>
            )}
            <div aria-live="polite">
              {searchError && <p role="alert">{searchError}</p>}
              {results?.length === 0 && (
                <p>
                  No matches in the {trip.city} search area. Try a specific
                  venue name or its local spelling. No location has been
                  guessed.
                </p>
              )}
              {results?.map((candidate) => (
                <article className="location-candidate" key={candidate.id}>
                  <strong>{candidate.name}</strong>
                  <small>Map feature: {candidate.kind}</small>
                  <p>{candidate.address}</p>
                  <small>
                    {candidate.coordinates.lat.toFixed(5)},{" "}
                    {candidate.coordinates.lng.toFixed(5)} ·{" "}
                    <a
                      href={candidate.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Inspect on OpenStreetMap
                    </a>
                  </small>
                  <button
                    className="secondary-button"
                    disabled={busy || !selected || selected.isLocked}
                    onClick={() => {
                      onConfirm(placeId, candidate);
                      setResults(null);
                    }}
                  >
                    Use this location
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        <p className="dialog-note">
          ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap contributors
          </a>{" "}
          · Search by{" "}
          <a href="https://photon.komoot.io/" target="_blank" rel="noreferrer">
            Photon
          </a>
          . Search text and selected city are sent to the provider when you
          press Search.
        </p>
      </section>
    </div>
  );
}
