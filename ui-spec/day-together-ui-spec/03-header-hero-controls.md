# 03 — Header, hero copy, trip controls

## Visual layout

Top nav runs full width with `border-bottom:1px solid var(--border)`. Left sun/logo (orange half-sun and rays) and wordmark **Day, together** in dark green serif. Center-left four nav options: `Workspace` active (terracotta underline), `Itinerary`, `Explore`, `Route`. Small circular avatar aligned right. Top band height ~67px.

Below nav, small eyebrow **Tokyo, Japan**, large h1 **A day in Tokyo, built together.** and supporting gray copy **A little rain, still a lovely day. We’ve adjusted 2 stops to keep your plans on track.** Control row top/right: Tokyo / History & food / $100 budget / solid terracotta **Plan my day →**. Each control separated by light lines or separate bordered segments.

## `TopNav.tsx`

```tsx
import { Sunrise } from 'lucide-react';
const navItems = ['Workspace','Itinerary','Explore','Route'];

type Props = { activeTab: string; onTabChange: (tab:string)=>void };
export default function TopNav({activeTab,onTabChange}:Props) {
  return <header className="top-nav">
    <a className="brand" href="/" aria-label="Day together home">
      <Sunrise size={34} strokeWidth={1.5} color="var(--accent)"/>
      <span>Day, together</span>
    </a>
    <nav aria-label="Primary navigation" className="nav-links">
      {navItems.map(item=><button key={item}
        className={`nav-tab ${activeTab===item?'is-active':''}`}
        aria-current={activeTab===item?'page':undefined}
        onClick={()=>onTabChange(item)}>{item}</button>)}
    </nav>
    <button className="avatar-button" aria-label="Account menu">
      <img alt="" src="/photos/avatar.jpg" /></button>
  </header>;
}
```

## `Hero.tsx`

```tsx
export default function Hero({city}:{city:string}) {
  return <div className="hero-copy">
    <div className="eyebrow">{city}, Japan</div>
    <h1>A day in {city}, built together.</h1>
    <p>A little rain, still a lovely day. We’ve adjusted 2 stops to keep your plans on track.</p>
  </div>;
}
```

## `TripControls.tsx`

```tsx
import { MapPin, Sparkles, WalletCards, ArrowRight } from 'lucide-react';
import type { Trip } from '../types/trip';

type Props = {
  trip:Trip; busy:boolean;
  onChange:(patch:Partial<Trip>)=>void;
  onPlan:()=>void;
};
export default function TripControls({trip,busy,onChange,onPlan}:Props) {
  return <div className="trip-controls" aria-label="Trip planning options">
    <label className="control-segment"><MapPin size={18}/><span className="sr-only">City</span>
      <select value={trip.city} onChange={e=>onChange({city:e.target.value})}>
        <option>Tokyo</option><option>Kyoto</option><option>Osaka</option>
      </select></label>
    <label className="control-segment"><Sparkles size={19} className="accent-icon"/>
      <span className="sr-only">Interests</span>
      <select value={trip.interest} onChange={e=>onChange({interest:e.target.value})}>
        <option>History & food</option><option>Art & culture</option><option>Nature & food</option>
      </select></label>
    <label className="control-segment"><WalletCards size={20}/>
      <span className="sr-only">Budget</span>
      <select value={trip.budgetUsd} onChange={e=>onChange({budgetUsd:Number(e.target.value)})}>
        <option value={100}>$100 budget</option><option value={150}>$150 budget</option><option value={200}>$200 budget</option>
      </select></label>
    <button className="plan-button" disabled={busy} onClick={onPlan}>
      <Sparkles size={18}/>{busy?'Planning…':'Plan my day'}<ArrowRight size={19}/>
    </button>
  </div>;
}
```

## CSS

```css
.top-nav { height:67px; display:flex; align-items:center; gap:64px; padding:0 40px;
  border-bottom:1px solid var(--border); background:rgba(255,253,250,.94); }
.brand { display:flex; align-items:center; gap:14px; text-decoration:none; color:var(--text);
  font:30px/1 var(--font-display); white-space:nowrap; }
.nav-links { display:flex; align-self:stretch; gap:34px; }
.nav-tab { position:relative; border:0; background:transparent; padding:0 2px;
  color:var(--text-body); font:15px var(--font-display); }
.nav-tab.is-active { color:#171c1a; }
.nav-tab.is-active::after { content:''; position:absolute; height:2px; bottom:14px;
  left:0; right:0; background:var(--accent); }
.avatar-button { margin-left:auto; background:transparent; border:0; border-left:1px solid var(--border);
  padding:0 0 0 36px; }
.avatar-button img { width:44px; height:44px; border-radius:50%; object-fit:cover; }
.hero-copy .eyebrow { color:#4e5a60; font:15px var(--font-display); margin-bottom:4px; }
.hero-copy h1 { margin:0 0 5px; font:clamp(37px,3.5vw,60px)/1.05 var(--font-display); letter-spacing:-1.3px; }
.hero-copy p { margin:0; font:17px/1.5 var(--font-display); color:#69707a; }
.trip-controls { display:flex; align-items:center; height:67px; margin-top:5px; border:1px solid var(--border);
  border-radius:10px; padding:6px; background:var(--surface); white-space:nowrap; }
.control-segment { display:flex; align-items:center; padding:0 18px; gap:12px;
  height:38px; border-right:1px solid var(--border); }
.control-segment select { border:0; background:transparent; color:#152d27; outline-offset:4px; font-size:14px; }
.accent-icon { color:var(--accent); }
.plan-button { height:54px; border:0; border-radius:9px; display:flex; align-items:center;
  gap:14px; padding:0 25px; margin-left:6px; background:var(--accent); color:white;
  font:19px var(--font-display); box-shadow:0 4px 10px #ac45251a; }
.plan-button:hover { background:var(--accent-dark); }
.sr-only { position:absolute; width:1px; height:1px; padding:0; overflow:hidden;
  clip:rect(0,0,0,0); white-space:nowrap; border:0; }
@media(max-width:1150px){ .top-nav {gap:30px;padding-inline:24px;} .trip-controls{margin-top:0;} }
@media(max-width:720px){.top-nav{padding-inline:14px;gap:14px}.brand{font-size:21px}
  .nav-links{overflow:auto;gap:15px}.nav-tab{font-size:13px}.avatar-button{display:none}
  .trip-controls{height:auto;flex-wrap:wrap;gap:4px}.control-segment{padding:0 8px}.plan-button{flex:1;justify-content:center} }
```

**Interaction rules:** Tabs must actually switch a route or view in a production app. City, interests, budget must update shared trip state. Plan action must invoke a real API or an explicit demo-state transition; never fake success. Account/avatar needs a functioning popup in a complete app.
