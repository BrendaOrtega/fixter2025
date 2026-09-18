# 04 — captions flaws

- Técnica: 5 cuadros congelados limpios del clip (frames 8/98/186/276/376, extraídos por número de frame — `-ss` con `-frames:v 1` cayó en el keyframe equivocado y sacó un plano con captions) cortados donde corta la referencia (0.2 / 3.17 / 6.13 / 9.13 / 12.43 s); captions en Inter 500 con tracking negativo, una sola timeline GSAP: palabra entra cayendo en rosa `#ee6f9f` y pasa a blanco, cajas con borde que crecen desde la izquierda (`scaleX`) con texto tecleado, marcas de esquina afuera y leader line dibujada con `stroke-dashoffset`.
- Recetas: la caída letra por letra de "automation" sigue la idea de `falling-text` (motion-anything) pero implementada sobre la timeline (tweens por letra con stagger de 1 frame) para que sea seek-safe; nada del registry.
- Se acerca: tiempos de cada palabra/caja (±0.1 s), posiciones y tamaños de las cajas y de las dos líneas abajo-izquierda, los cortes de plano, la cola de la tarjeta anterior en los 6 primeros frames.
- No se acerca: en la referencia "These flaws mean that" pasa POR DETRÁS del entrevistado (rotoscopia) y aquí va encima; el glifo de TypeSafe es un cubo genérico; el entrevistado está congelado (no habla); la salida de "These flaws mean that" en la referencia es más compleja que un deslizamiento a la derecha.
- Parecido honesto: 3.5/5.
