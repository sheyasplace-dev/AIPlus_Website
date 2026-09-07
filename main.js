/* ============================================================
   Integrated Biosciences — interaction layer
   No dependencies. All motion respects prefers-reduced-motion.
   ============================================================ */
(() => {
  'use strict';

  const html   = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp  = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp   = (a, b, t) => a + (b - a) * t;

  /* ── 1. Word splitting ─────────────────────────────────── */
  // Rise-out-of-a-mask words (hero headline).
  function splitRise(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach((w, i) => {
      const outer = document.createElement('span');
      outer.className = 'split_word';
      const inner = document.createElement('span');
      inner.textContent = w;
      inner.style.setProperty('--d', `${i * 42}ms`);
      outer.append(inner);
      el.append(outer, document.createTextNode(' '));
    });
  }

  // Words that light up one by one as the element scrolls through view.
  function splitFill(el) {
    if (el.dataset.filled === '1') return [];
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map(w => {
      const s = document.createElement('span');
      s.className = 'fw';
      s.textContent = w;
      el.append(s, document.createTextNode(' '));
      return s;
    });
    el.dataset.filled = '1';
    el._words = spans;
    return spans;
  }

  document.querySelectorAll('[data-split]').forEach(splitRise);

  // Hover labels need an inner element to travel, so the ::after
  // duplicate can slide into the space it leaves behind.
  document.querySelectorAll('.btn_label').forEach(label => {
    const text = label.textContent.trim();
    const inner = document.createElement('span');
    inner.className = 'label_inner';
    inner.textContent = text;
    if (!label.dataset.label) label.dataset.label = text;
    label.textContent = '';
    label.append(inner);
  });

  /* ── 2. Scroll-driven fill headings ────────────────────── */
  const fillEls = [...document.querySelectorAll('[data-fill]')];
  fillEls.forEach(splitFill);

  function updateFills() {
    for (const el of fillEls) {
      const words = el._words;
      if (!words || !words.length) continue;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) continue;

      // Fill across a long travel — from the heading entering low in the
      // viewport until it has risen near the top — so the unlit tail stays
      // visible for most of the scroll rather than completing on entry.
      let p = clamp((vh * 0.92 - r.top) / (vh * 0.78));

      // Content in the last viewport can never reach the top of that window,
      // so anything still unlit at the end of the page gets completed.
      if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) p = 1;
      const lit = p * (words.length + 0.5);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    }
  }

  /* ── 3. In-view observer ───────────────────────────────── */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-inview');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('[data-inview], [data-parallax]').forEach(el => {
    const sibs = [...el.parentElement.children].filter(c => c.hasAttribute('data-inview'));
    if (sibs.length > 1) el.style.setProperty('--d', `${sibs.indexOf(el) * 110}ms`);
    io.observe(el);
  });

  /* ── 4. Preloader → hero entrance ──────────────────────── */
  const loader    = document.querySelector('[data-loader]');
  const loaderBar = document.querySelector('[data-loader-bar]');
  let pct = 0;
  const tick = setInterval(() => {
    pct = Math.min(92, pct + Math.random() * 18);
    loaderBar.style.width = pct + '%';
  }, 130);

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    clearInterval(tick);
    loaderBar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('is-done');
      html.classList.remove('is-loading');
      html.classList.add('is-ready');
      document.querySelector('[data-hero-intro]')?.classList.add('is-revealed');
    }, reduce ? 0 : 420);
  }
  addEventListener('load', boot);
  setTimeout(boot, 3000);            // never trap the user behind a stalled asset

  /* ── 5. Hero: pinned handoff + scroll carousel ─────────── */
  const hero     = document.querySelector('[data-hero]');
  const intro    = document.querySelector('[data-hero-intro]');
  const scroller = document.querySelector('[data-scroller]');
  const items    = [...document.querySelectorAll('[data-fill-item]')];
  const rule     = document.querySelector('[data-rule]');
  const idxLabel = document.querySelector('[data-index-current]');
  const header   = document.querySelector('[data-header]');
  items.forEach(splitFill);
  let activeIdx = -1;

  const HANDOFF = 0.14;              // fraction of the pin spent on the headline

  function updateHero() {
    if (!hero) return;
    const total = hero.offsetHeight - window.innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / total);

    // headline recedes, carousel takes the stage
    const out = clamp(p / HANDOFF);
    intro.style.opacity   = String(1 - out);
    intro.style.transform = `translateY(${-out * 6}vh)`;
    scroller.classList.toggle('is-on', p > HANDOFF * 0.72);

    // three equal steps across the remaining pin
    const c = clamp((p - HANDOFF) / (0.97 - HANDOFF));
    const stepped = c * items.length;
    const idx     = clamp(Math.floor(stepped), 0, items.length - 1);
    const within  = clamp(stepped - idx);

    if (idx !== activeIdx) {
      items.forEach((el, i) => el.classList.toggle('is-active', i === idx));
      idxLabel.textContent = String(idx + 1).padStart(2, '0');
      activeIdx = idx;
    }

    // the rule draws across as the active item fills in
    rule.style.width = (within * 100).toFixed(2) + '%';

    // light the active item's words to match
    const words = items[idx]._words || [];
    const litTo = clamp(within / 0.82) * (words.length + 1);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < litTo));
    items.forEach((el, i) => {
      if (i === idx) return;
      (el._words || []).forEach(w => w.classList.toggle('is-lit', i < idx));
    });
  }

  /* ── 6. Marquee: drift + scroll-velocity boost ─────────── */
  const track = document.querySelector('[data-marquee-track]');
  const set   = track?.querySelector('.marquee_set');
  let mOff = 0, mWidth = 0, vel = 0, targetVel = 0;

  function measureMarquee() {
    if (!set) return;
    mWidth = set.getBoundingClientRect().width;
    // The loop resets after travelling exactly one set-width, so there must
    // always be a second copy behind it — otherwise a set wider than the
    // viewport scrolls off and leaves a visible gap before the reset.
    while (track.children.length < 2 || track.scrollWidth < innerWidth + mWidth) {
      if (track.children.length >= 8) break;
      track.append(set.cloneNode(true));
    }
    mWidth = set.getBoundingClientRect().width;
  }

  /* ── 6b. Damped smooth scroll ──────────────────────────── */
  // Drives the real window scroll (never a transform), so position:sticky,
  // the pinned hero and anchor links all keep working normally.
  const smooth = !reduce && !matchMedia('(pointer:coarse)').matches;
  let sTarget = scrollY, sCurrent = scrollY, gliding = false;

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - innerHeight);

  function glideTo(y) {
    sTarget = clamp(y, 0, maxScroll());
    gliding = true;
  }

  if (smooth) {
    html.style.scrollBehavior = 'auto';       // our loop owns the easing now

    addEventListener('wheel', e => {
      if (html.classList.contains('is-menu-open')) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16       // line units
                  : e.deltaMode === 2 ? e.deltaY * innerHeight
                  : e.deltaY;
      glideTo((gliding ? sTarget : scrollY) + delta);
    }, { passive: false });

    // any scroll we did not initiate (keyboard, scrollbar) resyncs the target
    addEventListener('scroll', () => {
      if (!gliding) { sTarget = sCurrent = scrollY; }
    }, { passive: true });

    addEventListener('resize', () => glideTo(sTarget), { passive: true });

    // route in-page anchors through the same easing
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        glideTo(t.getBoundingClientRect().top + scrollY);
      });
    });
  }

  function stepScroll() {
    if (!smooth || !gliding) return;
    sCurrent = lerp(sCurrent, sTarget, 0.11);
    if (Math.abs(sTarget - sCurrent) < 0.4) { sCurrent = sTarget; gliding = false; }
    scrollTo(0, sCurrent);
  }

  /* ── 7. rAF loop ───────────────────────────────────────── */
  let lastY = 0;
  function frame() {
    stepScroll();
    const y = scrollY;
    header?.classList.toggle('is-hidden',
      y > lastY && y > 500 && !html.classList.contains('is-menu-open'));
    targetVel = Math.abs(y - lastY);
    lastY = y;

    updateHero();
    updateFills();

    if (track && mWidth) {
      vel = lerp(vel, targetVel, 0.08);
      mOff -= (0.7 + vel * 0.16);
      if (mOff <= -mWidth) mOff += mWidth;
      track.style.transform = `translate3d(${mOff}px,0,0)`;
    }
    requestAnimationFrame(frame);
  }

  measureMarquee();
  addEventListener('resize', measureMarquee, { passive: true });
  if (reduce) { updateHero(); updateFills(); }
  else requestAnimationFrame(frame);

  /* ── 8. Mobile menu ────────────────────────────────────── */
  const toggle = document.querySelector('[data-menu-toggle]');
  toggle?.addEventListener('click', () => {
    const open = html.classList.toggle('is-menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('[data-popup] a').forEach(a => a.addEventListener('click', () => {
    html.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }));

  document.querySelector('[data-scroll-top]')?.addEventListener('click', () => {
    if (smooth) glideTo(0);
    else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ── 9. Background video ───────────────────────────────── */
  // Autoplay is blocked in some contexts; the canvas underneath keeps the
  // section alive, and the video only fades in once it is genuinely running.
  const videos = [...document.querySelectorAll('[data-video]')];
  if (!reduce && videos.length) {
    const show = v => v.classList.add('is-playing');
    const tryPlay = v => v.play().then(() => show(v)).catch(() => {});

    videos.forEach(v => {
      v.addEventListener('playing', () => show(v), { once: true });
      v.addEventListener('canplay', () => tryPlay(v), { once: true });
      tryPlay(v);
    });

    // Decoding a full-screen loop offscreen is pure waste — and there are two
    // of them on this page. Only the visible one runs.
    const vio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) tryPlay(e.target);
      else if (!e.target.paused) e.target.pause();
    }), { threshold: 0.01 });
    videos.forEach(v => vio.observe(v));
  }

  /* ── 9. Flowing organic background ─────────────────────── */
  // Large soft-edged blobs drift on lissajous paths; the CSS blur on the
  // canvas fuses them into the glossy, slowly-moving gradient.
  const PALETTES = {
    hero: [
      ['#16332a', 1.15], ['#3f6b4f', 1.0], ['#8fae86', .85],
      ['#c3ad8e', .8],   ['#0d1c17', 1.05], ['#dcd3c2', .7]
    ],
    footer: [
      ['#14302a', 1.2], ['#2f5a45', 1.0], ['#7d9c7a', .8],
      ['#b6a288', .75],  ['#0b1713', 1.1], ['#cfc6b4', .6]
    ]
  };

  document.querySelectorAll('[data-flow]').forEach(canvas => {
    const ctx  = canvas.getContext('2d');
    const pal  = PALETTES[canvas.hasAttribute('data-flow-footer') ? 'footer' : 'hero'];
    const base = canvas.hasAttribute('data-flow-footer') ? '#16302a' : '#1b3a2e';
    let w, h, dpr, blobs = [], t = Math.random() * 1000;

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);   // blurred anyway — save fill-rate
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const span = Math.max(w, h);
      blobs = pal.map(([color, scale], i) => ({
        color,
        r: span * 0.42 * scale,
        // each blob traces its own slow lissajous figure
        ax: 0.22 + (i % 3) * 0.12, ay: 0.26 + (i % 4) * 0.09,
        fx: 0.00007 + i * 0.000021, fy: 0.00009 + i * 0.000017,
        px: (i * 1.7) % 6.283, py: (i * 2.3) % 6.283
      }));
    }

    function draw(now) {
      t = now || t + 16;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      for (const b of blobs) {
        const x = w * (0.5 + b.ax * Math.sin(t * b.fx + b.px));
        const y = h * (0.5 + b.ay * Math.cos(t * b.fy + b.py));
        const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        g.addColorStop(0,   b.color);
        g.addColorStop(0.55, b.color + '80');
        g.addColorStop(1,   b.color + '00');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      if (!reduce) requestAnimationFrame(draw);
    }

    size();
    requestAnimationFrame(draw);
    addEventListener('resize', size, { passive: true });
  });
})();
