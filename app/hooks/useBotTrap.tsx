import { useEffect, useRef, useState } from "react";

// Honeypot + tiempo de llenado que exige checkSignupRequest (app/.server/signup-guard.ts).
// `t` se fija al montar en el cliente: el HTML del servidor lo trae en 0, así que un bot que
// raspa el form y hace POST directo no pasa.
// - Forms nativos: renderizar `trap` dentro del <form>.
// - Payloads armados a mano: renderizar `trap` igual y sumar `...fields()` al payload.
export function useBotTrap() {
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), []);
  const honeyRef = useRef<HTMLInputElement>(null);

  const fields = () => ({ website: honeyRef.current?.value ?? "", t: String(startedAt) });
  const trap = (
    <>
      {/* honeypot: un humano no lo ve ni lo llena */}
      <input
        ref={honeyRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <input type="hidden" name="t" value={startedAt} />
    </>
  );
  return { trap, fields };
}
