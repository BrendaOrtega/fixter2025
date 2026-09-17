import { buildCard } from "../_shared.mjs";
// instancia 1 escribe checkpoints → kill → instancia 2 lee y reanuda con la ficha 4
const T = 14;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "03-postgres.html", total: T,
  css: `
    #instance1-ghost-gone { animation: jello 1.2s .5s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #instance2-ghost { animation: tada 1s 9.6s both, bounce 1.1s 12.2s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #postgres-body { animation: rubberband .9s 3.9s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #chip4 { animation: bounce 1s 10.4s both; transform-box: fill-box; transform-origin: 50% 100%; }
  `,
  script: `
    // fotograma 0 completo. Instancia 1 viva al inicio (Ghosty visible), las filas se escriben una a una
    tl.set("#instance1-ghost-gone", { opacity: 1 }, 0.01);
    tl.set("#instance2", { opacity: .55 }, 0.01);
    tl.set("#row1, #row2, #row3", { fill: "#D9D3C4" }, 0.01);
    draw("#arrow-checkpoint path", 1.2, .5);
    [1,2,3].forEach((n, i) => tl.to("#row" + n, { fill: "#8DCF6E", duration: .2 }, 2.0 + i * .8));
    // kill: instancia 1 se apaga, Ghosty se desvanece
    tl.to("#instance1-ghost-gone", { opacity: .25, duration: .4 }, 5.2);
    tl.to("#instance1", { opacity: .6, duration: .3 }, 5.4);
    // instancia 2 despierta, lee (parpadean las filas) y reanuda
    tl.to("#instance2", { opacity: 1, duration: .3 }, 7.0);
    tl.to("#row1, #row2, #row3", { fill: "#85DDCB", duration: .15, stagger: .2, yoyo: true, repeat: 1 }, 7.6);
    draw("#arrow-resume path", 8.8, .5);
  `,
  sfx: { "paper": [2.0, 2.8, 3.6], "power-down": [5.2], "power-up": [7.0], "tick": [7.6, 7.8, 8.0], "whoosh-short": [8.8], "pop": [10.4] } });
