# 07 - Juego Tetris

**Estado:** Aprobado
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-17

**Objetivo:** Portar el juego jugable `references/started-games/03-tetris/game.js` a un componente React (`TetrisPlayer`) con una nueva entrada real `tetris` del catálogo, refactorizando su lógica procedural a un motor con contrato de callbacks (`onStatsChange`/`onStateChange`) y conectándolo al leaderboard real de Supabase (`games`/`scores`/`profiles`) igual que ya ocurre con Asteroides.

## Alcance

**Incluido:**

- Nueva entrada en `lib/data.ts` → `GAMES`: `id: "tetris"`, `title: "TETRIS"`, categoría `PUZZLE`, color `magenta`, cover `cover-tetro` (reutilizada de la entrada mock existente `caida`, que no se modifica ni se elimina).
- Refactor de la lógica de `references/started-games/03-tetris/game.js` (hoy procedural, con variables de módulo y escritura directa al DOM vía `textContent`/`classList` en `updateHUD`, `endGame` y `togglePause`) a una clase `TetrisEngine` con el mismo patrón de contrato ya usado en `AsteroidsEngine` (spec 05): callbacks `onStatsChange(score, lines, level)` y `onStateChange(state)` (estados `"playing" | "paused" | "gameover"`; Tetris no tiene estado de victoria ni vidas). El motor conserva intacta toda la mecánica original: tablero 10×20, las 8 piezas (incluida la pieza "N" tuerca agregada en esta fuente), rotación con wall kicks, soft drop, hard drop, ghost piece, limpieza de líneas, puntuación `[0,100,300,500,800]` multiplicada por nivel, y velocidad de caída `max(100, 1000 − (nivel−1)×90)` ms.
- `components/games/tetris-player.tsx` (`"use client"`): puerto a React del motor, montado sobre un `<canvas>` de 300×600 (tablero) más un segundo `<canvas>` pequeño de 120×120 para la vista previa de la siguiente pieza, ambos referenciados con `useRef` dentro de un `useEffect` de montaje que arranca el loop y limpia (`cancelAnimationFrame`, remueve listeners de teclado) en el desmontaje.
- El canvas principal se escala visualmente al ancho del contenedor `crt-screen` vía CSS (`width: 100%`, `height: auto`, `aspect-ratio: 300 / 600`), igual que en `AsteroidsPlayer`, manteniendo la resolución lógica interna fija (300×600) para la física/dibujo.
- El componente reutiliza las clases visuales ya existentes (`av-player`, `player-hud`, `crt`, `crt-screen`, `modal-bd`, `modal`) sin crear chrome nuevo de HUD o modal.
- HUD sincronizado por `onStatsChange`: fila de `hud-stat` con Jugador / Puntuación / **Líneas** / Nivel (el stat "Vidas" de Asteroides no aplica a Tetris y se reemplaza por "Líneas", extendiendo la fila existente).
- Botón **PAUSA** funcional (igual contrato que Asteroides: detiene el loop conservando estado, lo retoma al reanudar con reseteo de `lastTime` para evitar un salto de `dt` acumulado), más el atajo de teclado `KeyP` que alterna el mismo `togglePause` (se conserva de la fuente, a diferencia de Asteroides que no tiene atajo).
- Botón **FIN**: termina la partida manualmente abriendo el modal de "FIN DEL JUEGO" con el `score` actual.
- Fin de partida automático: cuando el motor detecta que una pieza recién generada colisiona al aparecer (`spawn`), dispara `onStateChange("gameover")` y el componente abre el modal automáticamente.
- Modal de fin de partida con guardado manual, mismo patrón que `AsteroidsPlayer` (spec 06): botón "GUARDAR PUNTUACIÓN" que inserta el score en Supabase solo si el usuario está autenticado (vía `saveScore` de `lib/scores.ts`); si no hay sesión, el modal ofrece ir a `/ingresar` en vez de guardar. Sin guardado automático ni fallback a `localStorage`.
- Controles de teclado (`ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `KeyX`, `Space`, `KeyP`) con `event.preventDefault()` en `Space` para evitar scroll de página, listeners agregados en el montaje y removidos en el cleanup del `useEffect`, igual que `AsteroidsPlayer`.
- Botón **SALIR**: navega a `/juego/tetris` deteniendo el loop (cleanup del `useEffect`).
- `app/juego/[id]/jugar/page.tsx`: se agrega una rama más al if-chain existente — si `id === "tetris"` renderiza `TetrisPlayer`; el resto de ids sigue su resolución actual sin cambios (Asteroides → `AsteroidsPlayer`, el resto → `GamePlayer` genérico).
- `components/library.tsx`: se agrega `"tetris"` a `REAL_GAME_IDS`, para que la vista de tabla calcule mejor puntuación/partidas jugadas en vivo desde Supabase para este juego también.
- Migración Supabase: nuevo archivo en `supabase/migrations/` con únicamente un `insert into public.games (...)` para el registro `tetris` (mismo shape que `asteroides`: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`). No se modifica el esquema de `games`/`scores`/`profiles` — ya es genérico.

**No incluido (fuera de alcance de este spec):**

- Theme toggle claro/oscuro (`localStorage['tetris-theme']`) presente en la fuente — Arcade Vault ya tiene su propio tema neón fijo; no se porta ningún selector de tema ni persistencia asociada.
- Modificar o eliminar la entrada mock `caida` del catálogo — queda intacta como juego simulado, igual que pasó con `rocas` al portar `asteroides` (spec 05).
- Portar Arkanoid (`04-arkanoid`) — este spec cubre exclusivamente Tetris.
- Generalizar un registro `Record<string, Component>` para resolver el reproductor por id en `app/juego/[id]/jugar/page.tsx` — se mantiene el if-chain existente por mínimo diff (ver Riesgos: con Tetris este sería el tercer juego real portado, conviene evaluarlo a partir del próximo).
- Historial de partidas o estadísticas adicionales más allá de mejor puntuación/partidas jugadas (ya cubiertas por spec 06) — ranking global cross-juego, paginación, etc. siguen fuera de alcance como ya definió spec 06.
- Soporte táctil/móvil para los controles del juego.
- Tests automatizados (no hay test runner configurado en el repo).
- Ajustes de dificultad, balance o piezas adicionales respecto a la fuente — se porta tal cual está en `game.js`, incluida la pieza "N" (tuerca) ya presente en esa fuente.

## Modelo de datos

No se introduce un modelo de datos nuevo más allá de lo ya definido en spec 06. Se agrega:

1. Un elemento a `GAMES` (`lib/data.ts`), con la misma forma `Game` existente:

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "...",
  long: "...",
  cat: "PUZZLE",
  cover: "cover-tetro",
  color: "magenta",
  best: 0,
  plays: "0",
}
```

2. Un registro en la tabla real `games` de Supabase (esquema ya existente de spec 06, sin cambios de DDL):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'tetris',
  'TETRIS',
  '...',
  '...',
  'PUZZLE',
  'cover-tetro',
  'magenta'
);
```

Los textos `short`/`long` exactos se redactan al implementar, siguiendo el tono ya usado para `asteroides`/`caida` (sin inventar mecánicas que no estén en el alcance de este spec).

## Plan de implementación

1. `lib/data.ts` — agregar la entrada `tetris` a `GAMES` con el shape de arriba. El catálogo mock sigue funcionando igual que antes; la nueva card aparece en `/biblioteca` apuntando a un reproductor que todavía no existe.
2. Refactorizar `references/started-games/03-tetris/game.js` a una clase `TetrisEngine` (puede vivir directamente dentro de `components/games/tetris-player.tsx`, igual convención que `AsteroidsEngine`) con constructor `(ctx, nextCtx, { onStatsChange, onStateChange })`, exponiendo métodos equivalentes a `start`/`stop`/`resume`/`initGame`/`handleKeyDown`/`handleKeyUp`, reemplazando toda escritura directa a `textContent`/`classList` (HUD y overlay de la fuente) por invocaciones a los callbacks. El sistema no se ve afectado todavía (nada lo consume fuera del propio archivo).
3. `components/games/tetris-player.tsx` — componente React que monta el motor sobre los dos `<canvas>` (tablero + preview), sincroniza el HUD (Jugador/Puntuación/Líneas/Nivel), implementa PAUSA (botón + atajo `KeyP`)/FIN/SALIR, y el modal de fin de partida con guardado manual vía `saveScore`/`/ingresar` (mismo patrón que `AsteroidsPlayer`). El juego es jugable de punta a punta en memoria, sin persistir todavía ningún score real.
4. `app/juego/[id]/jugar/page.tsx` — agregar la rama `if (game.id === "tetris") return <TetrisPlayer game={game} />;` al if-chain existente. `/juego/tetris/jugar` ya sirve el reproductor real de Tetris.
5. `components/library.tsx` — agregar `"tetris"` a `REAL_GAME_IDS`. La vista de tabla en `/biblioteca` ya calcula mejor puntuación/partidas jugadas en vivo para Tetris (inicialmente `0`/`0` hasta la primera partida guardada).
6. Migración Supabase — crear `supabase/migrations/<timestamp>_seed_tetris_game.sql` con el `insert into public.games (...)` del registro `tetris`, aplicarla vía `mcp__supabase__apply_migration`, y verificar con `mcp__supabase__get_advisors(type: "security")` que las políticas RLS existentes siguen sin advertencias tras el insert.
7. Checklist de prueba manual: jugar una partida completa (mover/rotar/soft drop/hard drop), pausar y reanudar con el botón y con `KeyP`, perder (dejar que una pieza colisione al generarse) y verificar el modal de "FIN DEL JUEGO", guardar la puntuación estando autenticado (confirmar insert real en `scores`) y verificar el CTA a `/ingresar` sin sesión, confirmar que `/salon` agrega el tab "TETRIS" con datos reales, y correr `npm run lint && npx tsc --noEmit`.

## Criterios de aceptación

- [ ] La entrada `tetris` aparece en `/biblioteca` (vista grid y vista tabla) con cover `cover-tetro`, sin alterar la entrada mock `caida`.
- [ ] `TetrisEngine` no escribe a `textContent`/`classList`/DOM directamente en ningún punto — todo cambio de HUD o de estado pasa por `onStatsChange`/`onStateChange`.
- [ ] `/juego/tetris/jugar` renderiza `TetrisPlayer` y permite jugar una partida completa: mover piezas, rotar con wall kicks, soft drop, hard drop, ghost piece visible, vista previa de la siguiente pieza, limpieza de líneas y aumento de nivel/velocidad cada 10 líneas.
- [ ] El botón PAUSA y el atajo de teclado `KeyP` detienen y reanudan el loop sin perder el estado del tablero.
- [ ] Cuando una pieza nueva colisiona al generarse, se abre automáticamente el modal "FIN DEL JUEGO" con la puntuación final.
- [ ] Estando autenticado, "GUARDAR PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase con `game_id: "tetris"`.
- [ ] Sin sesión, el modal de fin de partida ofrece ir a `/ingresar` en vez de un botón de guardado.
- [ ] `/salon` muestra un tab "TETRIS" adicional (además de "ASTEROIDES") con el leaderboard real de ese juego.
- [ ] La vista de tabla en `/biblioteca` muestra mejor puntuación/partidas jugadas en vivo para `tetris` (no valores mock), igual que ya ocurre para `asteroides`.
- [ ] `mcp__supabase__get_advisors(type: "security")` no reporta advertencias nuevas tras aplicar la migración de seed.
- [ ] `npm run lint && npx tsc --noEmit` pasan sin errores sobre el código real del proyecto (se excluyen, como ya es convención del repo, los errores preexistentes de `references/templates/*.jsx`).

## Decisiones tomadas y descartadas

- **Refactor a motor con callbacks es obligatorio, no limpieza opcional**: la fuente escribe directo a `textContent`/`classList` en `updateHUD`, `endGame` y `togglePause`; sin este refactor no hay forma de sincronizar el HUD de React ni el modal de fin de partida con el estado del juego.
- **Se reutiliza `cover-tetro` en vez de crear una clase de cover nueva**: temáticamente es el mismo juego que la entrada mock `caida`; es solo una clase de fondo CSS, no justifica duplicar chrome visual.
- **Se conserva el atajo de teclado `KeyP` para pausar, además del botón PAUSA**: a diferencia de Asteroides (que no lo tiene), la fuente de Tetris ya lo define y no hay razón para quitarlo — ambos caminos invocan el mismo `togglePause`.
- **Se descarta el theme toggle de la fuente**: no encaja con el tema neón fijo de Arcade Vault; mezclar dos sistemas de theming agregaría complejidad sin valor para el producto.
- **Se porta la vista previa de la "siguiente pieza" con un segundo canvas**, en vez de omitirla: es una mecánica central y muy visible de Tetris, no una decoración — omitirla degradaría la experiencia respecto al juego original.
- **El modal de fin de partida sigue el mismo contrato que Asteroides** (confirmación manual, sin iniciales editables, CTA a `/ingresar` si no hay sesión): consistencia entre juegos reales ya establecida por spec 06, sin reinventar el flujo por juego.
- **Alcance único (porting + wiring a Supabase en un solo spec)**, a diferencia de cómo se hizo históricamente con Asteroides (specs 05 y 06 separados por motivos históricos): el esquema de Supabase ya existe y es genérico, por lo que no hay necesidad real de partir el trabajo en dos aprobaciones.
- **El if-chain de `app/juego/[id]/jugar/page.tsx` se mantiene tal cual** (no se generaliza a un registro) para minimizar el diff de este spec; queda anotado como riesgo a evaluar a partir del próximo juego portado.

## Riesgos identificados

- **If-chain de reproductores creciendo sin abstracción**: con Tetris, `app/juego/[id]/jugar/page.tsx` tendrá tres ramas (`asteroides`, `tetris`, genérico). Si se porta un cuarto juego real sin resolver esto, conviene evaluar entonces un registro `Record<string, Component>` en vez de seguir extendiendo el if-chain — no se resuelve en este spec para mantener el diff mínimo.
- **Pieza "N" (tuerca) fuera del set estándar de 7 piezas**: la fuente ya la incluye como una pieza más; se porta tal cual sin verificar si rompe expectativas de un jugador familiarizado con el Tetris clásico — aceptado porque está fuera de alcance rediseñar el set de piezas.
