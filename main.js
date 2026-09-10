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

  /* ── 4. Intro: the mark builds, then becomes the logo ─── */
  // One continuous move: bricks land to form AI+, the mark holds for a beat,
  // then flies to where the header logo sits while the navy backdrop clears.
  // The backdrop and the hero share a colour, so nothing flashes — the mark
  // simply hands over to the real logo and the page is already there.
  const loader     = document.querySelector('[data-loader]');
  const loaderMark = document.querySelector('[data-loader-mark]');
  const siteLogo   = document.querySelector('.header_logo .logo_img');

  const BUILD = reduce ? 0 : 1180;   // bricks landing
  const HOLD  = reduce ? 260 : 380;  // the completed mark, held
  const FLY   = reduce ? 320 : 900;  // mark → logo

  function flyToLogo() {
    if (!loaderMark || !siteLogo) return;
    const from = loaderMark.getBoundingClientRect();
    const to   = siteLogo.getBoundingClientRect();
    if (!from.width || !to.width) return;
    const scale = to.width / from.width;
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    loaderMark.style.transition = `transform ${FLY}ms cubic-bezier(.62,.02,.2,1)`;
    loaderMark.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
  }

  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;

    loader?.classList.add('is-building');

    setTimeout(() => {
      // the page is revealed underneath while the mark is still travelling,
      // so the two halves overlap instead of cutting from one to the other
      loader?.classList.add('is-clearing');
      html.classList.remove('is-loading');
      html.classList.add('is-ready');
      document.querySelector('[data-hero-intro]')?.classList.add('is-revealed');
      flyToLogo();
    }, BUILD + HOLD);

    // the mark dissolves as the real logo comes up in its place
    setTimeout(() => loader?.classList.add('is-done'), BUILD + HOLD + FLY - 120);
    setTimeout(() => loader?.remove(), BUILD + HOLD + FLY + 400);
  }

  // The intro runs on its own clock rather than waiting on assets — the hero
  // carries a poster frame, so there is nothing worth stalling the opening for.
  if (document.readyState === 'complete') boot();
  else { addEventListener('load', boot); setTimeout(boot, 600); }

  /* ── 5. Hero: pinned handoff + scroll carousel ─────────── */
  const hero     = document.querySelector('[data-hero]');
  const intro    = document.querySelector('[data-hero-intro]');
  const scroller = document.querySelector('[data-scroller]');
  const items    = [...document.querySelectorAll('[data-fill-item]')];
  let heroP = 0;                      // pin progress, drives the globe's scale
  const rule     = document.querySelector('[data-rule]');
  const idxLabel = document.querySelector('[data-index-current]');
  const numeral  = document.querySelector('[data-numeral]');
  const eyebrow  = document.querySelector('[data-eyebrow]');
  const header   = document.querySelector('[data-header]');
  const heroMedia = document.querySelector('.hero_bg');
  items.forEach(splitFill);
  let activeIdx = -1;

  const HANDOFF = 0.14;              // fraction of the pin spent on the headline

  function updateHero() {
    if (!hero) return;
    const total = hero.offsetHeight - window.innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / total);
    heroP = p;

    // a slow push on the footage — enough to feel alive under the text,
    // well short of parallax that draws attention to itself. Scaling the
    // wrapper rather than the <video> keeps the video off its own transformed
    // compositing layer, which some Chrome/GPU combinations fail to paint
    // inside the rounded, clipped hero frame.
    if (heroMedia) {
      heroMedia.style.transform = `scale(${(1 + p * 0.07).toFixed(4)})`;
    }

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
      const n = String(idx + 1).padStart(2, '0');
      idxLabel.textContent = n;
      if (numeral) numeral.textContent = n;
      // each panel carries its own category label
      if (eyebrow) eyebrow.textContent = items[idx].dataset.label || '';
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

  /* ── 5b. Partners: logos riding off-canvas orbits ──────── */
  // Four circles centred past the right edge, so only their near arc is on
  // screen. Forty companies are spread evenly around them, which means a
  // handful are visible at a time and the rest keep swinging into view — the
  // section holds the scroll long enough to read them.
  const partners  = document.querySelector('[data-partners]');
  const pStage    = document.querySelector('[data-pstage]');
  const pCards    = [...document.querySelectorAll('[data-pcard]')];
  const pOrbits   = document.querySelector('[data-porbits]');
  const pinnedMQ  = matchMedia('(min-width:1201px)');
  const RINGS     = [0.56, 0.78, 1.0, 1.22];   // radii, as a share of the stage width
  let pMeta = [], pBox = null;

  function measurePartners() {
    if (!partners || !pCards.length) return;
    if (!pinnedMQ.matches || reduce) {          // static list: nothing to drive
      pMeta = []; pBox = null;
      pCards.forEach(c => { c.style.transform = ''; c.style.opacity = ''; });
      return;
    }
    const s = pStage.getBoundingClientRect();
    const card = pCards[0].getBoundingClientRect();
    pBox = {
      w: s.width, h: s.height,
      cx: s.width * 1.16,                       // the centre sits off-canvas…
      cy: s.height * 0.5,
      cw: card.width, ch: card.height
    };
    const per = Math.ceil(pCards.length / RINGS.length);
    pMeta = pCards.map((c, i) => {
      const ring = Math.floor(i / per);
      const k = i % per;
      return {
        r: s.width * RINGS[Math.min(ring, RINGS.length - 1)],
        // spread around the whole circle; most of it is off screen at any moment
        ang: Math.PI + ((k / per) * Math.PI * 2),
        rate: 1 - ring * 0.12,                  // outer arcs travel a little slower
        amp: 2 + (i % 3) * 1.4,
        fr: 0.13 + (i % 5) * 0.03,
        ph: i * 0.7
      };
    });

    if (pOrbits) {
      pOrbits.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
      RINGS.forEach((f, i) => {
        const el = pOrbits.querySelector(`[data-porbit="${i + 1}"]`);
        el.setAttribute('cx', pBox.cx);
        el.setAttribute('cy', pBox.cy);
        el.setAttribute('r', s.width * f);
      });
    }
  }

  function updatePartners(now) {
    if (!partners || !pMeta.length) return;
    const total = partners.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const p = clamp(-partners.getBoundingClientRect().top / total);
    const t = now / 1000;
    // scroll leads, the clock keeps it alive when the page is still — both
    // slow, so the logos are readable as they pass
    const turn = p * Math.PI * 2 * 0.42 + t * 0.022;

    pCards.forEach((c, i) => {
      const m = pMeta[i];
      const a = m.ang + turn * m.rate;
      const x = pBox.cx + Math.cos(a) * m.r - pBox.cw / 2;
      const y = pBox.cy + Math.sin(a) * m.r - pBox.ch / 2
              + Math.sin(t * m.fr + m.ph) * m.amp;

      // fade at the edges of the stage rather than clipping, so logos arrive
      // and leave instead of popping
      const fx = clamp((x + pBox.cw) / (pBox.cw * 1.4)) *
                 clamp((pBox.w - x) / (pBox.cw * 1.4));
      const fy = clamp((y + pBox.ch * 0.6) / (pBox.ch * 0.9)) *
                 clamp((pBox.h - y) / (pBox.ch * 0.9));
      const vis = fx * fy;

      c.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${(0.9 + 0.1 * vis).toFixed(3)})`;
      c.style.opacity = vis.toFixed(3);
      c.style.visibility = vis < 0.01 ? 'hidden' : 'visible';
    });
  }

  /* ── 5b2. Editorial: scattered work drifting ───────────── */
  // Each piece travels at its own rate as the section crosses the viewport,
  // and the accent line draws itself in step with it.
  const edSection = document.querySelector('[data-editorial]');
  const edTiles   = [...document.querySelectorAll('[data-drift]')];
  const edLine    = document.querySelector('[data-ed-line] path');
  const edMQ      = matchMedia('(min-width:901px)');
  if (edLine) {
    const len = edLine.getTotalLength();
    edLine.style.setProperty('--len', len.toFixed(1));
  }

  function updateEditorial() {
    if (!edSection || reduce) return;
    const r = edSection.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    // -1 entering from below → 0 centred → 1 leaving above
    const t = ((innerHeight - r.top) / (innerHeight + r.height)) * 2 - 1;

    if (edMQ.matches) {
      edTiles.forEach(el => {
        const rate = +el.dataset.drift || 30;
        el.style.transform = `translate3d(0, ${(t * -rate).toFixed(1)}px, 0)`;
      });
    }
    // the line draws as the middle of the section reaches the middle of the screen
    if (edLine) {
      const len = edLine.getTotalLength();
      const drawn = clamp((0.35 - t) / 0.5);
      edLine.style.strokeDashoffset = (len * (1 - drawn)).toFixed(1);
    }
  }

  /* ── 5b3. Story: the plate arriving ────────────────────── */
  // The photograph rises into place as the section leaves, and its image
  // travels slower than its frame — the plate fills, then settles.
  const storyPlate = document.querySelector('[data-story-plate]');
  const storyImg   = document.querySelector('[data-story-img]');

  function updateStory() {
    if (!storyPlate || reduce) return;
    const r = storyPlate.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) return;
    // 0 as the plate's top reaches the bottom of the screen → 1 once it is up
    const t = clamp((innerHeight - r.top) / (innerHeight * 0.9));
    const e = 1 - Math.pow(1 - t, 3);
    storyPlate.style.transform = `translate3d(0, ${((1 - e) * 90).toFixed(1)}px, 0)`;
    if (storyImg) {
      storyImg.style.transform = `translate3d(0, ${((1 - e) * -60).toFixed(1)}px, 0) scale(${(1.12 - 0.12 * e).toFixed(3)})`;
    }
  }

  /* ── 5c. Numbers: turning the pages ────────────────────── */
  // The pad is pinned; scroll turns one page at a time. A page rotates on its
  // top edge until it is past vertical, by which point the next figure has
  // faded up underneath it — so a turn reads as one movement, not two.
  const statsSec  = document.querySelector('[data-stats]');
  const pages     = [...document.querySelectorAll('[data-page]')];
  const pageDots  = [...document.querySelectorAll('[data-stats-dots] i')];
  let activeDot = 0;

  function updateStats() {
    if (!statsSec || !pages.length || reduce) return;
    const total = statsSec.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    const p = clamp(-statsSec.getBoundingClientRect().top / total);
    // a short hold at each end so the first and last figures can be read
    const s = clamp((p - 0.08) / 0.84) * (pages.length - 1);

    pages.forEach((el, i) => {
      // how far this sheet has arrived, and how far the next has covered it
      const arrive = i === 0 ? 1 : clamp(s - (i - 1));
      const a = arrive === 1 ? 1 : 1 - Math.pow(1 - arrive, 3);
      const leave = clamp(s - i);
      const l = leave === 0 ? 0 : 1 - Math.pow(1 - leave, 2.4);

      // it swings in on an angle from below, straightens, then settles back
      const rot = (1 - a) * 9 - l * 4;
      const ty  = (1 - a) * 44 - l * 9;
      const sc  = 1 + (1 - a) * 0.06 - l * 0.05;
      el.style.transform = `translateY(${ty.toFixed(2)}%) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      el.style.opacity = a < 0.02 ? '0' : '1';

      // the covered sheet falls into shadow
      const shade = el.querySelector('.page_shade');
      if (shade) shade.style.opacity = (l * 0.72).toFixed(3);

      const img = el.querySelector('.page_img');
      if (img) img.style.filter = l ? `brightness(${(1 - l * 0.25).toFixed(3)})` : '';

      // its figure rises with the sheet and leaves as the next one covers it
      const type = el.querySelector('[data-page-type]');
      if (type) {
        const o = Math.min(clamp((a - 0.45) / 0.45), 1 - clamp(l / 0.35));
        type.style.opacity = o.toFixed(3);
        type.style.transform = `translateY(${((1 - a) * 26).toFixed(1)}px)`;

        // …and travels right to left along the arc while the sheet is on top
        const travel = i === 0 ? clamp(s / 0.8) : clamp((s - (i - 1)) / 1.8);
        const path = el.querySelector('[data-page-path]');
        if (path) path.setAttribute('startOffset', (54.5 - travel * 9).toFixed(2) + '%');
      }
    });

    const idx = Math.round(s);
    if (idx !== activeDot) {
      pageDots.forEach((d, i) => d.classList.toggle('is-on', i === idx));
      activeDot = idx;
    }
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
    sCurrent = lerp(sCurrent, sTarget, 0.1);
    if (Math.abs(sTarget - sCurrent) < 0.4) { sCurrent = sTarget; gliding = false; }
    scrollTo(0, sCurrent);
  }

  /* ── 7. rAF loop ───────────────────────────────────────── */
  let lastY = 0;
  function frame(now) {
    stepScroll();
    const y = scrollY;
    header?.classList.toggle('is-hidden',
      y > lastY && y > 500 && !html.classList.contains('is-menu-open'));
    targetVel = Math.abs(y - lastY);
    lastY = y;

    updateHero();
    updateFills();
    updatePartners(now || 0);
    updateEditorial();
    updateStory();
    updateStats();

    if (track && mWidth) {
      vel = lerp(vel, targetVel, 0.08);
      mOff -= (0.7 + vel * 0.16);
      if (mOff <= -mWidth) mOff += mWidth;
      track.style.transform = `translate3d(${mOff}px,0,0)`;
    }
    requestAnimationFrame(frame);
  }

  measureMarquee();
  measurePartners();
  addEventListener('resize', () => { measureMarquee(); measurePartners(); }, { passive: true });
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
  // The video fades in once there is a decoded frame — the navy hero background
  // covers it until then, which is what prevents any flash on load. It stays
  // visible even where autoplay is blocked or motion is reduced; it just holds
  // on the in-point frame instead of playing.
  const videos = [...document.querySelectorAll('[data-video]')];
  if (videos.length) {
    const show = v => v.classList.add('is-playing');
    const tryPlay = v => reduce ? Promise.resolve() : v.play().then(() => show(v)).catch(() => {});

    videos.forEach(v => {
      // Optional in-point: the clip starts partway in, and loops back to that
      // point rather than to frame 0.
      const start = parseFloat(v.dataset.start || 0);
      if (start > 0) {
        const seekIn = () => { try { v.currentTime = start; } catch (e) {} };

        const applyStart = () => { if (v.duration > start + 0.5) seekIn(); };
        if (v.readyState >= 1) applyStart();
        else v.addEventListener('loadedmetadata', applyStart, { once: true });

        v.addEventListener('timeupdate', () => {
          if (!v.duration) return;
          // seek back just before the natural end, so the wrap never exposes
          // the frames before the in-point
          if (v.currentTime >= v.duration - 0.12) seekIn();
          else if (v.currentTime < start - 0.3) seekIn();   // safety net
        });
        v.addEventListener('ended', () => { seekIn(); tryPlay(v); });
      }

      v.addEventListener('playing', () => show(v), { once: true });
      v.addEventListener('canplay', () => tryPlay(v), { once: true });
      // Reveal as soon as there is a frame to show. Autoplay can be blocked by
      // the browser or declined for reduced motion — in both cases the footage
      // should still be visible, just held still.
      if (v.readyState >= 2) show(v);
      else v.addEventListener('loadeddata', () => show(v), { once: true });
      tryPlay(v);
    });

    // Decoding a full-screen loop offscreen is pure waste. pause()/play()
    // preserves currentTime, so this never restarts the footage.
    const vio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) tryPlay(e.target);
      else if (!e.target.paused) e.target.pause();
    }), { threshold: 0.01 });
    // the markup carries `autoplay`, so under reduced motion the browser has to
    // be told each time to hold the frame still
    if (reduce) videos.forEach(v => {
      v.pause();
      v.addEventListener('play', () => v.pause());
    });
    videos.forEach(v => vio.observe(v));
  }

})();
