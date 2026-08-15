/**
 * La escala de capas del sitio, en un solo lugar.
 *
 * Antes había diecisiete valores repartidos a mano —60, 100, 150, 200, 300,
 * 320, 335, 340, 400, 410, 999— y ninguno sabía de los otros. El resultado era
 * el que se ve: el menú de videos tapando el cajón de compra, los avisos de
 * éxito debajo de la navbar, y un banner en 999 que se ponía encima incluso de
 * un diálogo de confirmación.
 *
 * Las dos reglas que faltaba escribir:
 *   1. Un cajón siempre gana al menú.
 *   2. Un diálogo siempre gana al cajón — es lo que confirma algo que el cajón
 *      está pidiendo, así que no puede quedar debajo.
 *
 * Cuidado al usar estos valores: un ancestro con `position` y z-index propio
 * crea un stacking context y encierra a sus hijos, sin importar lo alto que sea
 * su número. Si algo "no sube", el problema casi nunca es el valor.
 */
export const LAYER = {
  /** Contenido normal. */
  base: 0,
  /** Encabezados que se quedan pegados al hacer scroll. */
  sticky: 10,
  /** Controles del reproductor, sobre el video pero bajo todo lo demás. */
  playerControls: 60,
  /** Avisos flotantes y banners de campaña. */
  banner: 150,
  /** Navegación principal. */
  navbar: 200,
  /** Menú lateral de videos: cubre la navegación, no los cajones. */
  sidebar: 300,
  /** El fondo oscurecido de un cajón. */
  overlay: 400,
  /** El cajón. */
  drawer: 410,
  /** Confirmaciones. Siempre por encima del cajón que las pidió. */
  dialog: 500,
  /** Avisos efímeros, lo último que se dibuja. */
  toast: 600,
} as const;

export type LayerName = keyof typeof LAYER;

/** Para estilos inline: `style={layer("drawer")}`. */
export const layer = (name: LayerName) => ({ zIndex: LAYER[name] });
