# Estilo "goodies" — short vertical de puro motion graphics ⭐️⭐️⭐️⭐️⭐️

Aprobado por bliss el 17 ago 2026 sobre `videos/goodies-sdk/`. **Este es el
estilo a reusar** para shorts que explican una idea técnica sin grabación de
pantalla ni cara. Copia ese proyecto y cambia el contenido.

---

## La forma

**Cuatro o cinco escenas, cada una un solo golpe.** Nada de escenas que expliquen
dos cosas: una idea, un número, un corte.

Dentro de cada escena, **dos paneles** que se relevan con un deslizamiento duro:
el A sale por la izquierda, el B entra por la derecha, 0.42s con `power4.inOut`.
Sin fundidos. El panel A plantea, el B demuestra.

```js
tl.to("#sX-a", { xPercent: -100, duration: 0.42, ease: "power4.inOut" }, T);
tl.to("#sX-b", { xPercent:    0, duration: 0.42, ease: "power4.inOut" }, T);
```

**Todo centrado vertical** (`justify-content: center`, padding 200px). La primera
versión llevaba el contenido pegado arriba y la mitad de abajo se veía muerta.

## La tipografía

- Titulares en **Archivo Black**, 90–120px, `line-height: 0.92`,
  `letter-spacing: -0.03em`. Una palabra clave en ámbar dentro de un `<em>` sin
  cursiva.
- Números protagonistas en 260–520px. **El número es la diapositiva.**
- Todo lo demás en **JetBrains Mono**: kickers en mayúsculas con
  `letter-spacing: 0.22em`, notas al pie en morado claro.

## La paleta

| | |
| --- | --- |
| Fondo | `#0b0b0f` |
| Panel / tarjeta | `#15121f` |
| Morado (estructura, bordes) | `#7c3aed`, texto `#a78bfa` |
| Ámbar (el dato, el CTA) | `#fbbf24` |
| Texto | `#f7f0e4`, apagado `#7a7a8c` |
| Tercer acento (solo en listas de tres) | `#4fc7ee` |

Bordes de **5px sólidos** y `box-shadow: 14px 14px 0` del mismo morado al 33%.
Nada de esquinas redondeadas ni gradientes en los bloques.

## El fondo

Nunca negro plano. Retícula de 60px que recorre **una celda exacta** en diagonal
(así el bucle cierra sin salto), dos manchas de color con `blur(120px)`
respirando desfasadas, y una viñeta radial que aprieta la lectura al centro.

## La transición

Seis columnas con la misma retícula caen desde arriba con **35ms de retraso entre
columna** — esa demora es la que dibuja la diagonal — tapan el corte y siguen de
largo hacia abajo. 0.3s al cerrar, 0.32s al abrir.

## Reglas que no se rompen

- **El cuadro 0 va completo.** Lo que se anima es un asentamiento (`from` con
  `y: 26`) sobre algo que ya está puesto, nunca una aparición desde la nada.
- **`repeat` finito, jamás `-1`**: rompe el render determinista por cuadro.
- **Y con suficientes repeticiones para cubrir la escena entera.** Un bucle de 12
  repeticiones se congeló a media escena y parecía que el video se atoraba.
- **Nada espera a la narración para aparecer.** Los elementos entran en cuanto
  el panel entra; cuando la voz los nombra, dan un **pulso de escala** (1.22, 0.18s,
  yoyo). Si esperan, quedan huecos vacíos de tres segundos.

---

## El guion

**Decir de qué se habla en los primeros cinco segundos.** La primera versión
enumeraba ventajas sin nombrar nunca la herramienta. La escena 0 existe para eso:
el nombre en 200px y tres etiquetas con los identificadores reales.

**Nada de números sin la unidad de comparación.** "256 / 381 tokens" no dice
nada: hay que traducirlo a lo que le importa a quien mira — el porcentaje, el
"30× menos", el precio. El número grande debe entenderse **sin leer la letra
chica**.

Frases cortas, una por corte. Voz `em_santa` a velocidad 1.0, anglicismos en
fonética (`ei-ai ese-de-ka`, `dipsíc`, `versél`).

---

## El audio

**La cama musical NO va en la línea de tiempo de HyperFrames**: ahí se mezcla a
volumen fijo y tapa la voz en los picos. El render sale solo con narración y la
música entra después con `sidechaincompress` contra la propia voz
(`mezclar.sh`).

```
[1:a]volume=0.4[cama];
[cama][llave]sidechaincompress=threshold=0.05:ratio=9:attack=6:release=380[camaduck];
```

Pista de Openverse/Jamendo (Mixkit ya se agotó; el flujo completo está en
`scripts/bgm/README.md` y **ahora hay que dar crédito CC BY**), **nueva
cada video**, elegida midiendo con `scripts/bgm/medir-bgm.mjs`
(BPM por autocorrelación del flujo de onsets, RMS y punch). bliss pide **movida**:
BPM alto. Dos pistas fueron rechazadas por lentas antes de dar con la buena.

---

## Cómo se produce

```bash
cd videos/<proyecto>
export HYPERFRAMES_PYTHON=~/.venv-tts/bin/python   # kokoro vive ahí
npx hyperframes tts --text-file /tmp/a.txt -v em_santa -l es -o assets/voice/a.wav --json
npx hyperframes check                               # lint + contraste AA
npx hyperframes render -o renders/x.mp4 -q high -f 30
./mezclar.sh
```

El `--json` del TTS devuelve la duración exacta: **de ahí salen los `data-start`**
de la línea de tiempo, no de la estimación.

## Verificación en el archivo entregado

```bash
ffmpeg -i final.mp4 -vf blackdetect=d=0.05:pic_th=0.98 -an -f null -   # cero
ffprobe -show_entries stream=start_time -of csv=p=0 final.mp4          # 0
ffmpeg -ss 0 -i final.mp4 -frames:v 1 f0.png                           # tarjeta completa
```

Y para comprobar que un bucle no se congeló, comparar dos cuadros separados 0.2s
en la zona que se mueve: la diferencia media de píxeles debe ser parecida al
principio y al final de la escena.

## Tiempos reales

Proyecto completo de 44s: **~2 horas**, con dos rondas de correcciones. El render
tarda 1 minuto; medir 21 pistas de música, 3 minutos.
