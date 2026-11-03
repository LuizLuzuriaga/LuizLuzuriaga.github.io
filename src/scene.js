import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CLUSTERS, TOPICS, LINKS, FUTURE, topic, cluster, ARTEFACTO, RING_TOPIC, EXAM, daysToExam, examGlow } from './data.js';
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
// Líneas de flujo (las "corrientes" de Laniakea): del color del cúmulo al blanco del Gran Atractor, con un pulso que avanza hacia él.
const FLOW_VERT = /* glsl */ `
  attribute float aT; attribute float aSeed;
  uniform float uTime; uniform float uFade; uniform float uBase; uniform float uPulse;
  varying float vA; varying float vT;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float pulse = 0.5 + 0.5 * sin(aT * 16.0 - uTime * 1.5 + aSeed * 6.2831);
    vT = aT;
    vA = uFade * (uBase * (0.55 + 0.9 * aT) + uPulse * pulse * (0.35 + aT));
  }`;
const FLOW_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uMix; varying float vA; varying float vT;
  void main() { gl_FragColor = vec4(mix(uColor, vec3(1.0), uMix * smoothstep(0.55, 1.0, vT)), vA); }`;

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
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
  const rng = mulberry(11);
  const count = low ? 0.45 : 1;

  // ───────── La esfera de obsidiana (la bola de Gantz): lisa, sin líneas ─────────
  const sphere = new THREE.Group(); scene.add(sphere);
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(3, 128, 128),
    new THREE.MeshPhysicalMaterial({ color: 0x030406, roughness: 0.34, metalness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  );
  sphere.add(ball);
  const key = new THREE.DirectionalLight(0xa9c1ff, 2.2); key.position.set(-7, 6, 9); scene.add(key);
  const rim = new THREE.PointLight(0x4f6fff, 420, 60, 2); rim.position.set(9, 2, -6); scene.add(rim);
  const warm = new THREE.PointLight(0xe2bd78, 80, 40, 2); warm.position.set(-6, -4, 6); scene.add(warm);
  const glowTex = glowTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3b5bb8, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(15, 15, 1); sphere.add(halo);

  // ───────── El universo ─────────
  const universe = new THREE.Group(); scene.add(universe);
  const pointMats = [];
  function pointsMaterial() {
    const m = new THREE.ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 }, uPx: { value: dpr }, uFade: { value: 0 } } });
    pointMats.push(m); return m;
  }
  function buildPoints(n, fill, material) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { const o = fill(i, rng); pos.set(o.p, i * 3); col.set(o.c, i * 3); size[i] = o.s; ph[i] = rng(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    return new THREE.Points(g, material || pointsMaterial());
  }
  const WHITE = new THREE.Color(0xffffff);
  const col3 = (hex, k) => { const c = new THREE.Color(hex).lerp(WHITE, k); return [c.r, c.g, c.b]; };

  const flowMats = [];
  function flowMaterial(hex, base, pulse, whiten = 1) {
    const m = new THREE.ShaderMaterial({ vertexShader: FLOW_VERT, fragmentShader: FLOW_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFade: { value: 0 }, uBase: { value: base }, uPulse: { value: pulse }, uColor: { value: new THREE.Color(hex) }, uMix: { value: whiten } } });
    flowMats.push(m); return m;
  }
  // n corrientes curvas desde `origin` hasta el Gran Atractor; devuelve también puntos de polvo a lo largo de ellas.
  const UP = new THREE.Vector3(0, 1, 0);
  function streams(origin, spread, n, material, dustPerLine = 0) {
    const seg = 34, verts = [], ts = [], seeds = [], dust = [];
    const O = V(origin), away = O.clone().normalize();
    for (let i = 0; i < n; i++) {
      const S = O.clone().addScaledVector(away, spread * (0.4 + rng() * 1.7)).add(new THREE.Vector3(gauss(rng) * spread * 0.55, gauss(rng) * spread * 0.4, gauss(rng) * spread * 0.55));
      const E = new THREE.Vector3(gauss(rng) * 1.1, gauss(rng) * 0.7, gauss(rng) * 1.1);
      const dir = E.clone().sub(S), len = dir.length(), curl = dir.clone().cross(UP).normalize().multiplyScalar(len * (0.2 + rng() * 0.14));
      const C = S.clone().add(E).multiplyScalar(0.5).add(curl).add(new THREE.Vector3(0, gauss(rng) * spread * 0.3, 0));
      const curve = new THREE.QuadraticBezierCurve3(S, C, E), sd = rng();
      let prev = curve.getPoint(0);
      for (let k = 1; k <= seg; k++) { const q = curve.getPoint(k / seg); verts.push(prev.x, prev.y, prev.z, q.x, q.y, q.z); ts.push((k - 1) / seg, k / seg); seeds.push(sd, sd); prev = q; }
      for (let d = 0; d < dustPerLine; d++) { const tt = Math.pow(rng(), 0.7), q = curve.getPoint(tt); dust.push({ p: [q.x + gauss(rng) * 0.35, q.y + gauss(rng) * 0.35, q.z + gauss(rng) * 0.35], t: tt }); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    universe.add(new THREE.LineSegments(g, material));
    return dust;
  }

  // El Gran Atractor, en el centro: el punto blanco al que fluye todo.
  universe.add(buildPoints(Math.round(2600 * count), (i, r) => { const q = 2.2 * Math.pow(r(), 1.7), a = r() * 6.2832, b = Math.acos(2 * r() - 1); return { p: [q * Math.sin(b) * Math.cos(a), q * Math.cos(b) * 0.7, q * Math.sin(b) * Math.sin(a)], c: [1, 1, 1], s: 0.8 + r() * 2.2 }; }));
  const attractor = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdde8ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  attractor.scale.set(11, 11, 1); universe.add(attractor);

  // Los cuatro cúmulos de hoy: corrientes, polvo que fluye, núcleo y temas en órbita.
  const clusterCores = [];
  CLUSTERS.forEach((c) => {
    const mat = flowMaterial(c.color, 0.1, 0.16);
    const dust = streams(c.pos, c.r, Math.round(230 * count), mat, 5);
    universe.add(buildPoints(dust.length, (i) => ({ p: dust[i].p, c: col3(c.color, dust[i].t * 0.85), s: 0.7 + dust[i].t * 1.6 })));
    universe.add(buildPoints(Math.round(2400 * count), (i, r) => { const q = c.r * 0.5; return { p: [c.pos[0] + gauss(r) * q, c.pos[1] + gauss(r) * q * 0.7, c.pos[2] + gauss(r) * q], c: col3(c.color, 0.25 + r() * 0.4), s: 0.7 + r() * r() * 2.6 }; }));
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(c.color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.position.copy(V(c.pos)); core.scale.set(c.r * 2.1, c.r * 2.1, 1); universe.add(core); clusterCores.push(core);
  });
  // Afluentes: corrientes del vacío que también caen hacia el Gran Atractor.
  { const m = flowMaterial(0x6f86c4, 0.045, 0.06); for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.2832 + 0.7; streams([Math.cos(a) * 60, (rng() - 0.5) * 40, Math.sin(a) * 60], 26, Math.round(45 * count), m); } }

  // Temas (41): estrellas en órbita de su cúmulo. Las relaciones, como arcos finos.
  universe.add(buildPoints(TOPICS.length, (i) => { const t = TOPICS[i], hot = t.id === EXAM.topic || t.id === RING_TOPIC; return { p: t.pos, c: col3(t.color, hot ? 0.9 : 0.55), s: t.id === EXAM.topic ? 6.5 : 4 }; }));
  function linkLines(pairs, hex, base, pulse) {
    const seg = 28, verts = [], ts = [], seeds = [];
    pairs.forEach(([a, b], n) => {
      const A = V(a.pos), B = V(b.pos), M = A.clone().add(B).multiplyScalar(0.5), L = A.distanceTo(B);
      const curve = new THREE.QuadraticBezierCurve3(A, M.clone().multiplyScalar(0.8).add(new THREE.Vector3(0, L * 0.12, 0)), B); let prev = curve.getPoint(0);
      for (let k = 1; k <= seg; k++) { const q = curve.getPoint(k / seg); verts.push(prev.x, prev.y, prev.z, q.x, q.y, q.z); ts.push((k - 1) / seg, k / seg); seeds.push((n * 0.13) % 1, (n * 0.13) % 1); prev = q; }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setAttribute('aT', new THREE.Float32BufferAttribute(ts, 1)); g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    const m = flowMaterial(hex, base, pulse, 0); universe.add(new THREE.LineSegments(g, m)); return m;
  }
  const isAct = (t) => t.cluster === 'act';
  linkLines(LINKS.filter(([a, b]) => !isAct(a) && !isAct(b)), '#b8c6ee', 0.03, 0.03);
  const actLinks = linkLines(LINKS.filter(([a, b]) => isAct(a) || isAct(b)), '#f2b33d', 0.04, 0.02);

  // A dónde se quiere llegar: el mismo esquema (cúmulo, temas en órbita, corrientes) para el resto de ciencias; apagado hasta el final.
  const ghosts = FUTURE.map((f, i) => {
    const mat = flowMaterial(f.color, 0.07, 0.12); streams(f.pos, f.r, Math.round(48 * count), mat);
    const pm = pointsMaterial();
    universe.add(buildPoints(Math.round(1500 * count), (j, r) => { const q = f.r * 0.5; return { p: [f.pos[0] + gauss(r) * q, f.pos[1] + gauss(r) * q * 0.7, f.pos[2] + gauss(r) * q], c: col3(f.color, 0.2 + r() * 0.4), s: 0.7 + r() * r() * 2.4 }; }, pm));
    universe.add(buildPoints(7, (j, r) => { const a = r() * 6.2832, q = f.r * (0.4 + r() * 0.5); return { p: [f.pos[0] + Math.cos(a) * q, f.pos[1] + (r() - 0.5) * f.r * 0.5, f.pos[2] + Math.sin(a) * q], c: col3(f.color, 0.55), s: 3.2 }; }, pm));
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(f.color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.position.copy(V(f.pos)); core.scale.set(f.r * 2.4, f.r * 2.4, 1); universe.add(core);
    return { pm, mat, core, i };
  });
  const ghostSet = new Set(ghosts.map((g) => g.pm));

  // Anillo del artefacto (las 8 secciones orbitan un tema) y brillo del examen.
  const RT = topic(RING_TOPIC).pos, EX = topic(EXAM.topic).pos;
  const ringMat = new THREE.LineBasicMaterial({ color: 0xe2bd78, transparent: true, opacity: 0 });
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * 6.2832) * 1.5, 0, Math.sin(i / 128 * 6.2832) * 1.5))), ringMat);
  ring.position.copy(V(RT)); ring.rotation.set(0.5, 0, 0.18); universe.add(ring);
  const examSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd48a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  examSprite.position.copy(V(EX)); universe.add(examSprite);

  // ───────── Cámara: recorrido por la historia ─────────
  const off = (b, o) => [b[0] + o[0], b[1] + o[1], b[2] + o[2]];
  const ACT = cluster('act').pos;
  const KEYS = [
    { p: 0.00, pos: [0, 0.4, 16], look: [3.2, 0, 0] },
    { p: 0.13, pos: [0, 0.1, 10], look: [1, 0, 0] },
    { p: 0.26, pos: [0, 0, 3.6], look: [0, 0, -10] },
    { p: 0.31, pos: [4, 12, 56], look: [0, -2, 0] },
    { p: 0.46, pos: [-10, 14, 46], look: [0, -5, 0] },
    { p: 0.55, pos: off(ACT, [10, 6, 14]), look: off(ACT, [0, -2.4, 0]) },
    { p: 0.64, pos: off(RT, [4, 2, 6.5]), look: off(RT, [0, -1.5, 0]) },
    { p: 0.74, pos: off(EX, [-5, 2.4, 7]), look: off(EX, [0, -1.4, 0]) },
    { p: 0.86, pos: [0, 30, 96], look: [0, -6, 0] },
    { p: 1.00, pos: [6, 36, 118], look: [0, -8, 0] },
  ];
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.pos)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.look)), false, 'centripetal');
  function at(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const t = Math.min(1, Math.max(0, (p - KEYS[i].p) / (KEYS[i + 1].p - KEYS[i].p)));
    return (i + (t * t * (3 - 2 * t) * 0.55 + t * 0.45)) / (KEYS.length - 1);
  }

  // ───────── Bucle ─────────
  const glowK = examGlow(daysToExam());
  const v = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let w = 1, h = 1, raf = 0, running = true, n = 0;
  const clock = new THREE.Clock();
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 66 : 50; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize', resize);

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    if (store.past && (n++ % 3)) return;                         // pasada la historia, la escena de fondo va a ritmo bajo
    const dt = Math.min(clock.getDelta(), 0.06), t = clock.elapsedTime;
    store.p += (store.target - store.p) * Math.min(1, dt * 5.5);
    const p = store.p;

    const inSphere = smooth((p - 0.02) / 0.12);
    sphere.position.x = 5.2 * (1 - inSphere);
    sphere.rotation.y = -0.5 + t * 0.05 + store.mouse.x * 0.25 + p * 3;
    sphere.rotation.x = store.mouse.y * 0.12;
    sphere.visible = p < 0.285;
    halo.material.opacity = 0.35 * (1 - smooth((p - 0.18) / 0.08));

    const fade = smooth((p - 0.245) / 0.05) * (1 - smooth((p - 0.93) / 0.07) * 0.35);
    universe.visible = fade > 0.001;
    pointMats.forEach((m) => { m.uniforms.uTime.value = t; if (!ghostSet.has(m)) m.uniforms.uFade.value = fade; });
    flowMats.forEach((m) => { m.uniforms.uTime.value = t; m.uniforms.uFade.value = fade; });
    // los cúmulos de hoy se ven siempre; los futuros se encienden de uno en uno al final
    ghosts.forEach((g) => { const L = smooth((p - (0.76 + g.i * 0.012)) / 0.07); g.pm.uniforms.uFade.value = fade * (0.12 + 0.88 * L); g.mat.uniforms.uFade.value = fade * (0.2 + 0.8 * L); g.core.material.opacity = fade * (0.03 + 0.2 * L); });
    const hiAct = smooth((p - 0.5) / 0.05) * (1 - smooth((p - 0.66) / 0.05));
    actLinks.uniforms.uBase.value = 0.035 + 0.2 * hiAct; actLinks.uniforms.uPulse.value = 0.02 + 0.2 * hiAct;
    clusterCores.forEach((c) => { c.material.opacity = 0.2 * fade; });
    attractor.material.opacity = 0.62 * fade * (0.86 + 0.14 * Math.sin(t * 1.4));

    const pulse = 0.88 + 0.12 * Math.sin(t * (1.2 + glowK * 2.6));
    const exW = smooth((p - 0.66) / 0.06) * (1 - smooth((p - 0.84) / 0.05));
    examSprite.material.opacity = fade * (0.12 + 0.75 * glowK * exW) * pulse;
    const gs = 1.2 + 3.4 * glowK * (0.4 + 0.6 * exW); examSprite.scale.set(gs, gs, 1);
    ringMat.opacity = 0.55 * smooth((p - 0.595) / 0.04) * (1 - smooth((p - 0.7) / 0.04)) * fade;
    ring.rotation.y = t * 0.25;

    const u = at(p);
    posCurve.getPoint(u, camPos); lookCurve.getPoint(u, camLook);
    camPos.x += store.mouse.x * 0.9 * (p > 0.28 ? 1.6 : 0.6); camPos.y += -store.mouse.y * 0.6;
    camera.position.copy(camPos); camera.lookAt(camLook);

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
    store.ready = true;
    renderer.render(scene, camera);
  }
  frame();

  const onVis = () => { running = !document.hidden; if (running) clock.getDelta(); };
  document.addEventListener('visibilitychange', onVis);
  return { dispose() { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); } };
}

// Posición (en el mundo) de cada sección del artefacto: orbitan el tema en el anillo inclinado.
export function artefactPos(i) {
  const e = new THREE.Euler(0.5, 0, 0.18), q = new THREE.Vector3(), c = topic(RING_TOPIC).pos;
  return (t) => {
    const a = i / ARTEFACTO.length * 6.2832; e.set(0.5, t * 0.25, 0.18);
    q.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5).applyEuler(e);
    return [c[0] + q.x, c[1] + q.y, c[2] + q.z];
  };
}
