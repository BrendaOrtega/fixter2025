---
title: "Un comando y tu agente ya sabe hablar con Ghosty Studio: así usamos `npx skills` de Vercel"
slug: npx-skills-vercel-ghosty-studio
mainTag: agentes
tags: [agentes, ai, claude, tutorial]
authorName: Héctorbliss
contentFormat: markdown
---

Escribe esto en una terminal, dentro de cualquier proyecto:

```sh
npx skills add https://www.ghosty.studio
```

Y sale esto:

```
●  Skill: ghosty-agent
◇  73 agents
●  Installing to: Claude Code, Cline, Codex, Cursor, Gemini CLI, GitHub Copilot, Goose, Kiro CLI, OpenCode, Qoder, Windsurf, Zed

  ✓ ./.agents/skills/ghosty-agent
    universal: Cline, Codex, Cursor, Gemini CLI, GitHub Copilot +12 more
    symlinked: Claude Code, Goose, Kiro CLI, Qoder, Windsurf

└  Done!  Review skills before use; they run with full agent permissions.
```

Desde ese momento, Claude Code (o Cursor, o Codex, o el editor que uses) sabe configurar un agente de Ghosty Studio: cambiarle la identidad, subirle archivos, conectarle un servidor MCP, reiniciarlo. Dos archivos de markdown bajaron a tu carpeta y con eso alcanza: tú ya no pegas documentación en el prompt ni instalas un SDK.

![Terminal con npx skills add instalando ghosty-agent](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/BvC7_c1Dg0NB)

Este post cuenta las dos mitades de ese comando: qué es `skills`, el CLI que publicó Vercel, y qué pusimos nosotros del lado de ghosty.studio para que la URL funcione como fuente.

## La mitad de Vercel: un instalador de skills para 73 agentes

Un *skill* es una carpeta con un `SKILL.md`. El archivo abre con un frontmatter YAML de dos campos, `name` y `description`, y sigue con instrucciones en markdown. Es el formato de Agent Skills que arrancó Anthropic para Claude Code y que hoy leen también Codex, Cursor, Gemini CLI, Copilot, Goose, Windsurf, Zed y un montón más. Cada uno lo busca en su propia carpeta: `.claude/skills`, `.codex/skills`, `.cursor/skills`…

Ahí está el problema que resuelve `skills`. Tú escribes el skill una vez y el CLI lo pone donde cada agente lo va a buscar. En la corrida de arriba lo copió a `./.agents/skills/ghosty-agent` (la ruta "universal") y dejó symlinks para los agentes que insisten en su carpeta propia. Además deja un `skills-lock.json` con la fuente y la versión, así que `npx skills update` trae los cambios cuando el skill evoluciona.

La fuente puede ser un repo de GitHub (`npx skills add vercel-labs/agent-skills`) o, como en nuestro caso, un dominio. Cuando le das una URL, el CLI va a buscar `/.well-known/skills/index.json`. Si existe, lee la lista de skills y sus archivos, y los descarga.

![Diagrama: una carpeta SKILL.md se copia a .agents/skills y symlinks a .claude, .cursor, .codex](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/2Qmr5IeSWhbe)

## La mitad nuestra: tres archivos servidos desde ghosty.studio

Esto es lo que responde `https://www.ghosty.studio/.well-known/skills/index.json`:

```json
{
  "skills": [
    {
      "name": "ghosty-agent",
      "description": "Configure a Ghosty Studio agent (identity/system prompt, model, knowledge files in its machine, skills, custom MCP servers) through its REST API using the agent token. Use when the user asks to set up, tune, teach, or connect their Ghosty agent, or mentions ghosty.studio.",
      "files": ["SKILL.md", "references/api.md"]
    }
  ]
}
```

Un skill, dos archivos. El `SKILL.md` dice qué puede hacer el agente y con qué reglas; `references/api.md` trae las rutas exactas de la API con sus `curl`. Esa división tiene nombre en la spec de Agent Skills: *progressive disclosure*. El agente carga primero sólo la descripción (unas 40 palabras, vive en su contexto todo el tiempo), abre el `SKILL.md` cuando la tarea coincide, y lee `api.md` únicamente cuando ya va a hacer la llamada. El contexto se gasta en proporción a lo que se usa.

En React Router v7 servir eso es una ruta con splat: `app/routes/[.]well-known.skills.$.tsx`. Lee el archivo pedido de una carpeta del repo y lo regresa con su content-type. Cuando cambiamos la API, cambiamos el markdown en el mismo commit y el `npx skills update` de cada usuario se entera.

![Captura del SKILL.md de ghosty-agent con el frontmatter y la tabla de acciones](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/wW0no48aafOe)

## Qué pasa después de instalarlo

El skill pide dos variables de entorno. Las dos salen de Ghosty Studio → Agentes → tu agente → *Conexión con tu editor* → *Generar token*:

```sh
export GHOSTY_AGENT_ID="<id del agente, está en la URL /app/agents/<id>>"
export GHOSTY_AGENT_TOKEN="gat_…"
```

Y ya. Abres Claude Code en ese proyecto y le dices, en español:

> Ponle a mi agente de Ghosty esta identidad: "Eres Nora, asistente de la clínica Dental Sur. Contestas corto y nunca das diagnósticos." Súbele `precios-2026.pdf` y reinícialo.

Lo que hace el agente, siguiendo el skill:

1. `GET https://www.ghosty.studio/api/v2/agents/$GHOSTY_AGENT_ID` para ver qué tiene hoy (el skill lo obliga a leer antes de escribir).
2. `PATCH` con `{"prompt": "Eres Nora…"}`, sólo ese campo.
3. `PUT …/files/precios-2026.pdf` con los bytes crudos del PDF.
4. `POST …/restart`, una sola vez al final, porque cada reinicio corta un turno en curso.
5. Te contesta en una línea qué cambió y te sugiere probarlo: "pregúntale *¿qué archivos tienes en tu workspace?*".

El agente de Ghosty corre en su propia máquina, con disco y terminal; el PDF aterriza en `/data/work/precios-2026.pdf` y a partir del siguiente mensaje Nora lo puede leer. Nada se ejecutó en tu computadora más que unos `curl`.

![Secuencia GET → PATCH → PUT files → POST restart entre el editor y la máquina del agente](https://easybits-public.t3.storage.dev/69fb69f5273b3866227a5b84/ohiwDuojlDT9)

## Lo que aprendimos escribiendo el SKILL.md

Un skill es un prompt que otra gente va a correr con permisos completos de su agente. Eso obliga a escribirlo distinto a una doc normal.

**El token va en variables de entorno y nunca en argumentos.** Un agente copia lo que ve: si el ejemplo del `curl` trae el token inline, el token termina en el historial de la shell y en los logs. El skill ahora dice explícitamente: "Never print the token back to the user or into logs".

**Decirle cuándo detenerse.** Un id o token equivocado regresa `404`; los motores sin máquina propia (Claude, DeepSeek, Codex dentro de Ghosty) contestan `409 agente_sin_maquina` en archivos, skills, MCP y restart. El skill dice "do not retry" en los dos casos, para que el agente avise al usuario y pare en lugar de insistir con variaciones.

**`PUT /mcp` reemplaza la lista completa.** Si el agente conecta Notion sin hacer `GET /mcp` primero, desconecta todo lo demás. El skill lo pone como regla, con negritas.

**Límites concretos.** Prompt bajo 3,000 caracteres porque se antepone a cada conversación. Archivos de 10 MB. Veinte servidores MCP. Los números en el skill evitan que el agente pruebe hasta que algo truene.

## Para tu propio producto

Si tienes una API que la gente configura con un editor con IA al lado, la receta cabe en una tarde:

1. Escribe un `SKILL.md` con `name`, `description` y las acciones en una tabla "el usuario pide → tú haces".
2. Saca los detalles de la API a `references/api.md`, con un `curl` por endpoint.
3. Sírvelos en `/.well-known/skills/index.json` y las rutas que el índice declara.
4. Prueba con `npx skills add https://tu-dominio` en una carpeta vacía y lee lo que instaló.

Los usuarios te agregan con una línea y sus agentes aprenden tu API sin que nadie pegue documentación en un prompt.

En el canal de YouTube de FixterGeek estamos grabando la serie del taller de sistemas agénticos, donde estos agentes en su caja aparecen en vivo; si quieres verlos configurar un Ghosty desde Claude Code, ahí está.

Abrazo. Blissmo. 🤓
