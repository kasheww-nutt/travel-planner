import { useState } from "react";
import type { Trip } from "../types/trip";
import {
  LIBRARY_KEY,
  parseExport,
  readLibrary,
  snapshot,
  type SavedTrip,
} from "../lib/storage";

export default function SavedTripsPanel({
  trip,
  busy,
  onLoad,
}: {
  trip: Trip;
  busy: boolean;
  onLoad: (trip: Trip) => void;
}) {
  const [entries, setEntries] = useState<SavedTrip[]>(() => {
    try {
      return readLibrary(localStorage);
    } catch {
      return [];
    }
  });
  const [name, setName] = useState(`${trip.city} · ${trip.dateIso}`);
  const [message, setMessage] = useState("");
  const [removed, setRemoved] = useState<SavedTrip | null>(null);
  const commit = (next: SavedTrip[]) => {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
      setEntries(next);
      return true;
    } catch {
      setMessage(
        "Could not save on this device. Export your trip as a file instead.",
      );
      return false;
    }
  };
  const save = () => {
    if (entries.length >= 10) {
      setMessage(
        "Ten saved trips is the limit. Export and remove an older copy first.",
      );
      return;
    }
    try {
      const saved: SavedTrip = {
        version: 1,
        id: crypto.randomUUID(),
        name: name.trim() || `${trip.city} · ${trip.dateIso}`,
        savedAt: new Date().toISOString(),
        trip: snapshot(trip),
      };
      if (commit([saved, ...entries])) setMessage("Trip saved on this device.");
    } catch {
      setMessage(
        "The current trip could not be saved. Your existing copies are unchanged.",
      );
    }
  };
  const download = () => {
    try {
      const saved = {
        version: 1,
        id: crypto.randomUUID(),
        name: name.trim() || trip.city,
        savedAt: new Date().toISOString(),
        trip: snapshot(trip),
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(saved, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `day-together-${trip.city.toLowerCase()}-${trip.dateIso}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Trip file exported. Keep it as a backup.");
    } catch {
      setMessage("The current trip could not be exported.");
    }
  };
  return (
    <div className="saved-trips-panel">
      <p>
        The current itinerary saves automatically after planning finishes. Named
        copies below stay on this browser and device. Export a file for a backup
        or to move a trip elsewhere. Clearing browser data removes local saves.
      </p>
      <label className="data-field">
        Trip name
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="saved-trip-actions">
        <button className="secondary-button" disabled={busy} onClick={save}>
          Save a copy
        </button>
        <button className="secondary-button" disabled={busy} onClick={download}>
          Export trip file
        </button>
        <label className="import-trip">
          Import trip file
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              try {
                if (file.size > 1000000)
                  throw new Error("Trip files must be smaller than 1 MB.");
                const imported = parseExport(await file.text());
                if (entries.length >= 10)
                  throw new Error(
                    "Remove an older saved copy before importing.",
                  );
                if (
                  commit([{ ...imported, id: crypto.randomUUID() }, ...entries])
                )
                  setMessage(
                    "Imported as a saved copy. Choose Open to view it; your current trip is unchanged.",
                  );
              } catch (err) {
                setMessage(
                  err instanceof Error
                    ? err.message
                    : "Import failed. Your current trip is unchanged.",
                );
              }
            }}
          />
        </label>
      </div>
      <p role="status">{message}</p>
      {removed && (
        <p>
          Removed “{removed.name}”.{" "}
          <button
            className="text-link"
            disabled={entries.length >= 10}
            onClick={() => {
              if (commit([removed, ...entries])) {
                setRemoved(null);
                setMessage("Saved copy restored.");
              }
            }}
          >
            Undo removal
          </button>
        </p>
      )}
      <h3>Saved on this device · {entries.length}/10</h3>
      {!entries.length && <p>No named copies yet.</p>}
      {entries.map((entry) => (
        <article className="location-candidate" key={entry.id}>
          <strong>{entry.name}</strong>
          <p>
            {entry.trip.city} · {entry.trip.dateIso} ·{" "}
            {entry.trip.places.length} stops ·{" "}
            {entry.trip.places.filter((p) => p.isLocked).length} locked
          </p>
          <small>Saved {new Date(entry.savedAt).toLocaleString()}</small>
          <div className="saved-trip-actions">
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => onLoad(snapshot(entry.trip))}
            >
              Open {entry.name}
            </button>
            <button
              className="text-link"
              disabled={busy}
              onClick={() => {
                if (commit(entries.filter((e) => e.id !== entry.id))) {
                  setRemoved(entry);
                  setMessage(
                    "Saved copy removed. Undo is available until you close this panel.",
                  );
                }
              }}
            >
              Remove saved copy
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
