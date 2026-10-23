export type AgentId = "planner" | "transport" | "dining" | "activities";
export type AgentStatus = "working" | "done" | "idle" | "error" | "revising";
export type Category =
  | "historical"
  | "lunch"
  | "dining"
  | "museum"
  | "cultural"
  | "dinner"
  | "transport"
  | "activity";
export type Tab = "Workspace" | "Itinerary" | "Explore" | "Route";
export interface GeoPoint {
  lat: number;
  lng: number;
}
export interface Place {
  id: string;
  order: number;
  name: string;
  start: string;
  end: string;
  description: string;
  area: string;
  category: Category;
  image: string;
  coordinates?: GeoPoint;
  locationSource?: {
    name: string;
    address: string;
    url: string;
    confirmedAt: string;
    method?: "user" | "catalogue";
    openingHours?: string | null;
    fetchedAt?: string;
  };
  costUsd: number;
  isChanged?: boolean;
  isLocked?: boolean;
  isSample?: boolean;
}
export interface Agent {
  id: AgentId;
  name: string;
  status: AgentStatus;
  detail: string;
}
export interface AgentMessage {
  id: string;
  from: AgentId | "user" | "system";
  to: AgentId | "user" | "system";
  at: string;
  text: string;
  emphasis?: boolean;
  type?: string;
  raw?: string;
}
export interface WeatherEvent {
  title: string;
  description: string;
  start: string;
  end: string;
  source?: "Open-Meteo";
}
export interface Trip {
  city: string;
  country: string;
  dateIso: string;
  interest: string;
  budgetUsd: number;
  estimatedUsd: number;
  travelers: number;
  places: Place[];
  agents: Agent[];
  messages: AgentMessage[];
  weather: WeatherEvent | null;
  source: "demo" | "live";
}
export interface AgentEvent {
  from_agent: AgentMessage["from"];
  to_agent: AgentMessage["to"];
  message_type: string;
  content: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
