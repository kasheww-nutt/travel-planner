import { AgentAvatar } from "./AgentItem";
import type { AgentMessage } from "../types/trip";
export const titleOf = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);
export function MessageCard({
  message,
  onOpen,
}: {
  message: AgentMessage;
  onOpen?: () => void;
}) {
  return (
    <article className={`update-card ${message.emphasis ? "highlighted" : ""}`}>
      <AgentAvatar id={message.from} />
      <div className="update-content">
        <div className="update-top">
          <strong>
            {titleOf(message.from)} <span>→</span> {titleOf(message.to)}
          </strong>
          <time>{message.at}</time>
        </div>
        <p>{message.text}</p>
        {onOpen && (
          <button className="text-link" onClick={onOpen}>
            View event details
          </button>
        )}
      </div>
    </article>
  );
}
export default function RecentUpdates({
  messages,
  onOpen,
}: {
  messages: AgentMessage[];
  onOpen: () => void;
}) {
  return (
    <section className="recent-updates">
      <div className="recent-heading">
        <h3>Recent updates</h3>
        <button onClick={onOpen} className="text-link">
          See all
        </button>
      </div>
      <div
        className="updates-list"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.slice(-3).map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
        {!messages.length && (
          <p className="empty-hint">
            The team’s updates will appear here when you start planning.
          </p>
        )}
      </div>
    </section>
  );
}
