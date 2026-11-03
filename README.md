# AI+ — website

The site for AI+, the community of AI founders, researchers and builders at the
epicenter of the AI renaissance.

Static site. No build step, no dependencies. Open `index.html`, or serve it:

```bash
python3 -m http.server 8080
```

## Files

| File | Purpose |
|---|---|
| `index.html` | Full page markup |
| `styles.css` | Tokens, components, layout, responsive rules |
| `main.js` | All motion (vanilla JS) |
| `assets/` | Hero video, photography, partner logos, mentor photos, favicon |

## Page sections

Hero (video) → Platform → Numbers → Company (industry discussions, founder
dinners, product launches) → Partners → Mentors → Newsroom → Footer.

The Newsroom cards link to posts on the
[AI+ Substack](https://aiplusfounderscommunity.substack.com/); update the four
cards in `index.html` when new posts go out.

## Assets

- Photos ship as AVIF → WebP → JPEG via `<picture>`, with a 1200w step for
  large ones. When adding a photo, generate its `.avif`/`.webp` siblings too.
- `hero-video.mp4` (1080p) and `hero-video-720.mp4` (mobile) are silent and
  start at the loop's in-point; `data-start` on the `<video>` sets where the
  loop restarts.
- The intro's brick mark uses `assets/partners/partner-{3,5,6}.jpg`.
- Partner logos live in `assets/logos/`, mentor photos in `assets/mentors/`.

## Design tokens

Defined at the top of `styles.css` under `:root`:

- **Colour** — `--c-dark` `#000a45`, `--c-deep` `#0016a9`, `--c-mint` `#b1dfff`,
  `--c-azure` `#0099ff`, `--c-bone` `#e8eaf0`, `--c-off` `#f6f6f6`
- **Type** — Hanken Grotesk (display + body), Roboto Mono (labels, tags, buttons)
- **Scale** — every size is a `clamp()`, fluid across viewport widths

## How the motion works

| Effect | Where |
|---|---|
| Intro: brick mark builds, then flies to the header logo | `main.js` §4 |
| Pinned hero: headline hands off to the scroll carousel | `main.js` §5 |
| Partner logos riding off-canvas orbits | `main.js` §5b |
| Number slabs stacking on scroll | `main.js` §5c |
| Word-by-word fill on headings as they cross the viewport | `main.js` §2 |
| Marquee drift + scroll-velocity boost | `main.js` §6 |
| Damped smooth scroll (drives real window scroll, so `sticky` still works) | `main.js` §6b |
| Background video with a held in-point | `main.js` §9 |
| Staggered fade-up on `[data-inview]` elements | `main.js` §3 |

Every effect is disabled or reduced under `prefers-reduced-motion`, and smooth
scroll is skipped entirely on touch devices in favour of native momentum.
