import {
  Sparkles,
  TrainFront,
  UtensilsCrossed,
  Ticket,
  CircleUserRound,
  Settings2,
} from "lucide-react";
import type { Agent, AgentMessage } from "../types/trip";
export function AgentAvatar({ id }: { id: AgentMessage["from"] }) {
  const Icon = {
    planner: Sparkles,
    transport: TrainFront,
    dining: UtensilsCrossed,
    activities: Ticket,
    user: CircleUserRound,
    system: Settings2,
  }[id];
  return (
    <span
      className={`agent-avatar ${["planner", "dining"].includes(id) ? "peach" : "sage"}`}
    >
      <Icon size={23} strokeWidth={1.7} />
    </span>
  );
}
export const statusText = {
  done: "Done",
  working: "Working",
  idle: "Ready",
  error: "Interrupted",
  revising: "Revising",
};
export default function AgentItem({
  agent,
  onOpen,
}: {
  agent: Agent;
  onOpen: () => void;
}) {
  return (
    <button
      className="agent-item"
      onClick={onOpen}
      aria-label={`${agent.name}: ${statusText[agent.status]}. View activity`}
    >
      <AgentAvatar id={agent.id} />
      <span className="agent-copy">
        <span className="agent-name">
          <i className={`status-dot ${agent.status}`} />
          <strong>{agent.name}</strong>
          <small>{statusText[agent.status]}</small>
        </span>
        <span className="agent-detail">{agent.detail}</span>
      </span>
    </button>
  );
}
