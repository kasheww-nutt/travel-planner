import AgentItem from "./AgentItem";
import RecentUpdates from "./RecentUpdates";
import type { AgentId, Trip } from "../types/trip";
export default function TravelTeamPanel({
  trip,
  busy,
  onAgent,
  onMessages,
}: {
  trip: Trip;
  busy: boolean;
  onAgent: (id: AgentId) => void;
  onMessages: () => void;
}) {
  return (
    <aside className="travel-sidebar card">
      <header>
        <div className="team-heading">
          <h2>Travel team</h2>
          <span className="live-pill">
            <i className={`status-dot ${busy ? "working" : "done"}`} />
            {trip.source === "demo" ? "Demo run" : busy ? "Live" : "AI plan"}
          </span>
        </div>
        <p className="team-subtitle">4 agents working together</p>
      </header>
      <div className="agents-list">
        {trip.agents.map((agent) => (
          <AgentItem
            key={agent.id}
            agent={agent}
            onOpen={() => onAgent(agent.id)}
          />
        ))}
      </div>
      <RecentUpdates messages={trip.messages} onOpen={onMessages} />
    </aside>
  );
}
