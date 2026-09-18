# Escena 01 — blueprint (RLHF → logos → instrucción → chat)

- Técnica: un `#world` de 4800 px con tres secciones; la "cámara" es un solo tween de `x/y` sobre el mundo (paneo lento en la sección 1, saltos `power2.inOut` a las 2 y 3, subida de 100 px cuando entra "Instruction Following"). Todo GSAP en una timeline pausada; typewriter mono con spans `.ch` (`width:0 → auto`) y cursor rosa; logos como SVG a mano (OpenAI: seis lóbulos rotados; Anthropic: rayos salmón; Gemini: estrella de cuatro puntas con degradado del logo; "otro": anillo con barra).
- Recetas/bloques: ninguno; sólo GSAP + CSS (la retícula es `linear-gradient` de 128 px, seek-safe).
- Se acerca: ritmo palabra por palabra y de los logos (0.25 s), geometría del pill RLHF + conector en L + rayita, esquinas ¬/L, paneo continuo, fila Human/capas/núcleo/Response con chevrones que se acumulan, mock de ChatGPT y "Chat" con ícono; fotograma 0 completo.
- No se acerca: el nudo de OpenAI es más blando que el real; la salida de la sección 1 en el original es un barrido más brusco con desenfoque de movimiento; las órbitas del núcleo en el original giran con puntos más finos; brackets del original parpadean al aparecer, los míos son fijos.
- Verificado sobre out.mp4: start_time 0, 306 frames, blackdetect 0, f0.png con tarjeta completa. Parecido: 3.5/5.
