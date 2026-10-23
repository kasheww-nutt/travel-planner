import { useState, useEffect } from "react";
import {
  Check,
  ExternalLink,
  Info,
  LockKeyhole,
  MapPin,
  Radio,
  RotateCcw,
} from "lucide-react";
import TopNav from "./components/TopNav";
import Hero from "./components/Hero";
import TripControls from "./components/TripControls";
import TravelTeamPanel from "./components/TravelTeamPanel";
import ItineraryPanel from "./components/ItineraryPanel";
import RouteMap from "./components/RouteMap";
import PlanUpdatePanel from "./components/PlanUpdatePanel";
import TripSummaryPanel from "./components/TripSummaryPanel";
import Dialog from "./components/Dialog";
import AgentItem from "./components/AgentItem";
import { MessageCard, titleOf } from "./components/RecentUpdates";
import { newDemoTrip } from "./data/demoTrip";
import credits from "./data/photoCredits.json";
import usePlanner from "./hooks/usePlanner";
import useForecast from "./hooks/useForecast";
import TravelDataPanel from "./components/TravelDataPanel";
import SavedTripsPanel from "./components/SavedTripsPanel";
import WalkingRoutePanel from "./components/WalkingRoutePanel";
import SchedulePanel from "./components/SchedulePanel";
import { tripRouteKey, type WalkingRoute } from "./lib/routing";
import { readCurrent, writeCurrent } from "./lib/storage";
import type { Trip, Tab } from "./types/trip";
import { money } from "./types/trip";

export default function App() {
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      return readCurrent(localStorage) || newDemoTrip();
    } catch {
      return newDemoTrip();
    }
  });
  const [saveStatus, setSaveStatus] = useState("");
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Workspace");
  const [mode, setMode] = useState<"demo" | "live">(trip.source);
  const [dialog, setDialog] = useState<string | null>(null);
  const { busy, error, plan, cancel, setError } = usePlanner(setTrip);
  useEffect(() => {
    if (busy) return;
    try {
      writeCurrent(localStorage, trip);
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus(
        "Automatic save unavailable — export a trip file to keep your changes",
      );
    }
  }, [trip, busy]);
  const forecast = useForecast(
    trip.city,
    trip.dateIso,
    trip.source === "live" || dialog === "travel-data",
  );
  const liveWeather =
    forecast.data?.status === "available"
      ? {
          title: `${forecast.data.condition} · ${forecast.data.temperature_2m_min}–${forecast.data.temperature_2m_max} °C`,
          description: `${forecast.data.date} · ${forecast.data.precipitation_probability_max}% max daily precipitation probability`,
          start: "",
          end: "",
          source: "Open-Meteo" as const,
        }
      : null;
  useEffect(() => {
    const read = () => {
      const value = location.hash.slice(1);
      const valid = (
        ["Workspace", "Itinerary", "Explore", "Route"] as Tab[]
      ).find((t) => t.toLowerCase() === value);
      setTab(valid || "Workspace");
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const onChange = (patch: Partial<Trip>) => {
    setError("");
    setTrip((prev) => ({
      ...prev,
      ...patch,
      ...(patch.city && patch.city !== prev.city
        ? { places: [], estimatedUsd: 0, messages: [], weather: null }
        : {}),
    }));
    if (patch.city) setSelectedId(null);
  };
  const select = (id: string, fromMap = false) => {
    setSelectedId(id);
    if (fromMap)
      document.getElementById(`place-${id}`)?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "nearest",
      });
  };
  const replace = (id: string) => {
    const place = trip.places.find((p) => p.id === id);
    if (place?.isLocked) {
      setError("Unlock this stop before replacing it.");
      return;
    }
    setDialog(`replace:${id}`);
  };
  const reset = () => {
    if (busy) cancel();
    setTrip(newDemoTrip());
    setSelectedId(null);
    setMode("demo");
    setError("");
    setDialog(null);
  };
  const onPlan = () => void plan(trip, mode);
  const changed = trip.places.filter((p) => p.isChanged);
  const activeAgent = dialog?.startsWith("agent:")
    ? trip.agents.find((a) => a.id === dialog.split(":")[1])
    : undefined;
  const replacePlace = dialog?.startsWith("replace:")
    ? trip.places.find((p) => p.id === dialog.split(":")[1])
    : undefined;
  return (
    <div className="app-shell">
      <TopNav
        activeTab={tab}
        onTabChange={setTab}
        onAccount={() => setDialog("about")}
      />
      <main className={`dashboard-container tab-${tab.toLowerCase()}`}>
        <div className="hero-row">
          <Hero trip={trip} />
          <TripControls
            trip={trip}
            busy={busy}
            onChange={onChange}
            onPlan={onPlan}
          />
        </div>
        <div className="run-toolbar">
          <label>
            <Radio size={12} />
            <span className="sr-only">Planning mode</span>
            <select
              value={mode}
              disabled={busy}
              onChange={(e) => setMode(e.target.value as "demo" | "live")}
            >
              <option value="demo">Demo replay</option>
              <option value="live">Live AI</option>
            </select>
          </label>
          <span>
            {mode === "demo"
              ? "Sample itinerary, weather & agent conversation"
              : "Venue catalogue required · hours & prices remain unverified"}
          </span>
          {busy ? (
            <button onClick={cancel}>Cancel planning</button>
          ) : (
            <button onClick={reset}>
              <RotateCcw size={12} />
              Reset sample
            </button>
          )}
          <button onClick={() => setDialog("travel-data")}>
            <MapPin size={12} /> Places & forecast
          </button>
          <button onClick={() => setDialog("saved-trips")}>Saved trips</button>
          <button onClick={() => setDialog("schedule")}>Review schedule</button>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <Info size={18} />
            <span>{error}</span>
            <button onClick={onPlan}>Try again</button>
          </div>
        )}
        {tab === "Explore" ? (
          <section className="explore-panel card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A LITTLE INSPIRATION</span>
                <h2>Places worth a little detour.</h2>
              </div>
              <span className="chip neutral">
                {trip.source === "demo"
                  ? "Tokyo sample collection"
                  : "Source-backed places in your plan"}
              </span>
            </div>
            <div className="explore-grid">
              {(trip.source === "demo"
                ? newDemoTrip().places
                : trip.places.filter((p) => p.locationSource)
              ).map((place) => (
                <button
                  className="explore-place"
                  key={place.id}
                  onClick={() => {
                    setDialog(
                      `${trip.source === "demo" ? "explore" : "venue"}:${place.id}`,
                    );
                  }}
                >
                  <img src={place.image} alt="" />
                  <span>
                    <small>{place.area}</small>
                    <strong>{place.name}</strong>
                    <span>{place.description}</span>
                  </span>
                </button>
              ))}
            </div>
            {trip.source === "live" &&
              !trip.places.some((p) => p.locationSource) && (
                <p>
                  No source-backed places yet. Generate a new plan when venue
                  discovery is available.
                </p>
              )}
          </section>
        ) : (
          <div className="dashboard-grid">
            {tab === "Workspace" && (
              <TravelTeamPanel
                trip={trip}
                busy={busy}
                onAgent={(id) => setDialog(`agent:${id}`)}
                onMessages={() => setDialog("messages")}
              />
            )}
            {tab !== "Route" && (
              <ItineraryPanel
                trip={trip}
                selectedId={selectedId}
                onSelect={select}
                onDateChange={(dateIso) => onChange({ dateIso })}
                onPlacesChange={(places) =>
                  setTrip((prev) => ({
                    ...prev,
                    places,
                    estimatedUsd: places.reduce((sum, p) => sum + p.costUsd, 0),
                  }))
                }
                onReplace={replace}
                onPlan={onPlan}
                busy={busy}
              />
            )}
            <div className="right-column">
              <RouteMap
                walkingRoute={
                  walkingRoute?.key === tripRouteKey(trip)
                    ? walkingRoute
                    : undefined
                }
                places={
                  trip.source === "live"
                    ? trip.places.map((p) => ({
                        ...p,
                        coordinates: p.locationSource
                          ? p.coordinates
                          : undefined,
                      }))
                    : trip.places
                }
                weather={trip.source === "live" ? liveWeather : trip.weather}
                selectedId={selectedId}
                onSelect={(id) => select(id, true)}
                onWeather={() =>
                  setDialog(trip.source === "live" ? "travel-data" : "weather")
                }
                onTransport={() => setDialog("transport")}
              />
              <div className="right-footer-grid">
                <PlanUpdatePanel
                  trip={trip}
                  onOpen={() => setDialog("changes")}
                />
                <TripSummaryPanel trip={trip} />
              </div>
            </div>
          </div>
        )}
        <footer className="page-footer">
          <span role="status">
            {busy
              ? "Planning · previous itinerary kept until completion"
              : saveStatus}
          </span>
          <span>
            <Info size={12} />
            {trip.source === "demo"
              ? "A sample Tokyo day. Weather, costs and locations are illustrative."
              : "AI estimates · pins use source records or confirmed matches. Green lines are schematic; hours and prices remain unverified."}
          </span>
          <button className="text-link" onClick={() => setDialog("credits")}>
            Photo & map credits
          </button>
        </footer>
      </main>
      {dialog && (
        <Dialog
          title={
            activeAgent
              ? `${activeAgent.name} · activity`
              : replacePlace
                ? `Replace ${replacePlace.name}`
                : {
                    messages: "The conversation behind your day",
                    weather: "A little rain, a different afternoon",
                    transport: "Getting around your day",
                    changes: "What changed, and why",
                    about: "Your travel workspace",
                    credits: "Photography & map credits",
                    "travel-data": "Places & forecast",
                    "saved-trips": "Your saved trips",
                    schedule: "Can this day fit?",
                  }[dialog] || "A place worth exploring"
          }
          onClose={() => setDialog(null)}
        >
          {dialog === "schedule" ? (
            <SchedulePanel trip={trip} route={walkingRoute} busy={busy}
              onChange={setTrip} onWalking={() => setDialog("transport")} />
          ) : dialog === "saved-trips" ? (
            <SavedTripsPanel
              trip={trip}
              busy={busy}
              onLoad={(loaded) => {
                setTrip(loaded);
                setMode(loaded.source);
                setSelectedId(null);
                setError("");
                setDialog(null);
              }}
            />
          ) : dialog === "travel-data" ? (
            <TravelDataPanel
              trip={trip}
              busy={busy}
              forecast={forecast.data}
              loading={forecast.loading}
              error={forecast.error}
              onRetry={forecast.retry}
              onDate={(dateIso) => onChange({ dateIso })}
              onConfirm={(id, candidate) => {
                if (busy) return;
                setTrip((prev) => ({
                  ...prev,
                  places: prev.places.map((p) =>
                    p.id === id && !p.isLocked
                      ? {
                          ...p,
                          coordinates: candidate.coordinates,
                          area: candidate.address || candidate.name,
                          locationSource: {
                            method: "user",
                            name: candidate.name,
                            address: candidate.address,
                            url: candidate.source_url,
                            confirmedAt: new Date().toISOString(),
                          },
                        }
                      : p,
                  ),
                }));
                setSelectedId(id);
              }}
              onClear={(id) => {
                if (busy) return;
                setTrip((prev) => ({
                  ...prev,
                  places: prev.places.map((p) =>
                    p.id === id && !p.isLocked
                      ? {
                          ...p,
                          coordinates: undefined,
                          locationSource: undefined,
                          area: "Location unconfirmed",
                        }
                      : p,
                  ),
                }));
              }}
            />
          ) : activeAgent ? (
            <>
              <AgentItem agent={activeAgent} onOpen={() => {}} />
              <p>
                Tasks are coordinated by the planner. Each agent’s requests and
                responses are recorded by the backend and streamed to this
                workspace.
              </p>
              {trip.messages
                .filter(
                  (m) => m.from === activeAgent.id || m.to === activeAgent.id,
                )
                .map((m) => (
                  <MessageCard key={m.id} message={m} />
                ))}
            </>
          ) : dialog === "messages" ? (
            <>
              <p className="dialog-note">
                {trip.source === "demo"
                  ? "Scripted sample conversation. Select Live AI to see real backend events."
                  : "Actual backend events. Raw agent replies are unvalidated until final checks pass. Status messages describe work stages, not private reasoning."}
              </p>
              {trip.messages.length ? (
                trip.messages.map((message) => (
                  <div key={message.id}>
                    <MessageCard message={message} />
                    {message.raw && (
                      <details>
                        <summary>Event payload · {message.type}</summary>
                        <pre>{message.raw}</pre>
                      </details>
                    )}
                  </div>
                ))
              ) : (
                <p>No messages yet. Plan a day to start a conversation.</p>
              )}
            </>
          ) : dialog === "weather" ? (
            <>
              <div className="notice">
                <Info size={20} />
                Sample weather — not a live forecast.
              </div>
              <h3>{trip.weather?.title || "No weather data available"}</h3>
              <p>{trip.weather?.description}</p>
              <p>
                The sample afternoon walk was replaced with an indoor museum
                visit. The 17:00 tea ceremony remains locked.
              </p>
            </>
          ) : dialog === "transport" ? (
            <>
              <WalkingRoutePanel trip={trip} onRoute={setWalkingRoute} />
              <div className="notice">
                <MapPin size={20} />
                This line connects approximate stops; it is not turn-by-turn
                directions.
              </div>
              {trip.places.map((p, i) => (
                <div className="transport-leg" key={p.id}>
                  <span className="mini-number">{i + 1}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <p>
                      {p.area} · {p.start}
                    </p>
                  </div>
                  {p.coordinates && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${p.coordinates.lat}&mlon=${p.coordinates.lng}#map=16/${p.coordinates.lat}/${p.coordinates.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${p.name} on OpenStreetMap`}
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))}
              <p>
                Check metro connections and walking durations before you travel.
                A blue walking route, when requested, covers only your selected
                confirmed pair. Transit services and other legs remain
                unverified.
              </p>
            </>
          ) : dialog === "changes" ? (
            <>
              <p>
                {trip.source === "demo"
                  ? "The sample rain scenario changes the afternoon visit while keeping the rest of your day together."
                  : "The AI itinerary uses your city, date, interests and budget. When available, a daily forecast is supplied to the agents. Weather does not automatically replace stops or verify venue availability."}
              </p>
              {changed.map((p) => (
                <div className="change-detail" key={p.id}>
                  <img src={p.image} alt="" />
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                  </div>
                </div>
              ))}
              <p>
                <LockKeyhole size={15} />{" "}
                {trip.places.filter((p) => p.isLocked).length} stop(s) locked.
                Both modes preserve locked stops. Live AI reserves their costs
                and start/end windows on the backend. New-stop durations and
                travel times remain unverified.
              </p>
            </>
          ) : dialog === "about" ? (
            <>
              <p>
                A calmer way to see your day come together: four agents, one
                shared plan, and room for a little change.
              </p>
              <div className="notice">
                {mode === "demo"
                  ? "You’re viewing the interactive sample. No model calls are made in Demo replay."
                  : "Live AI connects to your cloned FastAPI backend on port 8002."}
              </div>
              <button className="secondary-button" onClick={reset}>
                Restore the Tokyo sample
              </button>
            </>
          ) : dialog === "credits" ? (
            <>
              <p>
                Representative photos from Wikimedia Commons, cropped for
                presentation. A generic tea ceremony and restaurant image
                illustrate the unnamed sample stops.
              </p>
              {credits.map((c) => (
                <div className="credit" key={c.id}>
                  <a href={c.source} target="_blank" rel="noreferrer">
                    {c.title}
                  </a>
                  <p>
                    {c.artist} ·{" "}
                    <a
                      href={c.licenseUrl || c.source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.license}
                    </a>
                  </p>
                  <small>{c.changes}</small>
                </div>
              ))}
              <p>
                Map ©{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap contributors
                </a>
                . Lines are schematic and approximate.
              </p>
            </>
          ) : replacePlace ? (
            <>
              <p>
                {trip.source === "demo" && replacePlace.id === "mori"
                  ? "Choose the afternoon that suits you. Locked stops will remain untouched."
                  : "Choose a fresh plan to get new suggestions around your locked stops."}
              </p>
              {trip.source === "demo" && replacePlace.id === "mori" ? (
                <button
                  className="choice-card"
                  onClick={() => {
                    setTrip((prev) => {
                      const places = prev.places.map((p) =>
                        p.id === replacePlace.id
                          ? {
                              ...p,
                              name: "Shinjuku Gyoen National Garden",
                              description:
                                "A quiet garden walk. Outdoor sample alternative; check the weather before visiting.",
                              area: "Shinjuku",
                              image: "/photos/garden.jpg",
                              coordinates: { lat: 35.6852, lng: 139.71 },
                              costUsd: 8,
                              locationSource: undefined,
                              isChanged: false,
                            }
                          : p,
                      );
                      return {
                        ...prev,
                        places,
                        estimatedUsd: places.reduce(
                          (sum, p) => sum + p.costUsd,
                          0,
                        ),
                      };
                    });
                    setDialog(null);
                  }}
                >
                  <img src="/photos/garden.jpg" alt="" />
                  <span>
                    <strong>Shinjuku Gyoen National Garden</strong>
                    <small>Outdoor sample alternative · $8</small>
                  </span>
                  <Check size={18} />
                </button>
              ) : (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setDialog(null);
                    onPlan();
                  }}
                >
                  Generate new suggestions
                </button>
              )}
            </>
          ) : dialog.startsWith("venue:") ? (
            (() => {
              const p = trip.places.find((p) => p.id === dialog.slice(6));
              return p?.locationSource ? (
                <>
                  <h3>{p.locationSource.name}</h3>
                  <p>{p.locationSource.address}</p>
                  <p>
                    Listed hours:{" "}
                    {p.locationSource.openingHours || "Not provided"}. These are
                    unverified community data; check with the venue.
                  </p>
                  <p>
                    Plan estimate {money(p.costUsd)} · current prices and
                    availability unverified.
                  </p>
                  <a
                    href={p.locationSource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect the OpenStreetMap source
                  </a>
                </>
              ) : (
                <p>No source record available for this stop.</p>
              );
            })()
          ) : dialog.startsWith("explore:") ? (
            (() => {
              const p = newDemoTrip().places.find(
                (p) => p.id === dialog.split(":")[1],
              );
              return p ? (
                <>
                  <img className="place-cover" src={p.image} alt={p.name} />
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <p>
                    {p.area} · Sample estimate {money(p.costUsd)}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      reset();
                      setSelectedId(p.id);
                      location.hash = "itinerary";
                      setTab("Itinerary");
                    }}
                  >
                    View in sample itinerary
                  </button>
                </>
              ) : null;
            })()
          ) : null}
        </Dialog>
      )}
    </div>
  );
}
