import { z } from "zod";
import type { Trip } from "../types/trip";
export const walkingSchema = z.object({
  source: z.literal("FOSSGIS / OSRM"),
  mode: z.literal("walking"),
  distance_m: z.number().finite().nonnegative(),
  duration_s: z.number().finite().nonnegative(),
  path: z
    .array(
      z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]),
    )
    .min(2)
    .max(5000),
  fetched_at: z.string(),
  source_url: z.literal("https://routing.openstreetmap.de/about.html"),
});
export type WalkingRoute = z.infer<typeof walkingSchema> & {
  key: string;
  fromId: string;
  toId: string;
};
export const tripRouteKey = (trip: Trip) =>
  JSON.stringify([
    trip.city,
    trip.places.map((p) => [p.id, p.coordinates, p.locationSource?.url]),
  ]);
