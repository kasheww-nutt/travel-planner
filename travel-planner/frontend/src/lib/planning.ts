import { z } from "zod";
import type {
  AgentEvent,
  AgentId,
  AgentMessage,
  Place,
  Trip,
} from "../types/trip";
const person = z.enum([
  "planner",
  "transport",
  "dining",
  "activities",
  "user",
  "system",
]);
export const eventSchema = z.object({
  from_agent: person,
  to_agent: person,
  message_type: z.string(),
  content: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
const itemSchema = z.object({
  venue: z
    .object({
      id: z.string().regex(/^(node|way|relation)\/[1-9]\d*$/),
      name: z.string().min(1).max(200),
      kind: z.string(),
      address: z.string(),
      coordinates: z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
      source_url: z
        .string()
        .regex(
          /^https:\/\/www\.openstreetmap\.org\/(node|way|relation)\/[1-9]\d*$/,
        ),
      opening_hours: z.string().max(300).nullable(),
      fetched_at: z.string(),
    })
    .nullable()
    .optional(),
  locked_id: z.string().min(1).nullable().optional(),
  end_time: z.string().default(""),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: z.string().min(1),
  description: z.string().default(""),
  cost: z.number().finite().nonnegative(),
  category: z.enum(["transport", "dining", "activity"]),
});
export const itinerarySchema = z.object({
  city: z.string(),
  items: z.array(itemSchema).min(1),
  total_cost: z.number().finite().nonnegative(),
  summary: z.string().optional(),
});

export function readableEvent(event: AgentEvent, index: number): AgentMessage {
  let text = event.content;
  if (
    ["response", "revised_response", "final_plan"].includes(event.message_type)
  ) {
    try {
      const value = JSON.parse(text);
      if (event.message_type === "final_plan")
        text = `Your itinerary is ready. Estimated total: $${Number(value.total_cost).toFixed(2)}.`;
      else if (typeof value.total_cost === "number")
        text = `${event.message_type === "revised_response" ? "Revised suggestions" : "Suggestions ready"}. Estimated total: $${value.total_cost.toFixed(2)}.`;
      else if (
        ["transport", "dining", "activities"].every(
          (key) => typeof value[key] === "number",
        )
      )
        text = `Budget allocated: transport $${value.transport}, dining $${value.dining}, activities $${value.activities}.`;
    } catch {
      /* Model text remains safe, ordinary React text. */
    }
  }
  return {
    id: `event-${index}`,
    from: event.from_agent,
    to: event.to_agent,
    at: new Date(event.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    text,
    emphasis:
      event.message_type.includes("revision") ||
      event.message_type === "revised_response",
    type: event.message_type,
    raw: event.content,
  };
}
export function applyAgentEvent(
  trip: Trip,
  event: AgentEvent,
  index: number,
): Trip {
  const id = event.from_agent as AgentId;
  const agents = trip.agents.map((agent) => {
    if (
      event.message_type === "error" &&
      ["working", "revising"].includes(agent.status)
    )
      return {
        ...agent,
        status: "error" as const,
        detail: "Planning interrupted",
      };
    if (
      event.message_type === "revision_request" &&
      agent.id === event.to_agent
    )
      return {
        ...agent,
        status: "revising" as const,
        detail: "Finding a better fit",
      };
    if (agent.id !== id) return agent;
    if (event.message_type === "status")
      return {
        ...agent,
        status: (agent.status === "revising" ? "revising" : "working") as
          "working" | "revising",
        detail: event.content,
      };
    if (
      ["response", "revised_response", "final_plan"].includes(
        event.message_type,
      )
    )
      return {
        ...agent,
        status: "done" as const,
        detail:
          event.message_type === "final_plan"
            ? "Your day, brought together"
            : "Suggestions ready",
      };
    return agent;
  });
  return {
    ...trip,
    agents,
    messages: [...trip.messages, readableEvent(event, index)],
  };
}
export function livePlaces(content: string, previous: Place[] = []): Place[] {
  const plan = itinerarySchema.parse(JSON.parse(content));
  const expected = previous.filter((p) => p.isLocked);
  const returned = plan.items.filter((item) => item.locked_id);
  if (
    returned.length !== expected.length ||
    expected.some(
      (p) =>
        returned.filter(
          (item) =>
            item.locked_id === p.id &&
            item.title === p.name &&
            item.time === p.start &&
            item.end_time === p.end &&
            item.cost === p.costUsd &&
            item.description === p.description &&
            item.category ===
              (["dining", "lunch", "dinner"].includes(p.category)
                ? "dining"
                : p.category === "transport"
                  ? "transport"
                  : "activity"),
        ).length !== 1,
    )
  )
    throw new Error("The planner did not preserve your locked stops.");
  return plan.items.map((item, index) => {
    if (item.locked_id) {
      const original = expected.find((p) => p.id === item.locked_id);
      if (!original) throw new Error("Unexpected locked stop.");
      return { ...original, order: index + 1 };
    }
    const dining = item.category === "dining";
    return {
      id: `live-${crypto.randomUUID()}`,
      order: index + 1,
      name: item.title,
      start: item.time,
      end: "",
      description: item.description,
      area: "Location unverified",
      category: dining
        ? "dining"
        : item.category === "transport"
          ? "transport"
          : "activity",
      image: "/illustrations/suggestion.svg",
      costUsd: item.cost,
      ...(item.venue
        ? {
            coordinates: item.venue.coordinates,
            area: item.venue.address,
            locationSource: {
              name: item.venue.name,
              address: item.venue.address,
              url: item.venue.source_url,
              confirmedAt: item.venue.fetched_at,
              fetchedAt: item.venue.fetched_at,
              method: "catalogue" as const,
              openingHours: item.venue.opening_hours,
            },
          }
        : {}),
    };
  });
}
