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

The selected calendar date is currently a frontend display setting; the legacy live API accepts city, interests and budget only. No opening-date or forecast validation is claimed. Live plans cannot preserve locked stops yet, and clearly refuse such a request rather than silently replacing them.
