import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, animate } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { createScene, artefactPos } from './scene.js';
import { store } from './store.js';
import { CLUSTERS, TOPICS, FUTURE, ARTEFACTO, ESTADOS, CIFRAS, PROYECTOS, PORTFOLIO, EXAM, RING_TOPIC, daysToExam, topic } from './data.js';

gsap.registerPlugin(ScrollTrigger);

// Capítulos de la historia: [desde, hasta] del progreso del scroll.
const CAPS = [[0, 0.1], [0.1, 0.26], [0.3, 0.4], [0.41, 0.53], [0.54, 0.62], [0.63, 0.72], [0.73, 0.83], [0.84, 1.01]];
const NOMBRES = ['Portada', 'Gedankenpalast', 'Laniakea', 'Lo que hay hoy', 'Dentro de un cúmulo', 'Espacio de estudio', 'Calendario', 'A dónde vamos'];
const chapterOf = (p) => { for (let i = 0; i < CAPS.length; i++) if (p >= CAPS[i][0] && p < CAPS[i][1]) return i; return p >= CAPS[CAPS.length - 1][0] ? CAPS.length - 1 : -1; };
const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let lenisRef = null;

function scrollToY(y) { if (lenisRef) lenisRef.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: 'smooth' }); }
function goChapter(i) { const s = document.getElementById('story'); scrollToY(s.offsetTop + (s.offsetHeight - innerHeight) * (CAPS[i][0] + 0.02)); }
function goTo(sel) { const el = document.querySelector(sel); if (!el) return; if (lenisRef) lenisRef.scrollTo(el, { duration: 1.6 }); else el.scrollIntoView({ behavior: 'smooth' }); }

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
    try { s = createScene(ref.current, { low }); } catch (e) { store.webgl = false; document.documentElement.classList.add('no-webgl', 'ready'); }
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
    const down = () => ring.current.classList.add('press'), up = () => ring.current.classList.remove('press');
    window.addEventListener('pointermove', move); window.addEventListener('pointerover', over); window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerover', over); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); };
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
      const sr = document.getElementById('story').getBoundingClientRect();
      const past = sr.bottom < innerHeight * 0.55; store.past = past; document.body.classList.toggle('past', past);
      if (store.ready) document.documentElement.classList.add('ready');
      if (fill.current) fill.current.style.transform = `scaleY(${Math.min(1, p).toFixed(4)})`;
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
          <a href="#portfolio" data-hover>Portfolio</a>
          <a href="#sobre-mi" data-hover>Sobre mí</a>
          <a href="https://luizluzuriaga.github.io/Gedankenpalast/" data-hover>Entrar</a>
        </nav>
      </header>
      <nav className="rail" aria-label="Capítulos de la historia">
        <span className="rail-n">{String(Math.max(chapter, 0) + 1).padStart(2, '0')}</span>
        <span className="rail-line"><i ref={fill} /></span>
        <ol className="rail-dots">
          {NOMBRES.map((n, i) => <li key={n}><button type="button" aria-label={`Ir a ${n}`} aria-current={i === chapter ? 'step' : undefined} className={i === chapter ? 'on' : ''} onClick={() => goChapter(i)} data-hover><span>{n}</span></button></li>)}
        </ol>
        <span className="rail-n dim">{String(NOMBRES.length).padStart(2, '0')}</span>
      </nav>
      <div className="readout" aria-hidden="true">
        <span className="ro-a">{chapter >= 2 ? 'Laniakea · 520 millones de años luz' : 'Esfera de obsidiana'}</span>
        <span ref={cam} className="ro-b" />
      </div>
      <button type="button" className="skipstory" onClick={() => goTo('#proyectos')} data-hover>Saltar la historia <span aria-hidden="true">↓</span></button>
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
    <div className="chapters" aria-live="polite">
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
            <motion.p className="lead" {...stag(1)}>Una esfera de obsidiana, inspirada en la esfera negra de <em>Gantz</em>. Dentro, el conocimiento convertido en un universo.</motion.p>
            <motion.p className="note" {...stag(2)}>Atraviésala.</motion.p>
          </motion.div>
        )}
        {c === 2 && (
          <motion.div key="c2" className="chap c2">
            <motion.h2 className="big" {...stag(0)}>Laniakea</motion.h2>
            <motion.p className="lead" {...stag(1)}>Es nuestro supercúmulo: cientos de miles de galaxias que fluyen, como un río, hacia un mismo punto, El Gran Atractor. Gedankenpalast toma esa idea para el conocimiento.</motion.p>
          </motion.div>
        )}
        {c === 3 && (
          <motion.div key="c3" className="chap c3">
            <motion.h2 className="big" {...stag(0)}>Lo que hay hoy</motion.h2>
            <motion.p className="lead" {...stag(1)}>Cuatro cúmulos de conocimiento que fluyen hacia El Gran Atractor: {CLUSTERS.map((x) => x.name).join(', ').replace(/, ([^,]*)$/, ' y $1')}.</motion.p>
            <motion.ul className="cifras" {...stag(2)}>
              {CIFRAS.map((x) => <li key={x.t}><b><Count n={x.n} active={c === 3} /></b><span>{x.t}</span></li>)}
            </motion.ul>
          </motion.div>
        )}
        {c === 4 && (
          <motion.div key="c4" className="chap c4">
            <motion.h2 className="big" {...stag(0)}>Dentro de un cúmulo</motion.h2>
            <motion.p className="lead" {...stag(1)}>Los temas orbitan su cúmulo y se conectan con los de otros. En Ciencias Actuariales hay 15, de Gestión de riesgos a Solvencia II, IFRS 17 o Reserving.</motion.p>
          </motion.div>
        )}
        {c === 5 && (
          <motion.div key="c5" className="chap c5">
            <motion.h2 className="big" {...stag(0)}>Cada tema, un espacio de estudio</motion.h2>
            <motion.p className="lead" {...stag(1)}>Ocho secciones por tema: del temario al tutor de IA, con tu progreso y tu calendario dentro.</motion.p>
          </motion.div>
        )}
        {c === 6 && (
          <motion.div key="c6" className="chap c6">
            <motion.h2 className="big" {...stag(0)}>El calendario hace brillar lo que importa</motion.h2>
            <motion.p className="lead" {...stag(1)}>
              {days >= 0 ? <>Examen de {EXAM.label}: <b className="gold">{days === 0 ? 'es hoy' : days === 1 ? 'falta 1 día' : `faltan ${days} días`}</b>. Su tema brilla más cuanto más se acerca.</> : <>El examen de {EXAM.label} ya pasó: su tema recupera el brillo discreto.</>}
            </motion.p>
            <motion.ul className="estados" {...stag(2)}>
              {ESTADOS.map((e) => <li key={e.id} className={e.id === estado ? 'on' : ''}><b>{e.nombre}</b><span>{e.desc}</span></li>)}
            </motion.ul>
          </motion.div>
        )}
        {c === 7 && (
          <motion.div key="c7" className="chap c7">
            <motion.h2 className="big" {...stag(0)}>A dónde se quiere llegar</motion.h2>
            <motion.p className="lead" {...stag(1)}>El mismo esquema, repetido para cada ciencia: {FUTURE.map((f) => f.name).join(', ').replace(/, ([^,]*)$/, ' y $1')}. Un cúmulo por área, con sus temas en órbita y sus conexiones.</motion.p>
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
  const actTopics = TOPICS.filter((t) => t.cluster === 'act');
  const ex = topic(EXAM.topic), rt = topic(RING_TOPIC);
  return (
    <div className="labels" aria-hidden="true">
      <Label pos={[0, 0, 0]} win={[0.3, 0.56]} className="hub">El Gran Atractor</Label>
      {CLUSTERS.map((c) => <Label key={c.id} pos={c.pos} win={[0.4, 0.62]} className="dom"><i style={{ background: c.color, color: c.color }} />{c.name}<small>{c.count} temas</small></Label>)}
      {actTopics.filter((t) => t.id !== RING_TOPIC).map((t) => <Label key={t.id} pos={t.pos} win={[0.53, 0.63]} className="node">{t.name}</Label>)}
      <Label pos={rt.pos} win={[0.52, 0.73]} className="star">{rt.name}</Label>
      <Label pos={ex.pos} win={[0.7, 0.84]} className="star">{ex.name}</Label>
      {ARTEFACTO.map((a, i) => <Label key={a} pos={artefactPos(i)} win={[0.63, 0.72]} className="art"><b>{String(i + 1).padStart(2, '0')}</b>{a}</Label>)}
      {FUTURE.map((f) => <Label key={f.id} pos={f.pos} win={[0.79, 1.01]} className="dom ghost"><i style={{ background: f.color, color: f.color }} />{f.name}<small>por explorar</small></Label>)}
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
          <ul className="ledger">
            {PROYECTOS.map((p, k) => (
              <li key={p.n} className="reveal">
                <a href={p.href} onPointerEnter={() => setI(k)} onFocus={() => setI(k)} className={k === i ? 'is-on' : ''} data-hover>
                  <i style={{ background: p.c, color: p.c }} /><span className="n">{p.n}</span><span className="k">{p.k}</span><span className="y">{p.y}</span>
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

function PortfolioSection() {
  return (
    <section className="block" id="portfolio" aria-labelledby="h-pf">
      <div className="block-in pf">
        <div className="pf-head">
          <h2 id="h-pf" className="sub reveal">Portfolio actuarial</h2>
          <p className="para reveal">Un CV que se juega: una habitación en pixel art donde cada objeto abre un minijuego actuarial que enseña una parte de mi perfil.</p>
        </div>
        <a className="pf-shot reveal" href={PORTFOLIO.href} data-hover aria-label="Abrir el portfolio actuarial">
          <img src="img/actuariales-habitacion.png" width="1200" height="630" alt="La habitación en pixel art del portfolio actuarial: mesa de estudio, pizarra, ordenador, cocina y una ventana con la luna" loading="lazy" />
          <span className="shine" />
        </a>
        <ul className="pf-objs reveal">
          {PORTFOLIO.objetos.map(([a, b], i) => <li key={a}><b>{String(i + 1).padStart(2, '0')}</b><span className="o">{a}</span><span className="d">{b}</span></li>)}
        </ul>
        <div className="pf-cols reveal">
          <div><h3 className="lh">Cómo se usa</h3><ul>{PORTFOLIO.uso.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="lh">Por dentro</h3><ul>{PORTFOLIO.datos.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div className="pf-cta">
            <Magnetic className="cta" href={PORTFOLIO.href} data-hover>Abrir el portfolio</Magnetic>
            <a className="textlink" href={PORTFOLIO.repo} rel="noopener" data-hover>Ver el repositorio</a>
          </div>
        </div>
      </div>
    </section>
  );
}

const REDES = [
  { n: 'GitHub', k: 'LuizLuzuriaga', href: 'https://github.com/LuizLuzuriaga' },
  { n: 'LinkedIn', k: 'Luiz Luzuriaga Izquierdo', href: 'https://www.linkedin.com/in/luiz-luzuriaga-izquierdo/' },
  { n: 'Instagram', k: '@luizluzuriaga · personal', href: 'https://www.instagram.com/luizluzuriaga/' },
  { n: 'Instagram', k: '@lomismoysiempre · arte y música', href: 'https://www.instagram.com/lomismoysiempre/' },
];

function Sobre() {
  return (
    <section className="block" id="sobre-mi" aria-labelledby="h-sobre">
      <div className="block-in about">
        <h2 id="h-sobre" className="sub reveal">Sobre mí</h2>
        <dl className="facts reveal">
          <div><dt>Estudios</dt><dd>Máster en Ciencias Actuariales y Financieras</dd></div>
          <div><dt>Universidad</dt><dd>Universidad de Alcalá</dd></div>
          <div><dt>Curso</dt><dd>Segundo año</dd></div>
          <div><dt>También me llaman</dt><dd>Terre</dd></div>
        </dl>
        <p className="para reveal">Convierto cada asignatura en algo que se pueda recorrer: guías con diagramas de flujo, simulaciones con el código delante y un atlas 3D donde los temas se relacionan. Todo en abierto y en español.</p>
        <p className="para para-2 reveal">De joven improvisaba en el barrio, y esa costumbre se vino conmigo: cuando una situación de estrés lo pide, improvisar es mi mejor arma.</p>
        <ul className="socials reveal" aria-label="Redes">
          {REDES.map((r) => <li key={r.k}><a href={r.href} rel="noopener" data-hover><span>{r.n}</span><small>{r.k}</small></a></li>)}
        </ul>
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
        <ul><li className="first">Código abierto</li><li><a href="https://github.com/LuizLuzuriaga/Gedankenpalast" rel="noopener" data-hover>Repositorio de Gedankenpalast</a></li><li><a href="https://github.com/LuizLuzuriaga/Actuariales" rel="noopener" data-hover>Repositorio del portfolio</a></li><li><a href="https://github.com/LuizLuzuriaga/LuizLuzuriaga.github.io" rel="noopener" data-hover>Repositorio de esta web</a></li></ul>
        <ul><li className="first">En línea</li>{REDES.map((r) => <li key={r.k}><a href={r.href} rel="noopener" data-hover>{r.n}{r.n === 'Instagram' ? (r.k.includes('arte') ? ' · arte y música' : ' · personal') : ''}</a></li>)}</ul>
      </div>
      <p className="foot-mark" aria-hidden="true">Luiz Luzuriaga</p>
      <p className="legal">© 2026 Luiz Luzuriaga. Las capturas son de los propios proyectos.</p>
    </footer>
  );
}

// Resumen de la historia para lectores de pantalla (la historia visual cambia de capítulo con el scroll).
function StoryText() {
  return (
    <div className="sr-only">
      <h2>Gedankenpalast, el universo del conocimiento</h2>
      <p>Una esfera de obsidiana, inspirada en la esfera negra de Gantz, que se abre a un universo tridimensional inspirado en Laniakea, el supercúmulo cuyas galaxias fluyen hacia El Gran Atractor.</p>
      <p>Hoy hay cuatro cúmulos: {CLUSTERS.map((c) => `${c.name} (${c.count} temas)`).join(', ')}. En total, 41 temas, 28 temarios y 29 calculadoras.</p>
      <p>Cada tema abre un espacio de estudio con {ARTEFACTO.length} secciones: {ARTEFACTO.join(', ')}. El calendario hace brillar el tema de un examen cuanto más se acerca.</p>
      <p>El objetivo: repetir el mismo esquema para otras ciencias: {FUTURE.map((f) => f.name).join(', ')}.</p>
    </div>
  );
}

export default function App() {
  const chapter = useChapter();
  useEffect(() => {
    let lenis;
    if (!reduced) {
      lenis = new Lenis({ duration: 1.25, smoothWheel: true, wheelMultiplier: 0.9 });
      lenisRef = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    const st = ScrollTrigger.create({ trigger: '#story', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { store.target = s.progress; } });
    const rv = gsap.utils.toArray('.reveal').map((el) => gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    const links = [...document.querySelectorAll('a[href^="#"]')];
    const onClick = (e) => { const a = e.currentTarget, t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); if (a.getAttribute('href') === '#inicio') scrollToY(0); else goTo(a.getAttribute('href')); } };
    links.forEach((a) => a.addEventListener('click', onClick));
    const onMove = (e) => { store.mouse.x = (e.clientX / innerWidth - 0.5) * 2; store.mouse.y = (e.clientY / innerHeight - 0.5) * 2; };
    window.addEventListener('pointermove', onMove);
    return () => { st.kill(); rv.forEach((r) => r.scrollTrigger && r.scrollTrigger.kill()); links.forEach((a) => a.removeEventListener('click', onClick)); window.removeEventListener('pointermove', onMove); lenis && lenis.destroy(); lenisRef = null; };
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
          <StoryText />
          <div className="sticky">
            <SceneLabels />
            <Chapters c={chapter} />
          </div>
        </section>
        <Proyectos />
        <PortfolioSection />
        <Sobre />
      </main>
      <Footer />
    </>
  );
}
