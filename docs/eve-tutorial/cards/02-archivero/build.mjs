import { buildCard } from "../_shared.mjs";
// Archivero entra, Ghosty lleva la ficha 4 al cajón steps, la charola muestra "siguiente".
const T = 12;
buildCard({
  dir: new URL(".", import.meta.url).pathname, frame: "02-archivero.html", total: T,
  css: `
      #ghosty { animation: jello 1.2s .8s both, tada .9s 4.0s both, swing 1.4s 7.0s both; }
      #drawer-steps { animation: headshake .8s 3.95s both; }
      #paper1 { animation: bounce 1s 4.4s both, rubberband 1s 6.2s both; }
      #tray { animation: swing 1.2s 6.2s both; }
      #ghosty, #drawer-steps, #paper1, #tray { transform-box: fill-box; transform-origin: 50% 100%; animation-fill-mode: both; }
  `,
  script: `
      // fotograma 0 completo. Lo "vivo" va por CSS (recetas motion-anything); GSAP sólo mueve la ficha y cambia textos.
      tl.to("#chip4hand", { x: -229, y: -55, duration: .9, ease: "power2.inOut" }, 3.0);
      tl.to("#chip4hand", { opacity: 0, duration: .08 }, 3.9);
      tl.to("#chip4path", { opacity: 0, duration: .2 }, 3.9);
      tl.to("#slot4", { fill: "#8DCF6E", strokeDasharray: "0 0", duration: .15 }, 3.92);
      tl.to("#slot4num", { opacity: 1, duration: .05 }, 3.95);
      tl.set("#nextlbl", { textContent: "siguiente: paso 5" }, 4.5);
  `,
  sfx: { "boing": [0.8], "chip-slide": [3.0], "chip-place": [3.92], "rattle": [3.95], "pop": [4.4], "paper": [6.2] },
});
