# 07 — Weather plan update and trip summary

## Layout

Directly underneath the right map, two side-by-side cards. Left is wider (`~420px`), right `~247px`. Both use off-white surfaces, beige 1px borders, subtle corner radius. **Plan update**: title top-left, peach circular cloud/rain badge, terracotta subhead **Rainy this afternoon**, summary line, right chevron. Bottom has two small nested comparison cards (Original plan → Revised plan). Original: **Shinjuku Gyoen National Garden**, cherry-blossom path thumbnail. Revised: **Mori Art Museum**, gallery thumbnail, `Better for rainy weather` peach chip. Right: **Trip summary** title + `$96 of $100`, horizontal muted beige spending track with sage progress fill at 96%; three small rows: **5 stops**, **~8 hours**, **Mix of history, food, culture**, each with an icon and sublabel.

## `PlanUpdatePanel.tsx`

```tsx
import { ArrowRight, ChevronRight, CloudRain, Umbrella } from 'lucide-react';
export default function PlanUpdatePanel({originalName,revisedName}:{originalName:string;revisedName:string}) {
  return <section className="plan-update card" aria-labelledby="update-heading">
    <h2 id="update-heading">Plan update</h2>
    <div className="update-summary">
      <div className="weather-badge"><CloudRain size={29}/></div>
      <div><h3>Rainy this afternoon</h3>
        <p>We’ve adjusted 2 stops to keep you on track while saving your locked plans.</p></div>
      <button className="icon-action" aria-label="Read full plan update"><ChevronRight size={17}/></button>
    </div>
    <div className="comparison-row">
      <div className="comparison-card"><div className="compare-heading"><strong>Original plan</strong><time>14:00 – 15:30</time></div>
        <div className="compare-main"><img src="/photos/shinjuku-garden.jpg" alt="Cherry blossom garden path"/>
          <span>{originalName}</span></div></div>
      <ArrowRight className="compare-arrow" size={19}/>
      <div className="comparison-card revised"><div className="compare-heading"><strong>Revised plan</strong><time>14:00 – 15:30</time></div>
        <div className="compare-main"><img src="/photos/mori.jpg" alt="Contemporary art gallery"/>
          <div><span>{revisedName}</span><small><Umbrella size={11}/> Better for rainy weather</small></div></div></div>
    </div>
  </section>;
}
```

## `TripSummaryPanel.tsx`

```tsx
import { MapPin, Clock3, Leaf } from 'lucide-react';
import type { Trip } from '../types/trip';
export default function TripSummaryPanel({trip}:{trip:Trip}) {
  const ratio=Math.min(100,Math.max(0,trip.budgetUsd?trip.estimatedUsd/trip.budgetUsd*100:0));
  return <section className="trip-summary card" aria-labelledby="summary-heading">
    <div className="summary-title"><h2 id="summary-heading">Trip summary</h2>
      <strong>${trip.estimatedUsd} <span>of ${trip.budgetUsd}</span></strong></div>
    <div className="budget-progress" role="progressbar" aria-valuemin={0}
      aria-valuemax={trip.budgetUsd} aria-valuenow={trip.estimatedUsd}
      aria-label="Estimated trip cost"><span style={{width:`${ratio}%`}}/></div>
    <dl className="summary-stats">
      <div><MapPin size={18}/><div><dt>{trip.places.length} stops</dt><dd>Adjusted for weather</dd></div></div>
      <div><Clock3 size={18}/><div><dt>~ 8 hours</dt><dd>9:00 AM – 8:30 PM</dd></div></div>
      <div><Leaf size={18}/><div><dt>Mix of history, food, culture</dt><dd>A balanced Tokyo day</dd></div></div>
    </dl>
  </section>;
}
```

`~ 8 hours` is intentionally a reference-design label, not derived from 09:00–20:30 elapsed duration. For production, compute **activity duration** from stop windows and display it clearly; the full span is 11.5 hours.

## CSS

```css
.plan-update, .trip-summary {padding:15px 16px;}
.plan-update h2, .trip-summary h2 {margin:0; font:20px var(--font-display);}
.update-summary {display:grid; grid-template-columns:46px minmax(0,1fr) 16px;
  align-items:center; gap:10px; padding:13px 0 11px;}
.weather-badge {width:45px;height:45px;border-radius:50%; background:#fdebe2;
  display:grid;place-items:center;color:var(--accent);}
.update-summary h3 {margin:0 0 4px;color:var(--danger);font:17px var(--font-display);}
.update-summary p {margin:0;color:#758089;font-size:11px;line-height:1.4;}
.icon-action {border:0;background:none;padding:0;color:#51606a;}
.comparison-row {display:grid;grid-template-columns:minmax(0,1fr) 19px minmax(0,1fr);
  gap:9px;align-items:center;}
.comparison-card {min-width:0;border:1px solid var(--border);border-radius:7px;padding:7px;background:#fffaf5;}
.comparison-card.revised {background:#fff1eb;}
.compare-heading {display:flex;align-items:center;justify-content:space-between;gap:4px;font-size:10px;}
.compare-heading time {font-size:9px;color:#78808b;white-space:nowrap;}
.revised .compare-heading strong {color:var(--danger);}
.compare-main {display:flex;align-items:center;gap:8px;margin-top:7px;}
.compare-main img {width:63px;height:63px;border-radius:5px;object-fit:cover;flex:none;}
.compare-main span {font:11px/1.3 var(--font-display);}
.compare-main small {display:flex;gap:3px;align-items:center;margin-top:5px;
  font-size:9px;color:var(--danger);background:#fbe3db;border-radius:99px;padding:3px;}
.compare-arrow {color:var(--accent);}
.summary-title {display:flex;align-items:center;justify-content:space-between;gap:7px;}
.summary-title strong {font:15px var(--font-display);white-space:nowrap;}
.summary-title strong span {font-size:12px;color:#56616b;}
.budget-progress {height:9px;border-radius:99px;background:#eee9dd;overflow:hidden;margin:12px 0 17px;}
.budget-progress > span {display:block;height:100%;background:#6c9b79;border-radius:99px;}
.summary-stats {display:flex;flex-direction:column;gap:20px;margin:0;}
.summary-stats > div {display:flex;gap:12px;align-items:flex-start;}
.summary-stats svg {flex:none;color:#1c4a3d;}
.summary-stats dt {font:13px var(--font-display);}
.summary-stats dd {margin:3px 0 0;font-size:11px;color:#7b838e;}
@media(max-width:1400px){.comparison-row{grid-template-columns:1fr}.compare-arrow{transform:rotate(90deg);justify-self:center}}
```

## Behavioral expectations

- Show comparison only when at least one stop has changed; otherwise show `No changes needed` state.
- The `Read full plan update` arrow opens an explanation drawer and should describe rainfall time, affected stop, replacement, reason and whether a locked stop was preserved.
- Budget bar derives from numeric totals and must visually indicate over-budget without silently capping reported costs; capping the fill at 100% is only for presentation.
- Comparison images should represent the named sites rather than arbitrary stock photos.
