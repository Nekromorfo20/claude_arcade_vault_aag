# Game Jam · Ranaria · Variante: niveles progresivos con power-ups

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero un motor de Frogger con progresión infinita de niveles (cada tablero completado genera uno nuevo más veloz y más poblado) y dos power-ups, con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `RanariaPlayer`, y darlo de alta como entrada real `ranaria` en el catálogo.

## Alcance

**Incluido:**

- Nueva entrada real en `GAMES` (`lib/data.ts`) con `id: "ranaria"`, `title: "RANARIA"`, categoría `ARCADE`, color `green`, cover `cover-rana`, `best: 0`, `plays: "0"` (mismo shape que la variante hermana; ver Decisiones sobre el conflicto de id con el mock).
- Motor `RanariaEngine` construido sobre el mismo esqueleto base de tablero (carretera + río + meta) que la variante `variante-tablero-fijo.md`, pero con estas diferencias centrales de diseño:
  - **Progresión de niveles sin techo:** al completar los 5 nenúfares de un tablero, no se dispara `win` — se genera un nuevo tablero (nivel+1) regenerando posiciones de vehículos/troncos/tortugas, incrementando velocidad base (`×1.00` hasta `×2.2` con techo en nivel 12, igual patrón de curva que Arkanoid) y reduciendo el tiempo disponible por vida. El juego no tiene condición de victoria explícita — termina únicamente por `gameover` al perder la última vida, igual que Tetris/Serpiente.
  - **Power-ups en el tablero:** aparece aleatoriamente (máximo uno a la vez, con cooldown entre apariciones) uno de dos power-ups recolectables saltando sobre su celda:
    - _Reloj de tiempo extra_ (ícono de reloj): suma 5 segundos a la barra de tiempo del intento actual.
    - _Casco de invencibilidad_ (ícono de casco/estrella): durante 3 segundos la rana puede cruzar la carretera sin morir al chocar (atraviesa vehículos), pero sigue necesitando una plataforma válida en el río — el casco no flota.
  - El resto de la mecánica base (grilla fija por tablero, salto discreto por tecla, troncos/tortugas con sumersión periódica, barra de tiempo por vida, 3 vidas) se mantiene igual que la variante hermana.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, lives: number, level: number) => void; onStateChange: (state: GameState) => void }`, con `GameState = "playing" | "paused" | "gameover"` (sin `"win"` — a diferencia de la variante de tablero fijo, acá no hay techo de niveles).
  - Dedupe de callbacks igual que el resto de motores del repo.
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Puntuación: mismo esquema base que la variante hermana (+10 por fila de avance, +50 por salto sobre plataforma, +200 por nenúfar ocupado), más un bonus `+500 × nivel` al completar cada tablero completo — esto le da al score rango largo y creciente sin techo, mitigando el riesgo de "score corto por nivel" que el propio `game-planner` señaló sobre este concepto.
  - Al reanudar desde pausa, resetea el `lastTime` del loop y el acumulador de tiempo, igual que la variante hermana.
- Renderizado con primitivas de canvas, igual criterio que la variante hermana, sumando dos íconos simples (reloj y casco) dibujados con formas geométricas básicas (sin spritesheet).
- Controles: flechas direccionales y WASD.
- Componente `components/games/ranaria-player.tsx`: mismo patrón de `useEffect`s (auth, montaje/cleanup, reset de pausa) que la variante hermana. HUD: Jugador / Puntuación / Vidas / Nivel (reemplaza "Nenúfares" por "Nivel", ya que acá el progreso es de niveles infinitos, no de un conteo fijo de 5).
- Indicador visual simple en el HUD o en el canvas de si el casco de invencibilidad está activo (ej. un badge "INVENCIBLE" parpadeante durante los 3 segundos).
- Modal de fin de partida: único título "FIN DEL JUEGO" (no hay estado `win`), guardado manual vía `saveScore` idéntico al patrón ya establecido.
- Alta en `app/juego/[id]/jugar/page.tsx`, `components/library.tsx` y migración Supabase, igual que la variante hermana.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Condición de victoria / estado `"win"` — este diseño es deliberadamente infinito, como Tetris/Serpiente.
- Más de dos tipos de power-up (se descartó un tercer power-up de "salto doble" por alcance, ver Decisiones).
- Soporte táctil/mobile.
- Sonido/música.
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx`.

## Modelo de datos

**Nueva entrada en `GAMES` (`lib/data.ts`):**

```ts
{
  id: "ranaria",
  title: "RANARIA",
  short: "Cruza la autopista de pixeles.",
  long: "Salta entre carriles de coches y troncos a la deriva. Cada tablero superado trae uno nuevo, más rápido y más peligroso. Recolectá relojes y cascos de invencibilidad para aguantar un nivel más.",
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
  best: 0,
  plays: "0",
}
```

Reutiliza `cover-rana`, sin clase CSS nueva.

**Migración Supabase (`supabase/migrations/<timestamp>_seed_ranaria_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'ranaria',
  'RANARIA',
  'Cruza la autopista de pixeles.',
  'Salta entre carriles de coches y troncos a la deriva. Cada tablero superado trae uno nuevo, más rápido y más peligroso. Recolectá relojes y cascos de invencibilidad para aguantar un nivel más.',
  'ARCADE',
  'cover-rana',
  'green'
);
```

## Plan de implementación

1. **`lib/data.ts`** — mismo punto de decisión sobre el conflicto de id con el mock que la variante hermana (ver esa variante o la sección Decisiones acá).
2. **`components/games/ranaria-player.tsx`** — escribir `RanariaEngine`: generador de tablero parametrizado por nivel (reutilizable para regenerar en cada incremento), sistema de power-ups (spawn aleatorio con cooldown, efectos temporales con contador de frames/tiempo restante), lógica de incremento de nivel al completar los 5 nenúfares sin disparar `win`.
3. En el mismo archivo, el componente `RanariaPlayer`: HUD de 4 stats (Jugador/Puntuación/Vidas/Nivel), badge de invencibilidad activa, modal de fin de partida con guardado manual.
4. **`app/juego/[id]/jugar/page.tsx`** — rama `if (game.id === "ranaria") return <RanariaPlayer game={game} />;`.
5. **`components/library.tsx`** — agregar `"ranaria"` a `REAL_GAME_IDS`.
6. **Migración Supabase** — seed + `mcp__supabase__apply_migration` + `mcp__supabase__get_advisors`.
7. **Checklist de prueba manual**: completar un tablero y verificar que se regenera más rápido sin disparar ningún modal; recolectar el reloj y confirmar el incremento de tiempo; recolectar el casco y cruzar la carretera sin morir durante la ventana de 3 segundos, luego confirmar que vuelve a ser letal; perder las 3 vidas y confirmar `gameover`; confirmar que el score sigue creciendo de forma natural y acumulativa entre niveles (sin techo bajo); pausar/reanudar sin salto de tiempo. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` incluye la entrada real `ranaria` con el shape de Modelo de datos.
- [ ] `RanariaEngine` expone `onStatsChange(score, lives, level)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover"` (sin `"win"`).
- [ ] Completar los 5 nenúfares de un tablero genera un nuevo tablero de nivel+1 con velocidad incrementada, sin abrir ningún modal.
- [ ] El power-up de reloj suma tiempo a la barra del intento actual al recolectarse.
- [ ] El power-up de casco vuelve a la rana inmune a colisión con vehículos (no con caída al agua) durante una ventana de tiempo visible en el HUD.
- [ ] El score crece de forma acumulativa entre niveles sin reiniciarse ni tener un techo bajo (incluye el bonus `+500 × nivel` por tablero completado).
- [ ] Perder la tercera vida dispara `onStateChange("gameover")` y abre el modal correspondiente con guardado manual.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `ranaria` a `RanariaPlayer`.
- [ ] `REAL_GAME_IDS` incluye `"ranaria"`.
- [ ] La migración de seed aplica limpiamente sin alertas nuevas de `mcp__supabase__get_advisors`.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Sin estado `win`, progresión infinita en vez de 5 huecos fijos.** A diferencia de la variante hermana (fiel al arcade original de 1981), esta variante prioriza un score de rango largo y natural — mitigación directa del riesgo que `game-planner` ya anotó sobre Ranaria ("score por travesía es escalonado y de rango corto"), acumulando por recorrido total en vez de por nivel único.
- **Dos power-ups, no más.** Se evaluó agregar un tercero ("salto doble", saltar dos filas de una vez) pero se descartó por alcance — complejiza la detección de colisión intermedia (¿cuenta la fila que se salta?) sin aportar variedad proporcional; queda como candidato a un spec de seguimiento si esta variante se aprueba y se quiere expandir.
- **El casco no protege contra caída al agua.** Mantiene la tensión del río incluso con invencibilidad activa — evita que el power-up vuelva trivial toda la partida.
- **Mismo conflicto de id con el mock que la variante hermana, documentado igual.** Ver Riesgos.
- **Curva de velocidad calcada de Arkanoid (techo en nivel 12, `×1.00` a `×2.2`).** Reutiliza una curva de dificultad ya validada en el repo en vez de inventar una nueva desde cero.

## Riesgos identificados

- **Mismo conflicto de id con el mock `ranaria`** que la variante hermana — requiere la misma decisión explícita del usuario antes de implementar cualquiera de las dos.
- **Generación procedural de tableros sin techo puede volverse injugable rápido.** Si la curva de velocidad crece demasiado agresiva, el juego se vuelve imposible antes de dar sensación de progreso; mitigable con tuning manual del multiplicador por nivel, igual que ya ocurrió con el balance de Arkanoid.
- **Balance de aparición de power-ups.** Si aparecen con demasiada frecuencia le quitan tensión al juego; si aparecen muy poco, el jugador nunca los nota. Requiere ajuste empírico al implementar, sin fórmula cerrada en este spec.
- **Complejidad del motor mayor que la variante hermana.** El generador procedural de tableros + dos power-ups con efectos temporales es sensiblemente más código que el tablero fijo, lo que implica más superficie de bugs potenciales en la primera implementación.
