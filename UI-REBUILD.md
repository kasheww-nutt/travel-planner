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

Live AI cannot yet preserve existing locked reservations. The UI blocks such a request and explains that the user must unlock the stops or use Demo replay. Demo replay preserves locked sample stops. The legacy planning engine's route feasibility, budget tolerance, grounded-data, and security audit findings are not comprehensively resolved by this UI rebuild. Keep the backend local.

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
- Partial maps report the number of located stops. Connecting lines are still schematic and may span unlocated intermediate stops; they are not road, walking or transit routes.
- Lookup state is held in this page's memory. Refreshing or resetting restores the sample; there is no account or saved-trip database yet.

Data access is backend-only, with fixed provider hosts, 8-second upstream timeouts, at most four pending lookups and one upstream request per second per provider, bounded in-memory caches (forecast 30 minutes; place searches 24 hours), input limits, coordinate validation and source attribution. No new API key is required for this local college POC. Search text and the city search area go to Photon; approximate city-centre coordinates go to Open-Meteo. No device location is collected. These public services are suitable for a modest non-commercial prototype; hosting at scale needs a provider/deployment review.

Provider references: [Open-Meteo forecast](https://open-meteo.com/en/docs), [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md), [Photon public demo policy](https://github.com/komoot/photon), [OSM attribution](https://www.openstreetmap.org/copyright).

Still pending: routed journey durations, grounded venue selection before generation, opening hours, real prices, persistence, lock-aware live replanning, and the previously recorded backend security hardening. A forecast-aware prompt alone does not prove a feasible itinerary.
