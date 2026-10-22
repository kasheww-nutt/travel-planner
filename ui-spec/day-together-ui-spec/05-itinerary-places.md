# 05 — Itinerary and place cards

## Anatomy

Central tall bordered panel (`≈575px` wide at reference size). Header: serif **Your itinerary**, compact date navigation with left/right chevrons, trailing list toggle. Below: vertical timeline rail at x ≈ 374, five dark-green numbered circles, five horizontal rows. Each row: circle number + time, thumbnail, place name + optional badge, short description, location pin + neighborhood + optional category chip, ellipsis menu. Third row **Mori Art Museum** has pastel-peach row highlight and red marker with `Changed` badge. Fourth row **Tea ceremony** has sage `Locked` badge. Content is softly separated; no harsh row borders.

## `PlaceRow.tsx`

```tsx
import { MapPin, MoreHorizontal, LockKeyhole } from 'lucide-react';
import type { Place } from '../types/trip';
const categoryLabel:Record<Place['category'],string> = {
  historical:'Historical', lunch:'Lunch', museum:'Museum', cultural:'Cultural', dinner:'Dinner'
};
export default function PlaceRow({place,selected,onSelect,onMenu}:{
  place:Place; selected:boolean; onSelect:()=>void; onMenu:()=>void;
}) {
  return <article className={`place-row ${place.isChanged?'is-changed':''} ${selected?'is-selected':''}`}>
    <button className={`timeline-marker ${place.isChanged?'is-changed':''}`}
      aria-label={`Select stop ${place.order}: ${place.name}`} onClick={onSelect}>{place.order}</button>
    <time className="place-time">{place.start} – {place.end}</time>
    <button className="place-photo-button" onClick={onSelect} aria-label={`View ${place.name}`}>
      <img className="place-photo" src={place.image} alt="" loading="lazy" />
    </button>
    <div className="place-info">
      <div className="place-title-line"><button onClick={onSelect} className="place-name">{place.name}</button>
        {place.isChanged && <span className="chip changed-chip">Changed</span>}
        {place.isLocked && <span className="chip lock-chip"><LockKeyhole size={11}/>Locked</span>}
      </div>
      <p>{place.description}</p>
      <div className="place-meta"><MapPin size={14} aria-hidden="true"/><span>{place.area}</span>
        <span className="category-chip">{categoryLabel[place.category]}</span></div>
    </div>
    <button className="place-menu-button" onClick={onMenu} aria-label={`Options for ${place.name}`}>
      <MoreHorizontal size={19}/></button>
  </article>;
}
```

## `ItineraryPanel.tsx`

```tsx
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { useState } from 'react';
import PlaceRow from './PlaceRow';
import type { Place, Trip } from '../types/trip';
export default function ItineraryPanel({trip,selectedId,onSelect,onPlacesChange}:{
  trip:Trip; selectedId:string|null; onSelect:(id:string)=>void;
  onPlacesChange:(places:Place[])=>void;
}) {
  const [listMode,setListMode]=useState(false);
  const [menuId,setMenuId]=useState<string|null>(null);
  const displayDate=new Date(`${trip.dateIso}T12:00:00`).toLocaleDateString('en-US',
    {weekday:'short',month:'short',day:'numeric',year:'numeric'});
  function changeDate(days:number) {
    // Date lives in App, so add an onDateChange prop to implement this.
    // Do not silently mutate demo date in the child.
    console.info('Date change requested:',days);
  }
  return <section className="itinerary-panel card" aria-labelledby="itinerary-title">
    <header className="itinerary-header"><h2 id="itinerary-title">Your itinerary</h2>
      <div className="date-picker-inline">
        <button onClick={()=>changeDate(-1)} aria-label="Previous day"><ChevronLeft size={16}/></button>
        <time dateTime={trip.dateIso}>{displayDate}</time>
        <button onClick={()=>changeDate(1)} aria-label="Next day"><ChevronRight size={16}/></button>
      </div>
      <button className="list-toggle" aria-pressed={listMode} onClick={()=>setListMode(v=>!v)}>
        <List size={16}/>{listMode?'Timeline view':'View as list'}</button>
    </header>
    <div className={`places-timeline ${listMode?'list-mode':''}`}>
      {trip.places.map(place=><PlaceRow key={place.id} place={place}
        selected={selectedId===place.id} onSelect={()=>onSelect(place.id)}
        onMenu={()=>setMenuId(menuId===place.id?null:place.id)} />)}
    </div>
    {menuId && <div className="place-menu-popover" role="dialog" aria-label="Place actions">
      <button onClick={()=>setMenuId(null)}>Close menu</button>
      <button onClick={()=>{
        onPlacesChange(trip.places.map(p=>p.id===menuId?{...p,isLocked:!p.isLocked}:p));
        setMenuId(null);
      }}>Toggle lock</button>
    </div>}
  </section>;
}
```

**Important:** The date arrow handler above is an explicitly marked stub and must be replaced by a parent-controlled `onDateChange(dateIso)` prop before release. For the screenshot-only state, it is acceptable to render the date without clickable arrow controls instead.

## CSS

```css
.itinerary-panel { padding:17px 12px 14px 15px; min-width:0; position:relative; }
.itinerary-header { display:flex; align-items:center; gap:18px; padding:0 4px 14px 0; }
.itinerary-header h2 { font:23px var(--font-display); margin:0; white-space:nowrap; }
.date-picker-inline { height:34px; display:flex; align-items:center; border:1px solid var(--border);
  border-radius:7px; padding:0 5px; gap:10px; white-space:nowrap; }
.date-picker-inline button { display:grid;place-items:center;border:0;background:none;padding:3px;color:var(--text); }
.date-picker-inline time { font-size:11px; }
.list-toggle { margin-left:auto; border:1px solid var(--border); border-radius:7px;
  background:var(--surface); display:flex; align-items:center; gap:9px; white-space:nowrap;
  padding:9px 10px; font-size:11px; }
.places-timeline { position:relative; display:flex; flex-direction:column; }
.places-timeline::before { content:''; position:absolute; left:15px; top:18px; bottom:34px;
  width:1px; background:#d9cfc2; z-index:0; }
.place-row { position:relative; display:grid;
  grid-template-columns: 30px 77px 93px minmax(0,1fr) 20px;
  gap:10px; min-height:116px; padding:9px 4px 10px 0; border-radius:9px; }
.place-row.is-changed { background:#fff1e9; }
.place-row.is-selected { outline:1px solid #d1a88b; outline-offset:-1px; }
.timeline-marker { position:relative; z-index:1; width:29px; height:29px; color:white;
  background:var(--marker); border:0; border-radius:50%; font:14px var(--font-display); }
.timeline-marker.is-changed { background:#a83626; }
.place-time { font-size:11px; color:#5d626d; padding-top:8px; white-space:nowrap; }
.place-photo-button { border:0; background:transparent; padding:0; align-self:start; }
.place-photo { width:93px; height:90px; border-radius:8px; object-fit:cover; }
.place-info { min-width:0; padding-top:1px; }
.place-title-line { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.place-name { padding:0; border:0; background:transparent; text-align:left;
  font:17px/1.25 var(--font-display); color:#131c19; }
.place-info p { font-size:12px; color:#6c737c; line-height:1.42; margin:5px 0 7px; }
.place-meta { display:flex; flex-wrap:wrap; align-items:center; gap:5px; font-size:11px; color:#727985; }
.category-chip, .chip { display:inline-flex; align-items:center; gap:3px; padding:4px 8px;
  border-radius:99px; background:#edf1eb; font-size:11px; white-space:nowrap; }
.changed-chip { background:#f9ded2; color:var(--danger); }
.lock-chip { background:#e1e8e4; }
.place-menu-button { border:0; background:transparent; height:27px; padding:0; }
.places-timeline.list-mode::before {display:none}
.places-timeline.list-mode .timeline-marker {display:none}
.places-timeline.list-mode .place-row {grid-template-columns:77px 93px minmax(0,1fr) 20px}
.place-menu-popover { position:absolute; z-index:20; right:20px; top:80px;
  background:white; padding:12px; border:1px solid var(--border); box-shadow:var(--shadow-soft); }
@media(max-width:720px){.itinerary-header{flex-wrap:wrap}.place-row{grid-template-columns:30px 62px 70px minmax(0,1fr) 16px;gap:6px}.place-photo{width:70px;height:75px}.place-info p{font-size:11px}}
```

At ~575px panel width, very long text and large UI fonts will overflow. Keep typography compact or increase itinerary width. Add actual licensed images; without them the result cannot resemble the reference.
