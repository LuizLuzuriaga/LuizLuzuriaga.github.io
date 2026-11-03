import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DOMAINS, NODES, ACTUARIAL, ARTEFACTO, daysToExam, examGlow } from './data.js';
import { store } from './store.js';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (r) => (r() + r() + r() - 1.5) / 1.5;

const POINT_VERT = /* glsl */ `
  attribute float aSize; attribute float aPhase; attribute vec3 aColor;
  uniform float uTime; uniform float uPx; uniform float uFade;
  varying vec3 vColor; varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uPx * (34.0 / -mv.z), 1.0, 46.0);
    vColor = aColor;
    vA = (0.62 + 0.38 * sin(uTime * 1.3 + aPhase * 6.2831)) * uFade;
  }`;
const POINT_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d); a *= a;
    gl_FragColor = vec4(vColor, a * vA);
  }`;
const LINE_VERT = /* glsl */ `
  attribute float aT; uniform float uTime; uniform float uFade; uniform float uHi; uniform float uSeed;
  varying float vA;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.5 + 0.5 * sin(aT * 14.0 - uTime * 1.6 + uSeed);
    vA = uFade * (0.07 + 0.55 * uHi * (0.35 + 0.65 * pulse) + 0.05 * pulse);
  }`;
const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor; varying float vA;
  void main() { gl_FragColor = vec4(uColor, vA); }`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createScene(canvas, { low = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  const rng = mulberry(11);
  const count = low ? 0.4 : 1;

  // ───────── La esfera de obsidiana (la bola de Gantz) ─────────
  const sphere = new THREE.Group(); scene.add(sphere);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(3, 96, 96),
    new THREE.MeshPhysicalMaterial({ color: 0x040507, roughness: 0.3, metalness: 0.55, clearcoat: 0.55, clearcoatRoughness: 0.22 }),
  );
  sphere.add(ball);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x6f93d8, transparent: true, opacity: 0.5 });
  const seam = new THREE.Mesh(new THREE.TorusGeometry(3.006, 0.005, 8, 220), seamMat); seam.rotation.y = Math.PI / 2; sphere.add(seam);
  const seam2 = new THREE.Mesh(new THREE.TorusGeometry(3.004, 0.004, 8, 220), seamMat); seam2.rotation.x = Math.PI / 2; seam2.rotation.z = 0.35; sphere.add(seam2);
  const panelMat = new THREE.LineBasicMaterial({ color: 0x6f93d8, transparent: true, opacity: 0.38 });
  const panel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.05, 1.7, 0.02)), panelMat);
  panel.position.set(0, 0.1, 3.012); sphere.add(panel);
  const panelDot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 16), new THREE.MeshBasicMaterial({ color: 0x9db8ff }));
  panelDot.position.set(0, -0.62, 3.03); sphere.add(panelDot);
  const key = new THREE.DirectionalLight(0xa9c1ff, 2.4); key.position.set(-7, 6, 9); scene.add(key);
  const rim = new THREE.PointLight(0x4f6fff, 420, 60, 2); rim.position.set(9, 2, -6); scene.add(rim);
  const warm = new THREE.PointLight(0xe2bd78, 90, 40, 2); warm.position.set(-6, -4, 6); scene.add(warm);

  const glowTex = glowTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3b5bb8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(15, 15, 1); sphere.add(halo);

  // ───────── El universo ─────────
  const universe = new THREE.Group(); scene.add(universe);
  const pointMats = [];
  const tint = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k);

  function pointsMaterial() {
    const m = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: dpr }, uFade: { value: 0 } },
    });
    pointMats.push(m); return m;
  }
  function buildPoints(n, fill) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = fill(i, rng); pos.set(o.p, i * 3); col.set(o.c, i * 3); size[i] = o.s; ph[i] = rng(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    return new THREE.Points(g, pointsMaterial());
  }

  const galaxies = [];
  DOMAINS.forEach((d, gi) => {
    const n = Math.round(5200 * count * (d.r / 5.5));
    const base = new THREE.Color(d.color);
    const pts = buildPoints(n, (i, r) => {
      let x, y, z, k;
      if (r() < 0.22) { const q = d.r * 0.28; x = gauss(r) * q; y = gauss(r) * q * 0.7; z = gauss(r) * q; k = 0.55; }
      else {
        const rad = Math.pow(r(), 0.62) * d.r, ang = rad * 0.62 + (i % 2) * Math.PI + (r() - 0.5) * 0.7;
        x = Math.cos(ang) * rad; z = Math.sin(ang) * rad; y = gauss(r) * d.r * 0.07 * (1 - rad / d.r * 0.4); k = 0.28 * (1 - rad / d.r);
      }
      const c = base.clone().lerp(new THREE.Color(0xffffff), k + r() * 0.12);
      return { p: [x, y, z], c: [c.r, c.g, c.b], s: 0.9 + r() * r() * 3.1 };
    });
    const grp = new THREE.Group(); grp.position.copy(V(d.pos)); grp.rotation.set((r0() - 0.5) * 1.2, r0() * 6, (r0() - 0.5) * 0.9);
    function r0() { return rng(); }
    grp.add(pts);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: base, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.scale.set(d.r * 1.5, d.r * 1.5, 1); grp.add(core);
    universe.add(grp); galaxies.push({ grp, core, d, spin: 0.015 + rng() * 0.03 });
  });

  // Polvo de fondo y el Gran Atractor en el centro.
  const dust = buildPoints(Math.round(9000 * count), (i, r) => {
    const rad = 28 + Math.pow(r(), 0.7) * 120, u = r() * 6.2832, v = Math.acos(2 * r() - 1);
    const c = new THREE.Color(0x7d8ec7).lerp(new THREE.Color(0xffffff), r() * 0.4);
    return { p: [rad * Math.sin(v) * Math.cos(u), rad * Math.cos(v) * 0.7, rad * Math.sin(v) * Math.sin(u)], c: [c.r, c.g, c.b], s: 0.7 + r() * 1.6 };
  });
  universe.add(dust);
  const attractor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x9db8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  attractor.scale.set(7, 7, 1); universe.add(attractor);

  // Filamentos: del Gran Atractor a cada dominio y entre dominios vecinos.
  const lineMats = [];
  function filaments(pairs, hex, hi, seed) {
    const seg = 46, verts = [], ts = [];
    pairs.forEach(([a, b], k) => {
      const A = V(a), B = V(b), mid = A.clone().add(B).multiplyScalar(0.5);
      const ctrl = mid.clone().multiplyScalar(0.62).add(new THREE.Vector3((rng() - 0.5) * 3, (rng() - 0.5) * 3, (rng() - 0.5) * 3));
      const curve = new THREE.QuadraticBezierCurve3(A, ctrl, B);
      let prev = curve.getPoint(0);
      for (let i = 1; i <= seg; i++) { const q = curve.getPoint(i / seg); verts.push(prev.x, prev.y, prev.z, q.x, q.y, q.z); ts.push((i - 1) / seg + k * 0.13, i / seg + k * 0.13); prev = q; }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uHi: { value: hi }, uSeed: { value: seed }, uColor: { value: new THREE.Color(hex) } },
    });
    lineMats.push(m); const l = new THREE.LineSegments(g, m); universe.add(l); return m;
  }
  const origin = [0, 0, 0];
  filaments(DOMAINS.map((d) => [origin, d.pos]), 0x8ea6e0, 0, 0);
  const near = [['formales', 'computacion'], ['formales', 'sociales'], ['sociales', 'ingenieria'], ['ingenieria', 'salud'], ['salud', 'ambiente'], ['naturales', 'formales'], ['humanidades', 'sociales'], ['artes', 'humanidades'], ['educacion', 'formales'], ['computacion', 'ingenieria']];
  const dp = (id) => DOMAINS.find((d) => d.id === id).pos;
  filaments(near.map(([a, b]) => [dp(a), dp(b)]), 0x6f86c4, 0.15, 3);
  const actLinks = filaments(NODES.map((n) => [ACTUARIAL.pos, n.pos]), 0xe2bd78, 1, 1.7);

  // Nodos de Ciencia Actuarial y su estrella.
  const nodePts = buildPoints(NODES.length + 1, (i) => {
    const o = i === NODES.length ? ACTUARIAL.pos : NODES[i].pos; const c = new THREE.Color(i === NODES.length ? 0xffe3a6 : 0xdce6ff);
    return { p: o, c: [c.r, c.g, c.b], s: i === NODES.length ? 7 : 4.2 };
  });
  universe.add(nodePts);
  const examGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd48a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  examGlowSprite.position.copy(V(ACTUARIAL.pos)); universe.add(examGlowSprite);

  // Anillo del artefacto (las 8 secciones orbitan el nodo).
  const ringMat = new THREE.LineBasicMaterial({ color: 0xe2bd78, transparent: true, opacity: 0 });
  const ringGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * 6.2832) * 1.5, 0, Math.sin(i / 128 * 6.2832) * 1.5)));
  const ring = new THREE.LineLoop(ringGeo, ringMat); ring.position.copy(V(ACTUARIAL.pos)); ring.rotation.set(0.5, 0, 0.18); universe.add(ring);

  // ───────── Cámara: recorrido por la historia ─────────
  const A = ACTUARIAL.pos, off = (o) => [A[0] + o[0], A[1] + o[1], A[2] + o[2]];
  const KEYS = [
    { p: 0.00, pos: [0, 0.4, 16], look: [3.2, 0, 0] },
    { p: 0.13, pos: [0, 0.1, 10], look: [1, 0, 0] },
    { p: 0.26, pos: [0, 0, 3.6], look: [0, 0, -10] },
    { p: 0.31, pos: [0, 4, 30], look: [0, -3, 0] },
    { p: 0.44, pos: [-6, 12, 52], look: [0, -6, -2] },
    { p: 0.52, pos: off([13, 6, 14]), look: off([0, -2.2, 0]) },
    { p: 0.62, pos: off([6, 3, 7]), look: off([0, -1.9, 0]) },
    { p: 0.70, pos: off([-3, 3.4, 6.2]), look: off([0, -1.6, 0]) },
    { p: 0.78, pos: off([-5, 1.2, 3.8]), look: off([0, -1.3, 0]) },
    { p: 0.88, pos: [-10, 14, 42], look: [3, -6, -4] },
    { p: 1.00, pos: [4, 20, 70], look: [0, -9, 0] },
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.look)), false, 'centripetal');
  function at(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const t = Math.min(1, Math.max(0, (p - KEYS[i].p) / (KEYS[i + 1].p - KEYS[i].p)));
    const e = t * t * (3 - 2 * t) * 0.55 + t * 0.45;                  // ease suave pero sin frenar del todo en cada tecla
    return (i + e) / (KEYS.length - 1);
  }

  // ───────── Bucle ─────────
  const days = daysToExam(); const glowK = examGlow(days);
  const v = new THREE.Vector3(); const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let w = 1, h = 1, raf = 0, running = true;
  const clock = new THREE.Clock();

  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 50; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    store.p += (store.target - store.p) * Math.min(1, dt * 5.5);
    const p = store.p;

    // esfera: de la derecha al centro, gira lento, y se abre al cruzarla
    const inSphere = smooth((p - 0.02) / 0.12);
    sphere.position.x = 5.2 * (1 - inSphere) + 0 * inSphere;
    sphere.rotation.y = -0.5 + t * 0.06 + store.mouse.x * 0.25 + p * 3;
    sphere.rotation.x = store.mouse.y * 0.12;
    sphere.visible = p < 0.285;
    halo.material.opacity = 0.35 * (1 - smooth((p - 0.18) / 0.08));

    const fadeIn = smooth((p - 0.245) / 0.05);
    const fadeOut = 1 - smooth((p - 0.9) / 0.1) * 0.55;
    const fade = fadeIn * fadeOut;
    universe.visible = fade > 0.001;
    pointMats.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uFade.value = fade; });
    const hiAct = smooth((p - 0.46) / 0.06) * (1 - smooth((p - 0.84) / 0.06));
    lineMats.forEach((m, i) => { m.uniforms.uTime.value = t; m.uniforms.uFade.value = fade; });
    actLinks.uniforms.uHi.value = 0.12 + 0.88 * hiAct;
    galaxies.forEach((g) => { g.grp.rotation.y += g.spin * dt; g.core.material.opacity = 0.16 * fade; });
    attractor.material.opacity = 0.5 * fade * (0.85 + 0.15 * Math.sin(t * 1.4));

    // el nodo brilla según la proximidad del examen (§9 del documento)
    const pulse = 0.88 + 0.12 * Math.sin(t * (1.2 + glowK * 2.6));
    examGlowSprite.material.opacity = fade * (0.18 + 0.7 * glowK * smooth((p - 0.42) / 0.08)) * pulse;
    const gs = 1.4 + 3.2 * glowK; examGlowSprite.scale.set(gs, gs, 1);
    ringMat.opacity = 0.5 * smooth((p - 0.6) / 0.04) * (1 - smooth((p - 0.77) / 0.04)) * fade;
    ring.rotation.y = t * 0.25;

    // cámara
    const u = at(p);
    posCurve.getPoint(u, camPos); lookCurve.getPoint(u, camLook);
    camPos.x += store.mouse.x * 0.9 * (p > 0.28 ? 1.6 : 0.6); camPos.y += -store.mouse.y * 0.6;
    camera.position.copy(camPos); camera.lookAt(camLook);

    // etiquetas HTML ancladas a puntos 3D
    for (const L of store.labels) {
      const a = L.win; const k = Math.min(1, Math.max(0, Math.min((p - a[0]) / 0.035, (a[1] - p) / 0.035)));
      const pos = typeof L.pos === 'function' ? L.pos(t) : L.pos;
      v.set(pos[0], pos[1], pos[2]).project(camera);
      const vis = k > 0.01 && v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15;
      L.el.style.opacity = vis ? String(k) : '0';
      if (vis) L.el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px, 0)`;
      L.el.style.visibility = vis ? 'visible' : 'hidden';
    }
    store.cam = [camPos.x, camPos.y, camPos.z];
    renderer.render(scene, camera);
  }
  frame();

  const onVis = () => { running = !document.hidden; if (running) clock.getDelta(); };
  document.addEventListener('visibilitychange', onVis);

  return {
    dispose() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); },
    artefactPos: (i) => (t) => { const a = i / ARTEFACTO.length * 6.2832; const x = Math.cos(a) * 1.5, z = Math.sin(a) * 1.5;
      // misma inclinación del anillo (rotation.x 0.5, z 0.18, y = t*0.25)
      const e = new THREE.Euler(0.5, t * 0.25, 0.18); const q = new THREE.Vector3(x, 0, z).applyEuler(e); return [ACTUARIAL.pos[0] + q.x, ACTUARIAL.pos[1] + q.y, ACTUARIAL.pos[2] + q.z]; },
  };
}

// Posición (en el mundo) de cada sección del artefacto: orbitan Ciencia Actuarial en el anillo inclinado.
export function artefactPos(i) {
  const e = new THREE.Euler(0.5, 0, 0.18); const q = new THREE.Vector3();
  return (t) => {
    const a = i / ARTEFACTO.length * 6.2832; e.set(0.5, t * 0.25, 0.18);
    q.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5).applyEuler(e);
    return [ACTUARIAL.pos[0] + q.x, ACTUARIAL.pos[1] + q.y, ACTUARIAL.pos[2] + q.z];
  };
}
