/* How we build — scroll-driven object choreography (five stations, one slow dolly).
   Hallmark · designed-as-app · design-system: design.md
   plan draws → saw cuts → panels rise → drawers and doors fit → lights come on.
   Every move is progress-driven (no free-running loops); reduced motion and
   no-WebGL get the same photo fallback as the walkthrough. */

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (a, b, t) => a + (b - a) * t;
const DoubleSide = 2;

export const __test = { three: null };

export const BUILD_BEATS = [{ from: 0 }, { from: 0.2 }, { from: 0.4 }, { from: 0.62 }, { from: 0.84 }];

const WOODS = [
  { base: '#8a5a33', streak: '#6b4a2f' },
  { base: '#5b3a24', streak: '#3f2817' },
  { base: '#9a6a3e', streak: '#7c5230' },
];

const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ease = (p) => 1 - Math.pow(1 - p, 3);
const smooth = (p) => p * p * (3 - 2 * p);
const prand = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

export async function initBuild({ reduce, THREE } = {}) {
  const section = document.querySelector('#build');
  if (!section) return () => {};
  const canvas = section.querySelector('.film__canvas');
  const fallback = section.querySelector('.film__fallback');
  const beats = [...section.querySelectorAll('.film__beat')];
  const railFill = section.querySelector('.film__railfill');
  const hint = section.querySelector('.film__hint');
  const fbImgs = fallback ? [...fallback.querySelectorAll('img')] : [];

  let target = 0;
  let shown = 0;

  let beat = -1;
  const syncUI = (e) => {
    let b = 0;
    BUILD_BEATS.forEach((bb, k) => { if (e >= bb.from) b = k; });
    if (b !== beat) {
      beat = b;
      beats.forEach((el, k) => el.classList.toggle('is-on', k === b));
    }
    if (railFill) railFill.style.transform = `scaleX(${e.toFixed(4)})`;
    if (hint) hint.style.opacity = e < 0.04 ? '1' : '0';
    if (fbImgs.length) {
      const fb = Math.min(b, fbImgs.length - 1);
      fbImgs.forEach((im, k) => im.classList.toggle('is-on', k === fb));
    }
    return b;
  };

  const fallbackMode = () => {
    section.classList.add('is-reduced');
    if (canvas) canvas.remove();
    if (fallback) fallback.hidden = false;
    syncUI(0);
    window.__buildScroll = syncUI;
    return () => { window.__buildScroll = null; };
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
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = coarse ? 1.16 : 1.04;

  const texSize = coarse ? 256 : 512;
  const makeCanvas = (fn, size = texSize) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    if (x) fn(x, size);
    return c;
  };
  const woodCanvas = (ctx, size, base, streak) => {
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
  };
  const tex = (c, rx = 1, ry = 1) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(rx, ry);
    return t;
  };
  const woodTex = (i) => tex(makeCanvas((x, s) => woodCanvas(x, s, WOODS[i].base, WOODS[i].streak)));

  const bladeTex = (() => {
    const c = makeCanvas((x, s) => {
      x.clearRect(0, 0, s, s);
      const r = s * 0.46;
      x.translate(s / 2, s / 2);
      x.fillStyle = '#b9bdc2';
      x.beginPath();
      x.arc(0, 0, r, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = '#0d1613';
      x.beginPath();
      x.arc(0, 0, r * 0.16, 0, Math.PI * 2);
      x.fill();
      x.strokeStyle = 'rgba(40,44,50,.85)';
      x.lineWidth = s * 0.012;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        x.beginPath();
        x.moveTo(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82);
        x.lineTo(Math.cos(a + 0.16) * r * 0.985, Math.sin(a + 0.16) * r * 0.985);
        x.stroke();
      }
      x.strokeStyle = 'rgba(255,255,255,.35)';
      x.lineWidth = s * 0.008;
      x.beginPath();
      x.arc(0, 0, r * 0.62, 0, Math.PI * 2);
      x.stroke();
    }, coarse ? 192 : 384);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1310');
  scene.fog = new THREE.Fog('#0a1310', 7, 24);

  const camera = new THREE.PerspectiveCamera(52, 16 / 10, 0.1, 60);
  const curve = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
  const posCurve = curve([
    [-1.1, 1.45, -4.6], [-0.6, 1.48, -2.9], [0.15, 1.52, -0.8], [0.55, 1.5, 1.4],
    [0.35, 1.5, 3.4], [0.1, 1.48, 5.4], [0.9, 1.5, 6.9], [1.9, 1.52, 8.6], [1.7, 1.55, 10.4],
  ]);
  const tgtCurve = curve([
    [0, 1.6, -2.6], [0, 1.45, -0.6], [0.2, 1.2, 1.0], [0.2, 1.25, 4.0],
    [0, 1.35, 6.0], [-0.4, 1.5, 7.6], [0.2, 1.45, 8.6], [0.2, 1.5, 9.6], [0, 1.45, 8.2],
  ]);

  const mats = [];
  const std = (o) => { const m = new THREE.MeshStandardMaterial(o); mats.push(m); return m; };
  const basic = (o) => { const m = new THREE.MeshBasicMaterial(o); mats.push(m); return m; };
  const floorMap = woodTex(2);
  floorMap.repeat.set(2.6, 5);
  const M = {
    floor: std({ map: floorMap, roughness: 0.55 }),
    wall: std({ color: 0x1c2b24, roughness: 0.95 }),
    wallWarm: std({ color: 0x2c3427, roughness: 0.92 }),
    oak: std({ map: woodTex(0), roughness: 0.6 }),
    walnut: std({ map: woodTex(1), roughness: 0.58 }),
    amber: std({ map: woodTex(2), roughness: 0.55 }),
    steel: std({ color: 0x9aa4ab, roughness: 0.4, metalness: 0.6 }),
    brass: std({ color: 0xcfc38f, roughness: 0.35, metalness: 0.7 }),
    chalk: basic({ color: 0xcfe3ea }),
    blade: basic({ map: bladeTex, transparent: true, side: DoubleSide }),
    dust: std({ color: 0xb9895a, roughness: 1 }),
    off: basic({ color: 0x171310 }),
    lamp: basic({ color: 0xffd9a3, side: DoubleSide }),
    paper: std({ color: 0xe9e2d2, roughness: 0.9 }),
  };

  const geo = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const box = (m, sx, sy, sz, x, y, z, ry = 0, parent = scene) => {
    const o = new THREE.Mesh(geo, m);
    o.scale.set(sx, sy, sz);
    o.position.set(x, y, z);
    o.rotation.y = ry;
    parent.add(o);
    return o;
  };

  const CEIL = 2.9;
  const textures = [floorMap, bladeTex];

  /* shell — camera starts outside; culled wall backfaces let it look in */
  box(M.floor, 7.4, 0.1, 17, 0, -0.05, 2.4);
  box(M.wallWarm, 0.14, CEIL, 17, -3.7, CEIL / 2, 2.4);
  box(M.wallWarm, 0.14, CEIL, 17, 3.7, CEIL / 2, 2.4);
  box(M.wall, 7.4, 0.12, 17, 0, CEIL, 2.4);

  const rig = [];

  /* ── 1.0 The plan — drawing board, blueprint lines draw on, brass rule stretches ── */
  const boardZ = -2.6;
  box(M.oak, 2.6, 0.07, 1.5, 0, 1.1, boardZ);
  [[-1.1, 0.5], [1.1, 0.5], [-1.1, -0.5], [1.1, -0.5]].forEach(([tx, tz]) =>
    box(M.steel, 0.07, 1.06, 0.07, tx, 0.53, boardZ + tz));
  box(M.paper, 2.1, 0.02, 1.2, 0, 1.145, boardZ);
  const plan = [];
  const rndPlan = prand(2002);
  for (let i = 0; i < 12; i++) {
    const len = 0.45 + rndPlan() * 1.15;
    const ln = box(M.chalk, len, 0.02, 0.02,
      -0.62 + rndPlan() * 0.5 + len * 0.3, 1.16, boardZ - 0.5 + i * 0.085);
    ln.userData = { len };
    plan.push(ln);
  }
  const rule = box(M.brass, 0.024, 0.03, 0.02, 0.86, 1.18, boardZ);
  rig.push((t) => {
    plan.forEach((ln, i) => {
      const p = ease(seg(t, 0.015 + i * 0.011, 0.09 + i * 0.011));
      ln.scale.x = Math.max(0.001, ln.userData.len * p);
    });
    rule.scale.z = 0.02 + 1.36 * ease(seg(t, 0.09, 0.19));
  });

  /* ── 2.0 The cut — bench, two planks, blade descends + spins, dust falls, offcut moves ── */
  const cutZ = 0.7;
  box(M.walnut, 2.9, 0.09, 0.9, 0, 0.86, cutZ);
  [[-1.25, 0.3], [1.25, 0.3], [-1.25, -0.3], [1.25, -0.3]].forEach(([tx, tz]) =>
    box(M.steel, 0.08, 0.82, 0.08, tx, 0.41, cutZ + tz));
  box(M.amber, 1.05, 0.075, 0.62, -0.56, 0.945, cutZ);
  const plankB = box(M.amber, 0.85, 0.075, 0.62, 0.6, 0.945, cutZ);
  const blade = new THREE.Mesh(plane, M.blade);
  blade.scale.set(0.62, 0.62, 1);
  blade.position.set(0.04, 1.9, cutZ);
  scene.add(blade);
  const guard = box(M.steel, 0.1, 0.66, 0.14, 0.04, 2.08, cutZ);
  const dust = [];
  const rndDust = prand(24);
  for (let i = 0; i < (coarse ? 12 : 26); i++) {
    const d = box(M.dust, 0.03, 0.03, 0.03, 0, 0.95, cutZ);
    d.userData = { sx: (rndDust() - 0.5) * 0.5, sz: (rndDust() - 0.5) * 0.4, sp: 0.5 + rndDust(), delay: rndDust() * 0.05 };
    dust.push(d);
  }
  rig.push((t) => {
    const drop = ease(seg(t, 0.235, 0.315));
    blade.position.y = 1.9 - 0.94 * drop;
    blade.rotation.z = -t * 46;
    guard.position.y = blade.position.y + 0.28;
    const dt = seg(t, 0.28, 0.44);
    dust.forEach((d) => {
      const dd = clamp((dt - d.userData.delay) * d.userData.sp * 2.1, 0, 1);
      if (dd <= 0 || dd >= 1) { d.visible = false; return; }
      d.visible = true;
      d.position.x = 0.04 + d.userData.sx * dd * 2.2;
      d.position.z = cutZ + d.userData.sz * dd * 2.2;
      d.position.y = 0.95 - 0.95 * dd * dd;
      d.scale.setScalar(0.035 * (1 - dd * 0.6));
    });
    plankB.position.x = 0.6 + ease(seg(t, 0.345, 0.4)) * 0.42;
  });

  /* ── 3.0 Assembly — wall panels rise from the floor one by one, brass trim last ── */
  const panels = [M.oak, M.walnut, M.amber, M.oak].map((m, i) =>
    box(m, 0.09, 0.001, 2.6, -2.4 + i * 0.6, 0.0005, 4.7));
  const trim = box(M.brass, 0.022, 0.001, 2.6, -1.47, 0.0005, 4.7);
  rig.push((t) => {
    panels.forEach((p, i) => {
      const h = 2.42 * ease(seg(t, 0.425 + i * 0.028, 0.53 + i * 0.028));
      p.scale.y = Math.max(0.001, h);
      p.position.y = h / 2;
    });
    const th = 2.42 * ease(seg(t, 0.52, 0.58));
    trim.scale.y = Math.max(0.001, th);
    trim.position.y = th / 2;
  });

  /* ── 4.0 The fit — carcass stands, drawers glide home, doors swing shut ── */
  const fitZ = 7.6;
  /* each part grows up from the floor to its final top edge */
  const parts = [
    [M.walnut, 1.9, 0.12, 0.62, 0.1, 0.06, fitZ],
    [M.oak, 1.94, 0.06, 0.66, 0.1, 0.9, fitZ],
    [M.oak, 0.05, 0.78, 0.62, -0.85, 0.51, fitZ],
    [M.oak, 0.05, 0.78, 0.62, 1.05, 0.51, fitZ],
    [M.walnut, 1.94, 1.16, 0.5, 0.1, 1.55, fitZ + 0.27],
  ].map(([m, sx, sy, sz, x, y, z]) => {
    const c = box(m, sx, 0.001, sz, x, 0.001, z);
    c.userData = { sy, bottom: y - sy / 2 };
    return c;
  });
  const hob = box(M.steel, 0.66, 0.02, 0.4, 0.1, 0.94, fitZ);
  const drawers = [0, 1, 2].map((i) => {
    const x = -0.55 + i * 0.62;
    const d = box(i === 1 ? M.amber : M.oak, 0.58, 0.62, 0.56, x, 0.43, fitZ + 0.8);
    d.userData = { x, zClosed: fitZ + 0.03, zOpen: fitZ + 0.8 };
    return d;
  });
  const doors = [-1, 1].map((side) => {
    const pivot = new THREE.Object3D();
    pivot.position.set(0.1 + side * 0.97, 1.55, fitZ + 0.03);
    scene.add(pivot);
    box(side === -1 ? M.amber : M.oak, 0.94, 1.16, 0.045, -side * 0.475, 0, 0, 0, pivot);
    box(M.brass, 0.035, 0.16, 0.035, -side * 0.88, 0, -0.04, 0, pivot);
    return { pivot, side };
  });
  rig.push((t) => {
    parts.forEach((c, i) => {
      const e = ease(seg(t, 0.6 + i * 0.02, 0.68 + i * 0.02));
      const h = c.userData.sy * e;
      c.visible = e > 0.01;
      c.scale.y = Math.max(0.001, h);
      c.position.y = c.userData.bottom + h / 2;
    });
    hob.visible = ease(seg(t, 0.66, 0.7)) > 0.01;
    drawers.forEach((d, i) => {
      const e = ease(seg(t, 0.655 + i * 0.025, 0.72 + i * 0.025));
      d.visible = e > 0.01;
      d.position.z = lerp(d.userData.zOpen, d.userData.zClosed, e);
    });
    doors.forEach((dr, i) => {
      const e = ease(seg(t, 0.72 + i * 0.02, 0.815));
      dr.pivot.visible = e > 0.01;
      dr.pivot.rotation.y = dr.side * 1.15 * (1 - e);
    });
  });

  /* ── 5.0 Handover — cove strips and pendant come up warm, room glows ── */
  box(M.off, 7.0, 0.05, 0.12, 0, CEIL - 0.16, -2.2);
  box(M.off, 0.12, 0.05, 4.6, -3.6, CEIL - 0.16, 0.2);
  box(M.off, 0.12, 0.05, 4.6, 3.6, CEIL - 0.16, 0.2);
  const lampZ = 9.9;
  box(M.steel, 0.015, 1.0, 0.015, 0.2, CEIL - 0.5, lampZ);
  box(M.brass, 0.4, 0.18, 0.4, 0.2, CEIL - 1.02, lampZ);
  const bulb = new THREE.Mesh(plane, M.off);
  bulb.scale.set(0.3, 0.3, 1);
  bulb.position.set(0.2, CEIL - 1.13, lampZ);
  bulb.rotation.x = -Math.PI / 2;
  scene.add(bulb);
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a2c1e, 0.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xe8f0ff, 1.5);
  key.position.set(2.2, 4.4, -3.6);
  scene.add(key);
  const lampLight = new THREE.PointLight(0xffc987, 0, 7, 2);
  lampLight.position.set(0.2, CEIL - 1.2, lampZ);
  scene.add(lampLight);
  const coveLight = new THREE.PointLight(0xffd9a3, 0, 9, 2);
  coveLight.position.set(0, CEIL - 0.3, 1.5);
  scene.add(coveLight);
  rig.push((t) => {
    const e = smooth(seg(t, 0.845, 0.97));
    M.off.color.setRGB(lerp(0.09, 1, e), lerp(0.075, 0.85, e), lerp(0.063, 0.64, e));
    bulb.material = e > 0.35 ? M.lamp : M.off;
    lampLight.intensity = 2.6 * e;
    coveLight.intensity = 2.2 * e;
    key.intensity = lerp(1.5, 0.85, e);
    hemi.intensity = lerp(0.5, 0.32, e);
  });

  const applyWorld = (e) => rig.forEach((fn) => fn(e));

  let visible = true;
  let raf = 0;
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.86 ? 66 : 52;
    camera.updateProjectionMatrix();
  };

  const tick = () => {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    shown = lerp(shown, target, 0.08);
    const e = clamp(shown, 0, 1);
    posCurve.getPoint(e, p);
    tgtCurve.getPoint(e, q);
    p.y += Math.sin(e * 3.1) * 0.012;
    camera.position.copy(p);
    camera.lookAt(q);
    applyWorld(e);
    syncUI(e);
    renderer.render(scene, camera);
  };

  resize();
  addEventListener('resize', resize);
  raf = requestAnimationFrame(tick);
  applyWorld(0);
  syncUI(0);

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => es.forEach((en) => { visible = en.isIntersecting && !document.hidden; }), { threshold: 0 });
    io.observe(section);
  }
  const onVis = () => { if (document.hidden) visible = false; };
  document.addEventListener('visibilitychange', onVis);

  window.__buildScroll = (v) => { target = clamp(v, 0, 1); };

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
    window.__buildScroll = null;
  };
}
