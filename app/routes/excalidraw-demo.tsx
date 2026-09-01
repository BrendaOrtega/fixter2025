import { lazy, Suspense, useEffect, useRef, useState } from "react";

const ExcalidrawWrapper = lazy(async () => {
  const [mod] = await Promise.all([
    import("@excalidraw/excalidraw"),
    import("@excalidraw/excalidraw/index.css"),
  ]);
  const { Excalidraw, convertToExcalidrawElements } = mod;

  return {
    default: function Wrapped() {
      const apiRef = useRef<any>(null);
      const lastVersion = useRef<number>(-1);

      useEffect(() => {
        let stopped = false;
        const tick = async () => {
          if (stopped) return;
          try {
            const r = await fetch("/api/excalidraw-scene", { cache: "no-store" });
            if (r.ok) {
              const data = await r.json();
              if (
                apiRef.current &&
                typeof data.version === "number" &&
                data.version !== lastVersion.current
              ) {
                lastVersion.current = data.version;
                // Esperar a que carguen las fuentes: si se mide antes, el texto sale recortado
                await document.fonts.ready;
                const elements = convertToExcalidrawElements(data.elements || []);
                apiRef.current.updateScene({ elements });
                if (data.elements?.length) {
                  apiRef.current.scrollToContent(elements, {
                    fitToContent: true,
                    animate: true,
                  });
                }
              }
            }
          } catch (e) {
            // swallow
          }
        };
        const id = setInterval(tick, 800);
        tick();
        return () => {
          stopped = true;
          clearInterval(id);
        };
      }, []);

      return (
        <Excalidraw
          excalidrawAPI={(api) => {
            apiRef.current = api;
          }}
        />
      );
    },
  };
});

export const meta = () => [{ title: "Excalidraw demo" }];

export default function ExcalidrawDemo() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {mounted ? (
        <Suspense
          fallback={
            <div style={{ padding: 24, color: "#999" }}>Cargando editor…</div>
          }
        >
          <ExcalidrawWrapper />
        </Suspense>
      ) : (
        <div style={{ padding: 24, color: "#999" }}>Cargando…</div>
      )}
    </div>
  );
}
