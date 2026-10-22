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
import type { Trip, Tab } from "./types/trip";
import { money } from "./types/trip";

export default function App() {
  const [trip, setTrip] = useState<Trip>(newDemoTrip);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Workspace");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [dialog, setDialog] = useState<string | null>(null);
  const { busy, error, plan, cancel, setError } = usePlanner(setTrip);
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
              : "Real Groq agents · suggestions and prices are unverified"}
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
              <span className="chip neutral">Tokyo sample collection</span>
            </div>
            <div className="explore-grid">
              {newDemoTrip().places.map((place) => (
                <button
                  className="explore-place"
                  key={place.id}
                  onClick={() => {
                    setDialog(`explore:${place.id}`);
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
          <span>
            <Info size={12} />
            {trip.source === "demo"
              ? "A sample Tokyo day. Weather, costs and locations are illustrative."
              : "AI estimates · only confirmed place matches get pins. Lines are schematic; travel times and opening hours are unverified."}
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
                  }[dialog] || "A place worth exploring"
          }
          onClose={() => setDialog(null)}
        >
          {dialog === "travel-data" ? (
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
                  : "Actual backend events. Status messages describe work stages, not private reasoning."}
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
                No live routing service is connected.
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
                Demo replay preserves these selections. Live AI requires
                unlocking first.
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
                  : "Choose a fresh plan to get new suggestions. Existing locked stops are preserved in Demo replay only."}
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
