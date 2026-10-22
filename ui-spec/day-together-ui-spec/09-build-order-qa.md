# 09 — Build sequence, testing and pixel-fidelity review

## Phase 1 — static reproduction

1. Initialize Vite React TS and install `lucide-react`, `leaflet`, `react-leaflet`, `@types/leaflet`.
2. Copy design tokens and global styles from `02-design-system-layout.md`.
3. Create `types/trip.ts` + `data/demoTrip.ts` from `01-project-architecture.md`.
4. Rebuild `TopNav`, `Hero`, `TripControls`, compare with screenshot at 1672×941.
5. Build `TravelTeamPanel` and check icon circle sizing, row spacing, update card heights.
6. Build `ItineraryPanel` and insert five exact stops with photos. Align timeline rail and rows.
7. Insert `RouteMap`; initially use live tile layer, then decide if styled tiles are required to approximate screenshot colors.
8. Build `PlanUpdatePanel` + `TripSummaryPanel` immediately beneath map.
9. Wire components into `App`, fix layout overflow before adding real APIs.

## Phase 2 — working UI

1. Ensure filters are controlled by App trip state.
2. Implement date changes via explicit parent callback (remove example console stub).
3. Wire list mode, card select, pin select, and place actions; replace placeholder event handlers.
4. Implement functioning Leaflet zoom or enable native controls; implement transport detail view.
5. Add modal/drawer for full agent updates and change rationale.
6. Add `POST /api/plan` real integration if backend exists. Until then label as an interactive demo.
7. Handle loading, errors, empty states, no weather, over-budget and no route.
8. Test keyboard tab order, dialogs, map fallback, mobile stacking.

## Suggested screenshot comparison

Use Playwright to capture the app at the **same** dimensions as reference, preferably with `deviceScaleFactor: 1`:

```ts
import { test } from '@playwright/test';
test('dashboard screenshot',async({page})=>{
  await page.setViewportSize({width:1672,height:941});
  await page.goto('http://localhost:5173');
  await page.screenshot({path:'dashboard-current.png',fullPage:true});
});
```

Overlay the reference and current render at 50% opacity in an image editor. Compare in this order: (1) overall columns and whitespace, (2) hero alignment, (3) map panel and crop, (4) card boundaries, (5) typography size/line wrapping, (6) thumbnail crop and status chips, (7) subtle colors. Inaccurate content photos will produce a large perceptual difference even with correct layout.

## QA checklist

- [ ] Header ~67px and restrained bottom border
- [ ] Hero h1 clearly dominant; no overlap with right trip controls
- [ ] Sidebar & itinerary equal visual depth at desktop width
- [ ] Route map dominates right half, weather banner unobtrusive
- [ ] Exact five stop names and times in correct order
- [ ] Changed third stop highlighted peach / red marker
- [ ] Locked fourth stop clearly identified
- [ ] Real `img` for each stop with consistent crop
- [ ] Recent messages in correct sequence and wording
- [ ] Plan comparison visually links original/revised stop
- [ ] Trip summary displays $96 of $100 and 96% progress
- [ ] Icon strokes consistent (usually 1.7–2px)
- [ ] Shared selected place state links map and itinerary
- [ ] Controls have implemented actions, not only hover effects
- [ ] No horizontal overflow at 390, 768, 1280 and 1672px
- [ ] Keyboard, focus indicators, readable text contrast
- [ ] Map attribution visible; route/demo distinction explained
- [ ] API failure and empty loading states handled

## What is not recoverable from this image

- Original React code or TSX, exact CSS values, build tooling.
- Exact font files or proprietary brand/logo assets.
- Real geocoded paths / routing directions; the mockup depicts a stylized route.
- Exact original place photos (replace with legitimately licensed originals).
- Actual working backend for planner / transport / dining / activities.
- Genuine weather data for the screenshot day.

## Completion definition

A close reconstruction reproduces layout, copy, visual hierarchy and common interactions. An **exact** reconstruction requires original source/assets or repeated screenshot-diff tuning. This package is a detailed implementation **blueprint**, not a claim that the complete TSX application has already been written or run.
