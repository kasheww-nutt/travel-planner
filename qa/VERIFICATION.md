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
