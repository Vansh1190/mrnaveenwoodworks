const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (a, b, t) => a + (b - a) * t;

export const __test = { three: null };

const BEATS = [
  { from: 0, to: 0.24 },
  { from: 0.24, to: 0.42 },
  { from: 0.42, to: 0.65 },
  { from: 0.65, to: 1 },
];

/* Eye-height dolly down the plan: approach -> lobby -> kitchen -> bedroom. */
const CAM_PTS = [
  [0, 1.58, -15.5], [0, 1.54, -9], [0, 1.56, -3.5], [0, 1.55, 1.2],
  [-0.45, 1.5, 4.2], [0.5, 1.5, 8.2], [0.9, 1.48, 10.4], [0.95, 1.46, 13.2],
  [1.0, 1.44, 15.0], [0.95, 1.42, 16.1], [0.9, 1.38, 17.6], [0.8, 1.34, 18.6],
];
const TGT_PTS = [
  [0, 1.62, -4], [0, 1.58, 0.5], [0, 1.55, 4], [0.3, 1.5, 7],
  [1.6, 1.32, 9.4], [1.5, 1.3, 11.4], [0.9, 1.4, 13.6], [-0.2, 1.42, 15.6],
  [-1.3, 1.44, 17.4], [-1.7, 1.42, 18.6], [-1.85, 1.4, 19.6], [-1.95, 1.38, 20.2],
];

const WOOD = [
  { base: '#8a5a33', streak: '#6b4a2f' },
  { base: '#5b3a24', streak: '#3f2817' },
  { base: '#9a6a3e', streak: '#7c5230' },
];

function woodCanvas(ctx, size, base, streak) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 150; i++) {
    const y = Math.random() * size;
    ctx.globalAlpha = 0.03 + Math.random() * 0.09;
    ctx.strokeStyle = i % 5 === 0 ? streak : 'rgba(0,0,0,.45)';
    ctx.lineWidth = 0.4 + Math.random() * 1.9;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let px = 0; px <= size; px += size / 6) ctx.lineTo(px, y + Math.sin(px * 0.045 + i) * (2 + (i % 4)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function speckleCanvas(ctx, size, base, amount) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  ctx.putImageData(img, 0, 0);
  for (let i = 0; i < 24; i++) {
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 6 + Math.random() * 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export async function initFilm({ reduce, THREE } = {}) {
  const section = document.querySelector('#film');
  if (!section) return () => {};
  const canvas = section.querySelector('.film__canvas');
  const fallback = section.querySelector('.film__fallback');
  const beats = [...section.querySelectorAll('.film__beat')];
  const dots = [...section.querySelectorAll('.film__dots li')];
  const railFill = section.querySelector('.film__railfill');
  const hint = section.querySelector('.film__hint');

  window.__filmScroll = (v) => { target = clamp(v, 0, 1); };

  const syncUI = (e) => {
    let b = 0;
    BEATS.forEach((bb, k) => { if (e >= bb.from) b = k; });
    beats.forEach((el, k) => el.classList.toggle('is-on', k === b));
    dots.forEach((el, k) => el.classList.toggle('is-on', k === b));
    if (railFill) railFill.style.transform = `scaleX(${e})`;
    if (hint) hint.style.opacity = b === 0 && e < 0.05 ? '1' : '0';
    const fbImgs = fallback ? [...fallback.querySelectorAll('img')] : [];
    fbImgs.forEach((im, k) => im.classList.toggle('is-on', k === b));
    return b;
  };

  const fallbackMode = () => {
    section.classList.add('is-fallback');
    if (canvas) canvas.remove();
    if (fallback) fallback.hidden = false;
    syncUI(0);
    window.__filmScroll = syncUI;
    return () => { window.__filmScroll = null; };
  };

  if (reduce) return fallbackMode();

  if (!THREE) {
    try {
      THREE = __test.three || (await import('./vendor/three.module.min.js'));
    } catch (err) {
      return fallbackMode();
    }
  }

  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
  const lowTier = coarse;

  const probe = document.createElement('canvas');
  const hasGL = !!(probe.getContext('webgl2') || probe.getContext('webgl'));
  probe.width = probe.height = 0;
  if (!hasGL) return fallbackMode();

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    return fallbackMode();
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowTier ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = lowTier ? 1.18 : 1.05;

  const texSize = lowTier ? 256 : 512;
  const makeCanvas = (fn, size = texSize) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    if (x) fn(x, size);
    return c;
  };
  const tex = (canvas, rx = 1, ry = 1) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(rx, ry);
    return t;
  };
  const woodTex = (i) => tex(makeCanvas((x, s) => woodCanvas(x, s, WOOD[i].base, WOOD[i].streak)));
  const wallTex = tex(makeCanvas((x, s) => speckleCanvas(x, s, '#e6ddcd', 0.06), lowTier ? 128 : 256), 2, 1);
  const stoneTex = tex(makeCanvas((x, s) => speckleCanvas(x, s, '#cfc9c0', 0.16)));
  const darkStoneTex = tex(makeCanvas((x, s) => speckleCanvas(x, s, '#2e2b27', 0.1)));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#08100c');
  scene.fog = new THREE.Fog('#0a120e', 6, 26);

  const camera = new THREE.PerspectiveCamera(55, 16 / 10, 0.1, 60);
  const curve = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.35);
  const posCurve = curve(CAM_PTS);
  const tgtCurve = curve(TGT_PTS);

  const mats = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); mats.push(m); return m; };
  const basic = (o) => { const m = new THREE.MeshBasicMaterial(o); mats.push(m); return m; };
  const floorMap = woodTex(2);
  floorMap.repeat.set(3, 7);
  const M = {
    floor: std({ map: floorMap, roughness: 0.55 }),
    wall: std({ map: wallTex, roughness: 0.95, color: 0xffffff }),
    wallDark: std({ map: wallTex, color: 0x24352c, roughness: 0.9 }),
    oak: std({ map: woodTex(0), roughness: 0.62 }),
    walnut: std({ map: woodTex(1), roughness: 0.6 }),
    stone: std({ map: stoneTex, roughness: 0.3, metalness: 0.05 }),
    dark: std({ map: darkStoneTex, roughness: 0.3 }),
    linen: std({ color: 0xd8cdb9, roughness: 1 }),
    brass: std({ color: 0xcfc38f, roughness: 0.35, metalness: 0.7 }),
    glow: basic({ color: 0xffd9a3 }),
    day: basic({ color: 0xcfe0ff }),
  };

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const addMesh = (m, sx, sy, sz, x, y, z, ry = 0) => {
    const o = new THREE.Mesh(geo, m);
    o.scale.set(sx, sy, sz);
    o.position.set(x, y, z);
    o.rotation.y = ry;
    scene.add(o);
    return o;
  };

  const HW = 2.6;
  const CEIL = 3.15;
  const textures = [floorMap, wallTex, stoneTex, darkStoneTex];

  const wall = (w, h, d, x, y, z, ry = 0, mat = M.wall) => addMesh(mat, w, h, d, x, y, z, ry);
  const sideWalls = (z0, z1, mat) => {
    const len = z1 - z0, mid = (z0 + z1) / 2;
    wall(0.12, CEIL, len, -HW - 0.06, CEIL / 2, mid, 0, mat);
    wall(0.12, CEIL, len, HW + 0.06, CEIL / 2, mid, 0, mat);
  };
  const ceiling = (z0, z1) => addMesh(M.wallDark, HW * 2 + 0.3, 0.1, z1 - z0, 0, CEIL + 0.05, (z0 + z1) / 2);
  const cove = (z) => addMesh(M.glow, HW * 1.4, 0.02, 0.05, 0, CEIL - 0.03, z);
  const floor = (z0, z1) => {
    const f = addMesh(M.floor, HW * 2, 0.1, z1 - z0, 0, -0.05, (z0 + z1) / 2);
    f.receiveShadow = true;
    return f;
  };
  const doorway = (z, gap = 2.1) => {
    const side = (HW * 2 + 0.3 - gap) / 2;
    wall(side, CEIL, 0.14, -(gap + side) / 2, CEIL / 2, z);
    wall(side, CEIL, 0.14, (gap + side) / 2, CEIL / 2, z);
    wall(gap, CEIL - 2.35, 0.14, 0, CEIL - (CEIL - 2.35) / 2, z);
  };
  const panelRun = (x, z0, z1, count, mat = M.walnut) => {
    const step = (z1 - z0) / count;
    for (let i = 0; i < count; i++) {
      const m = addMesh(mat, 0.07, CEIL * 0.82, step - 0.14, x, CEIL * 0.41, z0 + step * (i + 0.5));
      m.castShadow = false;
    }
  };
  const framed = (url, w, h, x, y, z, ry) => {
    const frame = addMesh(M.dark, w, h, 0.06, x, y, z, ry);
    const holder = new THREE.Mesh(plane, basic({ color: 0x555049 }));
    holder.scale.set(w - 0.12, h - 0.12, 1);
    holder.position.set(x, y, z);
    holder.rotation.y = ry;
    holder.translateZ(0.035);
    scene.add(holder);
    const loader = new THREE.TextureLoader();
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      holder.material.map = t;
      holder.material.color.set(0xffffff);
      holder.material.needsUpdate = true;
      textures.push(t);
    });
    return [frame, holder];
  };
  const lamp = (x, y, z, r = 0.09) => addMesh(M.glow, r, r, r, x, y, z);

  /* ---- approach ---- */
  floor(-16, -0.2);
  addMesh(M.stone, HW * 2 + 4, 0.12, 13, 0, -0.02, -8);
  sideWalls(-11, -0.2, M.wallDark);
  ceiling(-11, -0.2);
  const fw = (HW * 2 + 3 - 1.5) / 2 + 0.75;
  wall(fw, CEIL + 1.4, 0.3, -fw, (CEIL + 1.4) / 2, -0.35, 0, M.wallDark);
  wall(fw, CEIL + 1.4, 0.3, fw, (CEIL + 1.4) / 2, -0.35, 0, M.wallDark);
  wall(1.5, 0.85, 0.3, 0, CEIL + 0.55, -0.35, 0, M.wallDark);
  addMesh(M.day, 1.45, 2.3, 0.02, 0, 1.16, -0.18);
  addMesh(M.glow, HW * 1.6, 0.03, 0.05, 0, CEIL + 0.1, -1.4);
  wall(0.12, CEIL, 4, -HW - 0.06, CEIL / 2, -13.8, 0, M.wallDark);
  wall(0.12, CEIL, 4, HW + 0.06, CEIL / 2, -13.8, 0, M.wallDark);
  addMesh(M.wallDark, HW * 2 + 0.3, CEIL, 0.12, 0, CEIL / 2, -15.9);

  /* ---- lobby ---- */
  const lob0 = 0, lob1 = 6.2;
  floor(lob0, lob1);
  sideWalls(lob0, lob1, M.wall);
  ceiling(lob0, lob1);
  cove(lob0 + 0.4); cove(lob1 - 0.4);
  doorway(lob1);
  panelRun(-HW + 0.12, 0.7, 5.5, 6);
  framed('./img/living-2.jpg', 1.75, 1.2, -HW + 0.2, 1.62, 3.1, Math.PI / 2);
  addMesh(M.walnut, 1.15, 0.55, 0.45, -1.55, 0.28, 1.6);
  addMesh(M.brass, 0.05, 0.72, 0.05, 1.85, 0.36, 1.0);
  addMesh(M.stone, 0.36, 0.04, 0.36, 1.85, 0.73, 1.0);
  addMesh(M.walnut, 1.0, 2.3, 0.1, HW - 0.1, 1.15, 2.2, 0);
  addMesh(M.linen, 1.3, 0.02, 3.2, 0.1, 0.015, 3.2);

  /* ---- kitchen ---- */
  const kit0 = 6.2, kit1 = 13;
  floor(kit0, kit1);
  sideWalls(kit0, kit1, M.wall);
  ceiling(kit0, kit1);
  cove(kit0 + 0.4); cove(kit1 - 0.4);
  doorway(kit1);
  addMesh(M.walnut, 0.66, 0.88, 4.3, HW - 0.45, 0.44, 8.3);
  addMesh(M.stone, 0.74, 0.05, 4.4, HW - 0.45, 0.9, 8.3);
  addMesh(M.dark, 0.62, 0.04, 1.1, HW - 0.45, 0.94, 7.3);
  addMesh(M.brass, 0.04, 0.32, 0.04, HW - 0.52, 1.16, 7.3);
  addMesh(M.walnut, 0.64, 1.0, 3.1, HW - 0.42, 2.05, 8.5);
  addMesh(M.dark, 1.0, 2.15, 0.72, HW - 0.65, 1.08, 11.2);
  addMesh(M.walnut, 1.62, 0.9, 0.86, 0.9, 0.45, 11.9);
  addMesh(M.stone, 1.76, 0.06, 0.98, 0.9, 0.95, 11.9);
  [-0.35, 0.65].forEach((px) => {
    addMesh(M.brass, 0.015, 0.82, 0.015, px, 2.7, 11.9);
    lamp(px, 2.28, 11.9, 0.08);
  });
  framed('./img/kitchen-1.jpg', 1.85, 1.1, -HW + 0.2, 1.66, 9.6, Math.PI / 2);
  /* ---- bedroom ---- */
  const bed0 = 13, bed1 = 21;
  floor(bed0, bed1);
  sideWalls(bed0, bed1, M.wall);
  ceiling(bed0, bed1);
  cove(bed0 + 0.4); cove(bed1 - 0.3);
  wall(HW * 2 + 0.3, CEIL, 0.14, 0, CEIL / 2, bed1);
  panelRun(HW - 0.12, 13.4, 16.4, 4);
  const bedX = 0.75;
  addMesh(M.walnut, 2.15, 0.3, 2.3, bedX, 0.2, 18.5);
  addMesh(M.linen, 1.95, 0.22, 2.05, bedX, 0.46, 18.6);
  addMesh(M.linen, 0.72, 0.14, 0.5, bedX - 0.5, 0.63, 17.7);
  addMesh(M.linen, 0.72, 0.14, 0.5, bedX + 0.5, 0.63, 17.7);
  addMesh(M.walnut, 2.6, 1.7, 0.09, bedX, 0.85, 19.83);
  framed('./img/bedroom-1.jpg', 1.9, 1.0, bedX, 2.12, 19.72, 0);
  addMesh(M.oak, 0.46, 0.5, 0.4, bedX - 1.55, 0.25, 19.55);
  addMesh(M.oak, 0.46, 0.5, 0.4, bedX + 1.55, 0.25, 19.55);
  lamp(bedX - 1.55, 0.62, 19.55, 0.07); lamp(bedX + 1.55, 0.62, 19.55, 0.07);
  addMesh(M.walnut, 0.5, 0.5, 0.4, -1.55, 0.25, 20.1);
  lamp(-1.55, 0.66, 20.1, 0.07);
  framed('./img/detail-2.jpg', 1.15, 1.5, -HW + 0.2, 1.72, 18.2, Math.PI / 2);
  addMesh(M.walnut, 0.06, CEIL * 0.7, 2.4, -HW + 0.1, CEIL * 0.35, 15.4);
  addMesh(M.walnut, 1.4, 0.04, 0.26, -HW + 0.8, 1.28, 15.4);
  addMesh(M.walnut, 1.4, 0.04, 0.26, -HW + 0.8, 1.82, 15.4);
  addMesh(M.stone, 0.5, 0.42, 0.5, HW - 0.45, 0.21, 14.2);
  addMesh(M.day, 0.03, 1.5, 1.9, HW - 0.05, 1.75, 17.2);

  scene.add(new THREE.HemisphereLight(0xbfd0c6, 0x3a3520, 0.62));
  const point = (color, i, x, y, z, dist) => {
    const l = new THREE.PointLight(color, i, dist, 2);
    l.position.set(x, y, z);
    scene.add(l);
    return l;
  };
  point(0xffb974, lowTier ? 30 : 38, 0, 2.75, 3.0, 10);
  point(0xffcf9a, 32, 0.25, 2.2, 11.6, 9);
  point(0xffb060, 18, HW - 0.7, 1.95, 8.4, 7);
  point(0xffd0a0, 22, 0.4, CEIL - 0.35, 15.6, 9);
  point(0xffc98c, 8, 0.75, 0.85, 19.5, 4.2);
  point(0xffc98c, 6, -1.55, 0.8, 20.0, 3.4);
  if (!lowTier) {
    const sun = new THREE.DirectionalLight(0xcfe0ff, 2.1);
    sun.position.set(9, 3.4, 16.6);
    sun.target.position.set(-1.4, 0.9, 18.4);
    scene.add(sun, sun.target);
  }

  let target = 0;
  let shown = 0;
  let beat = -1;
  let visible = true;
  let raf = 0;
  let t = 0;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.86 ? 68 : 55;
    camera.updateProjectionMatrix();
  };

  const p = new THREE.Vector3();
  const q = new THREE.Vector3();

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    t += 0.016;
    shown = lerp(shown, target, 0.075);
    const e = clamp(shown, 0, 1);
    posCurve.getPoint(e, p);
    tgtCurve.getPoint(e, q);
    p.x += Math.sin(t * 0.6) * 0.014;
    p.y += Math.sin(t * 0.8 + 1.7) * 0.011;
    camera.position.copy(p);
    camera.lookAt(q);
    camera.rotation.z += Math.sin(t * 0.42) * 0.0022;
    syncUI(e);
    renderer.render(scene, camera);
  };

  resize();
  addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);
  syncUI(0);

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => es.forEach((en) => { visible = en.isIntersecting && !document.hidden; }), { threshold: 0 });
    io.observe(section);
  }
  const onVis = () => { if (document.hidden) visible = false; };
  document.addEventListener('visibilitychange', onVis);

  window.__filmScroll = (v) => { target = clamp(v, 0, 1); };

  return () => {
    cancelAnimationFrame(raf);
    if (io) io.disconnect();
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVis);
    textures.forEach((x) => x.dispose && x.dispose());
    mats.forEach((m) => m.dispose());
    geo.dispose();
    plane.dispose();
    renderer.dispose();
    window.__filmScroll = null;
  };
}
