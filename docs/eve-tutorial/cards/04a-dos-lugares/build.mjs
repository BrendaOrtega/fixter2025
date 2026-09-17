import { buildCard } from "../_shared.mjs";
const T = 12;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "04a-dos-lugares.html", total: T,
  css: `
    #office-ghost { animation: jello 1.2s .6s both, swing 1.2s 6.5s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #bench-hands { animation: bounce 1.1s 3.4s both, tada 1s 8.5s both; transform-box: fill-box; transform-origin: 50% 100%; }
  `,
  script: `
    // foco alternado: se levanta el lugar que se nombra
    const focus = (sel, t) => { tl.to(sel, { y: -14, duration: .35, ease: "back.out(2)" }, t); tl.to(sel, { y: 0, duration: .35 }, t + 2.4); };
    focus("#office", 0.5); focus("#bench", 3.3);
    tl.to("#office-items text", { x: 6, duration: .2, stagger: .25, yoyo: true, repeat: 1 }, 0.9);
    tl.to("#bench-items text", { x: 6, duration: .2, stagger: .25, yoyo: true, repeat: 1 }, 3.7);
  `,
  sfx: { "pop": [0.5, 3.3], "tick": [0.9, 1.15, 1.4, 1.65, 3.7, 3.95, 4.2, 4.45] } });
