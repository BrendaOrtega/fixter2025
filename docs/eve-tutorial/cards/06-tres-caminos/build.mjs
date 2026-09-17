import { buildCard } from "../_shared.mjs";
const T = 16;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "06-tres-caminos.html", total: T,
  css: `
    #journal-ghost { animation: jello 1.2s 1s both; } #engine-ghost { animation: jello 1.2s 5s both; } #frozen-box image { animation: headshake 1s 9s both; }
    #journal-ghost, #engine-ghost, #frozen-box image { transform-box: fill-box; transform-origin: 50% 100%; }
    #notebook { animation: swing 1.2s 1.2s both; transform-box: fill-box; transform-origin: 50% 0%; }
    #engine-db { animation: rubberband 1s 5.2s both; transform-box: fill-box; transform-origin: 50% 100%; }
  `,
  script: `
    const focus = (sel, t) => { tl.to(sel, { y: -16, duration: .35, ease: "back.out(2)" }, t); tl.to(sel, { y: 0, duration: .35 }, t + 3.2); };
    focus("#col-journal", 0.8); focus("#col-engine", 4.8); focus("#col-snapshot", 8.8);
    tl.set("#frost polygon", { scaleY: 0, transformOrigin: "50% 0%" }, 0.01);
    tl.to("#frost polygon", { scaleY: 1, duration: .5, stagger: .06, ease: "power2.out" }, 9.2);
  `,
  sfx: { "pop": [0.8, 4.8, 8.8], "paper": [1.2], "hit-low": [5.2], "card": [9.2] } });
