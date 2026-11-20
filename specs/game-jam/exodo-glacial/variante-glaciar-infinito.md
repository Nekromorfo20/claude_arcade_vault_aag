# Game Jam · Éxodo Glacial · Variante: glaciar infinito con temporada de deshielo

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero un motor de Éxodo Glacial con progresión infinita de tableros — cada refugio alcanzado genera un nuevo paso de montaña y un nuevo río helado más veloces y con témpanos más frágiles — con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `ExodoGlacialPlayer`, y darlo de alta como entrada real `exodo-glacial` en el catálogo.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "exodo-glacial"`, `title: "ÉXODO GLACIAL"`, categoría `ARCADE`, color `cyan`, cover `cover-glacial` (misma clase nueva propuesta por la variante hermana), `best: 0`, `plays: "0"`.
- Motor `ExodoGlacialEngine` construido sobre el mismo esqueleto base de tablero (paso de montaña + río helado + refugios) y la misma mecánica central de integridad de témpano que `variante-deshielo-por-tablero.md`, con estas diferencias:
  - **Progresión sin techo:** al ocupar los 5 refugios de un tablero, no se dispara `win` — se genera un nuevo tablero (nivel+1) con velocidad incrementada de obstáculos (`×1.00` a `×2.3` con techo en nivel 13) y témpanos que se degradan más rápido (menor integridad inicial o decrecimiento más veloz por nivel). El juego termina únicamente por `gameover` al perder la última vida.
  - **Evento de "temporada de deshielo":** cada 3 niveles completados, el río helado entra en un estado especial de 8 segundos donde todos los témpanos pierden integridad al doble de velocidad, anunciado con un aviso visual en pantalla ("¡DESHIELO!") — un pico de dificultad periódico que rompe la monotonía de simplemente acelerar linealmente, análogo a la aceleración de tick de Serpiente pero como evento puntual en vez de permanente.
  - Un power-up recolectable: _pico de hielo_ (ícono de piqueta), que al tomarse congela instantáneamente la integridad del témpano actual (y del próximo en el que se aterrice) durante 4 segundos, dando un respiro en medio de una temporada de deshielo.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, lives: number, level: number) => void; onStateChange: (state: GameState) => void }`, `GameState = "playing" | "paused" | "gameover"` (sin `"win"`, progresión infinita).
  - Dedupe de callbacks igual que el resto de motores del repo.
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Puntuación: mismo esquema base que la variante hermana (+10 fila, +50 témpano, +200 refugio, +300 salto ágil), más `+500 × nivel` al completar cada tablero y `+150` extra por cada refugio ocupado durante una temporada de deshielo activa (recompensa jugar bien bajo presión) — le da rango largo y creciente al score, mitigando el mismo riesgo de "score corto" que `game-planner` señaló para el concepto base de Frogger.
  - Al reanudar desde pausa, resetea `lastTime` y el cronómetro de la temporada de deshielo activa (si había una en curso, se retoma desde el tiempo restante, no se reinicia a cero).
- Renderizado con primitivas de canvas, igual criterio visual que la variante hermana, sumando el ícono de piqueta (power-up) y un overlay de texto parpadeante "¡DESHIELO!" durante el evento especial.
- Controles: flechas direccionales y WASD.
- Componente `components/games/exodo-glacial-player.tsx`: mismo patrón de `useEffect`s que el resto de reproductores reales. HUD: Jugador / Puntuación / Vidas / Nivel. Badge adicional visible solo durante la temporada de deshielo ("¡DESHIELO! Xs restantes").
- Modal de fin de partida con único título "FIN DEL JUEGO" (sin estado `win`), guardado manual vía `saveScore`.
- Alta en `app/juego/[id]/jugar/page.tsx`, `components/library.tsx` y migración Supabase.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Condición de victoria / estado `"win"`.
- Más de un power-up (se descartó un segundo power-up de "congelamiento de obstáculos del paso de montaña" por alcance, ver Decisiones).
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
  long: "Esquivá motonieves y osos polares, después saltá entre témpanos agrietados sin parar demasiado tiempo. Cada refugio alcanzado trae un glaciar nuevo, más veloz — y cada tres niveles, una temporada de deshielo que no perdona.",
  cat: "ARCADE",
  cover: "cover-glacial",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

Reutiliza la clase `.cover-glacial` propuesta por la variante hermana (ambas variantes comparten id y cover; solo se implementaría una de las dos).

**Migración Supabase (`supabase/migrations/<timestamp>_seed_exodo_glacial_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'exodo-glacial',
  'ÉXODO GLACIAL',
  'Cruza el paso nevado y el río helado.',
  'Esquivá motonieves y osos polares, después saltá entre témpanos agrietados sin parar demasiado tiempo. Cada refugio alcanzado trae un glaciar nuevo, más veloz — y cada tres niveles, una temporada de deshielo que no perdona.',
  'ARCADE',
  'cover-glacial',
  'cyan'
);
```

## Plan de implementación

1. **`lib/data.ts`** — agregar la entrada `exodo-glacial` (coordinar con la variante hermana si ambas se promueven en algún momento: solo una puede implementarse bajo este id).
2. **`app/globals.css`** — agregar `.cover-glacial` si no se creó ya al implementar la variante hermana.
3. **`components/games/exodo-glacial-player.tsx`** — escribir `ExodoGlacialEngine`: generador de tablero parametrizado por nivel, sistema de temporada de deshielo (temporizador de activación cada 3 niveles, multiplicador de degradación de integridad mientras está activa), power-up de pico de hielo (spawn con cooldown, efecto temporal de congelamiento de integridad), lógica de incremento de nivel sin disparar `win`.
4. En el mismo archivo, el componente `ExodoGlacialPlayer`: HUD de 4 stats, badge de temporada de deshielo activa, modal de fin de partida con guardado manual.
5. **`app/juego/[id]/jugar/page.tsx`** — rama `if (game.id === "exodo-glacial") return <ExodoGlacialPlayer game={game} />;`.
6. **`components/library.tsx`** — agregar `"exodo-glacial"` a `REAL_GAME_IDS`.
7. **Migración Supabase** — seed + `mcp__supabase__apply_migration` + `mcp__supabase__get_advisors`.
8. **Checklist de prueba manual**: completar un tablero y confirmar que genera uno nuevo más veloz sin abrir modal; llegar al nivel 3 y confirmar que se activa la temporada de deshielo con el aviso visual y la degradación acelerada de témpanos; recolectar el pico de hielo durante una temporada de deshielo y confirmar el respiro de 4 segundos; perder las 3 vidas y confirmar `gameover`; confirmar que el score crece de forma acumulativa y sin techo bajo entre niveles; pausar/reanudar durante una temporada de deshielo activa y confirmar que el cronómetro retoma el tiempo restante, no se reinicia. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` incluye la entrada `exodo-glacial` con el shape de Modelo de datos.
- [ ] `ExodoGlacialEngine` expone `onStatsChange(score, lives, level)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover"` (sin `"win"`).
- [ ] Completar los 5 refugios de un tablero genera un nuevo tablero de nivel+1 con velocidad incrementada, sin abrir ningún modal.
- [ ] Cada 3 niveles completados se activa una temporada de deshielo de 8 segundos con aviso visual y degradación de integridad de témpanos al doble de velocidad.
- [ ] El power-up de pico de hielo congela la integridad del témpano actual y del siguiente durante 4 segundos al recolectarse.
- [ ] El score crece de forma acumulativa entre niveles sin techo bajo, incluyendo el bonus por refugios ocupados durante una temporada de deshielo activa.
- [ ] Perder la tercera vida dispara `onStateChange("gameover")` con guardado manual en el modal correspondiente.
- [ ] Pausar y reanudar durante una temporada de deshielo activa conserva el tiempo restante del evento, sin reiniciarlo.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `exodo-glacial` a `ExodoGlacialPlayer`.
- [ ] `REAL_GAME_IDS` incluye `"exodo-glacial"`.
- [ ] La migración de seed aplica limpiamente sin alertas nuevas de `mcp__supabase__get_advisors`.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Sin estado `win`, progresión infinita en vez de un tablero único.** Mismo razonamiento que la variante "niveles progresivos" de Ranaria: da al score rango largo y natural, mitigando el riesgo de techo bajo ya anotado por `game-planner` sobre el concepto base de Frogger.
- **Evento periódico de "temporada de deshielo" en vez de solo acelerar linealmente la velocidad por nivel.** Se decidió agregar un pico de dificultad puntual y anunciado (no una sorpresa injusta) para romper la monotonía de una curva de dificultad puramente lineal — aporta variedad de ritmo dentro de una sola partida larga.
- **Un solo power-up (pico de hielo), no dos.** Se evaluó sumar un segundo power-up que congelara temporalmente los obstáculos del paso de montaña, pero se descartó por alcance — ya hay bastante superficie nueva entre el generador de tableros y el evento de deshielo; queda como candidato a un spec de seguimiento.
- **Reutiliza la cover y el color de la variante hermana.** Ambas variantes comparten `id`, `cover` y paleta porque representan el mismo juego con alcance distinto — solo una de las dos se implementaría en la práctica.
- **Curva de velocidad con techo en nivel 13**, ligeramente más alta que la de Ranaria (techo 12) y Arkanoid (techo 5 niveles, otra escala), elegida por tener más margen dado que la propia mecánica de integridad del témpano ya aporta dificultad sin depender solo de la velocidad de los obstáculos.

## Riesgos identificados

- **Interacción entre temporada de deshielo y power-up de pico de hielo puede desbalancear el ritmo.** Si el pico de hielo se vuelve demasiado accesible, anula por completo la presión del evento especial; si es demasiado raro, el evento se siente injusto. Requiere tuning empírico, sin fórmula cerrada en este spec.
- **Complejidad de motor considerablemente mayor que la variante de tablero fijo**: generador procedural + evento temporizado + power-up con efecto de doble alcance (témpano actual y siguiente) es la variante más ambiciosa de todo este jam, con más superficie de bugs en una primera implementación.
- **Mismo riesgo de legibilidad de la grieta de témpano solo con primitivas** que ya identificó la variante hermana, agravado durante la temporada de deshielo donde el cambio de velocidad debe ser perceptible además del propio desgaste visual.
