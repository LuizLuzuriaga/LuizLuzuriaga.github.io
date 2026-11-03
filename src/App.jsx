import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene, artefactPos } from './scene.js';
import { store, windowAt } from './store.js';
import { DOMAINS, NODES, ACTUARIAL, ARTEFACTO, ESTADOS, CIFRAS, PROYECTOS, EXAM, daysToExam } from './data.js';

gsap.registerPlugin(ScrollTrigger);

// Capítulos de la historia: [desde, hasta] del progreso del scroll.
const CAPS = [[0, 0.1], [0.1, 0.26], [0.3, 0.47], [0.48, 0.62], [0.63, 0.74], [0.75, 0.87], [0.88, 1.01]];
const chapterOf = (p) => { for (let i = 0; i < CAPS.length; i++) if (p >= CAPS[i][0] && p < CAPS[i][1]) return i; return p >= CAPS[CAPS.length - 1][0] ? CAPS.length - 1 : -1; };
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function useChapter() {
  const [c, setC] = useState(0);
  useEffect(() => {
    let raf = 0, last = 0;
    const tick = () => { const n = chapterOf(store.p); if (n !== last) { last = n; setC(n); } raf = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return c;
}

function Label({ pos, win, className = '', children }) {
  const ref = useRef(null);
  useEffect(() => {
    const item = { el: ref.current, pos, win };
    store.labels.push(item);
    return () => { store.labels = store.labels.filter((x) => x !== item); };
  }, []);
  return <div ref={ref} className={`label ${className}`} style={{ opacity: 0, visibility: 'hidden' }}><span>{children}</span></div>;
}

function Universe() {
  const ref = useRef(null);
  useEffect(() => {
    const low = window.matchMedia('(max-width: 820px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
    let s;
    try { s = createScene(ref.current, { low }); } catch (e) { store.webgl = false; document.documentElement.classList.add('no-webgl'); }
    return () => s && s.dispose();
  }, []);
  return <canvas ref={ref} className="universe" aria-hidden="true" />;
}

function Cursor() {
  const dot = useRef(null), ring = useRef(null);
  useEffect(() => {
    if (!fine) return;
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot.current, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' });
    const move = (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); store.mouse.x = (e.clientX / innerWidth - 0.5) * 2; store.mouse.y = (e.clientY / innerHeight - 0.5) * 2; };
    const over = (e) => ring.current.classList.toggle('big', !!e.target.closest('a,button,[data-hover]'));
    window.addEventListener('pointermove', move); window.addEventListener('pointerover', over);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerover', over); };
  }, []);
  if (!fine) return null;
  return <><div ref={ring} className="cursor-ring" aria-hidden="true" /><div ref={dot} className="cursor-dot" aria-hidden="true" /></>;
}

function Magnetic({ as: Tag = 'a', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!fine || reduced) return;
    const el = ref.current, qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    const m = (e) => { const r = el.getBoundingClientRect(); qx((e.clientX - (r.left + r.width / 2)) * 0.28); qy((e.clientY - (r.top + r.height / 2)) * 0.4); };
    const l = () => { qx(0); qy(0); };
    el.addEventListener('pointermove', m); el.addEventListener('pointerleave', l);
    return () => { el.removeEventListener('pointermove', m); el.removeEventListener('pointerleave', l); };
  }, []);
  return <Tag ref={ref} {...rest}>{children}</Tag>;
}

function Hud({ chapter }) {
  const fill = useRef(null), cam = useRef(null), flash = useRef(null), hint = useRef(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = store.p;
      if (fill.current) fill.current.style.transform = `scaleY(${Math.min(1, p).toFixed(4)})`;
      const sr = document.getElementById('story').getBoundingClientRect(); document.body.classList.toggle('past', sr.bottom < innerHeight * 0.55);
      if (flash.current) flash.current.style.opacity = String((Math.exp(-(((p - 0.268) / 0.011) ** 2)) * 0.9).toFixed(3));
      if (hint.current) hint.current.style.opacity = String(Math.max(0, 1 - p / 0.04).toFixed(2));
      if (cam.current && store.cam) cam.current.textContent = store.cam.map((n, i) => `${'xyz'[i]} ${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1).padStart(5, '0')}`).join('   ');
      raf = requestAnimationFrame(tick);
    };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <>
      <div ref={flash} className="flash" aria-hidden="true" />
      <header className="top">
        <a className="wordmark" href="#inicio" data-hover>Luiz Luzuriaga</a>
        <nav aria-label="Principal">
          <a href="#proyectos" data-hover>Proyectos</a>
          <a href="#sobre-mi" data-hover>Sobre mí</a>
          <a href="https://luizluzuriaga.github.io/Gedankenpalast/" data-hover>Entrar</a>
        </nav>
      </header>
      <div className="rail" aria-hidden="true">
        <span className="rail-n">{String(Math.max(chapter, 0) + 1).padStart(2, '0')}</span>
        <span className="rail-line"><i ref={fill} /></span>
        <span className="rail-n dim">07</span>
      </div>
      <div className="readout" aria-hidden="true">
        <span className="ro-a">{chapter >= 2 ? 'Laniakea · 520 millones de años luz' : 'Esfera de obsidiana'}</span>
        <span ref={cam} className="ro-b" />
      </div>
      <div ref={hint} className="hint" aria-hidden="true"><span>Baja</span><i /></div>
    </>
  );
}

const rise = { initial: { opacity: 0, y: 28, filter: 'blur(10px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -18, filter: 'blur(8px)' }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } };
const stag = (i) => ({ ...rise, transition: { ...rise.transition, delay: 0.08 * i } });

function Count({ n, active }) {
  const [v, setV] = useState(0);
  useEffect(() => { if (!active) { setV(0); return; } const a = animate(0, n, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) }); return () => a.stop(); }, [active, n]);
  return <>{v}</>;
}

function Chapters({ c }) {
  const days = daysToExam();
  const estado = days > 30 ? 'lejano' : days > 7 ? 'proximo' : 'inminente';
  return (
    <div className="chapters">
      <AnimatePresence mode="popLayout">
        {c === 0 && (
          <motion.div key="c0" className="chap c0" {...rise}>
            <h1 className="mega" aria-label="Luiz Luzuriaga"><span>Luiz</span><span>Luzuriaga</span></h1>
            <p className="lead">Máster en Ciencias Actuariales y Financieras. Guías de estudio y un atlas 3D, en abierto.</p>
          </motion.div>
        )}
        {c === 1 && (
          <motion.div key="c1" className="chap c1">
            <motion.h2 className="big" {...stag(0)}>Gedankenpalast</motion.h2>
            <motion.p className="lead" {...stag(1)}>Una esfera de obsidiana. Dentro, un universo tridimensional del conocimiento humano.</motion.p>
            <motion.p className="note" {...stag(2)}>Atraviésala.</motion.p>
          </motion.div>
        )}
        {c === 2 && (
          <motion.div key="c2" className="chap c2">
            <motion.h2 className="big" {...stag(0)}>El universo del saber</motion.h2>
            <motion.p className="lead" {...stag(1)}>Diez grandes dominios, cada uno una galaxia. Alejarse para contemplar; acercarse para entrar.</motion.p>
          </motion.div>
        )}
        {c === 3 && (
          <motion.div key="c3" className="chap c3">
            <motion.h2 className="big" {...stag(0)}>Una jerarquía para orientarse.<br />Una red para conectar.</motion.h2>
            <motion.p className="lead" {...stag(1)}>Ciencia Actuarial vive en Ciencias sociales, pero bebe de Matemáticas, Probabilidad, Estadística, Ciencia de datos, Informática, Econometría, Finanzas y Gestión de riesgos.</motion.p>
          </motion.div>
        )}
        {c === 4 && (
          <motion.div key="c4" className="chap c4">
            <motion.h2 className="big" {...stag(0)}>Cada punto abre un espacio de estudio</motion.h2>
            <motion.p className="lead" {...stag(1)}>Ocho secciones por nodo: del temario al tutor de IA, con tu progreso y tu calendario dentro.</motion.p>
          </motion.div>
        )}
        {c === 5 && (
          <motion.div key="c5" className="chap c5">
            <motion.h2 className="big" {...stag(0)}>El calendario hace brillar lo que importa</motion.h2>
            <motion.p className="lead" {...stag(1)}>
              {days >= 0 ? <>Examen de {EXAM.label}: <b className="gold">{days === 0 ? 'es hoy' : days === 1 ? 'falta 1 día' : `faltan ${days} días`}</b>. {EXAM.node} brilla más cuanto más se acerca.</> : <>El examen de {EXAM.label} ya pasó: el nodo recupera su brillo discreto.</>}
            </motion.p>
            <motion.ul className="estados" {...stag(2)}>
              {ESTADOS.map((e) => <li key={e.id} className={e.id === estado ? 'on' : ''}><b>{e.nombre}</b><span>{e.desc}</span></li>)}
            </motion.ul>
          </motion.div>
        )}
        {c === 6 && (
          <motion.div key="c6" className="chap c6">
            <motion.h2 className="big" {...stag(0)}>Y ya hay mapas publicados</motion.h2>
            <motion.ul className="cifras" {...stag(1)}>
              {CIFRAS.map((x) => <li key={x.t}><b><Count n={x.n} active={c === 6} /></b><span>{x.t}</span></li>)}
            </motion.ul>
            <motion.div {...stag(2)}>
              <Magnetic className="cta" href="https://luizluzuriaga.github.io/Gedankenpalast/" data-hover>Entrar en Gedankenpalast</Magnetic>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SceneLabels() {
  return (
    <div className="labels" aria-hidden="true">
      {DOMAINS.map((d) => <Label key={d.id} pos={d.pos} win={[0.32, 0.6]} className="dom"><i style={{ background: d.color }} />{d.name}<small>{d.sample}</small></Label>)}
      {NODES.map((n) => <Label key={n.name} pos={n.pos} win={[0.5, 0.78]} className="node">{n.name}</Label>)}
      <Label pos={ACTUARIAL.pos} win={[0.46, 0.84]} className="star">{ACTUARIAL.name}</Label>
      {ARTEFACTO.map((a, i) => <Label key={a} pos={artefactPos(i)} win={[0.64, 0.77]} className="art"><b>{String(i + 1).padStart(2, '0')}</b>{a}</Label>)}
    </div>
  );
}

function Proyectos() {
  const [i, setI] = useState(0);
  return (
    <section className="block" id="proyectos" aria-labelledby="h-proy">
      <div className="block-in work">
        <div className="work-col">
          <h2 id="h-proy" className="sub reveal">Artefactos publicados</h2>
          <p className="muted reveal">Seis espacios de estudio, abiertos y gratuitos. Pasa el cursor para ver cada uno.</p>
          <ul className="ledger" onMouseLeave={() => setI(i)}>
            {PROYECTOS.map((p, k) => (
              <li key={p.n} className="reveal">
                <a href={p.href} onPointerEnter={() => setI(k)} onFocus={() => setI(k)} className={k === i ? 'is-on' : ''} data-hover>
                  <i style={{ background: p.c }} /><span className="n">{p.n}</span><span className="k">{p.k}</span><span className="y">{p.y}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <figure className="preview reveal">
          <AnimatePresence initial={false}>
            <motion.img key={PROYECTOS[i].img} src={PROYECTOS[i].img} alt={PROYECTOS[i].alt} width="1200" height="750" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
          </AnimatePresence>
          <span className="shine" />
        </figure>
      </div>
    </section>
  );
}

function Sobre() {
  return (
    <section className="block" id="sobre-mi" aria-labelledby="h-sobre">
      <div className="block-in about">
        <h2 id="h-sobre" className="sub reveal">Sobre mí</h2>
        <dl className="facts reveal">
          <div><dt>Estudios</dt><dd>Máster en Ciencias Actuariales y Financieras</dd></div>
          <div><dt>Universidad</dt><dd>Universidad de Alcalá</dd></div>
          <div><dt>Curso</dt><dd>Segundo año</dd></div>
        </dl>
        <p className="para reveal">Convierto cada asignatura en algo que se pueda recorrer: guías con diagramas de flujo, simulaciones con el código delante y un atlas 3D donde los temas se relacionan. Todo en abierto y en español.</p>
        <div className="lists reveal">
          <div><h3 className="lh">Asignaturas</h3><ul>{['Simulación y modelos', 'Estadística bayesiana', 'Previsión social', 'Seguridad Social'].map((x) => <li key={x}><span>{x}</span><span>2026</span></li>)}</ul></div>
          <div><h3 className="lh">Herramientas</h3><ul>{[['R y Python', 'Cálculo'], ['Three.js', 'Atlas 3D'], ['MathJax', 'Fórmulas'], ['GitHub Pages', 'Publicación']].map(([a, b]) => <li key={a}><span>{a}</span><span>{b}</span></li>)}</ul></div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="foot">
      <div className="foot-cols">
        <ul><li className="first">Luiz Alberto Luzuriaga Izquierdo</li><li>Alcalá de Henares</li></ul>
        <ul><li className="first">Proyectos</li><li><a href="https://luizluzuriaga.github.io/Gedankenpalast/" data-hover>Gedankenpalast</a></li><li><a href="https://luizluzuriaga.github.io/Actuariales/" data-hover>Portfolio actuarial</a></li><li><a href="https://luizluzuriaga.github.io/Gedankenpalast/Fundacion/guias/seguridad_social.html" data-hover>Seguridad Social</a></li></ul>
        <ul><li className="first">En línea</li><li><a href="https://github.com/LuizLuzuriaga" data-hover>GitHub</a></li><li><a href="https://www.linkedin.com/in/luiz-luzuriaga-izquierdo" data-hover>LinkedIn</a></li></ul>
        <ul><li className="first">Créditos</li><li>Material de Simulación: David Atance del Olmo, CC BY-NC-SA 4.0</li></ul>
      </div>
      <p className="foot-mark" aria-hidden="true">Luiz Luzuriaga</p>
      <p className="legal">© 2026 Luiz Luzuriaga. Las capturas son de los propios proyectos.</p>
    </footer>
  );
}

export default function App() {
  const chapter = useChapter();
  useEffect(() => {
    let lenis;
    if (!reduced) {
      lenis = new Lenis({ duration: 1.25, smoothWheel: true, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    const st = ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { store.target = s.progress; } });
    const rv = gsap.utils.toArray('.reveal').map((el) => gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); lenis ? lenis.scrollTo(t) : t.scrollIntoView(); } }));
    const onMove = (e) => { store.mouse.x = (e.clientX / innerWidth - 0.5) * 2; store.mouse.y = (e.clientY / innerHeight - 0.5) * 2; };
    window.addEventListener('pointermove', onMove);
    return () => { st.kill(); rv.forEach((r) => r.scrollTrigger && r.scrollTrigger.kill()); window.removeEventListener('pointermove', onMove); lenis && lenis.destroy(); };
  }, []);

  return (
    <>
      <a className="skip" href="#proyectos">Saltar al contenido</a>
      <Universe />
      <div className="grain" aria-hidden="true" /><div className="vignette" aria-hidden="true" />
      <Cursor />
      <Hud chapter={chapter} />
      <main id="inicio">
        <section id="story" className="story" aria-label="Gedankenpalast, el universo del conocimiento">
          <div className="sticky">
            <SceneLabels />
            <Chapters c={chapter} />
          </div>
        </section>
        <Proyectos />
        <Sobre />
      </main>
      <Footer />
    </>
  );
}
