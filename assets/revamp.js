const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

document.documentElement.classList.add('js');
if (reduce) document.documentElement.classList.add('reduced');

/* ---------- preloader ---------- */
let booted = false;
const boot = () => {
  if (booted) return;
  booted = true;
  document.documentElement.classList.add('is-ready');
  document.body.classList.remove('is-locked');
  setTimeout(startReveals, reduce ? 0 : 260);
};
document.body.classList.add('is-locked');
addEventListener('load', boot);
setTimeout(boot, 2200);

/* ---------- word splitting ---------- */
document.querySelectorAll('[data-words]').forEach((el) => {
  const frag = document.createDocumentFragment();
  el.textContent.split(/\s+/).filter(Boolean).forEach((w, i) => {
    const box = document.createElement('span');
    box.className = 'word';
    const inner = document.createElement('i');
    inner.textContent = w;
    inner.style.transitionDelay = `${i * 45}ms`;
    box.appendChild(inner);
    frag.appendChild(box);
    frag.appendChild(document.createTextNode(' '));
  });
  el.textContent = '';
  el.appendChild(frag);
});

/* ---------- reveal ---------- */
let observer;
function startReveals() {
  const targets = document.querySelectorAll('[data-reveal], [data-words], .hero__title, .mask');
  if (reduce || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  targets.forEach((el) => {
    const d = el.dataset.revealDelay;
    if (d) el.style.setProperty('--d', d);
  });
  document.querySelectorAll('.hero__title .mask__i').forEach((el, i) => {
    el.style.setProperty('--d', 180 + i * 130);
  });
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        observer.unobserve(e.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));
}

/* ---------- counters ---------- */
function runCounters() {
  if (!('IntersectionObserver' in window)) return;
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduce) { el.textContent = end + suffix; return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1500;
        const tick = (now) => {
          const p = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(end * eased) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });
}
runCounters();

/* ---------- damped scroll engine ---------- */
const parallax = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
  el,
  speed: parseFloat(el.dataset.parallax) || 0.1,
  current: 0,
}));
const bar = document.querySelector('.progress__bar');
const hero = document.querySelector('.hero');
const nav = document.querySelector('.nav');
const video = document.querySelector('.hero__video');

let filmScrollCb = null;
let target = 0;
let y = 0;
let last = 0;
let velocity = 0;

const measure = () => {
  const doc = document.documentElement;
  const max = doc.scrollHeight - innerHeight;
  target = scrollY;
  parallax.forEach((p) => {
    const r = p.el.getBoundingClientRect();
    p.center = r.top + scrollY + r.height / 2;
    p.height = r.height;
  });
  return max;
};
let maxScroll = 1;

const frame = () => {
  target = scrollY;
  y = reduce ? target : lerp(y, target, 0.085);
  velocity = lerp(velocity, target - last, 0.12);
  last = target;

  const progress = maxScroll > 0 ? clamp(target / maxScroll, 0, 1) : 0;
  if (bar) bar.style.transform = `scaleX(${progress})`;

  if (!reduce) {
    parallax.forEach((p) => {
      const off = (y + innerHeight / 2 - p.center) * p.speed;
      p.el.style.transform = `translate3d(0, ${off.toFixed(2)}px, 0)`;
    });
    if (video) {
      const p = clamp(y / innerHeight, 0, 1);
      video.style.transform = `scale(${(1.06 + p * 0.12).toFixed(4)}) translateY(${(y * 0.08).toFixed(2)}px)`;
      video.style.opacity = (1 - p * 0.55).toFixed(3);
    }
  }

  if (filmScrollCb) filmScrollCb();

  if (nav) {
    nav.classList.toggle('is-stuck', target > 40);
    nav.classList.toggle('is-hidden', target > innerHeight * 1.2 && velocity > 2 && !menuOpen);
  }

  requestAnimationFrame(frame);
};

let menuOpen = false;
const toggle = document.querySelector('.nav__toggle');
if (toggle) {
  toggle.addEventListener('click', () => {
    menuOpen = !menuOpen;
    nav.classList.toggle('is-open', menuOpen);
    document.body.classList.toggle('is-locked', menuOpen);
    toggle.setAttribute('aria-expanded', String(menuOpen));
    toggle.setAttribute('aria-label', menuOpen ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('.nav__links a').forEach((a) =>
    a.addEventListener('click', () => {
      menuOpen = false;
      nav.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

addEventListener('scroll', () => { target = scrollY; }, { passive: true });
addEventListener('resize', () => { maxScroll = measure(); }, { passive: true });
addEventListener('load', () => { maxScroll = measure(); });
maxScroll = measure();
requestAnimationFrame(frame);

/* ---------- hero video: poster-first on touch, load in view ---------- */
const heroVideo = document.querySelector('.hero__video');
if (heroVideo) {
  const src = heroVideo.getAttribute('src');
  const heavy = matchMedia('(pointer: coarse)').matches || navigator.connection?.saveData;
  if (heavy) {
    heroVideo.removeAttribute('src');
    heroVideo.removeAttribute('autoplay');
    heroVideo.removeAttribute('loop');
    heroVideo.setAttribute('poster', './assets/img/detail-1.jpg');
  } else {
    heroVideo.removeAttribute('src');
    const play = () => {
      if (heroVideo.getAttribute('src')) return;
      heroVideo.setAttribute('src', src);
      const played = heroVideo.play();
      if (played && typeof played.catch === 'function') played.catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      const vio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { play(); vio.disconnect(); } }), { rootMargin: '20% 0px' });
      vio.observe(heroVideo);
    } else {
      play();
    }
  }
}

/* ---------- walkthrough film ---------- */
const film = document.querySelector('#film');
if (film) {
  const pin = film.querySelector('.film__pin');
  const sizer = film.querySelector('.film__sizer');
  let top = 0;
  let span = 1;

  const measure = () => {
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
    if (!window.__filmScroll) return;
    window.__filmScroll(clamp((scrollY + innerHeight / 2 - top) / span, 0, 1));
  };

  if (reduce) {
    film.classList.add('is-reduced');
    import('./film.js').then((m) => m.initFilm({ reduce: true })).catch(() => {});
  } else {
    const setup = () => { measure(); push(); };
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      import('./film.js')
        .then((m) => m.initFilm({ reduce: false }))
        .then(push)
        .catch(() => {
          film.classList.add('is-fallback');
          const c = film.querySelector('.film__canvas');
          if (c) c.remove();
          const fb = film.querySelector('.film__fallback');
          if (fb) fb.hidden = false;
          push();
        });
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (es) => es.forEach((e) => {
          if (!e.isIntersecting) return;
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
    filmScrollCb = push;
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
  }
}

/* ---------- magnetic ---------- */
if (fine && !reduce) {
  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      el.style.transition = 'transform .18s cubic-bezier(.22,1,.36,1)';
      el.style.transform = `translate(${mx * 0.28}px, ${my * 0.34}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
      el.style.transform = 'translate(0, 0)';
    });
  });

  const cursor = document.querySelector('.cursor');
  if (cursor) {
    let cx = 0, cy = 0, dx = 0, dy = 0, s = 1, cs = 1;
    addEventListener('pointermove', (e) => {
      dx = e.clientX;
      dy = e.clientY;
      cursor.classList.add('is-on');
    });
    const follow = () => {
      cx = lerp(cx, dx, 0.2);
      cy = lerp(cy, dy, 0.2);
      s = lerp(s, cursor.dataset.big === '1' ? 2.1 : 1, 0.16);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${s.toFixed(3)})`;
      requestAnimationFrame(follow);
    };
    follow();
    document.querySelectorAll('a, button, [data-tilt]').forEach((el) => {
      el.addEventListener('pointerenter', () => { cursor.dataset.big = '1'; });
      el.addEventListener('pointerleave', () => { cursor.dataset.big = '0'; });
    });
  }
}

/* ---------- tilt ---------- */
if (fine && !reduce) {
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const img = el.querySelector('img');
    if (!img) return;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) scale(1)';
    });
  });
}

/* ---------- collections rail ---------- */
const stage = document.querySelector('[data-work-stage]');
if (stage && 'IntersectionObserver' in window) {
  stage.closest('.work').classList.add('is-rail');
  const track = stage.querySelector('.work__track');
  const pieces = [...track.querySelectorAll('.piece')];
  const current = document.querySelector('.work__current');

  const gap = () => parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
  const go = (dir) => stage.scrollBy({ left: dir * (pieces[0].getBoundingClientRect().width + gap()), behavior: reduce ? 'auto' : 'smooth' });
  document.querySelector('[data-work-next]').addEventListener('click', () => go(1));
  document.querySelector('[data-work-prev]').addEventListener('click', () => go(-1));

  const revealIO = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    }),
    { root: stage, threshold: 0.12 }
  );
  pieces.forEach((p) => revealIO.observe(p));

  const indexIO = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting || !current) return;
      const i = pieces.indexOf(entry.target);
      if (i > -1) current.textContent = String(i + 1).padStart(2, '0');
    }),
    { root: stage, rootMargin: '-45% 0px -45% 0px' }
  );
  pieces.forEach((p) => indexIO.observe(p));

  let down = false;
  let startX = 0;
  let startScroll = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    down = true;
    startX = e.clientX;
    startScroll = stage.scrollLeft;
    stage.classList.add('is-grabbing');
  });
  addEventListener('pointerup', () => {
    down = false;
    stage.classList.remove('is-grabbing');
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    stage.scrollLeft = startScroll - (e.clientX - startX) * 1.2;
  });
}

/* ---------- smooth anchors ---------- */
document.querySelectorAll('[data-scroll]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + scrollY - (el.closest('.footer') ? 0 : 70);
    scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  });
});

/* ---------- year ---------- */
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
