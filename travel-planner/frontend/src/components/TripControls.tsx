import {
  MapPin,
  Sparkles,
  WalletCards,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import type { Trip } from "../types/trip";
export default function TripControls({
  trip,
  onChange,
  onPlan,
  busy,
}: {
  trip: Trip;
  onChange: (patch: Partial<Trip>) => void;
  onPlan: () => void;
  busy: boolean;
}) {
  return (
    <form
      className="trip-controls"
      onSubmit={(e) => {
        e.preventDefault();
        onPlan();
      }}
      aria-label="Trip planning options"
    >
      <label className="control-segment">
        <MapPin size={19} />
        <span className="sr-only">City</span>
        <select
          value={trip.city}
          onChange={(e) => onChange({ city: e.target.value, country: "Japan" })}
          disabled={busy}
        >
          <option>Tokyo</option>
          <option>Kyoto</option>
          <option>Osaka</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <label className="control-segment">
        <Sparkles size={21} className="accent" />
        <span className="sr-only">Interests</span>
        <select
          value={trip.interest}
          onChange={(e) => onChange({ interest: e.target.value })}
          disabled={busy}
        >
          <option>History & food</option>
          <option>Art & culture</option>
          <option>Nature & food</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <label className="control-segment">
        <WalletCards size={21} />
        <span className="sr-only">Budget</span>
        <select
          value={trip.budgetUsd}
          onChange={(e) => onChange({ budgetUsd: Number(e.target.value) })}
          disabled={busy}
        >
          {[50, 100, 150, 200].map((value) => (
            <option key={value} value={value}>
              ${value} budget
            </option>
          ))}
        </select>
        <ChevronDown size={13} />
      </label>
      <button className="plan-button" type="submit" disabled={busy}>
        <Sparkles size={19} />
        {busy ? "Planning…" : "Plan my day"}
        <ArrowRight size={18} />
      </button>
    </form>
  );
}
