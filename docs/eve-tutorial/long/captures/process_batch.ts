// N pasos lentos; cada uno es un checkpoint
export default defineWorkflowTool({
  description: "Procesa un lote en N pasos lentos (demo de durabilidad).",
  inputSchema: z.object({ steps: z.number().int().min(1).max(20).default(6) }),
  async *execute({ steps }) {
    "use workflow";
    const done: string[] = [];
    for (let i = 1; i <= steps; i++) {
      const stamp = await runStep(i);
      done.push(stamp);
      yield { progress: `${i}/${steps}`, stamp };
      await sleep("5s");
    }
    return { done };
  },
});

// reloj y log viven en el step: el cuerpo se replaya
async function runStep(i: number) {
  "use step";
  const stamp = `paso ${i} @ ${new Date().toISOString()} pid ${process.pid}`;
  console.log(`[process_batch] ${stamp}`);
  return stamp;
}
