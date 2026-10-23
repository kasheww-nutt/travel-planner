import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { Trip } from "../types/trip";
import { applyAgentEvent, eventSchema, livePlaces } from "../lib/planning";
import { newDemoTrip } from "../data/demoTrip";

export default function usePlanner(setTrip: Dispatch<SetStateAction<Trip>>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const source = useRef<EventSource | null>(null);
  const session = useRef<string | null>(null);
  const baseline = useRef<Trip | null>(null);
  const active = useRef(false);
  useEffect(
    () => () => {
      const id = session.current;
      controller.current?.abort();
      source.current?.close();
      if (id)
        void fetch(`/api/plan/${id}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
    },
    [],
  );
  const cancel = () => {
    const id = session.current;
    controller.current?.abort();
    source.current?.close();
    if (id) void fetch(`/api/plan/${id}`, { method: "DELETE" }).catch(() => {});
    session.current = null;
    setBusy(false);
    setTrip((prev) => ({
      ...prev,
      ...(baseline.current
        ? {
            source: baseline.current.source,
            places: baseline.current.places,
            weather: baseline.current.weather,
          }
        : {}),
      agents: prev.agents.map((a) =>
        ["working", "revising"].includes(a.status)
          ? { ...a, status: "idle", detail: "Planning cancelled" }
          : a,
      ),
    }));
    setError("Planning cancelled. Your last itinerary is still here.");
  };
  async function plan(trip: Trip, mode: "demo" | "live") {
    if (active.current) return;
    setError("");
    if (mode === "demo" && trip.city !== "Tokyo") {
      setError(
        "The sample itinerary is for Tokyo. Choose Tokyo for a demo, or switch to Live AI for another city.",
      );
      return;
    }
    if (
      mode === "live" &&
      trip.places
        .filter((p) => p.isLocked)
        .reduce((sum, p) => sum + p.costUsd, 0) > trip.budgetUsd
    ) {
      setError(
        "Locked stops exceed your budget. Increase the budget or unlock a stop.",
      );
      return;
    }
    setBusy(true);
    active.current = true;
    baseline.current = trip;
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setTrip((prev) => ({
      ...prev,
      source: mode === "demo" ? "demo" : "live",
      weather: mode === "demo" ? newDemoTrip().weather : null,
      messages: [],
      agents: prev.agents.map((a) => ({
        ...a,
        status: "idle",
        detail: "Waiting for the planner",
      })),
    }));
    try {
      if (mode === "demo") {
        const delay = (ms: number) =>
          new Promise<void>((resolve, reject) => {
            const timer = setTimeout(resolve, ms);
            signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          });
        setTrip((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === "planner"
              ? {
                  ...a,
                  status: "working",
                  detail: "Splitting the shared budget",
                }
              : a,
          ),
        }));
        await delay(650);
        setTrip((prev) => ({
          ...prev,
          agents: prev.agents.map((a) => ({
            ...a,
            status: "working",
            detail:
              a.id === "planner"
                ? "Coordinating the specialists"
                : "Finding options for your day",
          })),
        }));
        await delay(1000);
        const sample = newDemoTrip();
        setTrip((prev) => ({
          ...prev,
          messages: [sample.messages[0]],
          agents: prev.agents.map((a) => ({
            ...a,
            status: a.id === "activities" ? "revising" : "done",
            detail:
              a.id === "activities"
                ? "Finding rain-friendly alternatives"
                : "Suggestions ready",
          })),
        }));
        await delay(800);
        setTrip((prev) => ({ ...prev, messages: sample.messages.slice(0, 2) }));
        await delay(600);
        setTrip((prev) => {
          const locked = trip.places.filter((p) => p.isLocked);
          const places = sample.places.map(
            (p) => locked.find((old) => old.id === p.id) || p,
          );
          const total = places.reduce((sum, p) => sum + p.costUsd, 0);
          return {
            ...prev,
            places,
            estimatedUsd: total,
            agents: sample.agents,
            messages: [
              ...sample.messages.slice(0, 2),
              {
                ...sample.messages[2],
                text: `Updated estimate: $${total} of $${prev.budgetUsd}. Your sample day is ready.`,
              },
            ],
          };
        });
      } else {
        const response = await fetch("/api/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: trip.city,
            interests: trip.interest.split("&").map((s) => s.trim()),
            budget: trip.budgetUsd,
            date: trip.dateIso,
            locked_stops: trip.places
              .filter((p) => p.isLocked)
              .map((p) => ({
                id: p.id,
                title: p.name,
                time: p.start,
                end_time: p.end,
                description: p.description,
                cost: p.costUsd,
                category: ["dining", "lunch", "dinner"].includes(p.category)
                  ? "dining"
                  : p.category === "transport"
                    ? "transport"
                    : "activity",
              })),
          }),
          signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : Array.isArray(data.detail)
                ? data.detail
                    .map(
                      (d: { msg?: string }) => d.msg || "Invalid trip options",
                    )
                    .join(". ")
                : "The planner could not start. Please try again.",
          );
        if (typeof data.session_id !== "string")
          throw new Error("The planner returned an invalid session.");
        session.current = data.session_id;
        if (signal.aborted) {
          void fetch(`/api/plan/${data.session_id}`, {
            method: "DELETE",
          }).catch(() => {});
          throw new DOMException("Aborted", "AbortError");
        }
        await new Promise<void>((resolve, reject) => {
          let count = 0;
          const events = new EventSource(`/api/stream/${data.session_id}`);
          let settled = false;
          source.current = events;
          const timer = setTimeout(
            () =>
              finish(new Error("The team took too long. Please try again.")),
            190000,
          );
          const finish = (error?: Error) => {
            if (settled) return;
            settled = true;
            if (error && error.name !== "AbortError")
              void fetch(`/api/plan/${data.session_id}`, {
                method: "DELETE",
              }).catch(() => {});
            clearTimeout(timer);
            events.close();
            source.current = null;
            session.current = null;
            error ? reject(error) : resolve();
          };
          signal.addEventListener(
            "abort",
            () => finish(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
          events.onmessage = (message) => {
            if (signal.aborted || settled) return;
            try {
              const event = eventSchema.parse(JSON.parse(message.data));
              setTrip((prev) => applyAgentEvent(prev, event, count++));
              if (event.message_type === "error")
                finish(new Error(event.content));
              else if (event.message_type === "final_plan") {
                const places = livePlaces(event.content, trip.places);
                setTrip((prev) => ({
                  ...prev,
                  source: "live",
                  places,
                  estimatedUsd: places.reduce((sum, p) => sum + p.costUsd, 0),
                  weather: null,
                }));
                finish();
              }
            } catch {
              finish(
                new Error(
                  "The planner returned an unexpected response. Your previous itinerary has been preserved.",
                ),
              );
            }
          };
          events.onerror = () =>
            finish(
              new Error(
                "The live connection was interrupted. Please try again.",
              ),
            );
        });
      }
    } catch (err) {
      if (!signal.aborted)
        setTrip((prev) => ({
          ...prev,
          source: trip.source,
          places: trip.places,
          weather: trip.weather,
        }));
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
        setTrip((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            ["working", "revising"].includes(a.status)
              ? { ...a, status: "error", detail: "Planning interrupted" }
              : a,
          ),
        }));
      }
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { busy, error, plan, cancel, setError };
}
