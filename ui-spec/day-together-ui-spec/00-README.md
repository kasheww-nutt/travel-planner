# Day, together — pixel-focused UI rebuild specification

**Reference:** `reference-dashboard.png` (1672 × 941 screenshot). **Goal:** recreate the supplied *generated* landscape desktop UI in React + TypeScript (TSX), not redesign it. The image is the visual source of truth; this package transcribes visible structure, content, relative positions, design tokens and behavior into implementation guidance.

> **Accuracy note:** The source is a raster mockup, not a Figma file or an existing codebase. Exact underlying CSS, proprietary fonts, asset identities, map geometry, and hidden interactions cannot be recovered from pixels. Sizes below are measured/estimated from the 1672 × 941 reference; verify by overlaying rendered screenshots. Sample Tokyo stop times/route are **demo data**, not checked live logistics. The screenshot says Apr 12, 2025, while its route and costs are illustrative.

## Sections / files

| File | Owns | Suggested TSX components |
|---|---|---|
| `01-project-architecture.md` | Dependencies, file tree, app state, TypeScript schemas | `App`, `DashboardPage` |
| `02-design-system-layout.md` | Tokens, fonts, grids, responsiveness | `PageShell`, `Card`, `Pill` |
| `03-header-hero-controls.md` | Nav, greeting, trip filters and action | `TopNav`, `Hero`, `TripControls` |
| `04-travel-team-updates.md` | Four-agent sidebar and messages | `TravelTeamPanel`, `AgentItem`, `RecentUpdates` |
| `05-itinerary-places.md` | Timeline, place cards, change/lock badges | `ItineraryPanel`, `PlaceRow` |
| `06-map-route.md` | Map, markers, weather banner, transport action | `RouteMap`, `MapMarker`, `WeatherAlert` |
| `07-plan-update-summary.md` | Rain-triggered comparison and spend overview | `PlanUpdatePanel`, `TripSummaryPanel` |
| `08-interaction-accessibility.md` | Functional contracts, UX states, keyboard/responsive | hooks, handlers, acceptance checklist |
| `09-build-order-qa.md` | Step-by-step assembly, visual QA, verification | test plan |

## Desktop composition

```text
┌────────────────────────────────── top navbar (~67px) ──────────────────────────────────────┐
│ Brand                        Workspace / Itinerary / Explore / Route                Avatar│
├────────────────────────────────── intro (~128px) ────────────────────────────────────────┤
│ Tokyo, Japan                         [Tokyo] [History & food] [$100 budget] [Plan my day] │
│ A day in Tokyo, built together.                                                        │
│ A little rain, still a lovely day...                                                    │
├────────────── sidebar ─────────┬──────────── itinerary ────────┬──────────── map ────────────┤
│ Travel team                   │ Your itinerary / date / list  │ route, 5 numbered stops    │
│ Planner                       │ 1 Senso-ji Temple             │ rain alert + controls       │
│ Transport                     │ 2 Tsukiji Outer Market        │                             │
│ Dining                        │ 3 Mori Art Museum            ├──────────────┬──────────────┤
│ Activities                    │ 4 Tea ceremony               │ Plan update  │ Trip summary │
│ Recent updates (3 cards)      │ 5 Izakaya dinner             │ comparison   │ budget/stop  │
└───────────────────────────────┴───────────────────────────────┴──────────────┴──────────────┘
```

## Pixel landmarks in reference (approximate)

- Image canvas: `1672 × 941`.
- Nav bottom border: `y ≈ 67`.
- Content outer gutters: `x ≈ 38–49` and right `≈ 38–59`.
- Hero heading begins around `x ≈ 49, y ≈ 111`.
- Main panels start around `y ≈ 217`.
- Sidebar: `x ≈ 38–329`, width `≈ 291`.
- Itinerary: `x ≈ 343–918`, width `≈ 575`.
- Right map: `x ≈ 932–1613`, width `≈ 681`, height `≈ 475`.
- Bottom right cards begin `y ≈ 686`.
- Main panel gap `≈ 14px`; corner radius `≈ 10–12px`.

## Tech decision

Build with **Vite + React + TypeScript + CSS**. Use `lucide-react` icons, `react-leaflet` + `leaflet` if a functioning map is required; for highest screenshot fidelity, replace base map with a rights-cleared map image or custom styled tile provider, then overlay HTML pins. Do **not** use the generated screenshot itself as an entire app background. Add real DOM components for responsiveness/accessibility.

## Start

```bash
npm create vite@latest day-together -- --template react-ts
cd day-together
npm i lucide-react leaflet react-leaflet
npm i -D @types/leaflet
npm run dev
```

See `09-build-order-qa.md` for implementation sequence, data wiring and screenshot review.
