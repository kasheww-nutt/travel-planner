# Schedule review checkpoint — 24 October 2026

This phase adds a deterministic review, not a schedule solver or a feasibility guarantee.

## Behaviour

- Open **Review schedule** from the workspace toolbar. It works on demo, legacy live, and catalogue-backed plans without a model call.
- Edit an unlocked visit's planned start/end, then Save times. Existing trip persistence/export/import stores those fields. Locked windows cannot be edited here.
- Windows must be between 08:00 and 22:00; ends must follow starts. Blank ends are allowed and explicitly unknown. Overnight visits are unsupported.
- Check every pair for overlaps, including nested visits and a start inside a known-duration visit. Equal unknown-duration starts are flagged too. Invalid imported windows are reported instead of used to assert feasibility.
- Exclude transport-category allowances from timed visits; an allowance does not prove any actual journey.
- Check adjacent chronological visits against only the latest calculated forward walking pair when its location key still matches. Round walking seconds up to minutes, then add the visible buffer (default 10 minutes). A changed location invalidates evidence; changed times recalculate the gap.
- Missing ends or route evidence remain unknown. Reverse-direction evidence is not reused. Other legs, opening hours, queues, bookings and transit are unverified. Raw OSM hours are not parsed into an opening guarantee.
- The buffer is local to the open review and resets on reopening. Walking evidence is transient and cleared on reload. No automatic schedule repair or duration invention occurs.

## Verification

- 11 frontend tests: five new schedule tests cover nested/locked overlaps, unknown durations, exact walking rounding/buffer boundaries, direction, location invalidation, changed times, transport allowances and invalid windows. Existing storage/source/lock tests still pass.
- Production TypeScript/Vite build passes. Explicit `.ts` imports are enabled under `noEmit` for the pure review module's native Node test execution.
- All 44 backend tests pass (fixture-based source-provider contracts, not live source verification).
- Browser on existing legacy plan: originally seven missing ends and seven unchecked legs; temporarily set Sensō-ji end to 11:30 and detected a 30-minute overlap with the 11:00 museum visit. Restored the original blank end. Locked tea fields are disabled. The original itinerary/costs remain intact.
- At 390 × 844, the review fits the phone viewport and its form controls wrap. Desktop/mobile screenshots are alongside this file.
- Actual FOSSGIS lookup succeeded for the two already confirmed legacy locations: Sensō-ji → Tokyo National Museum, 2.4 km / 32 minutes. Temporarily setting the first visit end to 10:30 against the museum's 11:00 start produced “Short by 12 min” with the 10-minute buffer. Restored the original blank end after capturing `schedule-walking-conflict.png`; this screenshot contains temporary QA times, not a newly approved schedule. This live walking success does not resolve the separate Overpass discovery blocker.

## External blocker

The production catalogue lookup was retried against the configured default public Overpass provider on 24 October and again returned TravelDataUnavailable. No AI calls were made by this standalone source check. Live catalogue planning remains unverified; no fake or stale fixture catalogue was substituted.

## Remaining work

Reliable venue discovery and a real grounded AI run remain priorities. Automatic allocation of visit durations and travel around locks is not implemented by this review. A later solver needs explicit duration assumptions, per-leg transport choices, richer routing coverage, opening-hours/date handling and a clear infeasible outcome before it can claim a usable day.
