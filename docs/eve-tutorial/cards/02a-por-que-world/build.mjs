import { buildCard } from "../_shared.mjs";
// 0: título ya visible. Los tres mundos entran uno por uno; Ghosty es el mismo (se mece igual en los tres).
const T = 12;
buildCard({
  dir: new URL(".", import.meta.url).pathname, frame: "02a-por-que-world.html", total: T,
  script: `
      // fotograma 0 completo; lo que se anima es el foco: cada mundo se levanta un poco cuando se nombra
      const focus = (sel, t) => { tl.to(sel, { y: -16, duration: .35, ease: "back.out(2)" }, t); tl.to(sel, { y: 0, duration: .35, ease: "power2.inOut" }, t + 1.6); };
      focus("#w1", 1.0); focus("#w2", 3.2); focus("#w3", 5.4);
      // los tres Ghosty se mecen a la vez: misma ficha, mismo personaje
      tl.to("#w1 use[href='#ghosty'], #w2 use[href='#ghosty'], #w3 use[href='#ghosty']", { y: -10, duration: .7, yoyo: true, repeat: 5, ease: "sine.inOut" }, 7.6);
  `,
  sfx: { "pop": [1.0, 3.2, 5.4], "whoosh-soft": [7.6] },
});
