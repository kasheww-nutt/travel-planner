# 06 — Tokyo map, numbered stops, transport and rain

## Visual anatomy

Right top region is a map panel (~681×475), pastel OSM-like Tokyo map. Parks pale green, waterways powder blue, roads thin gray/beige. Numbered stop pins: **1 Senso-ji Temple** top-right, **2 Tsukiji Outer Market** lower-right, **3 Mori Art Museum** lower-middle-left (red changed pin), **4 Tea ceremony** bottom-center, **5 Izakaya dinner** bottom-right. Dark green curved route and red dashed highlighted detour. Upper-left vertical square tool stack `+`, `−`, compass/locate. Upper-right white peach-bordered rain card with umbrella/cloud icon **Rain from 14:00 – 16:00** and description. Lower-right pill **View transport options**. Keep labels visible but avoid clutter.

## Real map vs screenshot fidelity

**For real geo functionality:** React Leaflet + public/paid tiles. The exact cartographic linework and route in the mockup cannot be inferred; do not claim the stylized route is a true walking/transit path. Use routing service (e.g., Mapbox Directions, Google Directions, OpenRouteService) only after supplying credentials, checking terms, and requesting directions for travel mode. A polyline connecting places directly is a **schematic path**, not navigable directions. Respect map tile provider attribution and usage rules.

## `RouteMap.tsx` starter (interactive map)

```tsx
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { CloudRain, TrainFront } from 'lucide-react';
import type { Place, WeatherEvent } from '../types/trip';
import 'leaflet/dist/leaflet.css';

function markerIcon(number:number, changed:boolean, selected:boolean) {
  return L.divIcon({
    className:'custom-leaflet-marker', iconSize:[34,34], iconAnchor:[17,17],
    html:`<div class="map-pin ${changed?'changed':''} ${selected?'selected':''}">${number}</div>`
  });
}
function FocusSelected({place}:{place?:Place}) {
  const map=useMap();
  useEffect(()=>{ if(place) map.panTo([place.coordinates.lat,place.coordinates.lng]); },[map,place]);
  return null;
}
export default function RouteMap({places,weather,selectedId,onSelect}:{
  places:Place[];weather:WeatherEvent;selectedId:string|null;onSelect:(id:string)=>void;
}) {
  const ordered=[...places].sort((a,b)=>a.order-b.order);
  const line: [number,number][] = ordered.map(p=>[p.coordinates.lat,p.coordinates.lng]);
  const active=ordered.find(p=>p.id===selectedId);
  return <section className="route-map card" aria-label="Map of Tokyo itinerary">
    <MapContainer center={[35.683,139.764]} zoom={12} zoomControl={false}
      scrollWheelZoom={false} className="leaflet-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={line} pathOptions={{color:'#103e32',weight:3}} />
      {ordered.map(place=><Marker key={place.id}
        position={[place.coordinates.lat,place.coordinates.lng]}
        icon={markerIcon(place.order,!!place.isChanged,selectedId===place.id)}
        eventHandlers={{click:()=>onSelect(place.id)}}>
        <Tooltip direction="right" permanent opacity={1}>{place.name}</Tooltip>
      </Marker>)}
      <FocusSelected place={active}/>
    </MapContainer>
    <div className="map-zoom-controls">
      <button aria-label="Zoom in" onClick={()=>{/* connect via useMap hook and ref */}}>+</button>
      <button aria-label="Zoom out" onClick={()=>{/* connect via useMap hook and ref */}}>−</button>
    </div>
    <div className="map-weather" role="status"><CloudRain size={31} color="var(--accent)"/>
      <div><strong>{weather.title}</strong><p>{weather.description}</p></div></div>
    <button className="transport-button"><TrainFront size={17}/>View transport options</button>
  </section>;
}
```

The rendered `+`/`−` controls above are intentionally **not yet wired**; before shipping, either use Leaflet built-in `zoomControl` or a real `useMap()` child that calls `map.zoomIn()` / `map.zoomOut()`. The `transport-button` must open a transport-detail drawer or external directions; do not leave it visually clickable without behavior.

## CSS

```css
.route-map { position:relative; overflow:hidden; padding:0; isolation:isolate;
  background:#e7ecdf; }
.leaflet-map { height:100%; width:100%; z-index:0; }
.custom-leaflet-marker { background:transparent; border:0; }
.map-pin { display:grid; place-items:center; width:34px; height:34px; border:2px solid white;
  border-radius:50%; background:#103e32; color:white; font:15px var(--font-display);
  box-shadow:0 2px 6px #0002; }
.map-pin.changed {background:#b43d28;}
.map-pin.selected {outline:3px solid #efac8d; outline-offset:1px;}
.leaflet-tooltip { border:0!important; border-radius:5px!important; background:#fffcf7ee!important;
  color:#102f27!important; font:12px/1.2 var(--font-display)!important;
  box-shadow:none!important; padding:4px 6px!important; }
.leaflet-tooltip::before {display:none}
.map-weather { position:absolute; top:10px; right:10px; z-index:500; display:flex; gap:10px;
  max-width:230px; padding:12px 13px; border:1px solid #eacabb; border-radius:10px;
  background:#fffaf6f2; box-shadow:0 4px 15px #51351e16; }
.map-weather strong { color:var(--danger); font:13px var(--font-display); }
.map-weather p { margin:5px 0 0; font-size:11px; line-height:1.4; color:#757d84; }
.map-zoom-controls { position:absolute; top:12px; left:12px; z-index:500; display:flex;
  flex-direction:column; border:1px solid var(--border); border-radius:7px; overflow:hidden; }
.map-zoom-controls button { width:37px; height:37px; background:#fffefa; border:0;
  border-bottom:1px solid var(--border); color:var(--text); font-size:22px; }
.transport-button { position:absolute; right:14px; bottom:13px; z-index:500;
  display:flex; align-items:center; gap:9px; border:1px solid var(--border);
  background:#fffcf7; border-radius:8px; padding:11px 15px; color:var(--text);
  font-size:12px; font-weight:600; box-shadow:0 2px 5px #0001; }
```

## Pin interaction contract

- Clicking a pin selects the corresponding itinerary card and scrolls/focuses it into view; clicking a card pans/highlights its pin.
- Changed pin is terracotta/red; others dark green. Do not rely on color alone: display `Changed` in row.
- Map attribution must stay visible. Avoid covering it with bottom transport CTA.
- A demo preview can render a stylized route overlay; production travel paths require a routing API. For a screenshot-perfect version, request the designer's original map art/route paths or replace with a legal reference map asset plus pixel-aligned SVG paths.
- On narrow screens, keep map below itinerary (same content, no horizontal page scrolling).
