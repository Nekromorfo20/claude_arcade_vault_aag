# 08 - Juego Arkanoid

**Estado:** Aprobado
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-17

**Objetivo:** Portar el juego jugable `references/started-games/04-arkanoid/game.js` a un componente React (`ArkanoidPlayer`) con una nueva entrada real `arkanoid` del catálogo, refactorizando su lógica procedural (incluida la UI de pausa/selector de nivel dibujada directo en canvas) a un motor con contrato de callbacks (`onStatsChange`/`onStateChange`) y conectándolo al leaderboard real de Supabase (`games`/`scores`/`profiles`) igual que ya ocurre con Asteroides y Tetris.

## Alcance

**Incluido:**

- Nueva entrada en `lib/data.ts` → `GAMES`: `id: "arkanoid"`, `title: "ARKANOID"`, categoría `ARCADE`, color `yellow`, cover `cover-arkanoid` (clase nueva, ver sección Cover). La entrada mock existente `bloque-buster` (misma premisa temática: paleta + pelota + muros de bloques) no se modifica ni se elimina — mismo patrón ya aceptado con `rocas`/`asteroides`.
- Refactor de la lógica de `references/started-games/04-arkanoid/game.js` (hoy procedural, con variables de módulo y escritura directa a canvas vía `drawOverlay`/`drawPauseOverlay` para game over, victoria y el selector de nivel en pausa) a una clase `ArkanoidEngine` con el mismo patrón de contrato ya usado en `AsteroidsEngine`/`TetrisEngine`: callbacks `onStatsChange(score, lives, level)` y `onStateChange(state)` (estados `"playing" | "paused" | "gameover" | "win"`). El motor conserva intacta toda la mecánica original: paleta controlada por mouse y teclado (`←`/`→`), pelota con rebotes en paredes/paleta, colisión AABB bloque-por-bloque (un bloque destruido por frame), 5 niveles con velocidad incremental (`×1.00` a `×1.46`), 3 vidas, animación de explosión de 4 frames por bloque destruido, y los dos efectos de sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- El selector de nivel dibujado dentro del canvas durante la pausa (`drawPauseOverlay`, con su propio listener de `click` en coordenadas de canvas) se elimina del motor y se reimplementa como UI de React fuera del canvas (botones 1–5 superpuestos sobre el `crt-screen` cuando `state === "paused"`), que invocan un método del motor (`loadLevel(n)`) en vez de un listener de click interno.
- `components/games/arkanoid-player.tsx` (`"use client"`): puerto a React del motor, montado sobre un `<canvas>` de 800×600 referenciado con `useRef`, con `useEffect` de montaje que arranca el loop y limpia (`cancelAnimationFrame`, remueve listeners de teclado/mouse) en el desmontaje, y `useEffect([paused])` que resetea `lastTime` al reanudar para evitar un salto de `dt` acumulado.
- El canvas se escala visualmente al ancho del contenedor `crt-screen` vía CSS (`width: 100%`, `height: auto`, `aspect-ratio: 800 / 600`), igual que `AsteroidsPlayer`/`TetrisPlayer`, manteniendo la resolución lógica interna fija (800×600). El control de paleta por mouse traduce coordenadas de cliente a coordenadas lógicas con `getBoundingClientRect` + escalado (`scaleX`), igual que ya hace la fuente, para que funcione correctamente con el canvas escalado por CSS.
- El componente reutiliza las clases visuales ya existentes (`av-player`, `player-hud`, `crt`, `crt-screen`, `modal-bd`, `modal`) sin crear chrome nuevo de HUD o modal. Los botones del selector de nivel en pausa son elementos HTML simples superpuestos, con el mismo lenguaje visual (`pixel`/`mono`, colores neón) que el resto del HUD, no un widget nuevo.
- HUD sincronizado por `onStatsChange`: fila de `hud-stat` con Jugador / Puntuación / Vidas / Nivel (mismo shape que `AsteroidsPlayer`, que ya tiene `lives`, más el campo `level` que ya usa `TetrisPlayer`).
- Botón **PAUSA** funcional (igual contrato que Asteroides/Tetris: detiene el loop conservando estado, lo retoma al reanudar), más el atajo de teclado `KeyP`/`Escape` que alterna el mismo estado de pausa (se conserva de la fuente). Mientras está en pausa, se muestra el selector de nivel (botones 1–5, nivel activo resaltado) como overlay de React.
- Botón **FIN**: termina la partida manualmente en cualquier momento, abriendo el modal de "FIN DEL JUEGO" con el `score` actual.
- Fin de partida automático en ambos sentidos: cuando el motor detecta `lives <= 0` dispara `onStateChange("gameover")`, y cuando se limpian los bloques del nivel 5 dispara `onStateChange("win")`; el componente abre el modal automáticamente en cualquiera de los dos casos, con un título distinto ("FIN DEL JUEGO" vs. "¡GANASTE!") pero el mismo flujo de guardado.
- Modal de fin de partida con guardado manual, mismo patrón que `AsteroidsPlayer`/`TetrisPlayer` (spec 06): botón "GUARDAR PUNTUACIÓN" que inserta el score en Supabase solo si el usuario está autenticado (vía `saveScore` de `lib/scores.ts`); si no hay sesión, el modal ofrece ir a `/ingresar` en vez de guardar. Sin guardado automático ni fallback a `localStorage`.
- Controles: teclado (`ArrowLeft`, `ArrowRight`, `KeyP`, `Escape`) y mouse (`mousemove` para la paleta, `click` solo sobre los nuevos botones HTML del selector de nivel, ya no sobre el canvas). Listeners agregados en el montaje y removidos en el cleanup del `useEffect`, igual que los otros reproductores reales.
- Botón **SALIR**: navega a `/juego/arkanoid` deteniendo el loop (cleanup del `useEffect`).
- Migración de assets: `references/started-games/04-arkanoid/assets/spritesheet-breakout.png`, `assets/spritesheet.js` (helpers `drawSprite`/`drawFrame`) y `assets/sounds/{ball-bounce.mp3,break-sound.mp3}` se copian a `public/arkanoid/`. La carga de la imagen (`new Image()`) y de los audios (`new Audio()`) se guarda detrás de un guard `typeof window !== "undefined"` dentro de un `useEffect`/inicialización perezosa, nunca a nivel de módulo, para no romper el render en servidor de App Router.
- `references/started-games/04-arkanoid/levels.js` se porta a un módulo `.ts` (ej. `components/games/arkanoid-levels.ts`) con la misma estructura `LEVELS` (array de `{ speed, blocks }`), importado por el motor.
- `app/juego/[id]/jugar/page.tsx`: se agrega una rama más al if-chain existente — si `id === "arkanoid"` renderiza `ArkanoidPlayer`; el resto de ids sigue su resolución actual sin cambios (`asteroides` → `AsteroidsPlayer`, `tetris` → `TetrisPlayer`, el resto → `GamePlayer` genérico).
- `components/library.tsx`: se agrega `"arkanoid"` a `REAL_GAME_IDS`, para que la vista de tabla calcule mejor puntuación/partidas jugadas en vivo desde Supabase para este juego también.
- Migración Supabase: nuevo archivo en `supabase/migrations/` con únicamente un `insert into public.games (...)` para el registro `arkanoid` (mismo shape que `asteroides`/`tetris`: `id`, `title`, `short`, `long`, `cat`, `cover`, `color`). No se modifica el esquema de `games`/`scores`/`profiles` — ya es genérico.

**No incluido (fuera de alcance de este spec):**

- Modificar o eliminar la entrada mock `bloque-buster` del catálogo — queda intacta como juego simulado, aunque temáticamente se solape con `arkanoid` (mismo patrón que `rocas`/`asteroides`).
- Portar cualquier otro juego de `references/started-games/` — este spec cubre exclusivamente Arkanoid.
- Generalizar un registro `Record<string, Component>` para resolver el reproductor por id en `app/juego/[id]/jugar/page.tsx` — se mantiene el if-chain existente por mínimo diff (ver Riesgos: con Arkanoid este sería el cuarto juego real portado, conviene evaluarlo a partir de acá).
- Soporte táctil/móvil para los controles del juego (el mouse y el teclado de la fuente no se adaptan a touch en este spec).
- Historial de partidas o estadísticas adicionales más allá de mejor puntuación/partidas jugadas (ya cubiertas por spec 06) — ranking global cross-juego, paginación, etc. siguen fuera de alcance como ya definió spec 06.
- Tests automatizados (no hay test runner configurado en el repo).
- Ajustes de dificultad, balance, niveles adicionales o cambios de sprites respecto a la fuente — se porta tal cual está en `game.js`/`levels.js`/`spritesheet.js`.
- Cualquier persistencia en `localStorage` — la fuente de Arkanoid no usa `localStorage` (a diferencia del theme toggle de Tetris), así que no hay nada que descartar explícitamente en ese sentido.

## Modelo de datos

No se introduce un modelo de datos nuevo más allá de lo ya definido en spec 06. Se agrega:

1. Un elemento a `GAMES` (`lib/data.ts`), con la misma forma `Game` existente:

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "...",
  long: "...",
  cat: "ARCADE",
  cover: "cover-arkanoid",
  color: "yellow",
  best: 0,
  plays: "0",
}
```

2. Una clase CSS nueva `.cover-arkanoid` en `app/globals.css`, siguiendo el mismo patrón que las demás clases `cover-*` (gradiente de fondo + pseudo-elemento decorativo), sin introducir chrome nuevo de HUD/modal.

3. Un registro en la tabla real `games` de Supabase (esquema ya existente de spec 06, sin cambios de DDL):

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'arkanoid',
  'ARKANOID',
  '...',
  '...',
  'ARCADE',
  'cover-arkanoid',
  'yellow'
);
```

Los textos `short`/`long` exactos se redactan al implementar, siguiendo el tono ya usado para `asteroides`/`tetris`/`bloque-buster` (sin inventar mecánicas que no estén en el alcance de este spec).

## Plan de implementación

1. `lib/data.ts` — agregar la entrada `arkanoid` a `GAMES` con el shape de arriba. El catálogo mock sigue funcionando igual que antes; la nueva card aparece en `/biblioteca` apuntando a un reproductor que todavía no existe.
2. `app/globals.css` — agregar la clase `.cover-arkanoid` (y su pseudo-elemento decorativo si corresponde), siguiendo el patrón visual de las clases `cover-*` existentes.
3. Refactorizar `references/started-games/04-arkanoid/game.js` a una clase `ArkanoidEngine` (puede vivir directamente dentro de `components/games/arkanoid-player.tsx`, igual convención que `AsteroidsEngine`/`TetrisEngine`) con constructor `(ctx, { onStatsChange, onStateChange })`, exponiendo métodos equivalentes a `start`/`stop`/`handleKeyDown`/`handleKeyUp`/`handleMouseMove`/`loadLevel(n)`, eliminando `drawPauseOverlay` (selector de nivel dibujado en canvas) y `drawOverlay` (game over/win dibujados en canvas), y reemplazando toda señal de fin de nivel/vidas/victoria por invocaciones a los callbacks. El sistema no se ve afectado todavía (nada lo consume fuera del propio archivo).
4. Portar `references/started-games/04-arkanoid/levels.js` a `components/games/arkanoid-levels.ts` con la misma estructura `LEVELS`, importado por el motor del paso anterior.
5. Copiar `references/started-games/04-arkanoid/assets/spritesheet-breakout.png` y `assets/sounds/{ball-bounce.mp3,break-sound.mp3}` a `public/arkanoid/`. Portar `assets/spritesheet.js` (helpers `drawSprite`/`drawFrame`, carga de `Image`) al motor o a un módulo auxiliar, con guard `typeof window !== "undefined"` antes de instanciar `Image`/`Audio`.
6. `components/games/arkanoid-player.tsx` — componente React que monta el motor sobre el `<canvas>` 800×600, sincroniza el HUD (Jugador/Puntuación/Vidas/Nivel), implementa PAUSA (botón + atajo `KeyP`/`Escape`) con el selector de nivel como overlay HTML de React (no dibujado en canvas), FIN/SALIR, y el modal de fin de partida con guardado manual vía `saveScore`/`/ingresar`, distinguiendo el título según `state` sea `"gameover"` o `"win"`. El juego es jugable de punta a punta en memoria, sin persistir todavía ningún score real.
7. `app/juego/[id]/jugar/page.tsx` — agregar la rama `if (game.id === "arkanoid") return <ArkanoidPlayer game={game} />;` al if-chain existente. `/juego/arkanoid/jugar` ya sirve el reproductor real de Arkanoid.
8. `components/library.tsx` — agregar `"arkanoid"` a `REAL_GAME_IDS`. La vista de tabla en `/biblioteca` ya calcula mejor puntuación/partidas jugadas en vivo para Arkanoid (inicialmente `0`/`0` hasta la primera partida guardada).
9. Migración Supabase — crear `supabase/migrations/<timestamp>_seed_arkanoid_game.sql` con el `insert into public.games (...)` del registro `arkanoid`, aplicarla vía `mcp__supabase__apply_migration`, y verificar con `mcp__supabase__get_advisors(type: "security")` que las políticas RLS existentes siguen sin advertencias tras el insert.
10. Checklist de prueba manual: jugar una partida completa (mover la paleta con mouse y con flechas, rebotar la pelota, romper bloques), pausar y reanudar con el botón y con `KeyP`/`Escape` (confirmar que el selector de nivel aparece como overlay de React y cambia de nivel correctamente), perder las 3 vidas y verificar el modal de "FIN DEL JUEGO", completar los 5 niveles y verificar el modal de "¡GANASTE!", guardar la puntuación estando autenticado (confirmar insert real en `scores`) y verificar el CTA a `/ingresar` sin sesión, confirmar que `/salon` agrega el tab "ARKANOID" con datos reales, y correr `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] La entrada `arkanoid` aparece en `/biblioteca` (vista grid y vista tabla) con cover `cover-arkanoid`, sin alterar la entrada mock `bloque-buster`.
- [ ] `ArkanoidEngine` no escribe a canvas fuera de su propio dibujo de juego (bloques/pelota/paleta/explosiones) — el game over, la victoria y el selector de nivel en pausa ya no se dibujan dentro del canvas; todo pasa por `onStatsChange`/`onStateChange` hacia React.
- [ ] `/juego/arkanoid/jugar` renderiza `ArkanoidPlayer` y permite jugar una partida completa: mover la paleta con mouse y con `←`/`→`, rebotar la pelota en paredes/paleta, romper bloques con animación de explosión y sonido, y progresar por los 5 niveles con velocidad incremental.
- [ ] El botón PAUSA y el atajo `KeyP`/`Escape` detienen y reanudan el loop sin perder el estado de bloques/pelota/paleta, y muestran el selector de nivel (botones 1–5, nivel activo resaltado) como overlay de React que permite saltar de nivel.
- [ ] Al perder la tercera vida se abre automáticamente el modal "FIN DEL JUEGO"; al limpiar los bloques del nivel 5 se abre automáticamente el modal "¡GANASTE!" — ambos casos probados manualmente.
- [ ] Estando autenticado, "GUARDAR PUNTUACIÓN" inserta una fila real en la tabla `scores` de Supabase con `game_id: "arkanoid"`, tanto desde el modal de derrota como desde el de victoria.
- [ ] Sin sesión, el modal de fin de partida ofrece ir a `/ingresar` en vez de un botón de guardado.
- [ ] `/salon` muestra un tab "ARKANOID" adicional (además de "ASTEROIDES" y "TETRIS") con el leaderboard real de ese juego.
- [ ] La vista de tabla en `/biblioteca` muestra mejor puntuación/partidas jugadas en vivo para `arkanoid` (no valores mock), igual que ya ocurre para `asteroides`/`tetris`.
- [ ] Los assets (`spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3`) se sirven desde `public/arkanoid/` y no rompen el render en servidor (sin errores de `Image`/`Audio is not defined` durante `npm run build`).
- [ ] `mcp__supabase__get_advisors(type: "security")` no reporta advertencias nuevas tras aplicar la migración de seed.
- [ ] `npm run lint && npm run build` pasan sin errores sobre el código real del proyecto (se excluyen, como ya es convención del repo, los errores preexistentes de `references/templates/*.jsx` y `references/started-games/**`).

## Decisiones tomadas y descartadas

- **Refactor a motor con callbacks es obligatorio, no limpieza opcional**: la fuente dibuja el selector de nivel completo (5 botones clicables) y los overlays de game over/victoria directo en canvas, con su propio listener de `click`; sin extraer eso a estado de React no hay forma de sincronizar el HUD ni el modal de fin de partida con el estado del juego.
- **El selector de nivel de pausa se reimplementa como botones HTML de React, no se porta el dibujo en canvas** — es la pieza de UI más atípica de esta fuente respecto a Asteroides/Tetris; mantenerla dentro del canvas impediría reutilizar el modal/overlay ya existentes y duplicaría lógica de hit-testing de mouse que React resuelve gratis.
- **Se agrega el estado `"win"` a `onStateChange`, además de `"playing"`/`"paused"`/`"gameover"`** — Arkanoid es el primer juego real portado con condición de victoria explícita (completar los 5 niveles); Asteroides y Tetris no la tienen.
- **Se crea una clase `cover-arkanoid` nueva en vez de reutilizar `cover-bricks`** — a diferencia de Tetris/`caida` (mismo autor, mismo estilo visual), `bloque-buster`/`cover-bricks` es una entrada mock independiente que no se quiere acoplar visualmente a la entrada real; es solo una clase de fondo CSS, bajo costo de crear una nueva.
- **Convive `bloque-buster` (mock) con `arkanoid` (real) en el catálogo** — mismo patrón ya aceptado con `rocas`/`asteroides`; no se renombra ni se elimina la entrada mock.
- **El modal de fin de partida sigue el mismo contrato que Asteroides/Tetris** (confirmación manual, sin guardado automático, CTA a `/ingresar` si no hay sesión), distinguiendo únicamente el título entre derrota y victoria — consistencia entre juegos reales ya establecida por spec 06, sin reinventar el flujo por juego.
- **Alcance único (porting + wiring a Supabase en un solo spec)**, igual que se hizo con Tetris (spec 07) y a diferencia de cómo se hizo históricamente con Asteroides (specs 05 y 06 separados por motivos históricos): el esquema de Supabase ya existe y es genérico, por lo que no hay necesidad real de partir el trabajo en dos aprobaciones.
- **El if-chain de `app/juego/[id]/jugar/page.tsx` se mantiene tal cual** (no se generaliza a un registro) para minimizar el diff de este spec; queda anotado como riesgo a resolver a partir de este punto, dado que ya sería la cuarta rama.

## Riesgos identificados

- **If-chain de reproductores creciendo sin abstracción**: con Arkanoid, `app/juego/[id]/jugar/page.tsx` tendrá cuatro ramas (`asteroides`, `tetris`, `arkanoid`, genérico). Si se porta un quinto juego real sin resolver esto, conviene evaluar entonces un registro `Record<string, Component>` en vez de seguir extendiendo el if-chain — no se resuelve en este spec para mantener el diff mínimo.
- **Modelo de input híbrido (mouse + teclado) es nuevo respecto a los juegos ya portados**: Asteroides y Tetris son solo teclado. Un bug en el escalado de coordenadas de mouse (`getBoundingClientRect`/`scaleX`) podría hacer que la paleta no responda correctamente cuando el canvas está escalado por CSS en pantallas angostas. Mitigación: probar manualmente el control de paleta con la ventana redimensionada, no solo a tamaño completo (paso 10 del plan).
- **Carga de assets (spritesheet + audio) en un componente de App Router**: si el guard de SSR se omite o se coloca mal, `new Image()`/`new Audio()` a nivel de módulo rompería el build de Next.js al renderizar en servidor. Mitigación: inicialización perezosa dentro de un `useEffect`, verificada explícitamente por el criterio de aceptación de `npm run build` sin errores.
- **Duplicación temática `bloque-buster`/`arkanoid` en la biblioteca**: un usuario podría ver dos juegos con premisa casi idéntica en el catálogo. Mitigación: aceptado explícitamente por decisión del usuario para este spec, mismo precedente que `rocas`/`asteroides`.
