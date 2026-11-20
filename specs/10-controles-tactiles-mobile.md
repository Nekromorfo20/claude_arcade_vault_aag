# 10 - Controles táctiles para mobile

**Estado:** Aprobado
**Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
**Fecha:** 2026-11-20
**Objetivo:** Agregar un componente compartido `TouchControls` (d-pad direccional + hasta 2 botones de acción) que se muestre automáticamente en dispositivos táctiles debajo del canvas en los cuatro reproductores reales (Asteroides, Tetris, Arkanoid, Serpiente), reusando el input por teclado que cada motor ya expone.

## Alcance

**Incluido:**

- Nuevo componente compartido `components/games/touch-controls.tsx` (`"use client"`), estilo "mando arcade": un d-pad de 4 direcciones a la izquierda y hasta 2 botones de acción circulares a la derecha, dentro de un recuadro con el mismo lenguaje visual neón que el resto del HUD (reutiliza clases `crt`/`crt-screen` como referencia de estilo, con una clase nueva `touch-controls` para el layout propio).
- Props de `TouchControls`: `onDirectionStart(dir: "up" | "down" | "left" | "right")`, `onDirectionEnd(dir: "up" | "down" | "left" | "right")`, y `actionButtons?: { code: string; label: string }[]` (0 a 2 entradas; si se omite o es `[]`, no se renderizan botones de acción, solo el d-pad).
- Detección de dispositivo táctil con `matchMedia("(pointer: coarse)")` evaluado en un `useEffect` (guard de SSR, ya que `window.matchMedia` no existe en servidor), expuesta como hook `useIsTouchDevice()` en el mismo archivo o en `lib/use-is-touch-device.ts`. Cada `*-player.tsx` solo renderiza `<TouchControls />` cuando el hook devuelve `true`; en desktop el teclado sigue funcionando exactamente igual que hoy, sin overlay visible.
- Mapeo táctil → input sintético: `TouchControls` nunca llama a métodos nuevos del motor. Cada botón/dirección dispara `engine.handleKeyDown({ code, preventDefault: () => {} } as KeyboardEvent)` en `touchstart`/`pointerdown` y `engine.handleKeyUp({ code, preventDefault: () => {} } as KeyboardEvent)` en `touchend`/`pointerup` (y `pointercancel` para soltar si el dedo se arrastra fuera del botón), igual contrato que ya usan los listeners de teclado existentes — confirmado que los 4 motores solo leen `e.code` y llaman `e.preventDefault()`.
- Mapeo de códigos por juego (el d-pad siempre envía `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`, igual que las flechas físicas; solo cambia qué botones de acción se pasan):
  - **Asteroides** (`asteroids-player.tsx`): d-pad completo (arriba=acelerar, abajo sin uso hoy en teclado así que se omite del mapeo, izq/der=rotar). Botón A = `Space` (disparar). Botón B = `ArrowUp` (acelerar), redundante con el d-pad hacia arriba para permitir acelerar y rotar al mismo tiempo con una sola mano.
  - **Tetris** (`tetris-player.tsx`): d-pad (izq/der=mover, abajo=soft drop, arriba sin uso se omite). Botón A = `ArrowUp` o la tecla de rotar que ya use el motor. Botón B = `Space` (hard drop) si el motor la soporta, o caída rápida equivalente.
  - **Arkanoid** (`arkanoid-player.tsx`): solo izquierda/derecha del d-pad (mover paleta), arriba/abajo deshabilitados visualmente (botones grises, sin acción). Sin botones de acción. Movimiento continuo mientras el botón esté presionado, igual sensación que mantener `←`/`→` en teclado físico.
  - **Serpiente** (`snake-player.tsx`): d-pad completo (4 direcciones), sin botones de acción.
- Verificación exacta de los códigos de teclado reales que lee cada motor antes de fijar el mapeo anterior (paso 1 del plan de implementación) — si algún motor usa códigos distintos a los asumidos arriba (p. ej. `KeyZ` para rotar en Tetris en vez de `ArrowUp`), el mapeo se ajusta a lo que el motor realmente escucha, sin modificar los motores.
- Integración en los 4 archivos `*-player.tsx`: import de `TouchControls`, render condicional (`{isTouch && <TouchControls ... />}`) debajo del bloque `crt`/`crt-screen` existente, dentro del mismo contenedor `av-player`.
- CSS nuevo en `app/globals.css`: clases `.touch-controls`, `.touch-dpad`, `.touch-dpad-btn`, `.touch-action-btn` (o nombres equivalentes) siguiendo la paleta neón existente (`--cyan`, `--magenta`, etc.), con tamaños de botón pensados para el dedo (mínimo ~48px de área táctil) y `touch-action: none` para evitar scroll/zoom accidental al tocar los controles.
- Layout de página sin cambios estructurales: HUD arriba, canvas en medio, `TouchControls` debajo cuando aplica; si el conjunto no entra en el alto visible del viewport, la página scrollea verticalmente de forma normal (sin layout fijo a `100dvh`).
- Checklist de prueba manual en un dispositivo o emulador táctil real (no solo DevTools) para los 4 juegos, más `npm run lint && npm run build`.

**No incluido (fuera de alcance de este spec):**

- Soporte de gestos (swipe, pinch, drag libre sobre el canvas) — se descartó explícitamente a favor del d-pad + botones fijos, según la referencia visual provista.
- Vibración háptica (`navigator.vibrate`) al presionar los controles táctiles.
- Un toggle manual para forzar el modo táctil en desktop — la detección es automática vía `matchMedia("(pointer: coarse)")` únicamente.
- Rediseño del HUD superior (Jugador/Puntuación/Vidas/Nivel) para mobile — ese bloque ya es responsive por specs anteriores y no se toca aquí.
- Refactor del if-chain de `app/juego/[id]/jugar/page.tsx` a un registro `Record<string, Component>` — sigue diferido, igual que en specs 07, 08 y 09.
- Soporte táctil para el selector de nivel de pausa de Arkanoid (los botones HTML 1–5 ya son elementos táctiles nativos sin necesidad de cambios).
- Tests automatizados — no hay test runner configurado en este repo.
- Cambios de balance/dificultad para compensar la menor precisión del control táctil frente al teclado/mouse.

## Modelo de datos

Esta feature no introduce estructuras de datos persistentes ni cambios en Supabase. Introduce únicamente:

```ts
// components/games/touch-controls.tsx
type Direction = "up" | "down" | "left" | "right";

interface TouchActionButton {
  code: string; // ej. "Space", valor que se envía como e.code sintético
  label: string; // ej. "A", "⟲" — texto corto dentro del botón circular
}

interface TouchControlsProps {
  onDirectionStart: (dir: Direction) => void;
  onDirectionEnd: (dir: Direction) => void;
  actionButtons?: TouchActionButton[]; // 0 a 2 elementos
  disabledDirections?: Direction[]; // ej. ["up", "down"] para Arkanoid
}
```

```ts
// hook de detección, lib/use-is-touch-device.ts
function useIsTouchDevice(): boolean;
// internamente: matchMedia("(pointer: coarse)").matches, false en el primer render (SSR) y actualizado en useEffect
```

No se agregan columnas, migraciones ni cambios al esquema `games`/`scores`/`profiles`.

## Plan de implementación

1. Confirmar, leyendo los 4 archivos `*-player.tsx` y sus respectivos `handleKeyDown`, los códigos exactos (`e.code`) que cada motor escucha para movimiento/rotación/disparo/soft-drop/hard-drop, ajustando el mapeo descrito en Alcance si difiere de lo asumido (p. ej. confirmar si Tetris usa `Space` para hard drop o si esa acción no existe, en cuyo caso el botón B de Tetris se omite). Este paso no modifica código, solo confirma el contrato real antes de construir sobre él.
2. Crear `lib/use-is-touch-device.ts` con el hook `useIsTouchDevice()` (guard de SSR, `matchMedia("(pointer: coarse)")`, listener de `change` para dispositivos híbridos con mouse+touch). El sistema sigue funcionando igual, el hook todavía no se usa en ningún componente.
3. Crear `components/games/touch-controls.tsx` con el componente `TouchControls` (d-pad de 4 direcciones + hasta 2 botones de acción), usando `onPointerDown`/`onPointerUp`/`onPointerCancel` (no `onClick`) para soportar press-and-hold, y las props definidas en Modelo de datos. Aún no está integrado en ningún reproductor — se puede probar en aislamiento si hace falta, pero no es parte de este paso.
4. Agregar las clases CSS nuevas (`.touch-controls`, `.touch-dpad`, `.touch-dpad-btn`, `.touch-action-btn`) en `app/globals.css`, siguiendo la paleta neón existente y con áreas táctiles de al menos 48px.
5. Integrar `TouchControls` en `components/games/snake-player.tsx` (el caso más simple: 4 direcciones, sin botones de acción) — render condicional tras `useIsTouchDevice()`, callbacks de dirección que llaman a `engine.handleKeyDown`/`handleKeyUp` sintéticos con los códigos de flecha. El juego sigue siendo jugable con teclado en desktop sin cambios.
6. Integrar `TouchControls` en `components/games/arkanoid-player.tsx` (d-pad limitado a izq/der, sin botones de acción, movimiento continuo mientras se mantiene presionado).
7. Integrar `TouchControls` en `components/games/tetris-player.tsx` (d-pad + hasta 2 botones de acción, según el mapeo confirmado en el paso 1).
8. Integrar `TouchControls` en `components/games/asteroids-player.tsx` (d-pad + 2 botones de acción: disparar y acelerar, según el mapeo confirmado en el paso 1).
9. Checklist de prueba manual en un dispositivo táctil real o emulador (Chrome DevTools con "Show touch controls" no sustituye la prueba real porque `pointer: coarse` y los eventos `touch*` reales pueden comportarse distinto): jugar una partida completa de cada uno de los 4 juegos usando únicamente los controles táctiles, confirmar que en desktop (sin touch) el overlay no aparece y el teclado sigue funcionando igual que antes, confirmar que no hay scroll/zoom accidental al tocar los botones. Luego correr `npm run lint && npm run build`.

## Criterios de aceptación

- [ ] `useIsTouchDevice()` devuelve `false` durante SSR/primer render y se actualiza correctamente a `true`/`false` según `matchMedia("(pointer: coarse)")` tras montar en cliente.
- [ ] `TouchControls` no aparece en un navegador de escritorio sin touch (mouse únicamente) en ninguno de los 4 reproductores, y el input por teclado sigue funcionando exactamente igual que antes de este spec.
- [ ] En un dispositivo táctil, `/juego/serpiente/jugar` muestra el d-pad debajo del canvas y permite completar una partida moviendo la serpiente únicamente con los controles táctiles.
- [ ] En un dispositivo táctil, `/juego/arkanoid/jugar` muestra el d-pad (solo izquierda/derecha habilitados) y permite mover la paleta de forma continua mientras se mantiene presionado, sin necesitar mouse ni teclado.
- [ ] En un dispositivo táctil, `/juego/tetris/jugar` permite mover, rotar y acelerar la caída de las piezas usando únicamente d-pad y botones de acción táctiles.
- [ ] En un dispositivo táctil, `/juego/asteroides/jugar` permite rotar, acelerar y disparar usando únicamente d-pad y botones de acción táctiles.
- [ ] Soltar el dedo fuera de un botón táctil (arrastre) libera la tecla sintética correspondiente (`handleKeyUp`) en vez de quedar "trabada" presionada, verificado con `pointercancel`.
- [ ] Tocar los controles táctiles no dispara scroll ni zoom accidental de la página (`touch-action: none` aplicado correctamente).
- [ ] Ninguno de los 4 motores (`AsteroidsEngine`, `TetrisEngine`, `ArkanoidEngine`, `SnakeEngine`) fue modificado — toda la integración ocurre en los componentes `*-player.tsx` y en `TouchControls`.
- [ ] `npm run lint && npm run build` pasan sin errores nuevos atribuibles a los archivos de este spec.

## Decisiones tomadas y descartadas

- **D-pad + hasta 2 botones de acción, no gestos.** Según la referencia visual provista por el usuario (mando arcade fijo debajo del canvas), se descartó swipe/gestos libres: menos preciso para juegos de reacción rápida como Asteroides y más trabajo de diseño por juego sin beneficio claro aquí.
- **Componente compartido `TouchControls` en vez de implementación propia por juego.** Evita duplicar 4 veces el markup/CSS del d-pad; cada `*-player.tsx` solo decide qué botones mostrar vía props.
- **Reusar `handleKeyDown`/`handleKeyUp` con eventos sintéticos, sin tocar las clases `*Engine`.** Los 4 motores ya solo leen `e.code` y llaman `e.preventDefault()` (confirmado en el código actual) — agregar métodos táctiles dedicados a cada motor sería una abstracción prematura para una capa de input que ya sabe hablar "tecla por código".
- **Detección automática por `matchMedia("(pointer: coarse)")`, sin toggle manual.** Evita un estado adicional en `localStorage` y una UI de configuración nueva; el dispositivo decide, no el usuario. Si en el futuro aparecen dispositivos híbridos problemáticos, se revisará en un spec de seguimiento.
- **Arkanoid usa el mismo d-pad que el resto de los juegos, no drag sobre el canvas.** Aunque el control nativo de la fuente es mouse/`mousemove`, se prioriza consistencia visual entre los 4 juegos (mismo componente, misma ubicación) sobre replicar el gesto de arrastre original.
- **Movimiento continuo (press-and-hold) en vez de paso fijo por tap**, para que la sensación táctil sea equivalente a mantener presionada una tecla física, en particular para la paleta de Arkanoid y la aceleración de Asteroides.
- **Sin layout fijo a `100dvh`.** Se permite scroll vertical de la página si HUD + canvas + controles no entran en el alto visible, evitando una reescritura de layout más arriesgada solo para este spec.

## Riesgos identificados

- **Códigos de teclado asumidos en el mapeo pueden no coincidir exactamente con lo que cada motor escucha hoy** (p. ej. Tetris podría no tener una acción de hard drop mapeada a `Space`). Mitigación: el paso 1 del plan de implementación verifica esto contra el código real antes de construir el mapeo, ajustándolo sin modificar los motores.
- **Eventos táctiles duplicados o perdidos en navegadores que disparan tanto `touch*` como `pointer*`.** Mitigación: usar exclusivamente la familia `pointer*` (`onPointerDown`/`onPointerUp`/`onPointerCancel`) con `touch-action: none`, que ya normaliza mouse/touch/pen en un solo modelo de eventos en los navegadores soportados por Next.js 16.
- **Botones táctiles demasiado pequeños o mal posicionados en pantallas muy angostas**, afectando la precisión en juegos de reacción rápida (Asteroides). Mitigación: área táctil mínima de 48px y prueba manual obligatoria en dispositivo real (no solo emulación de DevTools) antes de marcar el spec como implementado.
- **`matchMedia("(pointer: coarse)")` puede reportar `false` en algunos dispositivos híbridos (laptops con pantalla táctil y mouse conectado)**, ocultando el overlay cuando el usuario sí querría tocarlo. Se acepta este comportamiento como conocido y fuera de alcance de este spec (ver "No incluido": sin toggle manual).
