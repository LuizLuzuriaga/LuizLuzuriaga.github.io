// Datos del universo, separados de la visualización (documento de concepto, §2.2).
// Lo que hay hoy sale del atlas publicado (Gedankenpalast/Fundacion/atlas.js, coordenadas ÷10);
// a dónde se quiere llegar, del documento de concepto (§12) y de la libreta.
import atlas from './atlas.json';

export const EXAM = { date: '2026-11-11', label: 'Simulación y modelos', topic: 'ds_simulacion' };

const k = 0.1;
const sc = (a) => [a[0] * k, a[1] * k, a[2] * k];

// Los cuatro cúmulos que existen hoy.
export const CLUSTERS = atlas.clusters.map((c) => ({
  id: c.id, name: c.name, color: c.hue, pos: sc(c.center), r: c.radius * k,
  count: atlas.topics.filter((t) => t.cluster === c.id).length,
}));

// Los temas (41), repartidos en órbita alrededor de su cúmulo con una semilla fija.
function seeded(n) { let a = n; return () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; }; }
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
export const TOPICS = atlas.topics.map((t) => {
  const c = CLUSTERS.find((x) => x.id === t.cluster), r = seeded(hash(t.id));
  const rad = c.r * (0.35 + r() * 0.6), a = r() * 6.2832, y = (r() - 0.5) * c.r * 0.7;
  return { id: t.id, cluster: t.cluster, name: t.name, related: t.related, pos: [c.pos[0] + Math.cos(a) * rad, c.pos[1] + y, c.pos[2] + Math.sin(a) * rad], color: c.color };
});
export const topic = (id) => TOPICS.find((t) => t.id === id);
export const cluster = (id) => CLUSTERS.find((c) => c.id === id);

// Las relaciones entre temas (sin duplicar).
export const LINKS = (() => {
  const seen = new Set(), out = [];
  TOPICS.forEach((t) => t.related.forEach((id) => {
    const o = topic(id); if (!o) return; const key = [t.id, id].sort().join('|');
    if (!seen.has(key)) { seen.add(key); out.push([t, o]); }
  }));
  return out;
})();

// Lo que se quiere explorar: el mismo esquema para el resto de ciencias (libreta y §12 del documento).
const FUT = [
  ['fisica', 'Física', '#9db8ff'], ['quimica', 'Química', '#7be0c3'], ['biologia', 'Biología', '#8fe06b'],
  ['medicina', 'Medicina', '#ff7b8a'], ['psicologia', 'Psicología', '#ff8fd1'], ['ingenieria', 'Ingeniería', '#ff9f6e'], ['filosofia', 'Filosofía', '#f0e2b6'],
];
const FY = [12, -20, 22, -8, 18, -24, 6];
export const FUTURE = FUT.map(([id, name, color], i) => {
  const a = (i / FUT.length) * 6.2832 + 0.55, rr = 50 + (i % 2) * 8;
  return { id, name, color, pos: [Math.cos(a) * rr, FY[i], Math.sin(a) * rr], r: 6.5 };
});

// Las 8 secciones del artefacto de conocimiento (§8).
export const ARTEFACTO = ['Descripción', 'Temario', 'Biblioteca', 'Fórmulas y modelos', 'Ejercicios', 'Tutor de IA', 'Progreso', 'Calendario'];
export const RING_TOPIC = 'act_solvencia';   // el tema alrededor del que giran las 8 secciones

// Estados visuales del calendario (§9).
export const ESTADOS = [
  { id: 'lejano', nombre: 'Lejano', desc: 'indicador discreto' },
  { id: 'proximo', nombre: 'Próximo', desc: 'brillo progresivo' },
  { id: 'inminente', nombre: 'Inminente', desc: 'mayor intensidad' },
];

// Cifras reales del atlas publicado (salida del validador de Gedankenpalast).
export const CIFRAS = [
  { n: 41, t: 'temas' },
  { n: 28, t: 'temarios' },
  { n: 29, t: 'calculadoras' },
];

export const PROYECTOS = [
  { n: 'Gedankenpalast', k: 'Atlas 3D de estudio', y: '2026', href: 'https://luizluzuriaga.github.io/Gedankenpalast/', img: 'img/atlas.jpg', alt: 'El atlas 3D de Gedankenpalast con un tema abierto en el panel lateral', c: '#e2bd78' },
  { n: 'Simulación y modelos', k: 'Guía de estudio', y: '2026', href: 'https://luizluzuriaga.github.io/Gedankenpalast/Fundacion/guias/simulacion.html', img: 'img/simulacion.jpg', alt: 'Guía de Simulación y modelos para el análisis de datos actuariales y financieros', c: '#8ab4ff' },
  { n: 'Estadística bayesiana', k: 'Guía de estudio', y: '2026', href: 'https://luizluzuriaga.github.io/Gedankenpalast/Fundacion/guias/bayesiana.html', img: 'img/bayesiana.jpg', alt: 'Guía de Estadística bayesiana con laboratorios interactivos', c: '#b394ff' },
  { n: 'Previsión social', k: 'Guía de estudio', y: '2026', href: 'https://luizluzuriaga.github.io/Gedankenpalast/Fundacion/guias/prevision_social.html', img: 'img/psc.jpg', alt: 'Guía de Previsión social con líneas temporales', c: '#6fe0c0' },
  { n: 'Seguridad Social', k: 'Guía de práctica', y: '2026', href: 'https://luizluzuriaga.github.io/Gedankenpalast/Fundacion/guias/seguridad_social.html', img: 'img/asignaturas.jpg', alt: 'Plataforma de tests de Seguridad Social con bloques de preguntas', c: '#ff9f6e' },
  { n: 'Portfolio actuarial', k: 'Habitación interactiva', y: '2025', href: 'https://luizluzuriaga.github.io/Actuariales/', img: 'img/actuariales.jpg', alt: 'Portfolio actuarial como habitación interactiva con minijuegos', c: '#ff8fd1' },
];

// Portfolio actuarial: lo que hay en la habitación (README del repositorio Actuariales).
export const PORTFOLIO = {
  href: 'https://luizluzuriaga.github.io/Actuariales/',
  repo: 'https://github.com/LuizLuzuriaga/Actuariales',
  objetos: [
    ['Mesa de estudio', 'La trayectoria como tabla de mortalidad profesional (qₓ, lₓ)'],
    ['Pizarra', 'Cadena de Markov con las etapas de la carrera y sus probabilidades de transición'],
    ['Ordenador', 'Proyectos presentados como pólizas No-Vida: ramo, prima y cobertura'],
    ['Escritorio lateral', 'Simulación Monte Carlo de 1.000 trayectorias, con histograma y percentiles'],
    ['Cocina', 'Calculadora de prima pura E[X] = Σ pᵢ·vᵢ·wᵢ con deslizadores'],
    ['Barra de dominadas', 'Perfil deportivo'],
    ['Ventana', 'CV completo'],
  ],
  uso: ['Teclado: flechas o WASD para moverte, E junto a un objeto, Esc para cerrar', 'Ratón: clic en un objeto o en el mapa de secciones', 'Móvil: cruceta y botón E bajo la habitación'],
  datos: ['Pixel art en canvas', 'HTML, CSS y JavaScript sin librerías', 'Teclado completo, etiquetas ARIA y movimiento reducido'],
};

export function daysToExam(now = new Date()) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(EXAM.date + 'T00:00') - day) / 864e5);
}

// 0..1: cuánto brilla el nodo según la proximidad del examen.
export function examGlow(days) {
  if (days < 0) return 0.25;
  if (days <= 3) return 1;
  if (days <= 7) return 0.82;
  if (days <= 14) return 0.62;
  if (days <= 30) return 0.45;
  return 0.3;
}
