# 01 — Project architecture and TSX data model

## File tree

```text
src/
  main.tsx
  App.tsx
  styles/
    tokens.css
    global.css
    dashboard.css
  data/
    demoTrip.ts
  types/
    trip.ts
  components/
    TopNav.tsx
    Hero.tsx
    TripControls.tsx
    TravelTeamPanel.tsx
    AgentItem.tsx
    RecentUpdates.tsx
    ItineraryPanel.tsx
    PlaceRow.tsx
    RouteMap.tsx
    MapMarker.tsx
    WeatherAlert.tsx
    PlanUpdatePanel.tsx
    TripSummaryPanel.tsx
    Tag.tsx
assets/
  photos/  # add properly licensed representative place photos
public/
  # optional static assets
```

## Domain types (`src/types/trip.ts`)

```ts
export type AgentId = 'planner' | 'transport' | 'dining' | 'activities';
export type AgentStatus = 'working' | 'done' | 'idle' | 'error';
export type Category = 'historical' | 'lunch' | 'museum' | 'cultural' | 'dinner';

export interface GeoPoint { lat: number; lng: number }

export interface Place {
  id: string;
  order: number;
  name: string;
  start: string; // local HH:mm
  end: string;
  description: string;
  area: string;
  category: Category;
  image: string;
  coordinates: GeoPoint;
  priceYen?: number;
  isChanged?: boolean;
  isLocked?: boolean;
}

export interface Agent {
  id: AgentId;
  name: string;
  status: AgentStatus;
  detail: string;
}

export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'user';
  at: string;
  text: string;
  emphasis?: boolean;
}

export interface WeatherEvent {
  title: string;
  description: string;
  start: string;
  end: string;
}

export interface Trip {
  city: string;
  country: string;
  dateIso: string;
  interest: string;
  budgetUsd: number;
  estimatedUsd: number;
  travelers: number;
  places: Place[];
  agents: Agent[];
  messages: AgentMessage[];
  weather: WeatherEvent;
}
```

## Demo data (`src/data/demoTrip.ts`)

```ts
import type { Trip } from '../types/trip';

export const demoTrip: Trip = {
  city: 'Tokyo', country: 'Japan', dateIso: '2025-04-12',
  interest: 'History & food', budgetUsd: 100, estimatedUsd: 96, travelers: 1,
  weather: {
    title: 'Rain from 14:00 – 16:00',
    description: 'Heavier showers expected in central Tokyo.',
    start: '14:00', end: '16:00',
  },
  agents: [
    { id: 'planner', name: 'Planner', status: 'working', detail: 'Rebuilding your day...' },
    { id: 'transport', name: 'Transport', status: 'working', detail: 'Checking routes' },
    { id: 'dining', name: 'Dining', status: 'working', detail: 'Finding options' },
    { id: 'activities', name: 'Activities', status: 'working', detail: 'Recommending alternatives' },
  ],
  messages: [
    { id: 'm1', from: 'planner', to: 'activities', at: '10:14 AM', text: 'The plan is $12 over budget. Find an option under $50.' },
    { id: 'm2', from: 'activities', to: 'planner', at: '10:17 AM', text: 'Swapped the paid exhibit for a free gallery walk. New total: $46.', emphasis: true },
    { id: 'm3', from: 'planner', to: 'user', at: '10:18 AM', text: 'Updated estimate: $96 of $100. Your itinerary is on track.' },
  ],
  places: [
    { id:'sensoji', order:1, name:'Senso-ji Temple', start:'09:00', end:'10:00', description:'Explore Tokyo’s most historic temple and Nakamise shopping street.', area:'Asakusa', category:'historical', image:'/photos/sensoji.jpg', coordinates:{lat:35.7148,lng:139.7967} },
    { id:'tsukiji', order:2, name:'Tsukiji Outer Market', start:'11:00', end:'12:30', description:'Fresh sushi, local bites and a stroll through the lively lanes.', area:'Tsukiji', category:'lunch', image:'/photos/tsukiji.jpg', coordinates:{lat:35.6655,lng:139.7708} },
    { id:'mori', order:3, name:'Mori Art Museum', start:'14:00', end:'15:30', description:'Swapped from an outdoor walk due to rain. Contemporary art with stunning city views.', area:'Roppongi Hills', category:'museum', image:'/photos/mori.jpg', coordinates:{lat:35.6605,lng:139.7292}, isChanged:true },
    { id:'tea', order:4, name:'Tea ceremony', start:'17:00', end:'18:00', description:'Your locked plan — kept as requested.', area:'Hamarikyu Garden', category:'cultural', image:'/photos/tea.jpg', coordinates:{lat:35.6596,lng:139.7636}, isLocked:true },
    { id:'izakaya', order:5, name:'Izakaya dinner', start:'19:00', end:'20:30', description:'Cozy local spot for dinner.', area:'Shimbashi', category:'dinner', image:'/photos/izakaya.jpg', coordinates:{lat:35.6667,lng:139.7582} },
  ],
};
```

The coordinates above are **approximate demo anchors**, not venue-specific navigation guarantees; the named tea ceremony and izakaya are unspecific examples.

## Composition (`src/App.tsx`)

```tsx
import { useState } from 'react';
import { demoTrip } from './data/demoTrip';
import TopNav from './components/TopNav';
import Hero from './components/Hero';
import TripControls from './components/TripControls';
import TravelTeamPanel from './components/TravelTeamPanel';
import ItineraryPanel from './components/ItineraryPanel';
import RouteMap from './components/RouteMap';
import PlanUpdatePanel from './components/PlanUpdatePanel';
import TripSummaryPanel from './components/TripSummaryPanel';
import type { Trip } from './types/trip';
import './styles/tokens.css';
import './styles/global.css';
import './styles/dashboard.css';

export default function App() {
  const [trip, setTrip] = useState<Trip>(demoTrip);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Workspace');
  const [planning, setPlanning] = useState(false);
  const updateTrip = (patch: Partial<Trip>) => setTrip(prev => ({ ...prev, ...patch }));

  async function handlePlan() {
    setPlanning(true);
    try { /* connect API/orchestrator here; keep demo data if no backend */ }
    finally { setPlanning(false); }
  }

  return (
    <div className="app-shell">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="dashboard-container">
        <div className="hero-row">
          <Hero city={trip.city} />
          <TripControls trip={trip} onChange={updateTrip} onPlan={handlePlan} busy={planning} />
        </div>
        <div className="dashboard-grid">
          <TravelTeamPanel agents={trip.agents} messages={trip.messages} />
          <ItineraryPanel trip={trip} selectedId={selectedPlaceId} onSelect={setSelectedPlaceId} onPlacesChange={(places)=>updateTrip({places})} />
          <div className="right-column">
            <RouteMap places={trip.places} weather={trip.weather} selectedId={selectedPlaceId} onSelect={setSelectedPlaceId} />
            <div className="right-footer-grid">
              <PlanUpdatePanel originalName="Shinjuku Gyoen National Garden" revisedName="Mori Art Museum" />
              <TripSummaryPanel trip={trip} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

## State boundaries

- `App`: canonical trip, selected place, busy/replan, navigation.
- `TripControls`: controlled city/interests/budget, `onPlan` async command.
- `ItineraryPanel`: no independent duplicate of stops; edits through `onPlacesChange`.
- `RouteMap`: receives same `places` and `selectedId` as itinerary — selection synchronized.
- Agent updates: backend SSE/websocket/polling in production; static source in prototype.
- Weather: demo only until forecast integration is added, with source/time labeling when live.
