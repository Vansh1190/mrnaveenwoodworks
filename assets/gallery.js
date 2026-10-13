/* Hallmark · designed-as-app · design-system: design.md
   Gallery plate grid: category filter + lightbox. No scroll reveals — plates are just there. */

const grid = document.querySelector('[data-gallery-grid]');
const plates = grid ? [...grid.querySelectorAll('.plate-item')] : [];
const countEl = document.querySelector('[data-gallery-count]');
const emptyEl = document.querySelector('[data-gallery-empty]');
const filters = document.querySelector('[data-gallery-filters]');

const catLabel = (cat) => {
  const btn = filters && filters.querySelector(`[data-filter="${cat}"]`);
  return btn ? btn.textContent.trim() : cat;
};

/* plate numbers reflect current visible order */
const renumber = () => {
  plates.filter((el) => !el.classList.contains('is-hidden'))
    .forEach((el, i) => {
      const no = el.querySelector('.plate-item__no');
      if (no) no.textContent = `Plate ${String(i + 1).padStart(2, '0')}`;
    });
};

const setWide = () => {
  plates.forEach((el) => el.classList.remove('plate-item--wide'));
  const visible = plates.filter((el) => !el.classList.contains('is-hidden'));
  visible.forEach((el, i) => {
    if (el.dataset.cat.split(' ').length > 1) return;
    if (i % 5 === 0) el.classList.add('plate-item--wide');
  });
};

const applyFilter = (cat) => {
  plates.forEach((el) => {
    const on = cat === 'all' || el.dataset.cat.split(' ').includes(cat);
    el.classList.toggle('is-hidden', !on);
  });
  const shown = plates.filter((el) => !el.classList.contains('is-hidden'));
  if (countEl) countEl.textContent = shown.length;
  if (emptyEl) emptyEl.hidden = shown.length > 0;
  setWide();
  renumber();
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

  /* deep link: gallery.html#kitchen etc. */
  const fromHash = plates.length && filters.querySelector(`[data-filter="${location.hash.slice(1)}"]`);
  if (fromHash) {
    filters.querySelectorAll('[data-filter]').forEach((b) => {
      const on = b === fromHash;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    applyFilter(fromHash.dataset.filter);
  } else {
    applyFilter('all');
  }
}

/* ---------- lightbox ---------- */
const box = document.createElement('div');
box.className = 'lightbox';
box.setAttribute('role', 'dialog');
box.setAttribute('aria-modal', 'true');
box.setAttribute('aria-label', 'Photo viewer');
box.innerHTML = `
  <div class="lightbox__top">
    <span class="lightbox__count"><b data-lb-index>1</b> / <span data-lb-total>${plates.length}</span></span>
    <button class="sqbtn" data-lb-close aria-label="Close photo viewer">✕</button>
  </div>
  <div class="lightbox__stage"><img alt="" data-lb-img /></div>
  <div class="lightbox__foot">
    <div class="lightbox__meta">
      <span class="lightbox__tag" data-lb-tag></span>
      <span class="lightbox__caption" data-lb-caption></span>
    </div>
    <div class="lightbox__nav">
      <button class="sqbtn" data-lb-prev aria-label="Previous photo">←</button>
      <button class="sqbtn" data-lb-next aria-label="Next photo">→</button>
    </div>
  </div>`;
document.body.appendChild(box);

const img = box.querySelector('[data-lb-img]');
const idxEl = box.querySelector('[data-lb-index]');
const totalEl = box.querySelector('[data-lb-total]');
const capEl = box.querySelector('[data-lb-caption]');
const tagEl = box.querySelector('[data-lb-tag]');
let pos = 0;
let opener = null;

const visible = () => plates.filter((el) => !el.classList.contains('is-hidden'));

const render = () => {
  const list = visible();
  const plate = list[pos];
  if (!plate) return;
  const src = plate.querySelector('img');
  img.src = src.getAttribute('src');
  img.alt = src.getAttribute('alt');
  img.style.visibility = 'hidden';
  img.onload = () => { img.style.visibility = 'visible'; };
  capEl.textContent = plate.dataset.name || '';
  tagEl.textContent = plate.dataset.cat.split(' ').map(catLabel).join(' · ');
  idxEl.textContent = pos + 1;
  totalEl.textContent = list.length;
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

plates.forEach((el) => {
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

/* swipe between plates on touch */
let sx = 0;
box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - sx;
  if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
});
