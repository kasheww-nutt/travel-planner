import { z } from "zod";

const base = {
  city: z.string(),
  date: z.string(),
  source: z.literal("Open-Meteo"),
  source_url: z.literal("https://open-meteo.com/"),
  timezone: z.string(),
  message: z.string(),
};
export const forecastSchema = z.discriminatedUnion("status", [
  z.object({ ...base, status: z.literal("out_of_range") }),
  z.object({
    ...base,
    status: z.literal("available"),
    condition: z.string(),
    weather_code: z.number().int(),
    temperature_2m_min: z.number().finite(),
    temperature_2m_max: z.number().finite(),
    precipitation_probability_max: z.number().min(0).max(100),
    fetched_at: z.string(),
  }),
]);
export type Forecast = z.infer<typeof forecastSchema>;
export const candidateSchema = z.object({
  kind: z.string().default("Map feature"),
  id: z.string(),
  name: z.string().min(1),
  address: z.string(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  source_url: z
    .string()
    .regex(/^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/\d+$/),
});
export type Candidate = z.infer<typeof candidateSchema>;
export const searchSchema = z.object({
  candidates: z.array(candidateSchema).max(5),
  fetched_at: z.string(),
});
export async function getTravelData(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "Travel data could not be loaded. Try again.",
    );
  return body;
}
