// un step interrumpido se vuelve a ejecutar completo
async function chargeCard(input) {
  "use step";
  // idempotente: el mismo id nunca cobra dos veces
  return stripe.charges.create(
    { amount: input.amount, customer: input.customer },
    { idempotencyKey: input.chargeId },
  );
}
export default defineTool({
  description: "Cobra una tarjeta.",
  approval: always(),          // una persona aprueba antes de correr
  async execute(input) { return chargeCard(input); },
});
// o el agente pregunta y la sesión se estaciona hasta la respuesta
const answer = await ctx.ask({
  prompt: "¿Cobro $1,200 a la tarjeta terminada en 4242?",
  display: "confirmation",
});
