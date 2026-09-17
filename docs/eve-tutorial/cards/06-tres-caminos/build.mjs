import { buildCard } from "../_shared.mjs";
const L = !!process.env.LONG; const T = L ? 50 : 16;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "06-tres-caminos.html", total: T,
  css: `
    #journal-ghost { animation: jello 1.2s ${L ? 6.3 : 1}s both; } #engine-ghost { animation: jello 1.2s ${L ? 18 : 5}s both; } #frozen-box image { animation: headshake 1s ${L ? 29.2 : 9}s both; }
    #journal-ghost, #engine-ghost, #frozen-box image { transform-box: fill-box; transform-origin: 50% 100%; }
    #notebook { animation: swing 1.2s ${L ? 6.5 : 1.2}s both; transform-box: fill-box; transform-origin: 50% 0%; }
    #engine-db { animation: rubberband 1s ${L ? 18.2 : 5.2}s both; transform-box: fill-box; transform-origin: 50% 100%; }
  `,
  script: `
    const focus = (sel, t) => { tl.to(sel, { y: -16, duration: .35, ease: "back.out(2)" }, t); tl.to(sel, { y: 0, duration: .35 }, t + 3.2); };
    focus("#col-journal", ${L ? 6.1 : 0.8}); focus("#col-engine", ${L ? 17.8 : 4.8}); focus("#col-snapshot", ${L ? 28.8 : 8.8});
    tl.set("#frost polygon", { scaleY: 0, transformOrigin: "50% 0%" }, 0.01);
    tl.to("#frost polygon", { scaleY: 1, duration: .5, stagger: .06, ease: "power2.out" }, ${L ? 29.4 : 9.2});
  `,
  sfx: L ? { "pop": [6.1, 17.8, 28.8], "paper": [6.5], "hit-low": [18.2], "card": [29.4] } : { "pop": [0.8, 4.8, 8.8], "paper": [1.2], "hit-low": [5.2], "card": [9.2] } });
