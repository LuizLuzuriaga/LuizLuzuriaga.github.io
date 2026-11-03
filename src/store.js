// Estado compartido fuera de React: el scroll lo escribe, la escena y el HUD lo leen cada fotograma.
export const store = {
  target: 0,      // progreso del scroll (0..1) en la sección de la historia
  p: 0,           // progreso suavizado
  labels: [],     // etiquetas HTML ancladas a puntos 3D: { el, pos, win, tag }
  mouse: { x: 0, y: 0 },
  webgl: true,
};

// Ventana suave: 0 fuera, 1 dentro, con bordes de 0.03.
export function windowAt(p, a, b, edge = 0.03) {
  const up = Math.min(1, Math.max(0, (p - a) / edge));
  const down = Math.min(1, Math.max(0, (b - p) / edge));
  return Math.min(up, down);
}
