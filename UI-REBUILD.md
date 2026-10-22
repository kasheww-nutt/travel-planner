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

The current backend returns no verified coordinates or stop end times. Live plans therefore show location/duration unverified, neutral illustrations instead of inaccurate venue photos, and a readable itinerary rather than invented map points.

Date navigation controls the displayed trip calendar date. The existing live model API consumes city, interests and budget; date-specific venue availability and opening hours are not connected.

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
