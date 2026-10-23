import type { Place, Trip } from "../types/trip";
import type { WalkingRoute } from "./routing";
import { tripRouteKey } from "./routing.ts";

export const minutes = (time: string): number | null => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export function validVisitWindow(start: string, end: string) {
  const a = minutes(start), b = minutes(end);
  return a !== null && a >= 480 && a <= 1320 &&
    (end === "" || (b !== null && b > a && b <= 1320));
}

export function reviewSchedule(trip: Trip, route: WalkingRoute | null, buffer = 10) {
  // A transport budget allowance is not a timed visit or a verified journey.
  const visits = trip.places.filter(p => p.category !== "transport")
    .slice().sort((a, b) => a.start.localeCompare(b.start) || a.order - b.order);
  const invalid = visits.filter(p => !validVisitWindow(p.start, p.end));
  const usable = visits.filter(p => !invalid.includes(p));
  const overlaps: { from: Place; to: Place; minutes: number }[] = [];
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const a = usable[i], b = usable[j];
      const aEnd = minutes(a.end), bStart = minutes(b.start)!;
      // Even an unknown-duration visit conflicts if its start is inside a known visit.
      if (aEnd !== null && bStart < aEnd) overlaps.push({
        from: a, to: b,
        minutes: Math.min(aEnd, minutes(b.end) ?? aEnd) - bStart,
      });
      else if (a.start === b.start) overlaps.push({ from: a, to: b, minutes: 0 });
    }
  }
  const safeBuffer = Number.isFinite(buffer) ? Math.max(0, Math.min(60, Math.ceil(buffer))) : 10;
  const currentRoute = route?.key === tripRouteKey(trip) &&
    Number.isFinite(route.duration_s) && route.duration_s >= 0 ? route : null;
  const legs = visits.slice(1).map((to, i) => {
    const from = visits[i], end = minutes(from.end), start = minutes(to.start);
    const gap = end !== null && start !== null && !invalid.includes(from) && !invalid.includes(to)
      ? start - end : null;
    const walkMinutes = currentRoute?.fromId === from.id && currentRoute.toId === to.id
      ? Math.ceil(currentRoute.duration_s / 60) : null;
    return { from, to, gap, walkMinutes, required: walkMinutes === null ? null : walkMinutes + safeBuffer,
      status: gap === null || walkMinutes === null ? "unknown" as const
        : gap < walkMinutes + safeBuffer ? "tight" as const : "fits" as const };
  });
  return { visits, invalid, overlaps, legs, buffer: safeBuffer,
    missingEnds: visits.filter(p => !p.end),
    tight: legs.filter(l => l.status === "tight"),
    unknownLegs: legs.filter(l => l.status === "unknown"),
  };
}
