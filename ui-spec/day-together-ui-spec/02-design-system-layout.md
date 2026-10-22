# 02 — Design system, typography, desktop grid

## Appearance

Warm editorial travel aesthetic: ivory paper, near-black forest green serif titles, slate-gray body copy, terracotta interactive accents, sage-tinted status accents. Minimal shadows, 1px warm-gray borders, generous negative space. Avoid bright blue and glassmorphism.

## CSS tokens (`src/styles/tokens.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');
:root {
  --bg: #fbf8f3;
  --surface: #fffdfa;
  --surface-peach: #fff1e9;
  --surface-sage: #edf2e9;
  --text: #102f27;
  --text-body: #39434d;
  --muted: #798089;
  --border: #e6ddd1;
  --border-strong: #d7cabc;
  --accent: #bb4f30;
  --accent-dark: #a93f25;
  --green: #139965;
  --marker: #103e32;
  --danger: #bd4228;
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-ui: 'DM Sans', Arial, sans-serif;
  --radius-card: 11px;
  --radius-pill: 999px;
  --shadow-soft: 0 2px 14px rgb(77 56 38 / 3%);
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
}
```

Fonts are suggested visual approximations, not an identification of the reference font. If pursuing closer resemblance, try a high-contrast editorial serif with similar widths and tune letter spacing.

## Global (`src/styles/global.css`)

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { min-height: 100%; margin: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--font-ui); }
button, select, input { font: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
button:focus-visible, a:focus-visible, select:focus-visible, input:focus-visible {
  outline: 3px solid #d78059; outline-offset: 2px;
}
img { display: block; max-width: 100%; }
h1, h2, h3, p { margin-top: 0; }
.serif { font-family: var(--font-display); font-weight: 400; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-card); box-shadow: var(--shadow-soft); }
.status-dot { display:inline-block; width:9px; height:9px; background:var(--green); border-radius:50%; flex:none; }
.soft-pill { background:var(--surface-sage); border-radius:var(--radius-pill); padding:4px 10px; font-size:12px; }
```

## Page grid (`src/styles/dashboard.css`)

```css
.app-shell { min-width: 320px; }
.dashboard-container { max-width: 1800px; margin: 0 auto; padding: 20px 38px 30px; }
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 25px; min-height: 129px; }
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(250px, .505fr) minmax(450px, 1fr) minmax(550px, 1.185fr);
  gap: 14px;
  align-items: stretch;
}
.travel-sidebar, .itinerary-panel { min-height: 690px; }
.right-column { min-width: 0; display:flex; flex-direction:column; gap:14px; }
.route-map { height: 475px; min-height: 440px; }
.right-footer-grid { display:grid; grid-template-columns: 1.7fr 1fr; gap: 14px; flex:1; }
.right-footer-grid > * { min-width:0; }

@media (max-width: 1400px) {
  .dashboard-container { padding-inline: 24px; }
  .dashboard-grid { grid-template-columns: 235px minmax(385px, 1fr) minmax(440px, 1.1fr); gap:12px; }
  .right-footer-grid { grid-template-columns: 1.3fr 1fr; }
}
@media (max-width: 1150px) {
  .hero-row { flex-direction:column; padding-bottom:18px; min-height:0; }
  .dashboard-grid { grid-template-columns: 260px minmax(0,1fr); }
  .right-column { grid-column:1 / -1; }
  .route-map { height:420px; }
}
@media (max-width: 720px) {
  .dashboard-container { padding: 18px 14px 26px; }
  .dashboard-grid { display:flex; flex-direction:column; }
  .travel-sidebar, .itinerary-panel { min-height:auto; }
  .right-footer-grid { grid-template-columns:1fr; }
  .route-map { height:360px; }
}
```

## Reference proportions at 1672px

| Region | Approx bounds | Hierarchy |
|---|---|---|
| Header | 0–67px high | Fixed-height nav strip |
| Hero | y≈86–194 | h1 largest visual element; controls to the right |
| Sidebar | x≈38–329, y≈217–911 | Agent roster above update feed |
| Itinerary | x≈343–918, y≈217–911 | Five timeline rows, about 114–135px per row |
| Map | x≈932–1613, y≈196–671 | Dominant right-hand landscape visual |
| Below map | y≈686–911 | 2 bordered cards: change comparison, spend summary |

Map starts about 20px higher than sidebar/itinerary in the illustration. Reproduce with `.right-column { margin-top:-20px; }` **only at large screens** if pixel comparison confirms it; otherwise align panels on the same baseline to keep a more robust grid.

## Visual QA targets

- Border stroke `1px`, hairline warm beige, not gray-black.
- Sidebar title around 23px serif; other panel titles ~22–24px serif.
- Desktop hero heading ~55–60px serif with tight line height `1.05`.
- UI body generally 12–15px; place titles ~17px serif.
- Card gutters 15–20px, internal spacing 12–18px.
- Photo crops square-ish, about 92 × 92px in itinerary (reference roughly 90 × 90).
- Use `object-fit:cover`; never stretch photography.
