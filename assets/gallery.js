/* gallery: category filter + lightbox (shares revamp.js scroll/reveal engine) */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const grid = document.querySelector('[data-gallery-grid]');
const shots = grid ? [...grid.querySelectorAll('.shot')] : [];
const countEl = document.querySelector('[data-gallery-count]');
const emptyEl = document.querySelector('[data-gallery-empty]');
const filters = document.querySelector('[data-gallery-filters]');

const setWide = () => {
  shots.forEach((el) => el.classList.remove('shot--wide'));
  const visible = shots.filter((el) => !el.classList.contains('is-hidden'));
  visible.forEach((el, i) => {
    if (el.dataset.cat.split(' ').length > 1) return;
    if (i % 5 === 0) el.classList.add('shot--wide');
  });
};

const applyFilter = (cat) => {
  shots.forEach((el) => {
    const on = cat === 'all' || el.dataset.cat.split(' ').includes(cat);
    el.classList.toggle('is-hidden', !on);
  });
  const shown = shots.filter((el) => !el.classList.contains('is-hidden'));
  if (countEl) countEl.textContent = shown.length;
  if (emptyEl) emptyEl.hidden = shown.length > 0;
  setWide();
  shots.forEach((el) => el.classList.add('is-in'));
};

if (filters) {
  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    filters.querySelectorAll('[data-filter]').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    applyFilter(btn.dataset.filter);
  });
}

/* stagger-in the grid as it scrolls into view */
if (grid && 'IntersectionObserver' in window && !reduce) {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const i = shots.indexOf(entry.target);
      entry.target.style.transitionDelay = `${(i % 4) * 90}ms`;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 }
  );
  shots.forEach((s) => io.observe(s));
} else {
  shots.forEach((s) => s.classList.add('is-in'));
}
setWide();
if (countEl) countEl.textContent = shots.length;

/* ---------- lightbox ---------- */
const box = document.createElement('div');
box.className = 'lightbox';
box.setAttribute('role', 'dialog');
box.setAttribute('aria-modal', 'true');
box.setAttribute('aria-label', 'Photo viewer');
box.innerHTML = `
  <div class="lightbox__top">
    <span class="lightbox__count"><b data-lb-index>1</b> / <span data-lb-total>${shots.length}</span></span>
    <button class="round" data-lb-close aria-label="Close photo viewer">✕</button>
  </div>
  <div class="lightbox__stage"><img alt="" data-lb-img /></div>
  <div class="lightbox__foot">
    <div class="lightbox__meta">
      <span class="lightbox__tag" data-lb-tag></span>
      <span class="lightbox__caption" data-lb-caption></span>
    </div>
    <div class="lightbox__nav">
      <button class="round" data-lb-prev aria-label="Previous photo">←</button>
      <button class="round" data-lb-next aria-label="Next photo">→</button>
    </div>
  </div>`;
document.body.appendChild(box);

const img = box.querySelector('[data-lb-img]');
const idxEl = box.querySelector('[data-lb-index]');
const capEl = box.querySelector('[data-lb-caption]');
const tagEl = box.querySelector('[data-lb-tag]');
let pos = 0;
let opener = null;

const visible = () => shots.filter((el) => !el.classList.contains('is-hidden'));

const render = () => {
  const list = visible();
  const shot = list[pos];
  if (!shot) return;
  const src = shot.querySelector('img');
  img.src = src.getAttribute('src');
  img.alt = src.getAttribute('alt');
  img.style.visibility = 'hidden';
  img.onload = () => { img.style.visibility = 'visible'; };
  capEl.textContent = shot.querySelector('.shot__name').textContent;
  tagEl.textContent = shot.querySelector('.shot__cat').textContent;
  idxEl.textContent = pos + 1;
};

const open = (i) => {
  const list = visible();
  pos = (i + list.length) % list.length;
  opener = document.activeElement;
  render();
  box.classList.add('is-open');
  document.body.classList.add('is-locked');
  box.querySelector('[data-lb-close]').focus();
};

const close = () => {
  box.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  if (opener && opener.focus) opener.focus();
};

const step = (d) => { pos = (pos + d + visible().length) % visible().length; render(); };

shots.forEach((el) => {
  el.addEventListener('click', () => open(visible().indexOf(el)));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(visible().indexOf(el)); }
  });
});

box.addEventListener('click', (e) => {
  if (e.target === box || e.target === box.querySelector('.lightbox__stage')) close();
});
box.querySelector('[data-lb-close]').addEventListener('click', close);
box.querySelector('[data-lb-prev]').addEventListener('click', () => step(-1));
box.querySelector('[data-lb-next]').addEventListener('click', () => step(1));

addEventListener('keydown', (e) => {
  if (!box.classList.contains('is-open')) return;
  if (e.key === 'Escape') close();
  else if (e.key === 'ArrowRight') step(1);
  else if (e.key === 'ArrowLeft') step(-1);
});

/* swipe between photos on touch */
let sx = 0;
box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
});
