---
name: port-game
description: Analiza un juego fuente (de references/started-games/ o uno nuevo) y genera un spec de porting + integración con el leaderboard de Supabase, siguiendo el patrón de los specs 05/06. Usar cuando se quiera agregar un juego jugable real a Arcade Vault.
disable-model-invocation: true
argument-hint: "[nombre-carpeta-en-references/started-games | descripción libre del juego]"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(find:*), Bash(wc:*)
---

# /port-game — Portar un juego al leaderboard de Arcade Vault

## Session context

Fecha de hoy (usar este valor para el header del spec, nunca adivinarla):
!`date +%F`

Specs que ya existen:
!`ls specs/ 2>/dev/null || echo "La carpeta specs/ todavía no existe"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null`

Ids ya presentes en GAMES (lib/data.ts):
!`grep -o 'id: "[a-z-]*"' lib/data.ts 2>/dev/null`

Juegos ya reales (REAL_GAME_IDS en components/library.tsx):
!`grep -A3 REAL_GAME_IDS components/library.tsx 2>/dev/null`

---

Esta skill ayuda a producir un spec que porte un juego jugable (desde `references/started-games/` o desde cualquier otra fuente) a un componente React real de Arcade Vault, integrado con el leaderboard de Supabase (`games`/`scores`/`profiles`). **No se escribe código acá.** El resultado es un spec en `specs/` listo para aprobar y pasar a `/spec-impl`.

## Filosofía

Arcade Vault ya portó un juego real (Asteroides, specs `05-juego-asteroides.md` + `06-leaderboard-y-tabla-de-juegos.md`) y ese patrón es el contrato a replicar: motor de juego con callbacks explícitos (`onStatsChange`/`onStateChange`), canvas escalado por CSS sin tocar la física interna, guardado de puntuación manual (nunca automático), y wiring a tres puntos de integración concretos del repo (`lib/data.ts`, `app/juego/[id]/jugar/page.tsx`, `components/library.tsx`) más una migración de Supabase. Esta skill no reinventa ese patrón: lo aplica de forma consistente a un juego nuevo, detectando dónde la fuente se desvía de él (lógica procedural, escritura directa al DOM, modelo de input distinto, assets externos) para que esos puntos queden como pasos explícitos del plan, no detalles perdidos en el camino.

Mirá `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-de-juegos.md` como plantilla de estructura y de tono (están en español, con los mismos encabezados de estado/fecha/dependencias). El spec que generes debe leerse como si fuera el próximo capítulo de esa misma serie.

## Flujo del comando

- Seguí las fases en orden. La Fase 1 (análisis de la fuente) y la Fase 2 (preguntas) son el corazón de la skill — no las saltees aunque el usuario tenga apuro.
- Tus respuestas deben estar en el mismo idioma del prompt inicial. Este repo trabaja en español — por defecto, respondé en español salvo que el usuario escriba en otro idioma.

### Fase 0 — Identificar la fuente

Mirá `$ARGUMENTS`:

- Si ya nombra una carpeta válida de `references/started-games/` (listada en el session context), usala directamente y pasá a la Fase 1.
- Si no, preguntá con `AskUserQuestion`: "¿De dónde viene este juego?", con estas opciones:
  - **(a) Una carpeta de `references/started-games/` aún no portada.** Calculalo en vivo contra el session context: listá las carpetas que todavía no tienen contraparte en `REAL_GAME_IDS`. Si no queda ninguna, decilo y no ofrezcas esta opción — el juego viene por (b) o (c).
  - **(b) Código que el usuario va a pegar o indicar por ruta.** Pedí la ruta del archivo o que pegue el código fuente.
  - **(c) Una descripción libre desde cero.** No hay código fuente — el motor se diseña a partir de la descripción del usuario, no se porta nada.

El resto de las fases se bifurca según esta respuesta: (a)/(b) pasan por el análisis de la Fase 1; (c) salta directo a la Fase 2 con preguntas adicionales de mecánica.

### Fase 1 — Analizar la fuente (solo si (a) o (b))

Leé completo el archivo de lógica del juego (`game.js` o equivalente) y los archivos que lo acompañan (`index.html`, `style.css`, módulos de datos como `levels.js`, y todo lo que haya en `assets/`). No leas solo un extracto: los puntos de abajo dependen de ver el archivo completo.

Antes de seguir a la Fase 2, reportale al usuario un resumen cubriendo:

1. **¿Lógica en clases o procedural con variables de módulo?** Si es procedural (como Tetris y Arkanoid en este repo), marcá que el plan va a necesitar un paso explícito de refactor a un motor/clase con contrato de callbacks antes o durante el puerto a React — no es limpieza opcional, es arquitectura requerida, igual que ya se hizo para Asteroides.
2. **¿Escribe directo al DOM/canvas en vez de notificar vía callback?** Ej.: Tetris escribe `overlayTitle.textContent` directo en el game over; Arkanoid dibuja su pantalla de pausa/selección de nivel directo en el canvas. Si encontrás esto, marcalo con la línea exacta y dejá anotado que el plan debe refactorizarlo hacia `onStateChange`/`onStatsChange`.
3. **Modelo de input.** Teclado (como Asteroides/Tetris) vs. mouse/click (como Arkanoid, que usa `mousemove` + `click` para su UI de pausa). Si es mouse, anotá que el plan necesita manejo de coordenadas escaladas (`getBoundingClientRect`) porque el canvas se muestra escalado por CSS aunque la física siga en coordenadas lógicas fijas.
4. **Semántica de victoria/derrota.** ¿Tiene "vidas"? ¿Tiene un estado "win" además de "gameover" (como Arkanoid, que gana al limpiar todos los bloques)? Esto define qué estados debe soportar `onStateChange` para este juego puntual.
5. **Assets externos.** Sprite sheets, audio, módulos de datos externos (`levels.js`). Listá cada ruta exacta encontrada (usá `find` sobre la carpeta del juego) — estos archivos van a necesitar copiarse a `public/` y cargarse con guards de SSR.
6. **Cosas persistidas en `localStorage` en la fuente que no encajan en las convenciones de la app.** Ej.: el theme toggle de Tetris (`localStorage('tetris-theme')`). Nunca lo descartes en silencio — anotalo para que termine explícitamente en la sección "No incluido" del spec.

Si la fuente es `02-asteroids`: avisá que ese juego ya está portado (`components/games/asteroids-player.tsx`) y que no se vuelve a portar — ofrecé usarlo como referencia arquitectónica si el usuario quiere revisar el contrato de callbacks ya implementado, pero no continúes generando un spec para él salvo que el usuario insista explícitamente en que es una reescritura intencional.

Si la fuente es (c) freeform: saltá este análisis — no hay archivo que leer — y pasá directo a la Fase 2 preguntando mecánicas, condición de victoria/derrota, controles, y si hay algo de código existente para arrancar.

### Fase 2 — Preguntas aclaratorias

Preguntá en bloques de 3 a 5 por vez vía `AskUserQuestion` (nunca una sola pregunta seguida de otra sola — es agotador). Categorías a cubrir siempre:

1. **Catálogo.** `id`/`title`/`short`/`long` para la nueva entrada en `GAMES` (`lib/data.ts`).
2. **Categoría y color.** `cat` (ARCADE/PUZZLE/SHOOTER/VERSUS) y `color` (cyan/magenta/green/yellow) — recomendá según el género del juego. Si hay una entrada mock existente con premisa temáticamente parecida (como pasó `rocas` vs. `asteroides`), avisá del posible solape y preguntá si es aceptable convivir con dos entradas similares.
3. **Cover.** ¿Se reutiliza una clase `cover-*` CSS existente o hace falta una nueva? Aclará que de cualquier forma es solo una clase de fondo — no se inventa chrome nuevo de HUD/modal.
4. **Forma de stats del HUD.** Basándote en el análisis de la Fase 1 (o en la descripción freeform), confirmá qué campos expone `onStatsChange` para este juego específico (ej.: Tetris = score/lines/level sin `lives`; Arkanoid = score/lives/level con estado adicional `win`).
5. **Alcance del spec.** Confirmá que el spec va a cubrir porting + wiring a Supabase en uno solo (default recomendado, a diferencia de cómo se hizo históricamente con Asteroides en dos specs separados por motivos históricos, no porque sea lo ideal).

Al igual que `/spec`: si ofrecés opciones, dalas de 2 a 4, marcando cuál es tu recomendación y por qué. Detenete cuando puedas responder sin asumir nada: qué archivos cambian, cuál es el primer y el último paso ejecutable, y cómo se verifica que está terminado.

### Fase 3 — Escribir el spec

**Antes de redactar nada, leé completo `.agents/skills/spec/SKILL.md` (la skill `/spec` de este repo).** No lo resumas de memoria ni asumas su contenido por lo que ya sepas de ella — leela en esta invocación para tomar de ahí, al pie de la letra: el orden exacto de secciones, el estilo de headers (Estado/Depende de/Fecha/Objetivo), el criterio de "cuándo dejar de preguntar" (poder responder sin asumir qué archivos cambian, cuál es el primer/último paso, cómo se verifica que está listo), el fast-path de Fase 3 (escribir todo de una vez si no hubo que asumir nada, sin pedir confirmación sección por sección), y las reglas de Fase 4 para guardar el archivo (numeración secuencial, slug, estado `Borrador`, seed de `specs/.spec-config.yml`). `/port-game` es una especialización de `/spec` para este tipo de tarea puntual — el spec que generes tiene que ser indistinguible, en forma y convenciones, de uno que `/spec` hubiera producido.

Si ya tenés toda la información de las Fases 1-2 sin haber tenido que asumir nada, escribí el spec completo de una sola vez (no vayas sección por sección) y pasá directo a la Fase 4 — tal como indica `/spec`. Si falta información (el usuario se saltó preguntas o alguna respuesta quedó vaga), desarrollá sección por sección, mostrando cada una y esperando confirmación antes de seguir — igual que `/spec`.

La estructura es la misma que define `/spec`, aplicada en este repo por `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-tabla-de-juegos.md` combinados:

1. **Header** (Estado: Borrador, Depende de, Fecha, Objetivo en una sola oración).
2. **Alcance** (Incluido / No incluido — explícito en ambos). Acá van los descartes detectados en la Fase 1 (theme toggles, etc.) bajo "No incluido".
3. **Modelo de datos** (la forma del `Game` nuevo en `lib/data.ts`, y el seed SQL para `games`).
4. **Plan de implementación** — numerado, cada paso deja el sistema funcional. Debe cubrir, en este orden:
   1. `lib/data.ts` — agregar la entrada a `GAMES`.
   2. Refactor del `game.js` fuente a un motor/clase con callbacks `onStatsChange`/`onStateChange` (paso explícito y obligatorio si la Fase 1 detectó lógica procedural o escritura directa al DOM).
   3. `components/games/<id>-player.tsx` — el puerto a React: canvas con `useRef`, `useEffect` de montaje/cleanup que cancela el loop y remueve listeners, `useEffect([paused])` con reset de `lastTime` al reanudar, chequeo de auth vía `supabase.auth.getUser()` + `profiles.username`, modal de fin de partida con guardado manual (confirmar antes de insertar, ofrecer ir a `/ingresar` si no hay sesión).
   4. Migración de assets, **solo si la Fase 1 encontró alguno**: copiar `references/started-games/<juego>/assets/**` a `public/<juego>/`, portar módulos de datos tipo `levels.js` a un `.ts` junto al componente, agregar guards de SSR (`typeof window !== "undefined"`) antes de `new Image()`/`new Audio()`.
   5. `app/juego/[id]/jugar/page.tsx` — agregar una rama más `if (game.id === "<id>") return <XPlayer game={game} />;`. Mantener el if-chain por mínimo diff — si este es el cuarto juego real portado, anotar en Riesgos que conviene evaluar un registro `Record<string, Component>` a partir de acá, sin hacerlo todavía.
   6. `components/library.tsx` — agregar el `id` a `REAL_GAME_IDS`.
   7. Migración Supabase — nuevo archivo en `supabase/migrations/` con únicamente `insert into public.games (...)` (el esquema ya es genérico, sin cambios de DDL), aplicar vía `mcp__supabase__apply_migration`, y verificar con `mcp__supabase__get_advisors` que las políticas RLS siguen bien.
   8. Checklist de prueba manual (jugar una partida completa, probar pausa/reanudación, perder y ganar si aplica, guardar puntuación autenticado y sin autenticar) + `npm run lint && npm run build`.
5. **Criterios de aceptación** (checklist booleano, verificable — no aspiracional). Debe incluir explícitamente el chequeo de `mcp__supabase__get_advisors` y, si el juego tiene estado "win", un criterio que pruebe ambos caminos (`gameover` y `win`).
6. **Decisiones tomadas y descartadas.**
7. **Riesgos identificados** (solo si aplican).

### Fase 4 — Guardar el spec

Seguí al pie de la letra el procedimiento de guardado de `.agents/skills/spec/SKILL.md` (ya leído en la Fase 3):

1. Número secuencial siguiente según el listado de `specs/` del session context (padded a dos dígitos).
2. Slug kebab-case derivado del nombre del juego (ej. `juego-tetris`, `juego-arkanoid`).
3. Fecha del session context — nunca inventada.
4. Escribir el archivo directamente en `specs/NN-juego-<slug>.md`, estado `Borrador`. No pedir permiso para el nombre del archivo — anunciar la ruta en la confirmación final. Solo preguntar si el archivo destino ya existe.
5. Verificar que las dependencias listadas en el header (ej. "Depende de: SPEC 01, SPEC 05, SPEC 06") realmente existan en `specs/`; si alguna no existe, decirlo en vez de dejar una referencia colgante.
6. Sembrar `specs/.spec-config.yml` si falta (mismo contenido default que usa `/spec`, con `AutoCreateBranch: true`); si ya existe, no tocarlo.
7. Confirmar al usuario:
   - Ruta del archivo creado.
   - Recordatorio: el spec está en `Borrador`. Pasa a `Aprobado` cuando el usuario lo revise.
   - Próximo paso: correr `/spec-impl NN-juego-slug` una vez aprobado.
   - **Detenerse ahí.** No proponer implementar, escribir código, ni tomar ninguna acción más allá de esta confirmación.

## Hard rules

- Nunca escribir ni modificar código de la aplicación en esta skill. Solo se escribe `specs/NN-slug.md` (y `specs/.spec-config.yml` si falta). La implementación ocurre vía `/spec-impl` después de aprobar.
- Nunca saltear el análisis de la Fase 1 sobre efectos directos al DOM. Si la fuente escribe a `textContent`/canvas en vez de notificar un callback en game-over/pause/win, el plan del spec DEBE incluir el refactor al contrato de callbacks como paso explícito antes o durante el puerto a React — no es limpieza opcional, es arquitectura requerida.
- Nunca proponer guardado automático de puntuación. El spec siempre describe confirmación manual "Guardar puntuación" (autenticado) vs. ofrecer ir a `/ingresar` (no autenticado) — sin fallback a localStorage, sin insert automático al terminar la partida.
- Nunca inventar chrome nuevo de HUD/modal. El plan debe decir explícitamente que el componente reutiliza las clases `av-player`, `player-hud`, `crt`, `crt-screen`, `modal-bd` ya existentes. Un stat específico del juego (ej. "líneas" en Tetris) extiende la fila de stats del HUD existente, no crea un widget nuevo.
- Nunca tocar una entrada mock existente del catálogo (ej. `rocas`) al portar su contraparte real — se agrega un `id` nuevo, nunca se renombra/reemplaza/borra la entrada mock vieja.
- Nunca escribir DDL de Supabase para una tabla nueva — el esquema `games`/`scores`/`profiles` ya es genérico. La migración es únicamente un `insert into public.games (...)`.
- Nunca saltear `mcp__supabase__get_advisors` después de aplicar la migración de seed — debe aparecer explícitamente en el plan y en los criterios de aceptación del spec generado.
- Nunca marcar el spec generado como `Aprobado` — siempre `Borrador`, igual que `/spec`.
- Nunca descartar en silencio features de la fuente ligadas a `localStorage`/theming que no encajen en las convenciones de la app (ej. el theme toggle de Tetris) — nombrarlas explícitamente en "No incluido".
- Si hay assets (sprites/audio), nunca cargarlos sin guard de SSR — los componentes de App Router se renderizan en servidor y `new Image()`/`new Audio()` a nivel de módulo rompen ahí.

## Tono al preguntar

Igual que `/spec`: directo y específico, sin disculparse por preguntar. Preguntas concretas, numeradas cuando son varias, con la recomendación marcada cuando ofrezcas opciones.

## Arguments

`$ARGUMENTS` puede ser el nombre de una carpeta de `references/started-games/` (ej. `03-tetris`) o una descripción libre. Si coincide exactamente con una carpeta listada en el session context, tratalo como la fuente directamente (Fase 0 resuelta sin preguntar). Si no, tratalo como punto de partida de la Fase 0 y preguntá igual para confirmar.

Si invocaron `/port-game` sin argumentos, arrancá directo con la pregunta de la Fase 0.
