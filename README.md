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
- Project photography is placeholder stock; replace files in `assets/img/` and the
  `<img>`/`photoFrame()` references before launch.
- Deploys to GitHub Pages from `main` at https://vansh1190.github.io/mrnaveenwoodworks/
