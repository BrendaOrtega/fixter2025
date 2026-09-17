import { buildCard } from "../_shared.mjs";
const T = 12;
buildCard({ dir: new URL(".", import.meta.url).pathname, frame: "04b-frontera.html", total: T,
  css: `
    #left-ghost { animation: jello 1.2s .4s both, headshake 1s 7.2s both; transform-box: fill-box; transform-origin: 50% 100%; }
    #secrets { animation: heartbeat 1.3s 7.2s both; transform-box: fill-box; transform-origin: 50% 50%; }
    #net { animation: shakex .8s 9.4s both; transform-box: fill-box; transform-origin: 50% 50%; }
  `,
  script: `
    draw("#arrow-cmd path", 1.5, .6);
    tl.from("#shell text:nth-of-type(2), #shell text:nth-of-type(3), #shell text:nth-of-type(4)", { opacity: 0, duration: .15, stagger: .6, immediateRender: false }, 2.3);
    draw("#arrow-res path", 4.6, .6);
    tl.to("#border line", { strokeDashoffset: -64, duration: 2, ease: "none", repeat: 4 }, 0);
  `,
  sfx: { "whoosh-short": [1.5, 4.6], "tick": [2.3, 2.9, 3.5], "hit-low": [7.2], "8bit-alarm": [9.4] } });
