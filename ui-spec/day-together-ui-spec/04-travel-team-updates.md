# 04 — Travel team and agent updates sidebar

## Reference

Full-height left white card: header **Travel team**, tiny sage `Live` pill with green dot, subtitle **4 agents working together**. Four vertically stacked rows: Planner (coral sparkles badge), Transport (sage train badge), Dining (coral utensils badge), Activities (sage ticket badge). Each row has a tiny bright-green status dot, bold name, gray activity subtitle. Thin beige divider. Secondary heading **Recent updates**, trailing link **See all**. Three separate small message cards; second tinted peach. At 1672px reference sidebar width ~291px, padding ~16px.

## Components

```tsx
import { Sparkles, TrainFront, UtensilsCrossed, Ticket } from 'lucide-react';
import type { Agent, AgentId, AgentMessage } from '../types/trip';
const icons = { planner:Sparkles, transport:TrainFront,
  dining:UtensilsCrossed, activities:Ticket };
const tint = { planner:'peach', transport:'sage', dining:'peach', activities:'sage' };
const titleOf = (id:AgentId|'user') => id==='user'?'User':id[0].toUpperCase()+id.slice(1);

function AgentAvatar({id}:{id:AgentId}) {
  const Icon=icons[id];
  return <span className={`agent-avatar ${tint[id]}`}><Icon size={23} strokeWidth={1.8}/></span>;
}
function AgentItem({agent}:{agent:Agent}) {
  return <div className="agent-item">
    <AgentAvatar id={agent.id}/>
    <div><div className="agent-name-row"><span className="status-dot"/>
      <strong>{agent.name}</strong></div><p>{agent.detail}</p></div>
  </div>;
}
function RecentUpdates({messages}:{messages:AgentMessage[]}) {
  return <section className="recent-updates">
    <div className="recent-heading"><h3>Recent updates</h3><button onClick={()=>{ /* open full event log */ }}>See all</button></div>
    <div className="updates-list">{messages.slice(0,3).map(msg=><article
      key={msg.id} className={`update-card ${msg.emphasis?'is-highlighted':''}`}>
      <AgentAvatar id={msg.from}/>
      <div className="update-content"><div className="update-top">
        <strong>{titleOf(msg.from)} → {titleOf(msg.to)}</strong><time>{msg.at}</time>
      </div><p>{msg.text}</p></div>
    </article>)}</div>
  </section>;
}
export default function TravelTeamPanel({agents,messages}:{agents:Agent[];messages:AgentMessage[]}) {
  return <aside className="travel-sidebar card">
    <header><div className="team-heading"><h2>Travel team</h2>
      <span className="live-pill"><span className="status-dot"/>Live</span></div>
      <p className="team-subtitle">{agents.length} agents working together</p></header>
    <div className="agents-list">{agents.map(agent=><AgentItem key={agent.id} agent={agent}/>)}</div>
    <RecentUpdates messages={messages}/>
  </aside>;
}
```

## CSS

```css
.travel-sidebar { padding:16px 13px 13px; display:flex; flex-direction:column; min-width:0; }
.team-heading { display:flex; gap:12px; align-items:center; }
.team-heading h2 { margin:0; font:24px var(--font-display); }
.live-pill { display:inline-flex; align-items:center; gap:7px; padding:6px 9px;
  background:var(--surface-sage); border-radius:99px; font-size:12px; }
.team-subtitle { margin:4px 0 18px; font-size:13px; color:var(--muted); }
.agents-list { display:flex; flex-direction:column; gap:19px; padding:0 2px 24px; }
.agent-item { display:flex; align-items:center; gap:12px; min-height:45px; }
.agent-avatar { display:flex; align-items:center; justify-content:center;
  border-radius:50%; width:46px; height:46px; flex:none; }
.agent-avatar.peach { background:#fbe5da; color:#bc4d2c; }
.agent-avatar.sage { background:#e5ece2; color:var(--text); }
.agent-name-row { display:flex; align-items:center; gap:8px; font-size:14px; }
.agent-name-row .status-dot { width:8px; height:8px; }
.agent-item p { margin:4px 0 0 17px; font-size:12px; line-height:1.35; color:#727982; }
.recent-updates { border-top:1px solid var(--border); padding-top:22px; margin-top:auto; }
.recent-heading { display:flex; justify-content:space-between; align-items:center; margin-bottom:11px; }
.recent-heading h3 { margin:0; font:19px var(--font-display); }
.recent-heading button { border:0; background:transparent; color:#596577; text-decoration:underline; font-size:12px; }
.updates-list { display:grid; gap:10px; }
.update-card { display:flex; align-items:flex-start; gap:8px; padding:10px 8px;
  border:1px solid #eee5db; border-radius:9px; background:#fffbf7; min-height:83px; }
.update-card.is-highlighted { background:#fcf0e9; }
.update-card .agent-avatar { height:33px; width:33px; }
.update-card .agent-avatar svg { height:18px; width:18px; }
.update-content { flex:1; min-width:0; }
.update-top { display:flex; align-items:flex-start; justify-content:space-between; gap:4px; }
.update-top strong { font:12px/1.3 var(--font-display); }
.update-top time { font-size:10px; color:#68717c; white-space:nowrap; }
.update-card p { margin:6px 0 0; font:12px/1.35 var(--font-display); color:#6d7680; }
```

## Functional requirement

Messages display actual timestamps and statuses from shared state. On live orchestration, add append-only events and announce new events politely via an ARIA live region without interrupting screen-reader users. Agent status dots need non-color status text. `See all` opens a modal/drawer; if not implemented, remove link instead of leaving inert UI.
