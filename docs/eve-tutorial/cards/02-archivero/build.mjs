import { buildCard } from "../_shared.mjs";
// Archivero entra, Ghosty lleva la ficha 4 al cajón steps, la charola muestra "siguiente".
const T = 12;
buildCard({
  dir: new URL(".", import.meta.url).pathname, frame: "02-archivero.html", total: T,
  script: `
      // fotograma 0 completo: archivero, Ghosty con la 4 y charola ya están; se anima el viaje de la ficha
      tl.to("#cabinet", { y: -10, duration: .35, ease: "back.out(2)" }, 0.6); tl.to("#cabinet", { y: 0, duration: .35 }, 1.4);
      // Ghosty se mece y la ficha viaja al hueco punteado del cajón
      tl.to("image", { y: -10, duration: .7, yoyo: true, repeat: 3, ease: "sine.inOut" }, 1.2);
      tl.to("g[transform*='rotate(-16'] rect, g[transform*='rotate(-16'] text", { x: -200, y: -30, duration: .8, ease: "power2.inOut" }, 3.0);
      tl.to("g[transform*='rotate(-16']", { opacity: 0, duration: .1 }, 3.8);
      tl.to("#slot4", { fill: "#8DCF6E", strokeDasharray: "0 0", duration: .2 }, 3.85); tl.to("#slot4num", { opacity: 1, duration: .1 }, 3.9);
      tl.to("#tray", { y: -10, duration: .35, ease: "back.out(2)" }, 5.6); tl.to("#tray", { y: 0, duration: .35 }, 6.4);
      tl.to("#tray rect:nth-of-type(5)", { y: -6, duration: .3, yoyo: true, repeat: 3, ease: "sine.inOut" }, 6.4);
  `,
  sfx: { "drawer-open": [0.6], "chip-slide": [3.0], "chip-place": [3.85], "paper": [5.6] },
});
