# 09 - Juego Serpiente

**Estado:** Implementado
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-17
**Objetivo:** Diseñar desde cero (no hay código fuente jugable de referencia, solo un spritesheet de frutas) un motor de Snake con contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `SnakePlayer`, y darle de alta como entrada real `serpiente` en el catálogo con guardado de puntuación en el leaderboard de Supabase.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "serpiente"`, `title: "SERPIENTE"`, categoría `ARCADE`, color `green`, reutilizando la clase CSS `cover-snake` ya existente (la misma que usa la entrada mock `serpentina`), `best: 0`, `plays: "0"`.
- Un motor nuevo `SnakeEngine` (clase TypeScript, sin refactor porque no hay fuente previa) que implementa Snake clásico en grid:
  - Serpiente se mueve en una grilla fija por "tick" (intervalo de movimiento, no por frame), una celda por tick en la dirección actual.
  - Comer una fruta alarga la serpiente en una celda y suma puntos.
  - Game over inmediato (sin vidas) al chocar contra el borde del grid o contra el propio cuerpo.
  - Progresión de nivel: cada 5 frutas comidas sube el nivel y se acorta el intervalo del tick (más velocidad), igual que la progresión por líneas de Tetris.
  - Constructor: `new SnakeEngine(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks)`.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, length: number, level: number) => void; onStateChange: (state: GameState) => void }`, con `GameState = "playing" | "paused" | "gameover"` (sin estado `"win"`, Snake no tiene condición de victoria).
  - Dedupe de callbacks igual que Tetris/Arkanoid: solo dispara `onStatsChange`/`onStateChange` cuando el valor realmente cambió (campos privados `lastReportedScore/Length/Level/State`).
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`, `handleKeyUp(e: KeyboardEvent)`.
  - Loop vía `requestAnimationFrame`, pero el movimiento de la serpiente solo avanza cuando transcurrió el intervalo del tick actual (acumulador de tiempo), no en cada frame — el render (dibujo de serpiente/fruta/grid) sí ocurre cada frame.
  - Al reanudar desde pausa, resetea el acumulador de tiempo para evitar un salto de tick.
- Renderizado de la fruta usando el spritesheet provisto (`references/source-assets/snake-assets/fruits.png` + `sprites.js`), fila pixel-art (coordenadas `y=136..295`), cargado con `new Image()` detrás de un guard de SSR (`typeof window !== "undefined"`). Rotar entre 2-3 frutas de esa fila como variedad visual al generar cada nueva fruta.
- Renderizado de la serpiente (cabeza y cuerpo) con formas simples en canvas (rects neón), ya que no hay sprite de serpiente en los assets provistos — mismo criterio que usan Tetris/Asteroides para sus propios elementos sin spritesheet dedicado.
- Controles: flechas direccionales y WASD simultáneamente soportados (igual que Tetris/Asteroides en este repo), bloqueando el giro de 180° instantáneo (no se puede invertir directamente sobre el propio cuerpo).
- Componente `components/games/snake-player.tsx`:
  - `"use client"`, canvas único con `useRef<HTMLCanvasElement>`.
  - `useEffect([])` de auth: `supabase.auth.getUser()` + lookup de `profiles.username`, mismo bloque exacto que usan `tetris-player.tsx`/`arkanoid-player.tsx`.
  - `useEffect([])` de montaje del motor: obtiene el contexto 2D, instancia `SnakeEngine`, agrega listeners `keydown`/`keyup` en `window`, llama `engine.start()`; cleanup cancela el loop, remueve listeners y limpia la ref.
  - `useEffect([paused])` que resetea el acumulador de tiempo interno al reanudar, igual que el patrón ya usado.
  - Canvas escalado por CSS sin tocar la física interna (coordenadas de grid fijas, igual que los demás juegos).
  - HUD reutilizando `av-player`/`player-hud`/`crt`/`crt-screen` existentes, fila de stats: Jugador / Puntuación / Longitud / Nivel (reemplaza el slot "Líneas" de Tetris por "Longitud"; sin "Vidas").
  - Botones de acción: `PAUSA`/`REANUDAR` (`btn yellow`), `FIN` (`btn magenta`), `SALIR` (`btn ghost`, navega a `/juego/serpiente`).
  - Modal de fin de partida (`modal-bd > modal`, mismas clases que Tetris/Arkanoid): título "FIN DEL JUEGO", "PUNTUACIÓN FINAL" con el score formateado (`toLocaleString("es-ES")`), guardado manual:
    - Si hay sesión (`userId` set) y no se guardó aún: botón `btn yellow` "GUARDAR PUNTUACIÓN" (estado "GUARDANDO..." mientras `saving`), `onClick` llama `saveScore(game.id, userId, score)` de `lib/scores.ts`.
    - Si ya se guardó: `toast-saved` "▸ PUNTUACIÓN GUARDADA_".
    - Si no hay sesión: botón `btn yellow` "INICIAR SESIÓN PARA GUARDAR", `onClick` navega a `/ingresar`.
    - Acciones adicionales: "JUGAR DE NUEVO" (`btn`, reinicia el motor) y "VOLVER AL VAULT" (`btn magenta`, navega a `/biblioteca`).
- Alta en `app/juego/[id]/jugar/page.tsx`: nueva rama `if (game.id === "serpiente") return <SnakePlayer game={game} />;`, agregada al if-chain existente antes del fallback genérico (manteniendo diff mínimo, sin refactor a `Record<string, Component>` todavía).
- Alta en `components/library.tsx`: agregar `"serpiente"` a `REAL_GAME_IDS`.
- Migración Supabase: nuevo archivo `supabase/migrations/<timestamp>_seed_serpiente_game.sql` con únicamente el `insert into public.games (...)` para la fila `serpiente` (sin cambios de DDL, mismo esquema genérico ya usado por `tetris`/`arkanoid`).
- Checklist de prueba manual + `npm run lint && npm run build` + verificación de advisors post-migración.

**No incluido (fuera de alcance de este spec):**

- Tocar, renombrar o eliminar la entrada mock `serpentina` existente en `lib/data.ts` — queda intacta y convive con `serpiente`.
- Condición de victoria ("ganar" llenando toda la grilla) — Snake en este spec solo soporta `gameover`, no hay estado `"win"`.
- Sistema de vidas — se descartó explícitamente a favor de game over directo (como Tetris).
- Soporte táctil/mobile para los controles (solo teclado).
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx` a un registro `Record<string, Component>` — se vuelve a diferir, igual que en specs 07 y 08.
- Balanceo fino de dificultad/velocidad más allá del esquema "cada 5 frutas sube de nivel y acelera el tick" descrito arriba.
- Tests automatizados — no hay test runner configurado en este repo.
- Cualquier uso de los sprites de las filas "flat" o "realista" del spritesheet (`y=0..135` y `y=296..442` aprox.) — solo se usa la fila pixel-art intermedia.

## Modelo de datos

**Nueva entrada en `GAMES` (`lib/data.ts`):**

```ts
{
  id: "serpiente",
  title: "SERPIENTE",
  short: "Clásico de grilla: comé, crecé, no te choques.",
  long: "El clásico atemporal. Guiá a la serpiente por la grilla para devorar fruta tras fruta, creciendo con cada bocado. Un giro en falso contra el borde o contra tu propia cola termina la partida. La velocidad sube con cada nivel — sobrevivir se vuelve cuestión de reflejos.",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
  best: 0,
  plays: "0",
}
```

No se crea ninguna clase CSS nueva — se reutiliza `cover-snake` (`app/globals.css`), ya usada por la entrada mock `serpentina`.

**Migración Supabase (`supabase/migrations/<timestamp>_seed_serpiente_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'serpiente',
  'SERPIENTE',
  'Clásico de grilla: comé, crecé, no te choques.',
  'El clásico atemporal. Guiá a la serpiente por la grilla para devorar fruta tras fruta, creciendo con cada bocado. Un giro en falso contra el borde o contra tu propia cola termina la partida. La velocidad sube con cada nivel — sobrevivir se vuelve cuestión de reflejos.',
  'ARCADE',
  'cover-snake',
  'green'
);
```

Sin cambios de DDL — el esquema `games`/`scores`/`profiles` de `20261117000000_create_profiles_games_scores.sql` ya es genérico y soporta esta fila sin modificación.

## Plan de implementación

1. **`lib/data.ts`** — agregar la entrada `serpiente` al array `GAMES` (ver Modelo de datos). El sistema sigue funcionando igual, ahora con una entrada adicional que todavía no es "real" hasta el paso 6.
2. **`components/games/snake-player.tsx`** — escribir desde cero la clase `SnakeEngine` (estado del grid, dirección, cola de segmentos, posición de fruta, acumulador de tiempo para el tick, detección de colisión contra borde y contra cuerpo propio, progresión de nivel cada 5 frutas) con el contrato de callbacks `onStatsChange(score, length, level)` / `onStateChange(state)` descrito en Alcance. Este paso reemplaza el "refactor de fuente" que tuvieron Tetris/Arkanoid, ya que acá no hay `game.js` previo — se diseña directo con el contrato correcto desde el primer commit.
3. En el mismo archivo, el componente `SnakePlayer` (wrapper React): canvas + `useRef`, los tres `useEffect` descritos (auth, montaje/cleanup del motor, reset de tick al reanudar), listeners de teclado (flechas + WASD, bloqueo de giro de 180°), HUD con los 4 stats (Jugador/Puntuación/Longitud/Nivel), botones PAUSA/REANUDAR/FIN/SALIR, y el modal de fin de partida con guardado manual vía `saveScore` de `lib/scores.ts` (mismo flujo que Tetris/Arkanoid, sin estado `"win"`).
4. **Carga del spritesheet de frutas** — copiar `references/source-assets/snake-assets/fruits.png` a `public/serpiente/fruits.png`. Portar `references/source-assets/snake-assets/sprites.js` (el objeto `window.SPRITE_ATLAS.fruits`) a un módulo `components/games/snake-sprites.ts` exportando `FRUIT_ATLAS` (solo la fila pixel-art) y una función `loadFruitSprite(onLoad: () => void): HTMLImageElement | null` con guard de SSR (`typeof window === "undefined" ? null : ...`), siguiendo el mismo patrón que `arkanoid-sprites.ts` usa para su spritesheet de bloques.
5. **`app/juego/[id]/jugar/page.tsx`** — agregar la rama `if (game.id === "serpiente") return <SnakePlayer game={game} />;` al if-chain existente, antes del fallback genérico. Este es el paso que activa la entrada como jugable de verdad.
6. **`components/library.tsx`** — agregar `"serpiente"` a `REAL_GAME_IDS`, para que la tarjeta de biblioteca muestre stats reales (`getGameStats`) en vez de los valores mock `best`/`plays`.
7. **Migración Supabase** — crear `supabase/migrations/<timestamp>_seed_serpiente_game.sql` con el `insert` del Modelo de datos, aplicar vía `mcp__supabase__apply_migration`, y correr `mcp__supabase__get_advisors` (tipo `security` y `performance`) para confirmar que las políticas RLS existentes siguen cubriendo la fila nueva sin alertas.
8. **Checklist de prueba manual**: jugar una partida completa controlando con flechas y con WASD; verificar que chocar contra el borde termina la partida; verificar que chocar contra el propio cuerpo termina la partida; comer 5 frutas y confirmar que sube el nivel y se siente más rápido; pausar y reanudar sin salto brusco de velocidad; guardar puntuación autenticado; intentar guardar sin sesión y confirmar la redirección a `/ingresar`; confirmar que la tarjeta de `serpiente` en `/biblioteca` muestra stats reales distintos de los de `serpentina`. Luego correr `npm run lint && npm run build`.

## Criterios de aceptación

- [X] `GAMES` en `lib/data.ts` incluye la entrada `serpiente` sin modificar la entrada `serpentina` existente.
- [X] `SnakeEngine` expone `onStatsChange(score, length, level)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover"`, y solo dispara cada callback cuando el valor cambia.
- [X] La serpiente se mueve en grilla fija por tick (no por frame), acelerando el tick cada 5 frutas comidas.
- [X] Chocar contra el borde del grid o contra el propio cuerpo dispara `onStateChange("gameover")` de inmediato, sin sistema de vidas.
- [X] La fruta se dibuja usando sprites de `fruits.png` (fila pixel-art), cargados con guard de SSR.
- [X] Los controles responden a flechas y WASD, y un giro de 180° instantáneo es ignorado (no permite auto-colisión inmediata).
- [X] El modal de fin de partida ofrece guardado manual: botón "GUARDAR PUNTUACIÓN" autenticado, "INICIAR SESIÓN PARA GUARDAR" con redirección a `/ingresar` sin sesión, y "▸ PUNTUACIÓN GUARDADA_" tras guardar — nunca un guardado automático.
- [X] `app/juego/[id]/jugar/page.tsx` enruta `serpiente` a `SnakePlayer` sin romper las ramas existentes de `asteroides`/`tetris`/`arkanoid`.
- [X] `REAL_GAME_IDS` en `components/library.tsx` incluye `"serpiente"` y la tarjeta de biblioteca muestra stats reales para ese id.
- [X] La migración `supabase/migrations/<timestamp>_seed_serpiente_game.sql` aplica limpiamente vía `mcp__supabase__apply_migration` y `mcp__supabase__get_advisors` no reporta alertas nuevas de seguridad ni performance sobre `games`/`scores`.
- [X] `npm run lint && npm run build` pasan sin errores nuevos atribuibles a los archivos de este spec.

## Decisiones tomadas y descartadas

- **Sin código fuente de referencia, se diseña el motor directo con el contrato correcto.** A diferencia de Tetris/Arkanoid, no hubo un `game.js` previo que refactorizar — se evitó cualquier tentación de escribir primero una versión "simple" con efectos directos al DOM y refactorizarla después; `SnakeEngine` nace ya con callbacks `onStatsChange`/`onStateChange`.
- **Se reutiliza `cover-snake` en vez de crear una clase nueva.** Es el mismo criterio que usaron `asteroides` (reusa `cover-rocas`) y `tetris` (reusa `cover-tetro`): la entrada mock y la real comparten arte de fondo porque representan el mismo concepto visual.
- **Id `serpiente` en vez de `snake-real` o similar.** Mantiene el catálogo en español consistente con el resto de ids (`caida`, `rocas`, `invasores`), evitando mezclar inglés.
- **Spritesheet de frutas sí, sprite de serpiente no.** Los assets provistos solo cubren fruta — se usa ese spritesheet para la comida (fila pixel-art, por consistencia estética con el resto del arcade), pero el cuerpo/cabeza de la serpiente se dibuja con formas simples en canvas, igual que Tetris dibuja sus propias piezas sin spritesheet.
- **Sin vidas, game over directo.** Es el comportamiento canónico de Snake y evita complejizar el HUD y la lógica de reset parcial que sí necesitó Arkanoid para su mecánica de bloques/vidas.
- **Un solo spec para porting + wiring de Supabase.** Mismo criterio que Tetris y Arkanoid (no el de Asteroides, que se dividió históricamente en dos specs por motivos puntuales de esa época, no por ser el patrón ideal).
- **Progresión por nivel igual que Tetris (cada N items acelera el tick).** Reutiliza un patrón de dificultad ya validado en el repo en vez de inventar una curva nueva.

## Riesgos identificados

- **Crecimiento del if-chain en `app/juego/[id]/jugar/page.tsx`.** Esta será la cuarta rama explícita (`asteroides`, `tetris`, `arkanoid`, `serpiente`). Sigue siendo manejable, pero si se porta un quinto juego real, conviene evaluar entonces un registro `Record<string, Component>` — no se hace en este spec para mantener el diff mínimo.
- **Ausencia total de sprite de serpiente en los assets provistos.** El cuerpo se dibuja con rects/formas neón en vez de sprites, lo que puede generar una diferencia de fidelidad visual notoria frente a la fruta (que sí usa sprites realistas en pixel-art). Si el resultado no convence visualmente, un spec de seguimiento podría encargarse de un sprite de serpiente dedicado.
- **Carga de imagen asíncrona antes del primer render de fruta.** Si `fruits.png` tarda en cargar, el primer frame podría dibujar la fruta como placeholder o no dibujarla — igual riesgo que ya mitigó Arkanoid con su callback `loadSpritesheet(() => engine.start())`, que este spec reutiliza para evitar arrancar el loop antes de tener la imagen lista.
