# 05 - Juego Asteroides

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-10-29

**Objetivo:** Portar el juego jugable `references/started-games/02-asteroids/game.js` a un componente React (`AsteroidsPlayer`) que reemplace el reproductor simulado para una nueva entrada `asteroides` del catálogo, conservando la física y reglas originales del juego e integrándolo con el HUD, el guardado de puntuación y el modal de fin de partida ya existentes en Arcade Vault.

## Alcance

**Incluido:**

- Nueva entrada en `lib/data.ts` → `GAMES`: `id: "asteroides"`, `title: "ASTEROIDES"`, categoría `SHOOTER`, con `short`/`long` acordes al juego real (nave en campo de asteroides con envolvimiento de bordes, triple disparo como power-up). La entrada existente `rocas` no se modifica ni se elimina.
- `components/games/asteroids-player.tsx` (`"use client"`): puerto a React de la lógica completa de `references/started-games/02-asteroids/game.js` (clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, constantes, `initGame`/`nextLevel`/`explode`/`killShip`, `update`/`draw`, loop con `requestAnimationFrame`), montada sobre un `<canvas>` de 800×600 referenciado con `useRef` dentro de un `useEffect`.
- El canvas se escala visualmente al ancho del contenedor `crt-screen` vía CSS (`width: 100%`, `height: auto`, `aspect-ratio: 800 / 600`), manteniendo la resolución lógica interna 800×600 (el juego sigue calculando física en esas coordenadas; solo cambia el tamaño de presentación).
- El componente sincroniza hacia el HUD de React (`hud-stat` de Jugador/Puntuación/Vidas/Nivel) el `score`, `lives` y `level` que mantiene el loop del juego, vía `useState` actualizado desde cada frame (o a una tasa reducida, p. ej. solo cuando cambian los valores).
- El indicador de power-up "3x" (triple disparo) se mantiene dibujado únicamente dentro del canvas (como ya hace `drawHUD` en `game.js`), sin duplicarse en el HUD de React.
- El propio `drawHUD`/overlay de `GAME OVER` de `game.js` se conserva tal cual dentro del canvas (incluye el texto `PUNTAJE` y "ESPACIO PARA REINICIAR"), aunque React también muestre su propio HUD arriba — duplicación visual aceptada para minimizar cambios sobre la lógica portada.
- Botón **PAUSA** funcional: al activarse, se detiene el loop (no se llama más a `update()`/`draw()` vía `requestAnimationFrame`) conservando el estado del juego; al reanudar, se retoma el loop desde donde quedó. Se usa el mismo overlay visual "EN PAUSA" que ya existe en el HUD genérico.
- Botón **FIN**: termina la partida manualmente en cualquier momento, abriendo el modal de "FIN DEL JUEGO" con el `score` actual (igual que el simulador genérico).
- Fin de partida automático: cuando el estado interno del juego portado pasa a `'gameover'` (vidas agotadas), el componente detecta el cambio de estado y abre el modal de "FIN DEL JUEGO" automáticamente, sin requerir que el usuario presione FIN.
- Reutilización del guardado de puntuación existente (`saveAvScore` en `localStorage`, clave `av_scores`) y del modal con input de iniciales, igual que en `components/game-player.tsx`.
- Botón **SALIR**: navega a `/juego/asteroides` deteniendo el loop del juego (cleanup del `useEffect` al desmontar).
- Controles de teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) con `event.preventDefault()` aplicado solo mientras `AsteroidsPlayer` está montado, para evitar que la página haga scroll mientras se juega. Los listeners se agregan en el montaje y se remueven en el cleanup del `useEffect`.
- `app/juego/[id]/jugar/page.tsx` se actualiza para elegir el componente de reproductor según el `id` del juego: si `id === "asteroides"` renderiza `AsteroidsPlayer`, para cualquier otro id renderiza el `GamePlayer` genérico existente (sin cambios en su comportamiento).

**No incluido (fuera de alcance de este spec):**

- Modificar o eliminar la entrada `rocas` del catálogo — queda intacta como juego simulado, aunque temáticamente se solape con `asteroides`.
- Portar cualquier otro juego de `references/started-games/` (Tetris, Arkanoid) — este spec cubre exclusivamente Asteroids.
- Generalizar una interfaz común para "juegos reales" que otros juegos futuros deban implementar — se opta por un componente dedicado (`AsteroidsPlayer`) sin abstraer un contrato compartido todavía.
- Soporte táctil/móvil para los controles del juego (el detalle del juego anuncia "TECLADO / TÁCTIL" de forma genérica para todo el catálogo, pero este spec no implementa controles táctiles reales para Asteroides).
- Persistir el score/vidas/nivel del juego en Supabase — se mantiene el mismo mecanismo actual de `localStorage` (`av_scores`).
- Tests automatizados (no hay test runner configurado en el repo).
- Ajustes de dificultad, balance o features nuevas respecto al juego original (power-ups adicionales, niveles especiales, etc.) — se porta tal cual está en `game.js`.

## Modelo de datos

No se introduce un modelo de datos nuevo. Se agrega un elemento al array ya tipado `GAMES` (`lib/data.ts`), con la misma forma `Game` existente:

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Pulveriza rocas espaciales en gravedad cero.",
  long: "Pilota una nave en un campo de asteroides toroidal. Dispara para partir rocas grandes en fragmentos cada vez más pequeños, recoge el power-up de disparo triple y sobrevive al mayor número de niveles posible.",
  cat: "SHOOTER",
  cover: "cover-rocas", // reutiliza la clase de fondo CSS ya existente para temática de asteroides
  color: "yellow",
  best: 0,
  plays: "0",
}
```

El estado interno del juego (score, lives, level, asteroides, balas, partículas, power-ups) vive únicamente en memoria dentro de `AsteroidsPlayer` mientras la partida está activa, igual que `game.js` original (variables de módulo pasan a ser `useRef`/estado local del componente). No se persiste entre sesiones salvo el registro final en `av_scores` al guardar la puntuación.

## Plan de implementación

1. Agregar la entrada `asteroides` a `GAMES` en `lib/data.ts`, sin tocar la entrada `rocas` existente.
2. Crear `components/games/asteroids-player.tsx` portando el contenido de `references/started-games/02-asteroids/game.js`: reemplazar `document.getElementById('canvas')` por un `useRef<HTMLCanvasElement>`, envolver las variables de módulo (`ship`, `bullets`, `asteroids`, `score`, `lives`, `level`, `state`, etc.) en refs/estado dentro del componente, y mover el `requestAnimationFrame(loop)` a un `useEffect` con cleanup que cancele el frame pendiente (`cancelAnimationFrame`) y remueva los listeners de teclado al desmontar.
3. Dentro del loop portado, después de cada `update(dt)`, sincronizar `score`/`lives`/`level` hacia estado de React solo cuando cambien (comparando contra el valor previo) para alimentar el HUD superior sin re-renderizar en cada frame innecesariamente.
4. Agregar `event.preventDefault()` en el handler de `keydown` para los códigos `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`, limitado al tiempo de vida del componente.
5. Implementar pausa real: una prop/estado `paused` controlado desde el HUD externo que, cuando es `true`, evita llamar a `requestAnimationFrame` (el loop se detiene por completo); al pasar a `false`, se reanuda desde el último `lastTime` registrado (reiniciar `lastTime` a `null` al reanudar para evitar un salto de `dt` grande).
6. Detectar la transición del `state` interno del juego a `'gameover'` (vía efecto que observa el estado sincronizado) y disparar automáticamente la apertura del modal de "FIN DEL JUEGO" ya existente, reusando `saveAvScore` y el input de iniciales de `components/game-player.tsx` como referencia de implementación (adaptado dentro de `asteroids-player.tsx`).
7. Aplicar el estilo CSS necesario para que el `<canvas>` escale a `width: 100%; height: auto; aspect-ratio: 800 / 600` dentro de `.crt-screen`, sin modificar las coordenadas internas de juego (siguen en base 800×600).
8. Actualizar `app/juego/[id]/jugar/page.tsx` para renderizar `AsteroidsPlayer` cuando `game.id === "asteroides"`, y `GamePlayer` (sin cambios) para el resto.
9. Probar manualmente con `npm run dev`: jugar una partida completa en `/juego/asteroides/jugar` — mover la nave, disparar, recoger el power-up 3x, perder las 3 vidas y confirmar que se abre el modal de fin de partida automáticamente, guardar la puntuación y verificar que aparece en `localStorage` bajo `av_scores` con `game: "asteroides"`.
10. Probar pausa/reanudación (el juego se congela y continúa sin saltos) y el botón SALIR (navega a `/juego/asteroides` y detiene el loop sin errores en consola).
11. Ejecutar `npm run lint` y `npm run build` para confirmar que `app/`, `components/` y `lib/` compilan sin errores nuevos.

## Criterios de aceptación

- [ ] `GAMES` en `lib/data.ts` incluye la entrada `asteroides` (categoría `SHOOTER`) además de la entrada `rocas` ya existente, sin eliminarla.
- [ ] `/juego/asteroides` muestra el detalle del juego usando el `GameDetail` genérico ya existente, sin cambios en ese componente.
- [ ] `/juego/asteroides/jugar` renderiza `AsteroidsPlayer`, no el `GamePlayer` genérico; cualquier otro juego (ej. `/juego/caida/jugar`) sigue renderizando `GamePlayer` sin cambios de comportamiento.
- [ ] La nave se controla con `←`/`→` (rotar) y `↑` (propulsar), y se dispara con `Espacio`, igual que el juego original; las flechas y espacio no provocan scroll de la página mientras se juega.
- [ ] Los asteroides grandes se destruyen y se dividen en medianos, y los medianos en pequeños, sumando 20/50/100 puntos respectivamente, igual que en `game.js` original.
- [ ] El power-up de triple disparo aparece según la misma probabilidad/garantía que el original (`POWERUP_DROP_CHANCE`, garantizado a las 5 destrucciones sin drop) y su indicador "3x" se ve dentro del canvas.
- [ ] El HUD superior de React (Jugador/Puntuación/Vidas/Nivel) refleja el estado real del juego en curso, no valores simulados.
- [ ] El botón PAUSA detiene visualmente el juego (nada se mueve) y lo reanuda sin saltos de posición al continuar.
- [ ] Al perder las 3 vidas, se abre automáticamente el modal "FIN DEL JUEGO" con la puntuación final correcta, sin necesidad de presionar FIN.
- [ ] El botón FIN también permite terminar la partida manualmente en cualquier momento, abriendo el mismo modal con la puntuación acumulada hasta ese punto.
- [ ] Guardar la puntuación desde el modal agrega un registro a `localStorage` bajo la clave `av_scores` con `{ game: "asteroides", score, name }`, igual que el flujo existente.
- [ ] El botón SALIR navega a `/juego/asteroides` y no deja el loop del juego corriendo en segundo plano (sin errores de "setState en componente desmontado" en consola).
- [ ] El canvas se ve escalado al ancho del contenedor `crt-screen` manteniendo la proporción 800:600, tanto en desktop como en una ventana angosta.
- [ ] `npm run build` completa sin errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores nuevos fuera de los ya existentes en `references/templates/*.jsx` y `references/started-games/**`.

## Decisiones tomadas y descartadas

- **Id nuevo `asteroides` en vez de reemplazar `rocas`** — decisión explícita del usuario; evita romper cualquier referencia existente a `rocas` como juego simulado y dejar la entrada mock intacta, aunque quede una duplicación temática en el catálogo.
- **Puerto a componente React controlado, no iframe** — permite integrar el juego con el HUD, el guardado de puntuación (`av_scores`) y el modal de fin de partida ya existentes en Arcade Vault; un iframe aislaría el juego del resto de la plataforma y no compartiría ese flujo.
- **Componente dedicado `AsteroidsPlayer`, sin generalizar una interfaz común de "juego real"** — decisión explícita del usuario; evita diseñar una abstracción para juegos futuros (Tetris, Arkanoid) antes de que exista un segundo caso real que la necesite.
- **Pausa real deteniendo el loop (`requestAnimationFrame`)** — decisión explícita del usuario; requiere un cambio mínimo sobre el loop original (controlar si se solicita el próximo frame) sin alterar la física ni las reglas del juego.
- **Fin de partida automático al llegar a `gameover`** — decisión explícita del usuario; evita que el jugador vea la pantalla "GAME OVER" dibujada dentro del canvas y tenga que presionar FIN manualmente para que aparezca el modal de guardado de puntuación de Arcade Vault.
- **Canvas escalado por CSS (`width: 100%`, `aspect-ratio`) en vez de tamaño fijo 800×600** — decisión explícita del usuario; mejora la experiencia en pantallas más chicas sin tocar la lógica interna del juego, que sigue operando en coordenadas lógicas 800×600.
- **HUD duplicado (React arriba + `drawHUD` dentro del canvas) se mantiene tal cual** — decisión explícita del usuario; minimiza el riesgo de romper el juego portado al no tener que extraer o eliminar lógica de dibujo del archivo original.
- **Indicador de power-up "3x" solo en el canvas, no en el HUD de React** — decisión explícita del usuario; evita exponer un estado adicional (`tripleShot`) hacia React cuando ya es visible dentro del propio juego.
- **`preventDefault` en los controles del juego, a diferencia del prototipo standalone original** — necesario porque, a diferencia de `index.html` (una página dedicada sin más contenido), el reproductor vive dentro de una página de Arcade Vault con scroll potencial; sin esto las flechas moverían la página en vez de la nave.

## Riesgos identificados

- **Timers/`requestAnimationFrame` huérfanos al navegar rápido entre rutas:** si el cleanup del `useEffect` no cancela correctamente el frame pendiente y remueve los listeners de teclado, podrían quedar callbacks corriendo tras desmontar el componente (errores de "setState en componente desmontado" o drenaje de batería en segundo plano). Mitigación: usar `cancelAnimationFrame` guardando el id del frame solicitado, y verificar manualmente (paso 10 del plan) que no aparecen errores en consola al salir rápido del reproductor.
- **Reanudar la pausa con un `dt` grande:** si `lastTime` no se reinicia a `null` al reanudar, el primer frame después de la pausa podría calcular un `dt` enorme (tiempo que estuvo pausado) y mover la nave/asteroides de golpe. Mitigación: reiniciar explícitamente `lastTime` a `null` al pasar de `paused=true` a `paused=false`, igual que ya hace el loop original en su primer frame (`lastTime === null ? 0 : ...`).
- **Duplicación temática `rocas`/`asteroides` en la biblioteca:** un usuario podría ver dos juegos con premisa casi idéntica en el catálogo. Mitigación: aceptado explícitamente por decisión del usuario para este spec; se puede revisar en un spec futuro si se decide consolidar o diferenciar ambas entradas.
