# Design — Mr. Naveen Wood Works

A locked design system for this site. Every page redesign reads this file before
emitting code. Do not regenerate per page — amend this file when the system grows.
Designed-as-app by Hallmark (`hallmark redesign`, multi-page flow), 2026-10-13.

## Genre

editorial — date-anchored, plain-spoken Indian-English, workshop honesty.
Audience: Punjab homeowners comparing carpenters before committing.
Use: drive one action — WhatsApp or call for a free site visit + quote.
Tone: editorial-craft. "A thing well made." Never "premium solutions".

## Macrostructure family

- Marketing page (`index.html`): **Photographic** — full-bleed photo folds with
  plate captions; text folds between; typographic-link CTA voice. The 3D walkthrough
  is the page's single orchestrated motion moment.
- Catalogue page (`gallery.html`): **Photographic / quiet catalogue** — index head,
  filterable plate grid, lightbox. Same caption voice ("Plate · place · thing").

## Theme (dark editorial, anchored on the logo's green-gold)

All colour goes through these tokens. No raw hex in components. No pure black/white.

- `--color-paper`   oklch(18% 0.012 155)   /* deep green-black ink surface */
- `--color-paper-2` oklch(24% 0.016 155)   /* raised surface (one level +6%) */
- `--color-rule`    oklch(34% 0.014 155)   /* hairlines */
- `--color-muted`   oklch(72% 0.014 120)   /* secondary text, ≥ 4.5:1 on paper */
- `--color-ink`     oklch(92.5% 0.016 85)  /* primary text (bone) */
- `--color-accent`  oklch(80% 0.06 95)     /* khaki gold — ≤ 5% of any viewport */
- `--color-accent-ink` oklch(18% 0.012 155) /* text on accent fills */
- `--color-focus`   oklch(85% 0.07 95)
- `--color-sage`    oklch(66% 0.045 145)   /* second neutral-accent, rare */

Accent is a highlighter: active states, focus rings, rules, one underlined word.
Never a gradient, never a section fill, never a glow on dark.

## Typography

- Display: Fraunces (self-hosted, variable 300–600), **roman only — italic is
  body-emphasis only, never in a heading**.
- Body: Satoshi (self-hosted, 400/500/700), one body weight per context.
- No third family. Numbers use `font-variant-numeric: tabular-nums`.
- Display tracking −0.02em; labels uppercase with +0.12em tracking.
- Hero display cap ≤ clamp(2.6rem, 5vw + 1rem, 4.8rem). Headlines ≤ 90 chars.
- Body 16–17px, line-height 1.6, measure ≤ 65ch.

## Spacing

4-pt named scale in `assets/revamp.css` (`--space-3xs` … `--space-4xl`).
Sections breathe unevenly (`--space-4xl` generous-top / tight-bottom alternation);
never identical padding on every section.

## Motion

- One orchestrated entrance (hero plate + masthead, ≤ 500 ms total stagger).
  Everything else is simply present. No universal scroll fade-up.
- No parallax, no custom cursor, no grain, no infinite marquees, no preloader.
- Easings: `--ease-out cubic-bezier(.16,1,.3,1)`, `--ease-in cubic-bezier(.7,0,.84,0)`.
  Durations: 120 / 220 / 420 ms tokens.
- The 3D walkthrough scroll-scrub is the one scroll-linked exception (it is the
  product); it keeps its reduced-motion photo fallback.
- Reduced motion: opacity-only, ≤ 150 ms. Focus rings instant, never transitioned.

## Component voice

- Nav: **N6 newspaper masthead** (issue line · wordmark · link row · double rule).
  On scroll past 80px it condenses into a sticky mini-mast (same DOM vocabulary —
  no floating pill). Mobile: disclosure sheet.
- Footer: **Ft4 dense colophon** — real contact block, inline rules, no sitemap
  columns, no icon row.
- Buttons: typographic links with drawn underline + arrow for primary CTAs;
  hairline rectangular chips (radius 2px) where a real button control is needed.
  Never pill-filled. Never hover-scale.
- Dividers: hairlines and the image edge itself. Cards don't nest.
- Captions are provenance ("Punjab · since 2002"), not marketing copy.
- Eyebrows: default OFF. Allowed only on genuinely ordinal content (the 4-step
  process), max 2 on a page, heading directly under them, single column.

## Facts (honest-copy lock)

Only these claims may appear: established 2002 (24+ years), Punjab India,
95% of clients recommend, 5.0/5 reviews, free site visit & 3D design,
made-to-measure, listed services. No invented metrics, no invented testimonials.
Photography is placeholder stock until the owner's real project photos arrive —
replace `assets/img/*` when they do.

## What pages MUST share

Masthead + colophon chrome, tokens, type pairing, caption voice, CTA voice,
`overflow-x: clip` on html and body, single-line affordances at 320–1920px.

## Exports

### tokens.css (source of truth: `assets/revamp.css` `:root`)

```css
:root {
  --color-paper: oklch(18% 0.012 155);
  --color-paper-2: oklch(24% 0.016 155);
  --color-rule: oklch(34% 0.014 155);
  --color-muted: oklch(72% 0.014 120);
  --color-ink: oklch(92.5% 0.016 85);
  --color-accent: oklch(80% 0.06 95);
  --color-accent-ink: oklch(18% 0.012 155);
  --color-focus: oklch(85% 0.07 95);
  --color-sage: oklch(66% 0.045 145);
  --font-display: "Fraunces", "Iowan Old Style", Georgia, serif;
  --font-body: "Satoshi", "Helvetica Neue", Arial, sans-serif;
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --ease-in: cubic-bezier(.7, 0, .84, 0);
  --dur-micro: 120ms; --dur-short: 220ms; --dur-long: 420ms;
  --radius-card: 2px;
}
```
