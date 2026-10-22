# 08 — Interaction contracts, responsive, accessible UX

## Functional matrix

| UI element | Action | State owner | Complete when |
|---|---|---|---|
| Top nav tabs | Navigate Workspace / Itinerary / Explore / Route | router/App | changes actual view/URL |
| Avatar | account menu | top nav | menu keyboard accessible |
| City | change destination | trip in App | all affected content resets/replans |
| Interest | change theme | trip in App | visible control and backend query update |
| Budget | change budget | trip in App | estimate/progress/replan reflect budget |
| Plan my day | generate/recalculate itinerary | async API state | loading, success, errors, cancel/retry |
| Agent rows | show agent detail | drawer state | step descriptions and run status |
| See all updates | full agent conversation log | modal state | chronological, accessible dialog |
| Date chevrons | shift day | trip in App | correct locale date and matching stops |
| List toggle | change timeline/list presentation | itinerary local state | state preserved, `aria-pressed` reflects |
| Place card | select stop | App `selectedPlaceId` | map pan/marker highlight |
| Place `…` | actions menu | itinerary | options such as Lock / Unlock / Replace |
| Locked chip | prevent automatic replace | trip stop `isLocked` | orchestration respects lock |
| Map pin | select place | App | card selected and scroll into view |
| Zoom +/− | zoom map | Leaflet instance | map scale actually changes |
| Rain card | view details | weather detail drawer | explains forecast and impact |
| Transport options | route/mode details | route modal | shows travel legs, source, time |
| Plan update arrow | see revision rationale | update drawer | original vs revised comparisons |

## Suggested TSX state and API contract

```ts
export interface PlanRequest {
  city:string;
  dateIso:string;
  interest:string;
  budgetUsd:number;
  lockedPlaceIds:string[];
}
export interface PlanResponse {
  trip: import('./types/trip').Trip;
  runId:string;
  generatedAt:string; // ISO timestamp, essential for live-weather claims
}

export async function requestPlan(payload:PlanRequest, signal?:AbortSignal):Promise<PlanResponse> {
  const res=await fetch('/api/plan',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal,
  });
  if(!res.ok) throw new Error(`Planning failed (${res.status})`);
  return res.json() as Promise<PlanResponse>;
}
```

Avoid a false sense of real live agents from demo-only data: display `Demo run` badge until connected to actual orchestration and events. Sample rain is **not a forecast** unless a weather API provides it.

## Loading/error/empty variants

1. **Initial:** placeholder skeleton in itinerary and map; status says `Preparing your trip`.
2. **Planning:** disable only actions that would conflict; keep previously completed content visible; `aria-busy="true"` in affected region; optionally stream actual agent messages.
3. **Error:** inline alert with `Try again` and non-technical explanation; preserve last successful plan.
4. **No places:** `No stops yet` with a working action to plan a day.
5. **Offline/no map tiles:** fallback accessible itinerary list; never obscure place names.
6. **Over budget:** show the true total; progress capped to 100% visually; label explicitly `Over budget by $X`.
7. **No rain:** hide specific rainy update; replace with an honest general `Your plan is on track` summary.

## Accessibility

- One h1 only (hero). Each card heading h2; internal subheads h3.
- `aria-current="page"` nav tab. Accessible name for controls using visible label or `sr-only`.
- Textual statuses beside colored dots (`Working`, `Done`, `Changed`, `Locked`).
- Pointer targets at least about 40–44px for interactive controls wherever feasible.
- Menu and dialog: Escape to close, focus trap inside modal, restore focus to trigger.
- Dynamic updates in a `role="log" aria-live="polite"` region, rate-limited to avoid chatter.
- Map conveys nothing that is absent from place list; include all route essentials textually.
- Honor `prefers-reduced-motion`. Maintain contrast >=4.5:1 for standard text, particularly fine gray text against ivory.
- Render localized dates with `Intl.DateTimeFormat`, not assumed device timezone conversions for trip calendar dates.

## Responsive priorities

- **≥1500px:** original three-pane landscape: sidebar ~18%, itinerary ~35%, right zone ~42% + gaps.
- **1150–1499px:** preserve three panes but lower padding / shrink fonts; compare screenshots for overflow.
- **721–1149px:** sidebar + itinerary first row, map + bottom cards second row; controls wrap under title.
- **≤720px:** vertical stack: headline, filters, itinerary, map, plan update, summary, collapsed agent updates. If user focus is map, provide a `Map` tab to bring it upward. Never cram three columns into 375px.

## Security and stability

- Treat event/message text as untrusted. React renders strings safely; do not use `dangerouslySetInnerHTML`.
- Validate responses with a schema (e.g. Zod) before rendering.
- Never expose private paid map/routing API secrets in frontend code; use allowed public keys or proxy where required.
- Respect map/photo attribution, rate limits and provider terms.
- Avoid silently fabricating prices, travel durations, forecasts, or route geometry.
