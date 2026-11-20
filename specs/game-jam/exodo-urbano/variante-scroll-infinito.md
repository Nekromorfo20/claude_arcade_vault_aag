# Game Jam · Éxodo Urbano · Variante: scroll vertical infinito

**Estado:** Borrador
**Depende de:** SPEC 01, SPEC 05, SPEC 06
**Fecha:** 2026-11-20
**Tema de la jam:** Frogger — cruza la carretera y el río sin convertirte en papilla.
**Objetivo:** Diseñar desde cero un concepto original derivado de Frogger — una ciudad en colapso que se recorre con scroll vertical continuo (no tablero fijo ni niveles discretos), combinando carriles de tránsito y plataformas industriales (cintas transportadoras, grúas) que suben de dificultad sin techo mientras más alto llega el jugador — con el contrato de callbacks `onStatsChange`/`onStateChange`, portarlo a un componente React `ExodoUrbanoPlayer`, y darlo de alta como entrada real `exodo-urbano` en el catálogo.

## Alcance

**Incluido:**

- Nueva entrada en `GAMES` (`lib/data.ts`) con `id: "exodo-urbano"`, `title: "ÉXODO URBANO"`, categoría `ARCADE`, color `yellow`, cover `cover-urbano` (clase nueva, ver Modelo de datos), `best: 0`, `plays: "0"`.
- Motor `ExodoUrbanoEngine` con diseño de **scroll infinito hacia arriba** (a diferencia de Frogger clásico, que es un tablero fijo de ancho/alto constante):
  - El jugador avanza verticalmente por una ciudad generada por franjas (chunks) que se van creando proceduralmente por encima de la cámara y se descartan por debajo a medida que el jugador sube — mismo patrón conceptual que un "endless runner" vertical, aplicado sobre la mecánica de carriles de Frogger.
  - Cada franja es uno de dos tipos, alternados de forma pseudo-aleatoria con reglas de transición (nunca dos franjas del mismo tipo extremo consecutivas sin una franja segura intermedia):
    - **Franja de tránsito:** autos, camiones y patrullas en movimiento horizontal por carriles — tocar cualquiera = `gameover` inmediato (igual que la carretera de Frogger clásico).
    - **Franja industrial:** cintas transportadoras en movimiento horizontal (el jugador debe pararse sobre una cinta activa para no quedar varado — las cintas lo arrastran lateralmente mientras está encima) y grúas que se desplazan verticalmente con cargas colgantes que hay que esquivar; caer fuera de cualquier plataforma válida de una franja industrial (ninguna cinta bajo el jugador cuando la cámara avanza y lo deja atrás) = `gameover` inmediato — no hay "agua", pero el efecto de "quedarse atrás de la cámara" cumple el mismo rol que ahogarse en el río.
  - La cámara sube a una velocidad base constante y además impone un límite inferior duro (si el jugador cae por detrás de ese límite por no avanzar lo suficiente rápido, `gameover` inmediato) — esto reemplaza la barra de tiempo de Frogger clásico con presión continua equivalente, sin necesitar un contador de segundos separado.
  - La velocidad de la cámara y la densidad/velocidad de vehículos y maquinaria escalan gradualmente con la altura alcanzada (sin techo), dando al diseño su naturaleza de dificultad creciente sin fin.
  - Sin sistema de vidas: `gameover` es inmediato y definitivo en cualquier colisión o al ser alcanzado por la cámara — coherente con el ritmo de un runner infinito (igual criterio que Serpiente: game over directo, sin vidas).
  - `EngineCallbacks`: `{ onStatsChange: (score: number, height: number, speed: number) => void; onStateChange: (state: GameState) => void }`, con `GameState = "playing" | "paused" | "gameover"` (sin `"win"`, es un runner infinito).
  - Dedupe de callbacks igual que el resto de motores del repo.
  - Métodos públicos: `start()`, `stop()`, `togglePause()`, `restart()`, `handleKeyDown(e: KeyboardEvent)`.
  - Loop vía `requestAnimationFrame`; scroll de cámara y vehículos avanzan por `dt` continuo; el movimiento del jugador es discreto por tecla (arriba/abajo/izquierda/derecha) con cooldown anti-rebote, igual criterio que Ranaria.
  - Puntuación: el `score` es directamente la altura neta alcanzada en metros simulados (`height`, entero creciente mientras la cámara avanza), más un bonus `+5` por cada franja industrial cruzada con éxito sin caer (recompensa el tramo más arriesgado) — da automáticamente un score de rango largo y sin techo, evitando por completo el riesgo de "score corto por nivel" que afecta al concepto base de Frogger.
  - Al reanudar desde pausa, resetea `lastTime` del loop sin mover la posición de cámara (la pausa no cuenta como "quedarse atrás").
- Renderizado con primitivas de canvas: jugador como triángulo/rombo amarillo, autos/patrullas como rects de colores variados, cintas transportadoras como rects grises con líneas de movimiento (chevrones animados indicando sentido), grúas como líneas con un rect colgante (la carga) que oscila, edificios de fondo como siluetas rectangulares oscuras con ventanas iluminadas (detalle ambiental simple, no interactivo).
- Controles: flechas direccionales y WASD. Movimiento horizontal libre dentro del ancho de la franja actual; movimiento vertical (arriba) es lo único que genera progreso de altura.
- Componente `components/games/exodo-urbano-player.tsx`: mismo patrón de `useEffect`s (auth, montaje/cleanup del motor, reset de pausa) que el resto de reproductores reales. HUD: Jugador / Puntuación / Altura (`height`m) / Velocidad (indicador simple de la velocidad actual de cámara, ej. "×1.8").
- Modal de fin de partida con único título "FIN DEL JUEGO" (sin estado `win`), mostrando la altura final alcanzada además del score, guardado manual vía `saveScore` idéntico al patrón ya establecido.
- Alta en `app/juego/[id]/jugar/page.tsx`, `components/library.tsx` y migración Supabase.
- Checklist de prueba manual + `npm run lint && npm run build`.

**No incluido (fuera de alcance de esta variante):**

- Tablero de niveles discretos con condición de victoria (eso lo cubre la variante hermana `variante-niveles-discretos.md`).
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
  short: "Sube por una ciudad que no da tregua.",
  long: "Esquivá el tránsito y saltá entre cintas transportadoras y grúas industriales mientras la ciudad se derrumba bajo tus pies. No hay meta: solo cuánto podés subir antes de que te alcance el colapso.",
  cat: "ARCADE",
  cover: "cover-urbano",
  color: "yellow",
  best: 0,
  plays: "0",
}
```

**Clase CSS nueva `.cover-urbano`** en `app/globals.css`, siguiendo el mismo patrón que las demás clases `cover-*` (gradiente de fondo urbano oscuro con siluetas de edificios + pseudo-elemento decorativo), sin introducir chrome nuevo de HUD/modal.

**Migración Supabase (`supabase/migrations/<timestamp>_seed_exodo_urbano_game.sql`):**

```sql
insert into public.games (id, title, short, long, cat, cover, color) values (
  'exodo-urbano',
  'ÉXODO URBANO',
  'Sube por una ciudad que no da tregua.',
  'Esquivá el tránsito y saltá entre cintas transportadoras y grúas industriales mientras la ciudad se derrumba bajo tus pies. No hay meta: solo cuánto podés subir antes de que te alcance el colapso.',
  'ARCADE',
  'cover-urbano',
  'yellow'
);
```

## Plan de implementación

1. **`lib/data.ts`** — agregar la entrada `exodo-urbano` al array `GAMES`.
2. **`app/globals.css`** — agregar la clase `.cover-urbano` siguiendo el patrón visual de las clases `cover-*` existentes.
3. **`components/games/exodo-urbano-player.tsx`** — escribir desde cero `ExodoUrbanoEngine`: generador procedural de franjas (chunks) por encima de la cámara con reglas de alternancia tránsito/industrial, sistema de cámara con velocidad creciente y límite inferior duro, lógica de cintas transportadoras (arrastre lateral del jugador), grúas con carga oscilante, detección de colisión en franjas de tránsito, detección de "caída por quedar atrás de la cámara" en franjas industriales, cálculo de `height`/`score`.
4. En el mismo archivo, el componente `ExodoUrbanoPlayer`: canvas + `useRef`, los `useEffect` descritos, listener de teclado, HUD de 4 stats (Jugador/Puntuación/Altura/Velocidad), botones PAUSA/REANUDAR/FIN/SALIR, modal de fin de partida con guardado manual.
5. **`app/juego/[id]/jugar/page.tsx`** — agregar la rama `if (game.id === "exodo-urbano") return <ExodoUrbanoPlayer game={game} />;`.
6. **`components/library.tsx`** — agregar `"exodo-urbano"` a `REAL_GAME_IDS`.
7. **Migración Supabase** — crear el seed, aplicar vía `mcp__supabase__apply_migration`, correr `mcp__supabase__get_advisors`.
8. **Checklist de prueba manual**: cruzar varias franjas de tránsito sin chocar; subirse a una cinta transportadora y confirmar el arrastre lateral; quedar varado en una franja industrial sin plataforma válida y confirmar `gameover` por la cámara; dejar de avanzar deliberadamente y confirmar que el límite inferior de cámara también dispara `gameover`; confirmar que la velocidad de cámara y la densidad de obstáculos aumentan perceptiblemente con la altura; pausar/reanudar sin que la cámara avance durante la pausa; guardar puntuación autenticado y sin sesión. Luego `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `GAMES` incluye la entrada `exodo-urbano` con el shape de Modelo de datos.
- [ ] `.cover-urbano` existe en `app/globals.css` siguiendo el patrón visual del resto de clases `cover-*`.
- [ ] `ExodoUrbanoEngine` expone `onStatsChange(score, height, speed)` y `onStateChange(state)` con `state` limitado a `"playing" | "paused" | "gameover"` (sin `"win"`).
- [ ] El motor genera franjas de tránsito e industriales de forma procedural y continua mientras la cámara avanza, sin usar un tablero de tamaño fijo.
- [ ] Tocar un vehículo en una franja de tránsito dispara `gameover` inmediato.
- [ ] Quedar sin plataforma válida en una franja industrial (arrastrado fuera por la cámara) dispara `gameover` inmediato.
- [ ] El límite inferior duro de la cámara dispara `gameover` si el jugador no avanza lo suficientemente rápido, sin depender de un contador de segundos separado.
- [ ] La velocidad de cámara y la dificultad de obstáculos aumentan de forma perceptible y sin techo a medida que crece `height`.
- [ ] El score (`height` acumulado) crece de forma natural y sin techo mientras dura la partida, resolviendo el riesgo de "score corto" del concepto base de Frogger.
- [ ] El modal de fin de partida muestra la altura final además del score, con guardado manual (autenticado / CTA a `/ingresar` / toast de guardado), nunca automático.
- [ ] `app/juego/[id]/jugar/page.tsx` enruta `exodo-urbano` a `ExodoUrbanoPlayer`.
- [ ] `REAL_GAME_IDS` incluye `"exodo-urbano"`.
- [ ] La migración de seed aplica limpiamente y `mcp__supabase__get_advisors` no reporta alertas nuevas.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos.

## Decisiones tomadas y descartadas

- **Scroll vertical infinito en vez de tablero fijo de niveles discretos.** Es la decisión de diseño central de esta variante: responde directamente al riesgo que `game-planner` ya identificó sobre Ranaria ("score por travesía es escalonado y de rango corto"), dándole al concepto un score que crece de forma continua y natural (altura), sin depender de "completar niveles" para seguir sumando.
- **Sin sistema de vidas, game over inmediato.** Coherente con el ritmo de un runner infinito — tener vidas rompería la tensión de "cada colisión es la última" que define este subgénero, y evita complejizar el reseteo parcial de posición en medio de un scroll continuo.
- **Límite inferior duro de cámara en vez de barra de tiempo explícita.** Reemplaza el rol que cumple el cronómetro en Frogger clásico (presión constante para seguir avanzando) sin necesitar un segundo sistema de UI paralelo — un solo mecanismo (la cámara) cumple las dos funciones de "avanza o perdés".
- **Cover nueva (`cover-urbano`) en vez de reutilizar alguna existente.** Ninguna cover actual tiene estética urbana/industrial; de bajo costo crear una nueva.
- **Color `yellow`** elegido para diferenciarse de `ranaria` (`green`) y `exodo-glacial` (`cyan`) dentro de la misma categoría ARCADE, evitando que los tres candidatos del jam se vean visualmente intercambiables en el catálogo.

## Riesgos identificados

- **Generación procedural de franjas con reglas de transición puede producir secuencias injustas** (ej. una franja industrial muy difícil justo después de otra), si el generador no está bien acotado. Mitigable con una tabla de pesos por altura y un chequeo de "no repetir el tipo más difícil dos veces seguidas", a validar empíricamente al implementar.
- **La mecánica de cinta transportadora (arrastre lateral) es nueva en el repo** — ningún motor existente maneja un "viento" o arrastre continuo sobre el jugador; el primer intento de implementación puede necesitar iteración para que se sienta controlable y no frustrante.
- **Balance de la velocidad de escalado sin techo.** Si la dificultad crece demasiado rápido, las partidas se vuelven cortas e intercambiables entre sí; si crece muy lento, el juego pierde el gancho de "cuánto puedo subir". Requiere tuning manual, sin fórmula cerrada en este spec.
- **Nueva clase CSS `cover-urbano` sin precedente de estética industrial/urbana en el catálogo actual**, mismo riesgo menor de consistencia visual que ya señaló la variante glacial para su propia cover nueva.
