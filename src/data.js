// Datos del universo, separados de la visualización (como pide el documento de concepto, §2.2).
// Los 10 dominios salen del §4 del documento; las conexiones de Ciencia Actuarial, del §5.

export const EXAM = { date: '2026-11-11', label: 'Simulación y modelos', node: 'Ciencia Actuarial' };

export const DOMAINS = [
  { id: 'formales',    name: 'Ciencias formales',     color: '#8ab4ff', pos: [-10, 4, -3],  r: 5.6, sample: 'Matemáticas · Probabilidad · Estadística' },
  { id: 'naturales',   name: 'Ciencias naturales',    color: '#6fe0c0', pos: [-19, -5, 6],  r: 6.2, sample: 'Física · Química · Biología' },
  { id: 'sociales',    name: 'Ciencias sociales',     color: '#e2bd78', pos: [7, -3, -9],   r: 6.4, sample: 'Economía · Psicología · Derecho' },
  { id: 'ingenieria',  name: 'Ingeniería y tecnología', color: '#ff9f6e', pos: [16, 6, 5],  r: 5.4, sample: 'Industrial · Aeroespacial · Robótica' },
  { id: 'salud',       name: 'Salud y vida',          color: '#ff7b8a', pos: [21, -6, -7],  r: 5.2, sample: 'Medicina · Epidemiología · Farmacología' },
  { id: 'computacion', name: 'Computación y datos',   color: '#b394ff', pos: [-2, 10, 8],   r: 5.6, sample: 'IA · Ciencia de datos · Sistemas' },
  { id: 'humanidades', name: 'Humanidades',           color: '#f0e2b6', pos: [3, -12, 13],  r: 5.0, sample: 'Filosofía · Historia · Lingüística' },
  { id: 'artes',       name: 'Artes y creación',      color: '#ff8fd1', pos: [-9, -12, -9], r: 4.6, sample: 'Música · Arquitectura · Cine' },
  { id: 'ambiente',    name: 'Medioambiente',         color: '#8fe06b', pos: [14, -13, 6],  r: 4.4, sample: 'Ecología · Agricultura · Recursos' },
  { id: 'educacion',   name: 'Educación',             color: '#8fd4ff', pos: [-20, 9, -9],  r: 4.4, sample: 'Pedagogía · Didáctica · Evaluación' },
];

const sociales = DOMAINS.find((d) => d.id === 'sociales').pos;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const domainPos = (id) => DOMAINS.find((d) => d.id === id).pos;

// Ciencia Actuarial vive en Ciencias sociales → Economía y finanzas, y se conecta con el resto (§5).
export const ACTUARIAL = { id: 'actuarial', name: 'Ciencia Actuarial', pos: add(sociales, [1.6, 0.9, 1.2]) };

export const NODES = [
  { name: 'Matemáticas',       pos: add(domainPos('formales'), [1.5, 1.2, 0.5]) },
  { name: 'Probabilidad',      pos: add(domainPos('formales'), [-1.2, -0.8, 1.6]) },
  { name: 'Estadística',       pos: add(domainPos('formales'), [0.4, -1.8, -1.3]) },
  { name: 'Ciencia de datos',  pos: add(domainPos('computacion'), [1.8, -0.6, -1]) },
  { name: 'Informática',       pos: add(domainPos('computacion'), [-1.6, 0.9, 1.4]) },
  { name: 'Econometría',       pos: add(sociales, [-1.9, 1.3, 1.0]) },
  { name: 'Finanzas',          pos: add(sociales, [2.4, -1.6, -0.6]) },
  { name: 'Gestión de riesgos', pos: add(sociales, [-0.6, -2.0, 2.2]) },
];

// Las 8 secciones del artefacto de conocimiento (§8).
export const ARTEFACTO = ['Descripción', 'Temario', 'Biblioteca', 'Fórmulas y modelos', 'Ejercicios', 'Tutor de IA', 'Progreso', 'Calendario'];

// Estados visuales del calendario (§9).
export const ESTADOS = [
  { id: 'lejano',    nombre: 'Lejano',    desc: 'indicador discreto',  desde: 31 },
  { id: 'proximo',   nombre: 'Próximo',   desc: 'brillo progresivo',   desde: 8 },
  { id: 'inminente', nombre: 'Inminente', desc: 'mayor intensidad',    desde: 0 },
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
