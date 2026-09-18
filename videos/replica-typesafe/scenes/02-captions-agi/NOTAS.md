# Escena 02 — captions + AGI?

- Técnica: dos cuadros congelados (`ref/f_001` y `ref/f_005`, no hay cuadro limpio: el caption quemado se tapa con un parche del mismo cuadro, madera/cortina verticales); captions Inter 106/84 px escritos por caracter con `tl.set` (palabra destacada en rosa → blanco); caja "AGI?" que crece con contorno y se rellena; cortinilla de píxeles 128 px con PRNG mulberry32 (algunas celdas muestran parches del propio video); diagrama en un `#world` que GSAP desplaza como paneo de cámara (retícula, caja, celda rosa que se corre dejando estela clara, conector dibujado con dashoffset, "But" con `back.out`, pregunta palabra por palabra).
- Recetas/bloques: ninguno del registry; el typewriter y la cortinilla siguen el patrón de `../../a/index.html`.
- Se acerca: tiempos de las palabras, posición y tamaño de los captions, la caja AGI?, el paneo del diagrama y el final ("But" + "The 💰 trillion-dollar question is").
- No se acerca: la fuente de la referencia es más angosta y pesada que Inter; la cortinilla de la referencia tiene celdas de tamaño variable y deja restos del caption sobre blanco; el salto de cámara en 6.5–6.75 es más brusco en la original.
- Parecido honesto: 3.5/5.
