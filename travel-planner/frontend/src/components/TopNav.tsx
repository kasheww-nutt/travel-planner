import type { Tab } from "../types/trip";
const tabs: Tab[] = ["Workspace", "Itinerary", "Explore", "Route"];
export default function TopNav({
  activeTab,
  onTabChange,
  onAccount,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAccount: () => void;
}) {
  return (
    <header className="top-nav">
      <a
        className="brand"
        href="#workspace"
        onClick={() => onTabChange("Workspace")}
        aria-label="Day together home"
      >
        <svg
          className="sun-logo"
          width="45"
          height="38"
          viewBox="0 0 48 40"
          aria-hidden="true"
        >
          <path d="M9 31a15 15 0 0 1 30 0Z" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.25">
            <path d="M2 33h44M24 3v7M12 6l3 6M3 14l6 4M0 24l7 1M36 6l-3 6M45 14l-6 4M48 24l-7 1" />
          </g>
        </svg>
        <span>Day, together</span>
      </a>
      <nav aria-label="Primary navigation">
        {tabs.map((tab) => (
          <a
            href={`#${tab.toLowerCase()}`}
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`nav-tab ${activeTab === tab ? "active" : ""}`}
            aria-current={activeTab === tab ? "page" : undefined}
          >
            {tab}
          </a>
        ))}
      </nav>
      <button
        className="avatar-button"
        onClick={onAccount}
        aria-label="About this workspace"
      >
        <img src="/photos/avatar.jpg" alt="" />
      </button>
    </header>
  );
}
