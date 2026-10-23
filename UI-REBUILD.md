# Day, together — isolated UI rebuild

This checkout is the separate UI version. The original project at `C:\Users\kashif\pro-lol\shant` is unchanged. Its pre-rebuild backup remains in the original project's `backups/` folder.

## Run the new version

From this repository root, in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r travel-planner/backend/requirements.txt
# Keep your own GROQ_API_KEY in travel-planner/.env (never committed).
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir travel-planner/backend --host 127.0.0.1 --port 8002
```

In another terminal:

```powershell
cd travel-planner/frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5174**. The new frontend proxies `/api` to port **8002**. The original version uses port **5173**. `--strictPort` prevents an accidental collision. Both application code and dependency environments are separate.

## Implemented

- React + TypeScript reconstruction of the ZIP's `00-README.md` and `01-project-architecture.md`, following the referenced component, interaction, accessibility, and QA documents.
- Warm ivory/forest/terracotta design; responsive three-pane desktop composition; five-stop timeline; changed and locked stop treatments; trip comparison; budget summary.
- Workspace, Itinerary, Explore, and Route views with URL hash navigation.
- Controlled trip filters, date navigation, list mode, stop selection synchronized with map pins, real zoom/fit controls, transport/weather/change dialogs, and a photograph credit dialog.
- Native modal dialogs support Escape, focus containment, backdrop close, and restoration of focus. Keyboard-visible focus styles, textual statuses, reduced motion, and a polite message log are included.
- Explicit **Demo replay** and **Live AI** modes. Demo replay performs a cancellable sample state transition; it is not presented as a live model run. Live mode calls the cloned FastAPI backend, validates SSE events and itinerary output with Zod, and displays actual agent messages and raw event details.
- Real cancellation endpoint in the cloned backend. Provider rejection of the final planner's JSON can fall back to the already collected specialist suggestions rather than discarding them.
- Licensed representative Commons photography stored locally, with author, source, license, and crop notes in `src/data/photoCredits.json`. The map uses OpenStreetMap tiles with visible attribution. The supplied generated image is a reference only, never an application background.

## Limits stated in the UI

The fixed Tokyo sample uses illustrative weather, prices, date, and approximate coordinate anchors. Its tea ceremony and restaurant are unnamed sample stops. The map connects coordinates schematically; it is not navigable directions or a live forecast.

The model returns no verified coordinates or stop end times. Live plans initially show location/duration unverified and neutral illustrations. In **Places & forecast**, search a specific venue, inspect its OpenStreetMap record, then confirm the intended match. Only confirmed matches get live map pins. This confirms the user's intended map location, not the venue's current operation, hours, prices or availability.

The live model API now consumes city, interests, budget and the selected calendar date. A real Open-Meteo daily forecast is supplied to the agents when available. Date-specific venue availability and opening hours are not connected. Changing the date refreshes the displayed forecast; generating again is required to update the itinerary.

Live AI now preserves locked stops through backend validation and deterministic restoration; see the next-phases section below. Venue availability, whole-day route feasibility, grounded-data selection and the original security audit are not comprehensively resolved. Keep the backend local.

The reference's fonts, photos, and generated map geometry are not recoverable exactly. The implementation uses real DOM components, licensed substitute photos, actual map tiles, and small honest demo labels. Activity duration is calculated as 6.5 hours for the sample, instead of repeating the reference's inconsistent approximately eight-hour label.

## Verification

```powershell
cd travel-planner/frontend
npm run build
cd ../backend
..\..\.venv\Scripts\python.exe -m unittest -v
```

See `qa/VERIFICATION.md` for observed browser results and screenshots. No deployment or push to the original GitHub repository is implied by this separate checkout.

## Next phase: real travel data

Implemented in this clone only:

- **Places & forecast** opens a focused panel without crowding the workspace. Use its calendar or **Use today in Japan** to select a forecast date. The historical screenshot date intentionally reports no forecast rather than substituting today's weather.
- Open-Meteo daily condition, temperature range and maximum daily precipitation probability for Tokyo, Kyoto or Osaka; today through 15 days ahead using Japan's calendar date. A city-wide daily forecast cannot establish a rain time at a venue.
- The actual date and available forecast are included in planner and specialist task assignments visible in the message log. A provider failure or out-of-window date permits planning with an explicit unavailable-weather message, without fabricating a forecast.
- Photon/OpenStreetMap venue search is restricted to a documented area around the selected city. No automatic best-match acceptance. Each candidate has its name, address, coordinates and OSM source link. Confirmation updates the corresponding stop's location and a **Map match confirmed** label; removal clears its pin. Locked stops cannot be changed. Searches that return nothing stay empty.
- Partial maps report the number of located stops. Green connecting lines remain schematic; the next phase adds a separately labelled blue walking route for a selected confirmed pair.
- Confirmed place matches now persist with the current trip and named local saves. There is no account or cloud database.

Data access is backend-only, with fixed provider hosts, 8-second upstream timeouts, at most four pending lookups and one upstream request per second per provider, bounded in-memory caches (forecast 30 minutes; place searches 24 hours), input limits, coordinate validation and source attribution. No new API key is required for this local college POC. Search text and the city search area go to Photon; approximate city-centre coordinates go to Open-Meteo. No device location is collected. These public services are suitable for a modest non-commercial prototype; hosting at scale needs a provider/deployment review.

Provider references: [Open-Meteo forecast](https://open-meteo.com/en/docs), [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md), [Photon public demo policy](https://github.com/komoot/photon), [OSM attribution](https://www.openstreetmap.org/copyright).

## Next phases: locked replanning, saved trips, walking routes

Implemented on 23 October 2026 in this clone:

- Locked stops are submitted as structured data. Their costs are reserved before budget allocation. Duplicate lock IDs, overlapping lock windows, invalid times and unaffordable locks are rejected before planning. The backend merges the exact locked title, description, start/end, category and cost back into the final result, and the frontend independently checks each returned lock before replacing the itinerary. Local images, confirmed location provenance and IDs survive. A retained sample stop stays labelled **Sample stop**.
- No new start time may fall inside a locked window; conflicting starts move to its end. A lock with no end holds its start instant only. This is not a full duration or travel-time scheduling solver. Missing durations stay unverified.
- Any estimated overspend now triggers up to two revisions. If it remains over budget, the run ends with an error and retains the previous itinerary, instead of accepting 10% overspend. These are constraints on estimates, not a promise about actual prices.
- Final assembly must preserve the specialists' stop identities, categories and individual costs. A same-price invented stop, missing stop or duplicate causes deterministic fallback. Fallback no longer drops the sixth activity and repairs invalid meal start times. The retained specialist suggestions themselves can still be wrong.
- The completed current trip automatically saves on this browser/device. **Saved trips** supports ten named copies, open, recoverable removal, and JSON export/import. Imports are size-limited and validated, reject remote/script image URLs and unsafe source links, and recompute totals. Imported files become saved copies without changing the open trip. Storage/quota errors are shown; no cloud sync is implied. Recent log history is limited to 40 messages in local snapshots.
- Cancellation now captures the session before closing the stream, so aborting the browser work also cancels the actual backend task. Unmounting attempts cancellation, and interrupted statuses restore as idle rather than pretending a stream resumed.
- **View transport options** includes an explicit walking lookup between two confirmed place matches. The request goes to FOSSGIS's dedicated OSRM foot-profile server. The blue line uses returned footpath geometry, distance and estimated duration; green lines remain schematic. The lookup does not change stop times or validate the full day's schedule. Coordinates changing or a different trip invalidates the displayed route. A route is not silently requested for sample anchors.
- Walking lookup uses a fixed host, two bounded city-local coordinates, one request/s, at most four pending requests, 8-second upstream timeout, one-hour caching keyed by the actual coordinate URL, response validation and a 300 m maximum network snap. No additional API key is needed. The two venue coordinates go to FOSSGIS only on the explicit Calculate action; no device location is collected. Route geometry is transient and is not saved as current navigation.

Provider references: [FOSSGIS usage/privacy](https://routing.openstreetmap.de/about.html), [OSRM route API](https://project-osrm.org/docs/v5.24.0/api/). The modest-use public service is not a production SLA.

## Venue catalogue phase

The next implementation adds source discovery before paid AI calls, category-specific venue IDs enforced by the backend, canonical source names and coordinates, source/hours details, and source-aware Explore and local persistence. New dining/activity selections must come from the catalogue. Transport is reduced to one unverified allowance rather than publishing invented ticket products. Existing locked/saved legacy suggestions remain unchanged.

Live venue discovery was unavailable during verification, so a successful real-source end-to-end run is still pending. The running app reports the source failure, makes no paid planning calls for that failed attempt, and preserves the old itinerary. It does not insert a fake catalogue. See [venue grounding implementation and validation](qa/VENUE-GROUNDING.md) for the exact boundary and `OVERPASS_API_URL` configuration.

Still pending: successful live venue-provider verification, verified opening hours and current prices, transit routing, duration-aware whole-day feasibility, cloud persistence/accounts and the previously recorded backend security hardening. Source records, a budget of estimates and one routed leg do not establish a travel-ready itinerary.
# Schedule review — 24 October 2026

The toolbar's **Review schedule** opens a focused visit-window editor and deterministic conflict review. It flags overlaps, missing end times, invalid windows and insufficient time for the latest calculated forward walking pair plus a visible buffer. Locked windows remain fixed. Edited times use existing local trip saving/export. This is a review, not an automatic scheduler or a full-day feasibility guarantee. See [qa/SCHEDULE-REVIEW.md](qa/SCHEDULE-REVIEW.md) for verification and limits. Live walking works for the existing confirmed pair; the separate public venue-discovery provider remains unavailable.
