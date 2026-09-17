// Escenas por capítulo. from/to = índices de marks (to inclusive). La escena dura desde marks[from].start
// hasta marks[to+1].start (o el fin del capítulo). kind: card | term | web | broll | code | pieces | tree | list | cta
export const CAPTURE = (f) => `captures/${f}`;
export const scenes = {
  0: [
    { from: 0, to: 0, kind: "hello" },
    { from: 1, to: 5, kind: "card", src: "01-congelado-long" },            // la tarjeta 01 completa (15 s) ≈ marks 1–5
    { from: 6, to: 6, kind: "term", title: "eve dev --no-ui", file: "eve-run.txt" },
    { from: 7, to: 7, kind: "web", src: "captures/web/eve-hero.png" },
  ],
  1: [
    { from: 8, to: 9, kind: "newagent" },
    { from: 10, to: 17, kind: "pieces" },
    { from: 18, to: 18, kind: "web", src: "captures/web/eve-directory.png" },
    { from: 19, to: 25, kind: "tree" },
  ],
  2: [
    { from: 26, to: 29, kind: "levels" },
    { from: 30, to: 33, kind: "card", src: "01-congelado" },
    { from: 34, to: 41, kind: "code", file: "process_batch.ts", hl: { 35: [1, 5], 36: [5, 5], 37: [20, 20], 38: [18, 19], 39: [20, 21], 40: [20, 21], 41: [11, 11] } },
    { from: 42, to: 48, kind: "code", file: "approval.ts", hl: { 43: [1, 3], 45: [5, 7], 46: [9, 12], 47: [9, 12], 48: [14, 17] } },
  ],
  3: [
    { from: 49, to: 50, kind: "term", title: "ls .eve/.workflow-data", file: "workflow-data.txt" },
    { from: 51, to: 51, kind: "card", src: "02a-por-que-world" },
    { from: 52, to: 56, kind: "card", src: "02-archivero" },
    { from: 57, to: 57, kind: "web", src: "captures/web/worlds-managed.png" },
    { from: 58, to: 58, kind: "web", src: "captures/web/worlds-selfhosted.png" },
    { from: 59, to: 59, kind: "web", src: "captures/web/worlds-community.png" },
    { from: 60, to: 64, kind: "code", file: "sandbox-backend.ts", hl: { 61: [1, 12], 62: [14, 18], 64: [1, 1] } },
  ],
  4: [
    { from: 65, to: 68, kind: "card", src: "03-postgres" },
    { from: 69, to: 72, kind: "term", title: "psql eve_demo", file: "pg-tables.txt" },
    { from: 73, to: 77, kind: "term", title: "eve-demo", file: "pg-install.txt" },
    { from: 78, to: 83, kind: "term", title: "eve dev --no-ui · psql", file: "pg-kill.txt" },
  ],
  5: [
    { from: 84, to: 86, kind: "card", src: "04a-dos-lugares" },
    { from: 87, to: 91, kind: "card", src: "04b-frontera" },
    { from: 92, to: 92, kind: "web", src: "captures/web/steve.png" },
    { from: 93, to: 96, kind: "term", title: "caja eve-nitro · docker", file: "docker.txt" },
  ],
  6: [
    { from: 97, to: 101, kind: "card", src: "05-easybits" },
    { from: 102, to: 102, kind: "web", src: "captures/web/npm-eve-sandbox.png" },
    { from: 103, to: 106, kind: "term", title: "eve-demo", file: "eb-install.txt" },
    { from: 107, to: 110, kind: "term", title: "eve build && eve start", file: "eb-start.txt" },
    { from: 111, to: 111, kind: "web", src: "captures/web/npm-easybits-org.png" },
  ],
  7: [
    { from: 112, to: 123, kind: "card", src: "06-tres-caminos-long" },
    { from: 124, to: 127, kind: "cta" },
  ],
};
