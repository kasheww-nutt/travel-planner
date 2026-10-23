# UI rebuild verification

Date: 22 October 2026.

- TypeScript strict checking and production Vite build: passed.
- Backend offline regression tests: 15 passed, including final-assembly provider JSON failure fallback and cancellation/terminal event handling.
- Frontend dependency audit after removing unused React Flow dependency: zero reported advisories at install time.
- Real live Groq run through the browser and cloned API: completed; all four agents done; 12 returned items; calculated total $75.80 / $100. This is one observed run, not a travel-quality or reliability benchmark. The old engine's transport alternatives and unverified venue claims remain limitations.
- Browser checks: date increment/decrement, timeline/list toggle, itinerary selection, conversation dialog, disabled replacement for locked stop, budget reduction to $50 with visible $46 overage, demo state transition, and true live streaming all observed.
- Responsive overflow checks: requested widths 1672, 1280, 768, 390; corresponding content viewports 1657, 1265, 753, 375 (scrollbar excluded); document width equaled viewport width in all four cases.
- Map resize handling uses ResizeObserver, nonanimated fit/pan, and Canvas route rendering so pins and routes remain aligned after breakpoint changes. Geographic anchors and connecting route are illustrative, not turn-by-turn directions.

Screenshots are saved alongside this document. Further manual checks and any material limits are recorded before delivery.

Additional browser checks passed: Explore shows five sample destination cards; Route switches to a map-focused view; zoom in/out and fit controls operate; transport and sample-weather dialogs show the correct content; Escape closes the native dialog; replacing the afternoon stop reduces the total from $96 to $78; locking that alternative and replaying the demo preserves it and its $78 total.

`dashboard-desktop.png` and `dashboard-mobile.png` show the actual running implementation. Desktop photos and OpenStreetMap cartography are licensed substitutes for the generated reference assets. Exact generated map topology is intentionally not reproduced as navigation.

Final map check: all five numbered markers were confirmed not to intersect the weather overlay. Fit padding and per-stop label directions avoid hiding the northern stop under the weather panel.

At the original UI checkpoint, date was a frontend display setting. The travel-data phase below supersedes that limitation. Live plans still cannot preserve locked stops and refuse such a request rather than silently replacing them.

## Travel-data phase

- Strict TypeScript/production build passes; 24 backend regression tests pass. New tests cover date selection, historical/far-future dates, null forecast values, geocoder region/coordinate/source validation, empty results, provider caching/timeouts, bounded lookup capacity and release on error, endpoint errors, actual forecast context dispatched to all specialists, and successful planning when forecasts fail.
- Live provider checks: Tokyo forecast for 2026-10-23 returned Overcast, 11.5–19 °C, 0% maximum daily precipitation probability. Tokyo Mori Art Museum search returned several real OSM candidates; the browser confirmed the intended museum and displayed its source/address. These are observed provider responses, not independent verification of meteorological accuracy or business operation.
- Browser: historical sample date reports out of forecast range; native date input refreshes forecast; Use today in Japan selects the destination's day; locked-stop guidance appears; choosing a candidate updates its provenance and map state. Modal has source attribution and explicit limits.
- Real Groq run for Kyoto on 2026-10-23 completed with all four agents done, 10 items and a displayed $76.25 estimate. The event log visibly included Open-Meteo Drizzle, 12.3–21.2 °C, 73% precipitation probability in assignments to all three specialists. This verifies integration only. The old engine still returns dubious/unverified transit products, venue suggestions, alternatives, and costs; it is not a validated travel itinerary.
- Mobile panel at 390 × 844: content width 375, document width 375, dialog width 341.2; no horizontal overflow. Screenshots: `grounding-phase-desktop.png`, `grounding-phase-mobile.png`.
- Live Kyoto lookup distinguished a similarly named **bus stop** from the temple's **place of worship** feature. After confirming the latter, the map showed one numbered pin and **1/10 stops located**, with the real daily forecast overlay. A deliberately unmatched search showed an empty result without adding coordinates. `grounding-phase-live-candidates.png` records the candidate types.

## Locked plans, persistence and walking routes — 23 October 2026

- Production build and strict TypeScript: passed. Backend: 33 offline tests passed. Frontend: 5 Node tests passed, covering trip/lock/provenance roundtrip, unsafe import rejection, quota errors, interrupted status recovery, altered lock rejection and walking-route invalidation.
- New backend tests cover exact lock restoration and reserved cost in specialist assignments, no model calls when locks consume the entire budget, early rejection of overlapping/over-budget/invalid locks, moving suggested starts out of lock windows, rejecting same-price invented assembly, preserving the sixth activity, and repairing malformed fallback meal times.
- Budget behavior changed deliberately: any estimated overspend is revised; unresolved overspend after two rounds fails without a `final_plan`. The previous tolerance test was updated to exercise the new requirement. This constrains estimated costs only.
- Real Groq browser run on Tokyo / 23 October / $150 completed: 11 items, $133 total, with the sample tea stop restored at 17:00–18:00, $32 reserved, original description/image/sample label and locked identity intact. This is an integration result, not a travel-quality benchmark: unverified venue, transit and pricing claims remain visible limitations.
- Browser persistence: named save succeeded; exported JSON was imported as a separate copy without replacing the current trip; budget $150 and the locked sample survived reload; completed live itinerary and two confirmed venue matches survived another reload. Recoverable removal and Undo were exercised on temporary QA copies, which were then removed. One named live result remains available in the preview's local storage.
- Walking API tests cover correct dedicated foot-server URL and lat/lng conversion, invalid/no-route responses, excessive network snap, out-of-city/identical input points and distinct coordinate URLs using distinct cache entries.
- Live browser walking lookup between confirmed Sensō-ji and Tokyo National Museum returned **2.4 km / about 32 minutes**. The map drew the blue footpath geometry and labelled all other lines schematic. The route is only this pair and does not validate visit durations, transit or the day schedule. Reload restored matches without pretending the transient route was still loaded.
- Cancellation during planner thinking displayed “Planning cancelled. Your last itinerary is still here,” retained all 11 previous stops and the locked tea window, and returned the interface to an idle state. Cancellation is best effort on network loss; server runs retain their 180-second deadline.
- Saved-trip dialog responsive checks at 1672, 1280, 768 and 390: document/client widths respectively 1657, 1265, 753, 375; no horizontal overflow. Desktop dialog width 640 and mobile dialog width 341.2. Native modal focus/close flow still worked.
- Screenshots: `saved-trips-desktop.png`, `saved-trips-mobile.png`, `walking-route-desktop.png`.

Remaining scope: real venue selection before generation, verified prices/hours, transit routes, new-stop duration and whole-day feasibility, multi-device accounts/storage and broader backend security/dependency hardening. Original app files and private GitHub remote are not modified by this clone's work.

## Catalogue-first venue selection — 23 October 2026

Implementation and exact trust boundary: [VENUE-GROUNDING.md](VENUE-GROUNDING.md).

- Strict TypeScript/production build passed; 44 backend tests and 6 frontend tests passed. Synthetic catalogue HTTP/SSE integration verifies that the production endpoint uses source discovery, validates venue IDs, attaches canonical source records and preserves budget/lock behavior. The lower-level engine test explicitly injects its offline engine, rather than bypassing the production endpoint's default.
- Added malformed/partial catalogue, private/out-of-region/NaN source, wrong-category, unknown/duplicate ID, injected listing-name, locked source-ID, no-remaining-budget, POST/cache and unsafe endpoint tests. Frontend regression covers coordinates/raw hours/source method through conversion and local storage.
- The real public venue-provider check failed. Browser displayed “Venue data is unavailable. No paid AI planning has started and your previous itinerary is unchanged.” Previous 11 stops, $133 estimate, two confirmed map matches and the locked 17:00–18:00 tea stop remained. No real successful catalogue/Groq plan is claimed. Screenshot: `venue-source-unavailable.png`.
- Live Explore showed only the two source-linked places in the saved live plan rather than the five Tokyo sample cards. Its museum detail displayed the actual source link, “Listed hours: Not provided,” and unverified cost/availability disclosure. Those are retained previously confirmed venues, not proof of a newly retrieved catalogue.
- No real credentials, synthetic fixture catalogues, or operator endpoint changes were installed into the running app's data. A reachable read-only Overpass service is required to complete successful live verification. Default remains the documented public instance; operators can configure `OVERPASS_API_URL`.
