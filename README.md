# Integrated Biosciences — front-end replica

Static site. No build step, no dependencies. Open `index.html`, or serve it:

```bash
python3 -m http.server 8899
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Full page markup |
| `styles.css` | Tokens, components, layout, responsive rules |
| `main.js` | All motion (~290 lines, vanilla) |
| `assets/` | Video, photography, icons, favicon |

## Swapping in your own assets

Drop-in replacements — no markup changes needed if you keep the filenames:

| Asset | Used by | Notes |
|---|---|---|
| `assets/hero-loop.mp4` | Hero + footer backgrounds | Footer copy is mirrored in CSS |
| `assets/company.jpg` | Company section | Landscape, 4:3 crop |
| `assets/featured.jpg` | Featured article card | Landscape, 4:3 crop |
| `assets/icon-1.svg` | Column 01 (mint) | Stroke must be dark |
| `assets/icon-2.svg` | Column 02 (charcoal) | Stroke must be light |
| `assets/icon-3.svg` | Column 03 (bone) | Stroke must be dark |
| `assets/favicon.png` | Browser tab | 512×512 |

**The current media belongs to Integrated Biosciences** and is in place as a
temporary stand-in for local development only. Replace before deploying.

All body copy is placeholder text, sized and structured to match the real
layout so swapping it in will not reflow anything.

## Design tokens

Defined at the top of `styles.css` under `:root`:

- **Colour** — `--c-dark` `#1f2c2b`, `--c-mint` `#cef79e`, `--c-off` `#f7f7f5`,
  `--c-bone` `#e7e8e1`, `--c-deep` `#445e5f`, `--c-sage` `#c9cbbe`
- **Type** — Manrope (display + body), Roboto Mono (labels, tags, buttons)
- **Scale** — every size is a `clamp()`, fluid from 375px to 1680px

## How the motion works

| Effect | Where |
|---|---|
| Damped smooth scroll (drives real window scroll, so `sticky` still works) | `main.js` §6b |
| Pinned hero: headline hands off to the scroll carousel at 14% of the pin | `main.js` §5 |
| Word-by-word fill on headings as they cross the viewport | `main.js` §2 |
| Marquee drift + scroll-velocity boost | `main.js` §6 |
| Background video fading in over an animated gradient canvas | `main.js` §9 |
| Staggered fade-up on `[data-inview]` elements | `main.js` §3 |

Every effect is disabled or reduced under `prefers-reduced-motion`, and smooth
scroll is skipped entirely on touch devices in favour of native momentum.

## Known follow-ups

- `hero-loop.mp4` is ~23MB and dominates page weight. Compress to 3–5MB and add
  a `poster` frame (needs `ffmpeg`, not available in the environment this was
  built in).
- Newsroom cards link to `#newsroom`; wire them to real article routes.
