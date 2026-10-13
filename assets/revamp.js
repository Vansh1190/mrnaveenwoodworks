/* Hallmark · designed-as-app · design-system: design.md
   Motion budget: one entrance (CSS .entrance) + functional progress + the 3D
   walkthrough (the product itself). No parallax, cursor, grain, curtain, marquees. */

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

document.documentElement.classList.add('js');
if (reduce) document.documentElement.classList.add('reduced');

/* ---------- masthead: condense past 80px, disclosure on mobile ---------- */
const mast = document.querySelector('.mast');
const toggle = document.querySelector('.mast__toggle');
let menuOpen = false;

const closeMenu = () => {
  menuOpen = false;
  if (mast) mast.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
};

if (mast && toggle) {
  toggle.addEventListener('click', () => {
    menuOpen = !menuOpen;
    mast.classList.toggle('is-open', menuOpen);
    document.body.classList.toggle('is-locked', menuOpen);
    toggle.setAttribute('aria-expanded', String(menuOpen));
    toggle.setAttribute('aria-label', menuOpen ? 'Close menu' : 'Open menu');
  });
  mast.querySelectorAll('.mast__links a').forEach((a) => a.addEventListener('click', closeMenu));
}

/* ---------- smooth in-page anchors with masthead offset ---------- */
addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href') === '#') return;
  const el = document.querySelector(a.getAttribute('href'));
  if (!el) return;
  e.preventDefault();
  const offset = el.classList.contains('mast') ? 0 : (mast ? mast.offsetHeight + 12 : 70);
  const top = el.getBoundingClientRect().top + scrollY - offset;
  scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
});

/* ---------- damped scroll: progress bar + masthead state + film feed ---------- */
const bar = document.querySelector('.progress__bar');
let target = 0;
let y = 0;
let maxScroll = 1;

const measure = () => {
  const doc = document.documentElement;
  return Math.max(1, doc.scrollHeight - innerHeight);
};

const frame = () => {
  target = scrollY;
  y = reduce ? target : lerp(y, target, 0.1);

  if (bar) bar.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1).toFixed(4)})`;
  if (mast) mast.classList.toggle('is-small', target > 80 && !menuOpen);

  if (filmScrollCb) filmScrollCb();
  if (buildScrollCb) buildScrollCb();
  requestAnimationFrame(frame);
};

addEventListener('resize', () => { maxScroll = measure(); }, { passive: true });
addEventListener('load', () => { maxScroll = measure(); });
maxScroll = measure();
requestAnimationFrame(frame);

/* ---------- hero video: poster-first on touch / save-data ---------- */
const heroVideo = document.querySelector('.fold__media video');
if (heroVideo) {
  const src = heroVideo.getAttribute('src');
  const heavy = matchMedia('(pointer: coarse)').matches || navigator.connection?.saveData;
  if (heavy) {
    heroVideo.removeAttribute('src');
    heroVideo.removeAttribute('autoplay');
    heroVideo.removeAttribute('loop');
  } else {
    heroVideo.removeAttribute('src');
    const play = () => {
      if (heroVideo.getAttribute('src')) return;
      heroVideo.setAttribute('src', src);
      const played = heroVideo.play();
      if (played && typeof played.catch === 'function') played.catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      const vio = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { play(); vio.disconnect(); } }), { rootMargin: '20% 0px' });
      vio.observe(heroVideo);
    } else {
      play();
    }
  }
}

/* ---------- scroll-linked 3D sections (the two sanctioned exceptions) ---------- */
let filmScrollCb = null;
let buildScrollCb = null;

const wireScrollFilm = (film, initFn, setCb) => {
  if (!film) return;
  const pin = film.querySelector('.film__pin');
  const sizer = film.querySelector('.film__sizer');
  let top = 0;
  let span = 1;

  const measureFilm = () => {
    pin.style.height = '';
    sizer.style.height = '';
    const vh = innerHeight;
    const content = pin.offsetHeight || vh;
    if (content <= vh) {
      pin.style.height = `${vh}px`;
      sizer.style.height = `${Math.round(vh * 3)}px`;
    } else {
      pin.style.height = `${content}px`;
      sizer.style.height = `${Math.round(vh * 3 + (content - vh))}px`;
    }
    top = film.getBoundingClientRect().top + scrollY;
    span = Math.max(1, film.offsetHeight - vh);
  };

  const push = () => {
    const feed = film === document.getElementById('film') ? window.__filmScroll : window.__buildScroll;
    if (!feed) return;
    feed(clamp((scrollY + innerHeight / 2 - top) / span, 0, 1));
  };

  if (reduce) {
    film.classList.add('is-reduced');
    initFn({ reduce: true }).catch(() => {});
    return;
  }

  const setup = () => { measureFilm(); push(); };
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    initFn({ reduce: false })
      .then(push)
      .catch(() => {
        film.classList.add('is-reduced');
        const c = film.querySelector('.film__canvas');
        if (c) c.remove();
        const fb = film.querySelector('.film__fallback');
        if (fb) fb.hidden = false;
        push();
      });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => {
        if (!en.isIntersecting) return;
        start();
        io.disconnect();
      }),
      { rootMargin: '40% 0px' }
    );
    io.observe(film);
  } else {
    start();
  }
  setup();
  setCb(push);
  addEventListener('resize', setup);
  addEventListener('load', setup);
  if ('ResizeObserver' in window) {
    let queued = false;
    new ResizeObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; setup(); });
    }).observe(film);
  }
};

const importFilm = () => import('./film.js').then((m) => m.initFilm);
const importBuild = () => import('./build.js').then((m) => m.initBuild);

wireScrollFilm(document.querySelector('#film'), (o) => importFilm().then((fn) => fn(o)), (cb) => { filmScrollCb = cb; });
wireScrollFilm(document.querySelector('#build'), (o) => importBuild().then((fn) => fn(o)), (cb) => { buildScrollCb = cb; });

/* ---------- year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
