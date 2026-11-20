# Game Jam · Ranaria · Variante: tablero fijo clásico

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero (no hay código fuente jugable de referencia para este concepto, igual que Serpiente) un motor de Frogger clásico de tablero fijo — una sola pantalla con carriles de autos y troncos, cinco nenúfares meta — con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `RanariaPlayer`, y darlo de alta como entrada real `ranaria` en el catálogo reutilizando el mock existente del mismo nombre.

## Alcance

**Incluido:**

- Nueva entrada real en `GAMES` (`lib/data.ts`) con `id: "ranaria"`, `title: "RANARIA"`, categoría `ARCADE`, color `green`, reutilizando la clase CSS `cover-rana` ya existente (la misma que usa hoy la entrada mock `ranaria`... en este caso la entrada mock y la real comparten id conceptual, ver Decisiones), `best: 0`, `plays: "0"`.
- Un motor nuevo `RanariaEngine` (clase TypeScript, diseñado directo con el contrato correcto, sin refactor previo) que implementa Frogger clásico sobre una grilla fija de un solo tablero:
  - Tablero de 13 columnas × 14 filas lógicas: 1 fila de meta (nenúfares), 5 filas de río (troncos y tortugas en movimiento horizontal, velocidades y sentidos alternados por fila), 1 fila de "isla" segura central, 5 filas de carretera (autos y camiones en movimiento horizontal, velocidades y sentidos alternados por fila), 1 fila de salida/inicio segura.
  - La rana se mueve una celda por pulsación de flecha/WASD (arriba/abajo/izquierda/derecha), sin movimiento continuo — input discreto, no analógico.
  - En la carretera: colisión directa con un vehículo = `gameover` inmediato.
  - En el río: la rana debe pararse sobre un tronco o tortuga en movimiento; si cae al agua (ninguna plataforma bajo ella tras el salto, o se desliza fuera del tablero por los bordes) = `gameover` inmediato. Las tortugas se sumergen periódicamente (ciclo visible de aviso) y dejan de ser plataforma válida mientras están bajo el agua.
  - 5 huecos de meta (nenúfares): llegar a un hueco vacío suma puntos y reaparece la rana en el punto de partida; llegar a un hueco ya ocupado no cuenta. Completar los 5 huecos dispara `onStateChange("win")`.
  - Temporizador por vida: una barra de tiempo decreciente por intento; si llega a cero antes de llegar a la meta = pierde una vida (no `gameover` directo si quedan vidas).
  - Sistema de 3 vidas (igual convención que Arkanoid): perder una vida reinicia la posición de la rana en el punto de partida sin reiniciar el progreso de nenúfares ya completados; perder la última vida dispara `gameover`.
  - Constructor: `new RanariaEngine(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks)`.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, lives: number, filled: number) => void; onStateChange: (state: GameState) => void }`, con `GameState = "playing" | "paused" | "gameover" | "win"`.
  - Dedupe de callbacks igual que Tetris/Arkanoid/Serpiente: solo dispara cuando el valor realmente cambió (`lastReportedScore/Lives/Filled/State`).
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Loop vía `requestAnimationFrame`; el movimiento de vehículos/troncos/tortugas avanza por `dt` continuo (no por tick discreto como Serpiente), mientras que el salto de la rana es discreto por tecla con un pequeño cooldown anti-rebote (ignorar nueva tecla mientras la animación de salto previa no terminó, ~120ms).
  - Puntuación: +10 por cada fila de avance neto hacia adelante (no se penaliza retroceder, pero tampoco se vuelve a sumar al re-cruzar la misma fila en el mismo intento), +50 por tronco/salto exitoso sobre el río, +200 por cada nenúfar ocupado, +1000 bonus si se completan los 5 nenúfares antes de que se acabe el tiempo total de la partida.
  - Al reanudar desde pausa, resetea el `lastTime` del loop y el acumulador de la barra de tiempo para evitar un salto brusco.
- Renderizado 100% con primitivas de canvas (rects y triángulos neón): rana como triángulo/rombo verde, autos/camiones como rects de distintos colores y tamaños por carril, troncos como rects marrones alargados, tortugas como óvalos verde oscuro con ciclo de parpadeo antes de sumergirse, nenúfares como círculos cian en la fila de meta. Sin spritesheet — mismo criterio que Serpiente usó para el cuerpo de la serpiente al no haber asset de referencia para este concepto.
- Controles: flechas direccionales y WASD simultáneamente soportados (igual que el resto de juegos del repo).
- Componente `components/games/ranaria-player.tsx`:
  - `"use client"`, canvas único con `useRef<HTMLCanvasElement>`.
  - `useEffect([])` de auth: `supabase.auth.getUser()` + lookup de `profiles.username`, mismo bloque que usan los demás reproductores reales.
  - `useEffect([])` de montaje del motor: obtiene el contexto 2D, instancia `RanariaEngine`, agrega listener `keydown` en `window`, llama `engine.start()`; cleanup cancela el loop y remueve el listener.
  - `useEffect([paused])` que resetea el acumulador de tiempo al reanudar.
  - HUD reutilizando `av-player`/`player-hud`/`crt`/`crt-screen`: Jugador / Puntuación / Vidas / Nenúfares (reemplaza el slot de "Nivel" por "Nenúfares", mostrando `filled/5`).
  - Botones PAUSA/REANUDAR (`btn yellow`), FIN (`btn magenta`), SALIR (`btn ghost`, navega a `/juego/ranaria`).
  - Modal de fin de partida (mismas clases `modal-bd`/`modal`), con título distinto según `state`: "FIN DEL JUEGO" (`gameover`) vs. "¡TODOS LOS NENÚFARES OCUPADOS!" (`win`); guardado manual de score vía `saveScore` idéntico al patrón ya establecido (botón si hay sesión, CTA a `/ingresar` si no, toast tras guardar).
- Alta en `app/juego/[id]/jugar/page.tsx`: nueva rama `if (game.id === "ranaria") return <RanariaPlayer game={game} />;`.
- Alta en `components/library.tsx`: agregar `"ranaria"` a `REAL_GAME_IDS`.
- Migración Supabase: `insert into public.games (...)` para la fila `ranaria`.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Niveles progresivos con velocidad creciente entre tableros (eso lo cubre la otra variante de este mismo `game-id`, `variante-niveles-progresivos.md`).
- Power-ups de ningún tipo (tiempo extra, invencibilidad, salto doble).
- Soporte táctil/mobile.
- Sonido/música (el concepto no tiene fuente de audio de referencia; se puede agregar en un spec de seguimiento si se decide avanzar con esta variante).
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx` a un registro `Record<string, Component>`.

## Modelo de datos

**Nueva entrada en `GAMES` (`lib/data.ts`):**

```ts
{
  id: "ranaria",
  title: "RANARIA",
  short: "Cruza la autopista de pixeles.",
  long: "Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Ocupá los cinco nenúfares antes de quedarte sin vidas ni tiempo.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
  best: 0,
  plays: "0",
}
```

No se crea ninguna clase CSS nueva — se reutiliza `cover-rana` (`app/globals.css`), ya usada por la entrada mock `ranaria` existente (ver Decisiones sobre el conflicto de id).

**Migración Supabase (`supabase/migrations/<timestamp>_seed_ranaria_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'ranaria',
  'RANARIA',
  'Cruza la autopista de pixeles.',
  'Salta entre carriles de coches a toda velocidad y troncos a la deriva en el río. Ocupá los cinco nenúfares antes de quedarte sin vidas ni tiempo.',
  'ARCADE',
  'cover-rana',
  'green'
);
```

Sin cambios de DDL.

## Plan de implementación

1. **`lib/data.ts`** — resolver el conflicto de id con el mock (ver Decisiones): la entrada mock `ranaria` se reemplaza por la entrada real con el mismo id una vez aprobado este spec (excepción puntual al patrón mock+real con ids distintos, documentada abajo), o se re-idéntica el mock a un id alternativo si el usuario prefiere mantener la convención estricta. Este punto debe resolverse explícitamente en la aprobación, no queda implícito.
2. **`components/games/ranaria-player.tsx`** — escribir desde cero la clase `RanariaEngine`: estado del tablero (filas de carretera/río/meta), posición de la rana, listas de vehículos/troncos/tortugas con velocidad y sentido por fila, detección de colisión en carretera, detección de "caída al agua" en el río, barra de tiempo por vida, sistema de 3 vidas, los 5 huecos de meta y condición de `win`.
3. En el mismo archivo, el componente `RanariaPlayer`: canvas + `useRef`, los `useEffect` descritos, listener de teclado, HUD de 4 stats, botones de acción, modal de fin de partida con guardado manual.
4. **`app/juego/[id]/jugar/page.tsx`** — agregar la rama `if (game.id === "ranaria") return <RanariaPlayer game={game} />;`.
5. **`components/library.tsx`** — agregar `"ranaria"` a `REAL_GAME_IDS`.
6. **Migración Supabase** — crear el seed, aplicar vía `mcp__supabase__apply_migration`, correr `mcp__supabase__get_advisors`.
7. **Checklist de prueba manual**: cruzar la carretera sin chocar; saltar sobre troncos y tortugas y confirmar que las tortugas sumergidas no sostienen; caer al agua y confirmar pérdida de vida (no gameover directo si quedan vidas); ocupar los 5 nenúfares y confirmar `win`; dejar correr el tiempo de un intento hasta cero y confirmar pérdida de vida; perder las 3 vidas y confirmar `gameover`; pausar/reanudar sin salto de tiempo; guardar puntuación autenticado y sin sesión. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` en `lib/data.ts` incluye la entrada real `ranaria` con el shape de Modelo de datos.
- [ ] `RanariaEngine` expone `onStatsChange(score, lives, filled)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover" | "win"`, deduplicando emisiones.
- [ ] Chocar con un vehículo en la carretera dispara `gameover` inmediato sin consumir una vida (es la variante "tablero fijo", no hay segunda oportunidad dentro del mismo cruce de carretera... — aclarar en implementación si en cambio se decide consumir vida; por ahora el spec define game over directo en carretera y pérdida de vida solo por caída al agua o por tiempo agotado).
- [ ] Caer al agua (tronco/tortuga ausente bajo la rana) consume una vida y reinicia la posición sin perder nenúfares ya ocupados.
- [ ] Las tortugas dejan de ser plataforma válida durante su ciclo de sumersión, visible antes de hundirse.
- [ ] Ocupar los 5 nenúfares dispara `onStateChange("win")`.
- [ ] Agotar el tiempo de un intento consume una vida; perder la tercera vida dispara `onStateChange("gameover")`.
- [ ] El modal de fin de partida distingue título entre `gameover` y `win`, y ofrece guardado manual (autenticado / CTA a `/ingresar` / toast de guardado), nunca automático.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `ranaria` a `RanariaPlayer` sin romper las ramas existentes.
- [ ] `REAL_GAME_IDS` incluye `"ranaria"`.
- [ ] La migración de seed aplica limpiamente y `mcp__supabase__get_advisors` no reporta alertas nuevas.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Conflicto de id con el mock `ranaria` existente — tratado explícitamente, no barrido bajo la alfombra.** A diferencia de `rocas`/`asteroides`, `caida`/`tetris`, `serpentina`/`serpiente` (mock y real con ids distintos que conviven), el mock de Frogger en `lib/data.ts` ya se llama `ranaria` — el mismo nombre canónico en español que le correspondería al juego real. Esta variante documenta el conflicto para que la decisión de resolución (reemplazar el mock por la fila real bajo el mismo id, o renombrar el mock a un id alternativo tipo `rana-arcade` para preservar el patrón) quede en manos del usuario al promover el spec, no de este agente.
- **Tablero fijo de un solo nivel, sin progresión.** Deliberado para esta variante: representa el Frogger "puro", de alcance acotado y rápido de evaluar. La progresión de dificultad vive en la variante hermana.
- **Barra de tiempo + sistema de vidas, en vez de solo una de las dos.** Fiel al Frogger original (ambas mecánicas coexisten en el arcade de 1981); se mantiene por autenticidad temática aunque suma algo de complejidad al motor frente a Serpiente.
- **Sin power-ups ni sonido en esta variante.** Mantiene el spec comparable en alcance a Serpiente (spec 09), el caso más análogo de "diseño desde cero sin fuente".
- **Primitivas de canvas, sin spritesheet.** No hay asset de referencia provisto para este tema; mismo criterio ya aceptado para el cuerpo de la serpiente.

## Riesgos identificados

- **Resolución del conflicto de id con el mock.** Es el riesgo más alto de esta variante en particular: si se decide reemplazar la fila mock por la real bajo el mismo `id: "ranaria"`, se rompe la regla general "nunca renombrar/eliminar una entrada mock al portar su contraparte real" documentada en `CLAUDE.md` — el usuario debe decidir conscientemente esta excepción antes de promover el spec a implementación.
- **Balance de la barra de tiempo.** Un tiempo demasiado corto castiga parálisis por análisis en el río; demasiado largo le quita tensión al cruce de la carretera. Requiere tuning manual al implementar.
- **Ciclo de sumersión de tortugas poco legible solo con primitivas.** Sin sprite, el aviso de "a punto de sumergirse" depende de un efecto de parpadeo por color/alpha que puede no leerse bien a primera vista; mitigable con un color de advertencia más contrastante.
