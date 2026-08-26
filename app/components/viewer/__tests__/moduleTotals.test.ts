/**
 * La aritmética del encabezado de módulo.
 *
 * El «Capítulo NN» que había en su sitio salía de la POSICIÓN en la lista, así
 * que un grupo que no es un módulo —los Webinars del curso de sistemas
 * agénticos— corría la cuenta y «ACP desde cero» se anunciaba como Capítulo 03
 * mientras su propio video decía MÓDULO 02. Se cambió por un recuento, que no
 * puede estar mal… siempre que sume bien. Eso es lo que fija esto.
 *
 * No hay test del componente: `@testing-library/react` NO está instalado en
 * este repo (el `AudioPlayer.test.tsx` que lo importa lleva roto desde siempre)
 * y añadirlo rompería el hash de las `node_modules` horneadas del runner de CI.
 */
import { describe, it, expect } from "vitest";
import { totalMinutos, formatTotal } from "../UnifiedSidebarMenu";

const v = (duration: unknown) => ({ duration }) as any;

describe("totalMinutos", () => {
  it("suma las duraciones del grupo", () => {
    expect(totalMinutos([v("48"), v("40"), v("7")])).toBe(95);
  });

  it("un video sin duración vale cero, no rompe la suma", () => {
    expect(totalMinutos([v("5"), v(""), v(null), v(undefined)])).toBe(5);
  });

  it("una duración que no es número NO envenena el total", () => {
    // `+"por definir"` es NaN, y sin el guardia se llevaba el grupo entero.
    expect(totalMinutos([v("5"), v("por definir")])).toBe(5);
  });

  it("conserva los decimales: `duration` son minutos, no segundos", () => {
    expect(totalMinutos([v("2.5"), v("2.5")])).toBe(5);
  });

  it("un grupo vacío es cero", () => {
    expect(totalMinutos([])).toBe(0);
  });
});

describe("formatTotal", () => {
  it("por debajo de una hora, minutos", () => {
    expect(formatTotal(8)).toBe("8m");
    expect(formatTotal(59)).toBe("59m");
  });

  it("a partir de una hora, horas — «161m» no se lee", () => {
    expect(formatTotal(161)).toBe("2h 41m");
    expect(formatTotal(60)).toBe("1h 0m");
  });

  it("redondea, no trunca", () => {
    expect(formatTotal(4.6)).toBe("5m");
  });

  it("cero no pinta nada: un módulo sin duraciones no dice «0m»", () => {
    expect(formatTotal(0)).toBe("");
  });
});
