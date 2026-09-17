import { buildCard } from "../_shared.mjs";
const T = 14;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "05-easybits.html", total: T,
  css: `
    #mother-ghost { animation: jello 1.2s .5s both, swing 1.2s 9s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #child-a-ghost { animation: bounce 1s 3.2s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #child-a { animation: bounce 1s 2.6s both; } #child-b { animation: bounce 1s 4.4s both; } #child-c { animation: headshake 1s 6.4s both; }
    #child-a, #child-b, #child-c { transform-box: fill-box; transform-origin: 50% 100%; }
    #adapter { animation: tada 1s 2.2s both; transform-box: fill-box; transform-origin: 50% 50%; }
  `,
  script: `
    draw("#arrow-a", 2.2, .5); draw("#arrow-b", 4.0, .5); draw("#arrow-c", 6.0, .5);
    // la hija C hiberna: carámbanos crecen
    tl.set("#child-c-frost polygon", { scaleY: 0, transformOrigin: "50% 0%" }, 0.01);
    tl.to("#child-c-frost polygon", { scaleY: 1, duration: .5, stagger: .08, ease: "power2.out" }, 6.6);
  `,
  sfx: { "whoosh-short": [2.2, 4.0, 6.0], "pop": [2.6, 4.4], "card": [6.6] } });
