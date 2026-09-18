# Rueda (32–36 s): lista que gira como disco

- Renglones que giran cada uno alrededor del mismo pivote fuera de cuadro (`transform-origin: -856px`), con tabla de ángulos medida: 0° el activo, ±6° la vecina, ±11° la siguiente. El disco es un `<circle>` fijo (rotarlo como div grande dejaba arista).
- Paso: cada renglón a su nuevo ángulo + el grupo baja 75 px, `power3.inOut` 0.5 s; el color cambia a mitad del giro.
- Inter 500 a 96 px, tracking −0.03em; blanco activo / #8a8a8a el resto.
- Sin igualar: el fondo negro plano (regla de la casa, aquí se respeta la referencia).
