# Venue grounding phase — 23 October 2026

## Implemented contract

The HTTP planning endpoint now uses `GroundedOrchestrator`; the lower-level `Orchestrator` remains a reusable engine for offline orchestration tests. There is no HTTP flag that bypasses source discovery. Before paid model calls, the coordinator retrieves a bounded OpenStreetMap catalogue using a read-only Overpass endpoint. Dining and activity agents select IDs from their own category's list. The backend rejects missing, unknown, wrong-category and repeated IDs, then replaces model-supplied venue names, descriptions and coordinates with canonical source data. Final assembly preserves these records through deterministic fallback and lock merging.

Up to 14 dining and 20 mixed activity listings are retained within five kilometres of a fixed discovery centre for Tokyo, Kyoto or Osaka. This is a sampled neighbourhood catalogue, not comprehensive city coverage or a popularity ranking. Private/disused, malformed, nonfinite and out-of-area records are filtered. Partial responses and insufficient pools fail before AI planning; old itineraries remain intact. Locked venue IDs are excluded from new selections. If locks use the full budget, no catalogue or model call is required.

The final venue evidence contains the OSM ID, source URL, source name, coordinates, address, feature type, raw listed opening hours if present and retrieval time. The frontend shows an OSM-listed venue label and expandable source/hours detail, creates pins directly from exact catalogue records, and keeps this provenance in local saves. A catalogue location is distinguished from a user-confirmed fuzzy search match. Explore shows source-backed places from the live plan instead of an unrelated Tokyo sample. Imported/saved provenance is retained as data; it is not independently reverified just by opening a file.

Transport has no authoritative fare/operator service in this phase. It returns one explicitly unverified allowance; named ticket products, validity and operator availability are not published as sourced facts. Costs throughout remain model estimates. Listed OSM opening hours are unparsed community data, not a checked open/closed status, a current business confirmation or a guarantee for the selected date. Existing saved/locked legacy suggestions are preserved and are not retroactively upgraded to catalogue evidence.

## Provider and availability

Default read-only endpoint: `https://overpass.private.coffee/api/interpreter`. Operators may set `OVERPASS_API_URL` to an HTTPS read-only Overpass instance. This environment-only setting is never taken from an API request or model response. URLs with embedded credentials, query strings or fragments are rejected. Query construction uses fixed centres and feature filters, not arbitrary user-supplied Overpass code.

Requests use POST with an identifying User-Agent, 25-second HTTP timeout, 20-second query timeout, 16 MB query memory limit, 2 MB response limit, one request/s, at most four pending lookups, and a six-hour in-memory cache. A source error has no synthetic or memory-based venue fallback. Only the fixed discovery area and feature query are sent to Overpass; user interests, budget, trip date and Groq credentials are not sent to that provider.

**Live limitation observed in this session:** public Overpass checks timed out or returned an upstream error. The actual browser plan attempt displayed the unavailable-source error before any paid planning and retained the previous 11-stop itinerary, its two confirmed map matches and its locked tea stop. A successful new real-venue/Groq run could not be verified. This phase must not be reported as live-verified end to end until the provider responds successfully or a working operator-controlled endpoint is configured. No static fake catalogue has been substituted in the running app.

References: [Overpass QL](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL), [public instance list and operating guidance](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances), [shared-server usage](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [OSM attribution](https://www.openstreetmap.org/copyright). The main OSM editing API is not used as a production read-only fallback.

## Prompt change evidence and tests

Used the multi-agent orchestration pattern (ARC-09) and source-grounding/abstention rules (ARC-01) from the prompt-design skill. The key tradeoff is deliberate: lower availability when source data fails, instead of allowing plausible invented venues.

- Before: agents could remember arbitrary restaurants, passes, fees and attractions. After: category-specific ID lists, explicit untrusted-data delimiters, no booking/browsing authority, estimated costs, abstention on missing choices, and backend enforcement rather than a prompt-only promise.
- Malformed and incomplete provider data: rejected before planning.
- Out-of-scope and boundary cases: wrong-category, unknown and duplicate IDs rejected; locked IDs excluded; zero remaining budget avoids lookup.
- Injection probe: a synthetic listing name directing selection of an off-catalogue ID cannot produce a published plan with that ID. Names and raw hours are ordinary React text; source links are constrained to OSM record URLs.
- Conflicting constraints: unsupported/insufficient source pools and unresolved budget violations fail explicitly, preserving the old itinerary.
- Synthetic HTTP/SSE integration verifies the production endpoint's grounded workflow, canonical source attachment, source progress messages and final result. These fixtures are labelled synthetic in tests and are not evidence of real-world venue existence.
- Frontend regression verifies venue coordinates, source method and raw hours survive conversion and local storage; unsafe source links are rejected.

Remaining work includes stable live provider verification, verified prices, date-aware interpretation of listed hours, transit routing, duration-aware full-day feasibility, cloud accounts and the prior security/dependency audit findings.
