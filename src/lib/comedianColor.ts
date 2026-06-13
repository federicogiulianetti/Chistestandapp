/**
 * Color de identidad por comediante / elenco.
 *
 * Asigna a cada nombre un color estable de la paleta (mismo nombre →
 * mismo color, siempre y en toda la app). Sirve para diferenciar de un
 * vistazo las tarjetas de distintos comediantes cuando aparecen juntas
 * (ej.: la "2025" de Luna vs la "2025" de Agus en la vista de un productor).
 *
 * No depende de la base de datos: se calcula a partir del nombre. Si en el
 * futuro querés fijar un color a mano por comediante, se puede guardar en la
 * tabla `comedians` y usarlo acá como override.
 */
const PALETTE = [
  '#2ee65c', // verde de marca
  '#19e3c6', // cyan
  '#ff9e1b', // naranja
  '#a24bff', // violeta
  '#ff5da2', // rosa
  '#3b9eff', // azul
  '#ffd60a', // amarillo
  '#ff6b4a', // coral
  '#7cff5d', // lima
  '#c06bff', // lavanda
]

export function comedianColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return PALETTE[h % PALETTE.length]
}
