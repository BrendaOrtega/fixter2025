# Screen Recorder con AutoZoom

Este paquete contiene un prototipo de grabador de pantalla con funcionalidad de autozoom similar a la que ofrece [Screen Studio](https://screen.studio/changelog). Es una demostración visual de cómo funciona la característica de autozoom, que automáticamente detecta áreas de interés y hace zoom en ellas durante la grabación.

## Características principales

- **AutoZoom inteligente**: Detecta automáticamente áreas de interés en la pantalla y hace zoom en ellas
- **Animación de cursor realista**: Simulación física del movimiento del cursor con efectos de estela según la velocidad
- **Efectos visuales de zoom**: Transiciones suaves con indicador visual del nivel de zoom
- **Controles ajustables**: Configura la sensibilidad del zoom y la velocidad de transición

## Cómo funciona el AutoZoom

El sistema de AutoZoom funciona mediante los siguientes principios:

1. **Detección de áreas de interés**: Identifica automáticamente elementos relevantes en la pantalla como texto, cursor o elementos interactivos
2. **Cálculo dinámico del nivel de zoom**: El nivel de zoom se ajusta según el tamaño del área de interés (áreas más pequeñas reciben mayor zoom)
3. **Transiciones suaves**: Utiliza funciones de easing para crear transiciones naturales entre las diferentes áreas enfocadas
4. **Seguimiento del cursor**: Combina la posición del cursor con el contexto circundante para determinar la mejor área para hacer zoom

## Implementación técnica

- El componente principal es la clase `AutoZoom` que maneja la lógica de detección y aplicación del zoom
- Utiliza una simulación física para el movimiento del cursor, con variables como masa, amortiguación y aceleración
- Las transiciones de zoom utilizan CSS transforms con propiedades de transition para lograr animaciones suaves
- El cálculo del zoom considera tanto la posición del elemento como su tamaño para determinar el nivel óptimo

## Demo

Para ver la demostración:

1. Abre `index.html` en un navegador
2. Haz clic en "Iniciar Grabación"
3. Observa cómo la vista derecha automáticamente hace zoom en diferentes áreas mientras el cursor se mueve
4. Puedes ajustar la sensibilidad y velocidad con los controles en la parte inferior

## Proyecto de demostración

Este es un prototipo para ilustrar la funcionalidad de autozoom y podría ser utilizado como base para una implementación completa de un grabador de pantalla con funcionalidades avanzadas.

## Notas de implementación

- En una implementación real, el zoom se aplicaría sobre el video capturado en tiempo real
- La detección de áreas de interés podría mejorarse con algoritmos de visión por computadora
- El comportamiento del scroll se podría optimizar para un comportamiento más natural
