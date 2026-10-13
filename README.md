# Mr. Naveen Wood Works

Bespoke interiors and joinery studio site — a single-page static build with a scroll-driven
3D walkthrough. No framework, no build step: open `index.html` or serve the folder as-is.

    python3 -m http.server 8080

## Layout

    index.html            content + sections
    assets/revamp.css     design system, motion styles
    assets/revamp.js      scroll engine, reveals, nav, rail
    assets/film.js        WebGL walkthrough (lazy-loaded)
    assets/vendor/        three.js (self-hosted)
    assets/fonts/         Fraunces + Satoshi, latin subsets, woff2
    assets/img|video|icons

## Notes

- The walkthrough builds rooms procedurally and displays project photos on in-scene walls.
  It lazy-loads three.js only when the section scrolls into view, clamps DPR to 1.75,
  pauses offscreen, and falls back to a photo sequence without WebGL or with
  `prefers-reduced-motion`.
- Brand kit comes from the official logo badge (assets/logo.png): deep green #16281f /
  #2f4a3c, sage #8fa886, khaki gold #cfc38f, cream #efe7da. Palette lives in the CSS
  custom properties at the top of assets/revamp.css.
- Project photography is placeholder stock; replace files in `assets/img/` and the
  `<img>`/`photoFrame()` references when real site photos arrive.
- Facts synced from the old Vercel site: established 2002, Punjab-based, 95% of clients
  recommend, service list (Italian & modular kitchens, luxury bedrooms, LCD/LED panels,
  doors & windows, down ceilings, interior design, storage solutions).
- Deploys to GitHub Pages from `main` at https://vansh1190.github.io/mrnaveenwoodworks/
