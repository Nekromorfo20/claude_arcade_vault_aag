# Game Jam · Éxodo Glacial · Variante: deshielo por tablero fijo

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero un re-tema glacial de Frogger — cruzar un paso de montaña nevado con maquinaria pesada y luego un río helado con témpanos que se hunden por inestabilidad — con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `ExodoGlacialPlayer`, y darlo de alta como entrada real `exodo-glacial` en el catálogo.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "exodo-glacial"`, `title: "ÉXODO GLACIAL"`, categoría `ARCADE`, color `cyan`, cover `cover-glacial` (clase nueva, ver Modelo de datos), `best: 0`, `plays: "0"`.
- Motor `ExodoGlacialEngine` sobre una grilla fija de un solo tablero (13 columnas × 14 filas lógicas), con la misma estructura base de carriles que Frogger clásico pero re-temada:
  - Fila de meta: 5 refugios de hielo (iglús) a ocupar.
  - 5 filas de "paso de montaña" (equivalente a la carretera): motonieves, rompehielos sobre orugas y osos polares patrullando en movimiento horizontal; tocar cualquiera = `gameover` inmediato.
  - 1 fila segura intermedia (banco de nieve).
  - 5 filas de "río helado" (equivalente al río): témpanos de hielo flotantes en movimiento horizontal.
  - **Mecánica diferencial central de esta variante — inestabilidad del témpano:** cada témpano tiene una barra de integridad que baja mientras el jugador está parado sobre él (se dibuja como una grieta que crece visualmente); si la integridad llega a cero mientras el jugador sigue encima, el témpano se hunde y el jugador cae al agua helada = pierde una vida. Saltar a otro témpano antes de que se hunda resetea la integridad del nuevo témpano al 100%. Esto reemplaza la sumersión periódica de las tortugas de Frogger por una mecánica de "no te quedes quieto", más orientada a recompensar el avance constante.
  - Sistema de 3 vidas; perder una vida reinicia la posición de inicio sin perder refugios ya ocupados.
  - Barra de tiempo por intento (más corta que en Frogger clásico, ya que la inestabilidad del témpano ya castiga la lentitud, así que el tiempo total puede ser más generoso para no duplicar la presión).
  - Completar los 5 refugios dispara `onStateChange("win")`.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, lives: number, filled: number) => void; onStateChange: (state: GameState) => void }`, `GameState = "playing" | "paused" | "gameover" | "win"`.
  - Dedupe de callbacks igual que el resto de motores del repo.
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Loop vía `requestAnimationFrame`: vehículos/témpanos avanzan por `dt` continuo, salto del jugador discreto por tecla con cooldown anti-rebote (~120ms), integridad del témpano decrece por `dt` mientras el jugador está parado sobre él.
  - Puntuación: +10 por fila de avance neto, +50 por salto exitoso sobre témpano, +200 por refugio ocupado, +300 bonus si se salta a un témpano nuevo con la integridad del anterior aún por encima del 50% ("salto ágil", recompensa el ritmo).
- Renderizado con primitivas de canvas: jugador como triángulo/rombo cian con detalle de abrigo, motonieves/rompehielos como rects grises y blancos, osos polares como óvalos blancos con un punto negro de nariz, témpanos como polígonos blancos/celestes con una grieta dibujada que crece (línea quebrada que se extiende según la integridad restante), refugios como semicírculos blancos en la fila de meta.
- Controles: flechas direccionales y WASD.
- Componente `components/games/exodo-glacial-player.tsx`: mismo patrón de `useEffect`s (auth, montaje/cleanup del motor, reset de pausa) que el resto de reproductores reales del repo. HUD: Jugador / Puntuación / Vidas / Refugios (`filled/5`).
- Modal de fin de partida con título distinto según `state` ("FIN DEL JUEGO" vs. "¡REFUGIO ASEGURADO!"), guardado manual vía `saveScore` idéntico al patrón ya establecido.
- Alta en `app/juego/[id]/jugar/page.tsx`, `components/library.tsx` y migración Supabase.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Progresión de niveles infinita (eso lo cubre la variante hermana `variante-glaciar-infinito.md`).
- Power-ups.
- Soporte táctil/mobile.
- Sonido/música.
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx`.

## Modelo de datos

**Nueva entrada en `GAMES` (`lib/data.ts`):**

```ts
{
  id: "exodo-glacial",
  title: "ÉXODO GLACIAL",
  short: "Cruza el paso nevado y el río helado.",
  long: "Esquivá motonieves y osos polares en el paso de montaña, después saltá entre témpanos que se agrietan bajo tus pies antes de hundirse. Llegá a los cinco refugios antes de que el hielo ceda.",
  cat: "ARCADE",
  cover: "cover-glacial",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

**Clase CSS nueva `.cover-glacial`** en `app/globals.css`, siguiendo el mismo patrón que las demás clases `cover-*` (gradiente de fondo azul/blanco glacial + pseudo-elemento decorativo, ej. líneas de grieta o copos), sin introducir chrome nuevo de HUD/modal.

**Migración Supabase (`supabase/migrations/<timestamp>_seed_exodo_glacial_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'exodo-glacial',
  'ÉXODO GLACIAL',
  'Cruza el paso nevado y el río helado.',
  'Esquivá motonieves y osos polares en el paso de montaña, después saltá entre témpanos que se agrietan bajo tus pies antes de hundirse. Llegá a los cinco refugios antes de que el hielo ceda.',
  'ARCADE',
  'cover-glacial',
  'cyan'
);
```

## Plan de implementación

1. **`lib/data.ts`** — agregar la entrada `exodo-glacial` al array `GAMES`.
2. **`app/globals.css`** — agregar la clase `.cover-glacial` siguiendo el patrón visual de las clases `cover-*` existentes.
3. **`components/games/exodo-glacial-player.tsx`** — escribir desde cero `ExodoGlacialEngine`: tablero fijo con las filas descritas, lista de obstáculos del paso de montaña con velocidad y sentido por fila, lista de témpanos con barra de integridad individual y lógica de hundimiento, detección de colisión en el paso de montaña, sistema de 3 vidas, barra de tiempo por intento, los 5 refugios y condición de `win`.
4. En el mismo archivo, el componente `ExodoGlacialPlayer`: canvas + `useRef`, los `useEffect` descritos, listener de teclado, HUD de 4 stats, botones PAUSA/REANUDAR/FIN/SALIR, modal de fin de partida con guardado manual.
5. **`app/juego/[id]/jugar/page.tsx`** — agregar la rama `if (game.id === "exodo-glacial") return <ExodoGlacialPlayer game={game} />;`.
6. **`components/library.tsx`** — agregar `"exodo-glacial"` a `REAL_GAME_IDS`.
7. **Migración Supabase** — crear el seed, aplicar vía `mcp__supabase__apply_migration`, correr `mcp__supabase__get_advisors`.
8. **Checklist de prueba manual**: cruzar el paso de montaña sin chocar; pararse en un témpano y observar la grieta crecer hasta hundirse, confirmando pérdida de vida; saltar entre témpanos antes de que se hundan y confirmar el bonus de "salto ágil"; ocupar los 5 refugios y confirmar `win`; agotar el tiempo de un intento y confirmar pérdida de vida; perder las 3 vidas y confirmar `gameover`; pausar/reanudar sin salto de tiempo; guardar puntuación autenticado y sin sesión. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` incluye la entrada `exodo-glacial` con el shape de Modelo de datos, sin afectar ninguna entrada existente.
- [ ] `.cover-glacial` existe en `app/globals.css` siguiendo el patrón visual del resto de clases `cover-*`.
- [ ] `ExodoGlacialEngine` expone `onStatsChange(score, lives, filled)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover" | "win"`, deduplicando emisiones.
- [ ] Tocar un obstáculo en el paso de montaña dispara `gameover` inmediato.
- [ ] Cada témpano tiene una barra de integridad individual que decrece mientras el jugador permanece sobre él y se resetea al saltar a otro témpano.
- [ ] Un témpano hundido bajo el jugador consume una vida y reinicia su posición sin perder refugios ya ocupados.
- [ ] Ocupar los 5 refugios dispara `onStateChange("win")`.
- [ ] El modal de fin de partida distingue título entre `gameover` y `win`, y ofrece guardado manual, nunca automático.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `exodo-glacial` a `ExodoGlacialPlayer` sin romper las ramas existentes.
- [ ] `REAL_GAME_IDS` incluye `"exodo-glacial"`.
- [ ] La migración de seed aplica limpiamente y `mcp__supabase__get_advisors` no reporta alertas nuevas.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Inestabilidad de témpano en vez de sumersión periódica de tortuga.** Se evaluó portar la sumersión cíclica tal cual Frogger clásico, pero se descartó a favor de una mecánica de "barra de integridad que baja con el tiempo parado" porque encaja mejor con la estética de hielo quebrándose y le da al jugador una señal visual continua (la grieta) en vez de un ciclo binario de aviso/sumersión.
- **Tablero fijo de un solo nivel, sin progresión.** Igual criterio que la variante de tablero fijo de Ranaria: representa el concepto "puro" de esta variante temática, acotado para evaluar rápido. La progresión vive en la variante hermana.
- **Cover nueva (`cover-glacial`) en vez de reusar alguna existente.** Ninguna cover actual tiene paleta azul/blanca glacial; crear una nueva es de bajo costo (solo CSS) y evita forzar una estética ajena.
- **Sin power-ups ni sonido en esta variante**, para mantenerla comparable en alcance al spec de Serpiente.
- **Color `cyan`** elegido para la entrada de catálogo por asociación directa con hielo/frío, sin chocar con el uso de `cyan` en `duelo-pixel` (son juegos de categorías distintas, ARCADE vs VERSUS).

## Riesgos identificados

- **Legibilidad de la grieta del témpano solo con primitivas de canvas.** Sin sprite dedicado, comunicar "cuánto falta para que se hunda" con una línea quebrada que crece puede no leerse con claridad a primera vista; mitigable con un cambio de color progresivo (blanco → celeste → rojo) además de la grieta.
- **Balance de la velocidad de decrecimiento de integridad.** Si baja muy rápido, castiga cualquier pausa breve para pensar el próximo salto; si baja muy lento, la mecánica pierde tensión y se siente idéntica a un tronco normal de Frogger. Requiere tuning manual al implementar.
- **Nueva clase CSS `cover-glacial` sin precedente de paleta azul/blanca en el catálogo actual.** Riesgo menor de inconsistencia visual frente a las covers ya existentes; mitigable revisando el resultado contra el resto de la grilla de `/biblioteca` antes de aprobar el spec de implementación.
