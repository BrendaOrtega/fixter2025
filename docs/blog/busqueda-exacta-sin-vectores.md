---
title: "Búsqueda exacta, sin vectores: por qué Claude Code busca con grep"
slug: busqueda-exacta-sin-vectores
---

Las primeras versiones de Claude Code buscaban en tu código como casi cualquier sistema de RAG: indexaban el repositorio con embeddings de Voyage, guardaban los vectores en una base local y, ante una pregunta, traían los fragmentos más parecidos. Boris Cherny, que dirige el proyecto en Anthropic, contó después que eso "funcionaba bastante bien".

Aun así lo quitaron. Hoy el agente busca con `glob` y `grep`, las mismas herramientas que usarías tú en la terminal, y decide cuántas vueltas dar: busca una palabra, lee lo que encontró, ajusta y vuelve a buscar.

![Una base de vectores en el bote de basura](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/-VKfKhuga2eJ)

> "Superó a todo lo demás por mucho. Por mucho. Fue sorprendente."
> — Boris Cherny

Cherny aclara que esa medición fue interna e informal. Las razones que da para quedarse con grep son más concretas: el índice se desincroniza en cuanto alguien edita un archivo, y además tiene que vivir en algún servidor, con lo que eso implica en seguridad y privacidad. Grep lee el código tal como está en ese momento. El costo es más latencia y más tokens.

---

## Lo que midieron afuera

![Marcador: grep 93.1 contra vectores 75.9](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/EZ1JFIlC8KYj)

En mayo de 2026, un equipo de PwC publicó [*Is Grep All You Need?*](https://arxiv.org/abs/2605.15184). Pusieron a competir grep contra búsqueda vectorial en cuatro arneses —uno propio llamado Chronos, más Claude Code, Codex y Gemini CLI— con cinco modelos, sobre 116 preguntas de LongMemEval, un benchmark de memoria donde el agente tiene que encontrar un dato enterrado en muchas conversaciones viejas.

Cuando los resultados de la búsqueda entran directo al contexto del modelo, grep ganó en las diez combinaciones de arnés y modelo. Algunas filas de su tabla 1:

| Arnés + modelo | grep | vectores |
|---|---|---|
| Codex + GPT-5.4 | 93.1 % | 75.9 % |
| Gemini CLI + Gemini 3.1 Flash-Lite | 87.1 % | 67.2 % |
| Chronos + Gemini 3.1 Flash-Lite | 86.2 % | 62.9 % |
| Claude Code + Claude Opus 4.6 | 76.7 % | 75.0 % |

El mismo paper trae dos matices que conviene leer antes de citar el 93 contra 76:

- Cuando los resultados se escriben a un archivo que el agente tiene que abrir (lo llaman modo programático), los vectores ganaron en cinco de las diez combinaciones. Codex con GPT-5.4 bajó de 93.1 % a 55.2 % con grep.
- El arnés pesa tanto como la técnica. Claude Opus 4.6 con grep sacó 93.1 % dentro de Chronos y 76.7 % dentro de Claude Code, con los mismos datos.

---

## Por qué grep gana en este tipo de preguntas

Los autores lo explican en su sección de limitaciones: en LongMemEval la respuesta casi siempre está escrita tal cual en el texto. Si alguien dijo "mi perro se llama Toby", la palabra *Toby* está ahí y grep la encuentra sin aproximaciones.

Un embedding convierte la pregunta en un punto dentro de un espacio de significados y trae lo que cae cerca. Cerca puede ser otra conversación sobre otro perro. El modelo recibe cinco fragmentos parecidos y tiene que confiar en que el correcto venía entre ellos.

Los mismos autores advierten que donde la evidencia rara vez es literal —resúmenes científicos parafraseados, documentos llenos de imágenes— los vectores o una búsqueda híbrida pueden salir mejor.

---

## Leyes: la cita tiene que ser textual

![Libros de leyes con un separador en el artículo 47](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/viMH1MNyfm3v)

Una ley es casi el caso ideal para grep. Se cita por artículo y fracción, y la cita tiene que ser exacta: un abogado no puede presentar "algo parecido al artículo 47".

Imagina la Ley Federal del Trabajo en texto plano y una persona que pregunta si la pueden despedir por faltar. El agente empieza por las palabras que usaría la propia ley:

```sh
grep -n -i "faltas de asistencia" lft.txt
```

Ahí aparece la fracción X del artículo 47: más de tres faltas en un periodo de treinta días, sin permiso del patrón o sin causa justificada, es causa de rescisión sin responsabilidad para el patrón. Con el número en la mano, el agente busca el artículo completo y los artículos que lo mencionan:

```sh
grep -n -i "artículo 47" lft.txt
```

Cada línea que regresa trae su número de línea, así que la respuesta puede citar el texto literal y cualquiera puede comprobarlo.

El punto débil de grep es el vocabulario. La persona dice "me corrieron" y la ley dice "rescisión". En un buscador de una sola consulta eso deja la respuesta en cero. En la búsqueda agéntica el modelo hace la traducción: prueba "despido", "rescisión", "separación", lee y vuelve a buscar. El conocimiento de derecho laboral ya lo trae el modelo; el índice no tiene que aportarlo.

---

## Cuándo sí conviene un índice

![Fichero de biblioteca con un cajón abierto](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/ywIFTRIApl5_)

- El corpus es tan grande que recorrerlo con grep tarda o cuesta demasiado.
- Las preguntas casi no comparten palabras con el texto, como jurisprudencia redactada de mil maneras.
- El contenido no es texto plano: escaneos, tablas en imagen, audio.

Para un asistente sobre leyes, el orden razonable es empezar con el texto plano, grep y un modelo que pueda dar varias vueltas, y medir con preguntas reales de usuarios. Si el agente falla porque no encuentra el artículo, ese es el momento de agregar embeddings, y probablemente como segunda herramienta junto a grep, no en su lugar.

Si quieres ver cómo armamos agentes con estas herramientas, en el [canal de YouTube](https://www.youtube.com/@fixtergeek) hay sesiones completas.

**Fuentes**

- Sen et al., [*Is Grep All You Need? How Agent Harnesses Reshape Agentic Search*](https://arxiv.org/abs/2605.15184), arXiv 2605.15184, mayo 2026.
- Boris Cherny sobre RAG contra búsqueda agéntica, [resumen y citas en OfficeChai](https://officechai.com/ai/claude-researcher-explains-how-agentic-search-performed-better-than-rag-for-code-generation/).

Abrazo. Blissmo. 🤓
