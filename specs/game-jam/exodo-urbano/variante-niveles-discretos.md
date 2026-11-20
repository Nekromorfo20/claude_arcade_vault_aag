# Game Jam · Éxodo Urbano · Variante: niveles discretos con terminal de evacuación

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero una versión de alcance más acotado de Éxodo Urbano — tableros fijos secuenciales (no scroll infinito), cada uno con una franja de tránsito y una franja industrial, con un punto de evacuación fijo como meta de cada tablero — con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `ExodoUrbanoPlayer`, y darlo de alta como entrada real `exodo-urbano` en el catálogo.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "exodo-urbano"`, `title: "ÉXODO URBANO"`, categoría `ARCADE`, color `yellow`, cover `cover-urbano` (misma clase nueva propuesta por la variante hermana), `best: 0`, `plays: "0"`.
- Motor `ExodoUrbanoEngine` sobre una grilla fija de un solo tablero por nivel (13 columnas × 14 filas lógicas), estructuralmente más parecido al Frogger clásico que la variante hermana, pero re-temado como escape urbano:
  - Fila de meta: una sola "terminal de evacuación" (un furgón de rescate) ubicada en una columna distinta y aleatoria en cada nivel, no cinco huecos — llegar a la columna correcta del furgón = nivel completado; llegar a cualquier otra columna de esa fila (contra un muro/escombro) = `gameover` inmediato. Esto simplifica la condición de meta respecto a los 5 nenúfares de Frogger clásico, dándole a esta variante un ritmo más rápido por intento.
  - 5 filas de "avenida colapsada" (equivalente a la carretera): autos abandonados en movimiento errático (empujados por explosiones aleatorias, con cambios de velocidad súbitos en vez de velocidad constante por carril, a diferencia de Frogger clásico) y patrullas; tocar cualquiera = `gameover` inmediato.
  - 1 fila segura intermedia (acera derrumbada).
  - 5 filas de "planta industrial abandonada" (equivalente al río): cintas transportadoras activas e inactivas que se alternan en ciclos (igual rol que la sumersión de tortugas de Frogger clásico: una cinta inactiva no es plataforma válida), y grúas con cargas que oscilan y pueden golpear al jugador si está debajo en el momento equivocado (un segundo tipo de peligro dentro de la misma franja, no presente en el Frogger original).
  - Sistema de 3 vidas; perder una vida reinicia la posición de inicio del tablero actual (no retrocede de nivel).
  - Barra de tiempo por intento (mismo rol que en Frogger clásico).
  - Completar el nivel 10 (llegar a la terminal de evacuación en el décimo tablero) dispara `onStateChange("win")` — a diferencia de la variante hermana (infinita) y de la variante de niveles progresivos de Ranaria, esta variante sí tiene un techo explícito de niveles, pensado como el "modo historia" acotado de Éxodo Urbano.
  - `EngineCallbacks`: `{ onStatsChange: (score: number, lives: number, level: number) => void; onStateChange: (state: GameState) => void }`, `GameState = "playing" | "paused" | "gameover" | "win"`.
  - Dedupe de callbacks igual que el resto de motores del repo.
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Loop vía `requestAnimationFrame`: vehículos/cintas/grúas avanzan por `dt` continuo con los cambios de velocidad súbitos descritos; salto del jugador discreto por tecla con cooldown anti-rebote.
  - Puntuación: +10 por fila de avance neto, +50 por cruce exitoso de una franja industrial, +300 por nivel completado (llegar a la terminal), con incremento de velocidad de obstáculos por nivel (`×1.00` a `×1.9`, techo en nivel 10 dado que el juego termina ahí).
- Renderizado con primitivas de canvas: jugador como triángulo/rombo amarillo con detalle de mochila, autos abandonados como rects con un efecto de "tambaleo" ocasional (ligero desplazamiento súbito que anuncia el cambio errático de velocidad), cintas transportadoras activas/inactivas diferenciadas por color (verde/gris apagado), grúas como líneas con carga oscilante, terminal de evacuación como un rect grande distintivo (furgón) en la fila de meta.
- Controles: flechas direccionales y WASD.
- Componente `components/games/exodo-urbano-player.tsx`: mismo patrón de `useEffect`s (auth, montaje/cleanup del motor, reset de pausa) que el resto de reproductores reales. HUD: Jugador / Puntuación / Vidas / Nivel (`N/10`).
- Modal de fin de partida con título distinto según `state` ("FIN DEL JUEGO" vs. "¡EVACUACIÓN COMPLETA!"), guardado manual vía `saveScore` idéntico al patrón ya establecido.
- Alta en `app/juego/[id]/jugar/page.tsx`, `components/library.tsx` y migración Supabase.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Scroll vertical infinito (eso lo cubre la variante hermana `variante-scroll-infinito.md`; estas dos variantes son alternativas mutuamente excluyentes del mismo `id`, no complementarias).
- Power-ups.
- Soporte táctil/mobile.
- Sonido/música.
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx`.

## Modelo de datos

**Nueva entrada en `GAMES` (`lib/data.ts`):**

```ts
{
  id: "exodo-urbano",
  title: "ÉXODO URBANO",
  short: "Diez niveles para llegar al último furgón.",
  long: "Cruzá avenidas colapsadas esquivando autos abandonados y patrullas, después abrite paso entre cintas transportadoras y grúas de una planta industrial en ruinas. Diez niveles separan tu posición del último furgón de evacuación.",
  cat: "ARCADE",
  cover: "cover-urbano",
  color: "yellow",
  best: 0,
  plays: "0",
}
```

Reutiliza la clase `.cover-urbano` propuesta por la variante hermana (ambas variantes comparten id y cover; solo se implementaría una de las dos).

**Migración Supabase (`supabase/migrations/<timestamp>_seed_exodo_urbano_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'exodo-urbano',
  'ÉXODO URBANO',
  'Diez niveles para llegar al último furgón.',
  'Cruzá avenidas colapsadas esquivando autos abandonados y patrullas, después abrite paso entre cintas transportadoras y grúas de una planta industrial en ruinas. Diez niveles separan tu posición del último furgón de evacuación.',
  'ARCADE',
  'cover-urbano',
  'yellow'
);
```

## Plan de implementación

1. **`lib/data.ts`** — agregar la entrada `exodo-urbano` (coordinar con la variante hermana: solo una puede implementarse bajo este id).
2. **`app/globals.css`** — agregar `.cover-urbano` si no se creó ya al implementar la variante hermana.
3. **`components/games/exodo-urbano-player.tsx`** — escribir `ExodoUrbanoEngine`: generador de tablero parametrizado por nivel (posición aleatoria de la terminal de evacuación, densidad/velocidad de obstáculos por nivel), lógica de velocidad errática de autos abandonados, ciclo de activación/inactivación de cintas transportadoras, grúas con cargas oscilantes y ventana de golpe, sistema de 3 vidas, barra de tiempo por intento, condición de `win` en el nivel 10.
4. En el mismo archivo, el componente `ExodoUrbanoPlayer`: canvas + `useRef`, los `useEffect` descritos, listener de teclado, HUD de 4 stats, botones PAUSA/REANUDAR/FIN/SALIR, modal de fin de partida con guardado manual distinguiendo título según `state`.
5. **`app/juego/[id]/jugar/page.tsx`** — agregar la rama `if (game.id === "exodo-urbano") return <ExodoUrbanoPlayer game={game} />;`.
6. **`components/library.tsx`** — agregar `"exodo-urbano"` a `REAL_GAME_IDS`.
7. **Migración Supabase** — crear el seed, aplicar vía `mcp__supabase__apply_migration`, correr `mcp__supabase__get_advisors`.
8. **Checklist de prueba manual**: cruzar la avenida colapsada esquivando los cambios erráticos de velocidad de los autos; cruzar la planta industrial sincronizando con el ciclo de cintas activas/inactivas y evitando las cargas de las grúas; llegar a la columna correcta de la terminal de evacuación y confirmar avance de nivel; llegar a una columna incorrecta de esa fila y confirmar `gameover`; agotar el tiempo de un intento y confirmar pérdida de vida; perder las 3 vidas y confirmar `gameover`; completar el nivel 10 y confirmar `win`; pausar/reanudar sin salto de tiempo; guardar puntuación autenticado y sin sesión. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` incluye la entrada `exodo-urbano` con el shape de Modelo de datos.
- [ ] `.cover-urbano` existe en `app/globals.css` siguiendo el patrón visual del resto de clases `cover-*`.
- [ ] `ExodoUrbanoEngine` expone `onStatsChange(score, lives, level)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover" | "win"`, deduplicando emisiones.
- [ ] Cada nivel ubica la terminal de evacuación en una columna aleatoria distinta de la fila de meta; llegar a esa columna avanza de nivel, llegar a cualquier otra columna de esa fila dispara `gameover`.
- [ ] Los autos de la avenida colapsada cambian de velocidad de forma errática (no constante por carril), perceptible visualmente antes del cambio.
- [ ] Las cintas transportadoras alternan entre activa/inactiva en ciclos, y solo son plataforma válida mientras están activas.
- [ ] Las grúas con carga oscilante pueden golpear al jugador si está debajo durante su ventana de impacto.
- [ ] Agotar el tiempo de un intento consume una vida; perder la tercera vida dispara `onStateChange("gameover")`.
- [ ] Completar el nivel 10 dispara `onStateChange("win")`.
- [ ] El modal de fin de partida distingue título entre `gameover` y `win`, con guardado manual, nunca automático.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `exodo-urbano` a `ExodoUrbanoPlayer`.
- [ ] `REAL_GAME_IDS` incluye `"exodo-urbano"`.
- [ ] La migración de seed aplica limpiamente y `mcp__supabase__get_advisors` no reporta alertas nuevas.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Niveles discretos con techo de 10 y condición de victoria explícita, en vez de scroll infinito.** Decisión central de esta variante: ofrece un "modo historia" de alcance predecible y más corto de implementar que la variante hermana, con un final claro (`win`) en vez de un diseño abierto — más parecido en espíritu a Arkanoid (5 niveles con victoria) que a Serpiente/Tetris.
- **Una sola terminal de evacuación en vez de cinco huecos de meta.** Se decidió simplificar la condición de meta respecto al Frogger clásico (5 nenúfares) para acelerar el ritmo de cada intento — con solo una franja de tránsito y una industrial por nivel, cinco metas simultáneas alargarían demasiado cada tablero.
- **Velocidad errática en los autos en vez de velocidad constante por carril.** Diferenciador deliberado frente a Ranaria (que sí usa velocidad constante, fiel al original) — refuerza la premisa temática de "ciudad en colapso" y evita que esta variante se sienta como un simple reskin del Frogger clásico.
- **Grúas con ventana de impacto como segundo peligro dentro de la franja industrial**, sumado a las cintas inactivas — a diferencia del río de Frogger (un solo tipo de peligro: caer al agua), esta variante combina dos amenazas distintas en la misma franja para diferenciarse mecánicamente, no solo temáticamente.
- **Reutiliza la cover y el color de la variante hermana.** Ambas variantes comparten `id`, `cover` y paleta porque representan el mismo juego con alcance distinto; solo una de las dos se implementaría en la práctica.

## Riesgos identificados

- **Mismo conflicto estructural que las otras parejas de variantes de este jam**: esta variante y `variante-scroll-infinito.md` comparten `id: "exodo-urbano"` — son alternativas de diseño mutuamente excluyentes, no complementarias; implementar ambas requeriría resolver el choque de id igual que se documentó para las dos variantes de Ranaria (aunque acá no hay mock previo en conflicto, el choque es entre las dos variantes propuestas en este mismo jam).
- **Balance de la velocidad errática de los autos.** Si los cambios de velocidad son demasiado impredecibles, el cruce de la avenida se siente injusto en vez de desafiante; requiere tuning manual con un rango acotado de variación, no aleatoriedad sin límites.
- **Sincronización de dos peligros simultáneos en la franja industrial (cintas + grúas)** puede generar situaciones de "muerte inevitable" si no se calibra con cuidado el timing de ambos ciclos; mitigable con pruebas manuales exhaustivas del plan de implementación antes de dar por buena la curva de dificultad.
- **Décimo nivel como único techo de victoria** puede sentirse corto para jugadores experimentados una vez memorizan los patrones; aceptado como parte del alcance acotado de esta variante (ver Decisiones), no se resuelve acá.
