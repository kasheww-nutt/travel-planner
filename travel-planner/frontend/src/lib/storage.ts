import { z } from "zod";
import type { Trip } from "../types/trip";

export const CURRENT_KEY = "day-together.current.v1";
export const LIBRARY_KEY = "day-together.library.v1";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const place = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  order: z.number().int().positive(),
  name: z.string().min(1).max(200),
  start: time,
  end: z.union([time, z.literal("")]),
  description: z.string().max(4000),
  area: z.string().max(1000),
  category: z.enum([
    "historical",
    "lunch",
    "dining",
    "museum",
    "cultural",
    "dinner",
    "transport",
    "activity",
  ]),
  image: z
    .string()
    .regex(/^\/(?:photos\/[a-z0-9-]+\.jpg|illustrations\/suggestion\.svg)$/),
  coordinates: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  locationSource: z
    .object({
      name: z.string().max(300),
      address: z.string().max(1000),
      url: z
        .string()
        .regex(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/),
      confirmedAt: z.string().max(50),
      method: z.enum(["user", "catalogue"]).optional(),
      openingHours: z.string().max(300).nullable().optional(),
      fetchedAt: z.string().max(50).optional(),
    })
    .optional(),
  costUsd: z.number().finite().min(0).max(1000000),
  isChanged: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  isSample: z.boolean().optional(),
});
const agentId = z.enum(["planner", "transport", "dining", "activities"]);
const person = z.enum([
  "planner",
  "transport",
  "dining",
  "activities",
  "user",
  "system",
]);
export const tripSchema = z
  .object({
    city: z.enum(["Tokyo", "Kyoto", "Osaka"]),
    country: z.string().max(100),
    dateIso: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => {
        const value = new Date(d);
        return (
          !Number.isNaN(value.getTime()) &&
          value.toISOString().slice(0, 10) === d
        );
      }),
    interest: z.string().min(1).max(200),
    budgetUsd: z.number().finite().positive().max(1000000),
    estimatedUsd: z.number().finite().nonnegative(),
    travelers: z.number().int().min(1).max(100),
    source: z.enum(["demo", "live"]),
    places: z
      .array(place)
      .max(80)
      .refine((ps) => new Set(ps.map((p) => p.id)).size === ps.length),
    agents: z
      .array(
        z.object({
          id: agentId,
          name: z.string().max(100),
          status: z.enum(["working", "done", "idle", "error", "revising"]),
          detail: z.string().max(4000),
        }),
      )
      .length(4)
      .refine((as) => new Set(as.map((a) => a.id)).size === 4),
    messages: z
      .array(
        z.object({
          id: z.string().max(100),
          from: person,
          to: person,
          at: z.string().max(100),
          text: z.string().max(30000),
          emphasis: z.boolean().optional(),
          type: z.string().max(100).optional(),
          raw: z.string().max(30000).optional(),
        }),
      )
      .max(40),
    weather: z
      .object({
        title: z.string().max(500),
        description: z.string().max(2000),
        start: z.string().max(10),
        end: z.string().max(10),
        source: z.literal("Open-Meteo").optional(),
      })
      .nullable(),
  })
  .transform((trip) => ({
    ...trip,
    places: trip.places.map((p) => ({
      ...p,
      isSample: p.isSample || trip.source === "demo",
    })),
    estimatedUsd:
      Math.round(trip.places.reduce((sum, p) => sum + p.costUsd, 0) * 100) /
      100,
    agents: trip.agents.map((a) =>
      ["working", "revising"].includes(a.status)
        ? {
            ...a,
            status: "idle" as const,
            detail: "Previous run interrupted; generate again to continue",
          }
        : a,
    ),
  }));
const savedSchema = z.object({
  version: z.literal(1),
  id: z.string().max(100),
  name: z.string().min(1).max(80),
  savedAt: z.string().max(50),
  trip: tripSchema,
});
export type SavedTrip = z.infer<typeof savedSchema>;
export function snapshot(trip: Trip) {
  return tripSchema.parse({
    ...trip,
    messages: trip.messages.slice(-40).map((m) => ({
      ...m,
      text: m.text.slice(0, 30000),
      raw: m.raw?.slice(0, 30000),
    })),
  });
}
export function parseExport(text: string): SavedTrip {
  if (text.length > 1000000)
    throw new Error("This trip file is too large (limit 1 MB).");
  const parsed = savedSchema.safeParse(JSON.parse(text));
  if (!parsed.success)
    throw new Error(
      "This is not a valid Day, together trip file. Your current trip has not changed.",
    );
  return parsed.data;
}
export function readCurrent(storage: Pick<Storage, "getItem">): Trip | null {
  const raw = storage.getItem(CURRENT_KEY);
  if (!raw) return null;
  return tripSchema.parse(JSON.parse(raw));
}
export function readLibrary(storage: Pick<Storage, "getItem">): SavedTrip[] {
  const raw = storage.getItem(LIBRARY_KEY);
  return raw ? z.array(savedSchema).max(10).parse(JSON.parse(raw)) : [];
}
export function writeCurrent(storage: Pick<Storage, "setItem">, trip: Trip) {
  storage.setItem(CURRENT_KEY, JSON.stringify(snapshot(trip)));
}
