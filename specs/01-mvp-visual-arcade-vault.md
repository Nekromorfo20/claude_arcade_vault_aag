# 01 - MVP Visual Arcade Vault

**Estado:** Implementado
**Depende de:** Ninguno
**Fecha:** 2026-10-16

**Objetivo:** Portar las cinco pantallas del prototipo estático en `references/templates/` (biblioteca, detalle, reproductor, salón de la fama, auth) a componentes reales de Next.js App Router, preservando el look & feel neón-pixel y toda la interactividad visual, sin implementar lógica de ningún minijuego real.

## Alcance

**Incluido:**

- Rutas reales de Next.js App Router:
  - `/` → Biblioteca (listado/grid de juegos con búsqueda y filtro por categoría).
  - `/juego/[id]` → Detalle de un juego (info, stats, leaderboard del juego, CTA a jugar).
  - `/juego/[id]/jugar` → Reproductor: HUD simulado (puntuación, vidas, nivel), marco CRT, pausa, fin de juego y modal para guardar puntuación.
  - `/ingresar` → Auth: login, registro, "jugar como invitado", botones sociales decorativos (sin OAuth real).
  - `/salon` → Salón de la Fama: tabs por juego, podio top 3, tabla de puntuaciones, fila "tu mejor marca" si hay sesión.
- Nav superior + panel lateral móvil, con estado activo de ruta, contador de créditos (estático) y botón de sesión/usuario.
- Sesión simulada: login guarda `{ name }` en `localStorage` (clave `av_user`); "jugar como invitado" limpia la sesión; cerrar sesión borra `av_user`.
- Puntuaciones simuladas: al terminar una partida simulada, se guarda un registro en `localStorage` (clave `av_scores`), igual que en el prototipo.
- Datos mock portados a `lib/data.ts` (tipado): `GAMES`, `CATS`, `PLAYERS`, `seededScores()`.
- Estilos neón-pixel portados desde `references/templates/styles.css` a `app/globals.css` (o equivalente), conservando variables CSS (`--cyan`, `--magenta`, `--green`, `--yellow`, etc.) y clases existentes (`pixel`, `mono`, `card`, `chip`, `btn`, etc.). Tailwind v4 se usa solo para utilidades nuevas que no tengan ya una clase equivalente en el prototipo.
- Componentes en `components/` (raíz del repo), como Client Components (`"use client"`), 1:1 con los del prototipo: `Nav`, `GameCard`, `Library`, `GameDetail`, `GamePlayer`, `Auth`, `HallOfFame`.
- La pantalla reproductor mantiene la simulación completa: el score sube solo por intervalo, nivel sube cada 2500 puntos, pausa detiene el intervalo, "FIN" abre modal de fin de juego, guardar puntuación con iniciales, reiniciar partida.
- Reemplazo de `app/page.tsx` (boilerplate de `create-next-app`) por la pantalla de Biblioteca real.
- Footer global con el texto del prototipo.

**No incluido (fuera de alcance de este spec):**

- Lógica de juego real para cualquiera de los 8 juegos del catálogo (Bloque Buster, Caída, Serpentina, etc.). El "reproductor" sigue siendo una simulación visual, no un juego jugable.
- Autenticación real (backend, hashing de contraseñas, OAuth con Google/GitHub). Los botones sociales son decorativos, sin handler funcional más allá de un `console.log` o no-op.
- Persistencia en base de datos o API. Todo el estado sigue viviendo en `localStorage` y datos mock en memoria, igual que el prototipo.
- Internacionalización — todo el copy permanece en español, igual que el prototipo.
- Tests automatizados (no hay test runner configurado en el repo).
- Accesibilidad más allá de lo que ya trae el prototipo (no se añade ARIA adicional, no se audita contraste).
- Optimización de imágenes/covers reales — las "covers" siguen siendo fondos CSS generados (clases `cover-*`), no se agregan assets de imagen.
- Responsive/mobile QA exhaustivo más allá de reusar las clases y breakpoints que ya trae `styles.css`.

## Modelo de datos

Portado desde `references/templates/data.jsx` a `lib/data.ts`, tipado con TypeScript, sin cambios de forma:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS de fondo, ej. "cover-bricks"
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;   // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA"
}

export const GAMES: Game[];
export const CATS: ("TODOS" | GameCategory)[];
export const PLAYERS: string[];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

Estado de sesión y puntuaciones (sin modelo de servidor, solo forma de los datos en `localStorage`):

- `av_user` → `{ name: string } | null`
- `av_scores` → `Array<{ game: string; score: number; name: string; at: number }>`

## Plan de implementación

1. Portar `references/templates/styles.css` a `app/globals.css`, conservando variables y clases; eliminar el boilerplate de estilos de `create-next-app` que ya no aplique. Verificar que la app sigue compilando con `npm run dev`.
2. Crear `lib/data.ts` con `GAMES`, `CATS`, `PLAYERS` y `seededScores()` tipados, portados desde `data.jsx` sin cambiar los valores.
3. Crear `components/nav.tsx` (`"use client"`), portando `Nav` del prototipo: usa `usePathname()`/`Link` de Next.js en vez del router hash, estado de sesión leído de `localStorage`, panel móvil con el mismo comportamiento de apertura/cierre.
4. Crear `components/game-card.tsx` y `components/library.tsx` (`"use client"`), portando `GameCard` y `Library`: búsqueda, filtro por categoría, grid, estado vacío "NO HAY RESULTADOS".
5. Reemplazar `app/page.tsx` para renderizar `Library`, montada bajo el layout con `Nav` y footer.
6. Crear `components/game-detail.tsx` (`"use client"`) y la ruta `app/juego/[id]/page.tsx`, portando `GameDetail`: info del juego, stats, leaderboard vía `seededScores`, CTA a `/juego/[id]/jugar`. Manejar `id` inexistente con `notFound()`.
7. Crear `components/game-player.tsx` (`"use client"`) y la ruta `app/juego/[id]/jugar/page.tsx`, portando `GamePlayer`: HUD, simulación de score/nivel por intervalo, pausa, fin de juego, modal de guardado de puntuación en `localStorage` (`av_scores`), reinicio, salida a detalle o a biblioteca.
8. Crear `components/auth.tsx` (`"use client"`) y la ruta `app/ingresar/page.tsx`, portando `Auth`: tabs login/registro, formulario, "jugar como invitado", botones sociales decorativos, guardado de `av_user` en `localStorage` y redirección a `/` tras "login".
9. Crear `components/hall-of-fame.tsx` (`"use client"`) y la ruta `app/salon/page.tsx`, portando `HallOfFame`: tabs por juego, podio, tabla, fila "tu mejor marca" condicionada a sesión activa.
10. Integrar `Nav` y el footer en `app/layout.tsx`, leyendo/gestionando sesión (`av_user`) a nivel de layout o vía un hook/contexto cliente simple, y pasando `onSignOut`/estado a `Nav`.
11. Revisión visual manual navegando las 5 rutas en el navegador (biblioteca, detalle, reproductor, auth, salón), comparando contra el prototipo HTML abierto en paralelo, en desktop y mobile width.
12. Ejecutar `npm run lint` y `npm run build` para confirmar que el árbol `app/`/`components/`/`lib/` compila sin errores (los errores preexistentes en `references/templates/*.jsx` se mantienen y se ignoran, como indica `CLAUDE.md`).

## Criterios de aceptación

- [ ] `app/page.tsx` renderiza la Biblioteca (ya no es el boilerplate de `create-next-app`).
- [ ] Las rutas `/`, `/juego/[id]`, `/juego/[id]/jugar`, `/ingresar`, `/salon` existen y renderizan sin error para al menos un `id` válido de `GAMES`.
- [ ] `/juego/id-invalido` responde con `notFound()` (página 404) en vez de crashear.
- [ ] La búsqueda y el filtro por categoría en Biblioteca funcionan como en el prototipo (filtran el grid en tiempo real).
- [ ] El detalle de un juego muestra su info, stats y un leaderboard generado con `seededScores`.
- [ ] En el reproductor: el puntaje sube solo mientras no está en pausa ni terminado, pausa detiene el incremento, "FIN" abre el modal de fin de juego con la puntuación final.
- [ ] Guardar puntuación en el modal de fin de juego agrega un registro a `localStorage["av_scores"]` y muestra el estado "guardado".
- [ ] Login (con usuario) y "jugar como invitado" en `/ingresar` ambos redirigen a `/` y actualizan el estado de sesión visible en `Nav` (nombre de usuario o botón "Iniciar Sesión").
- [ ] Cerrar sesión desde `Nav` borra `av_user` de `localStorage` y vuelve a mostrar el botón "Iniciar Sesión".
- [ ] El Salón de la Fama permite cambiar de tab por juego y muestra podio + tabla; si hay sesión activa, muestra la fila "tu mejor marca".
- [ ] El panel de navegación móvil (hamburguesa) abre/cierra y refleja la ruta activa.
- [ ] `npm run build` completa sin errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores nuevos fuera de los ya existentes en `references/templates/*.jsx`.
- [ ] La estética neón-pixel (colores, tipografía `pixel`/`mono`, efectos CRT/scanline) es visualmente equivalente a `references/templates/Arcade Vault.html` al compararlos lado a lado.

## Decisiones tomadas y descartadas

- **Routing real de Next.js (App Router) en vez de router por hash** — se descarta replicar el router casero del prototipo porque no es idiomático en Next.js y el objetivo es portar la UI a arquitectura real, no preservar el mecanismo de ruteo.
- **localStorage + datos mock, sin backend** — se mantiene fiel al prototipo porque este spec es explícitamente "solo la parte visual"; introducir persistencia real es trabajo de un spec futuro.
- **Reproductor se porta como simulación completa, no como placeholder estático** — la experiencia de "jugar" (HUD, puntaje que sube, pausa, fin de juego, guardado de score) es parte central de la UX del producto aunque no haya un juego real detrás; un placeholder estático perdería esa sensación.
- **Todos los componentes como Client Components** — se descarta la separación Server/Client porque toda la interactividad del prototipo (filtros, tabs, formularios, intervalos) requiere estado y efectos de cliente; forzar Server Components exigiría rediseñar esa interactividad, fuera de alcance de un MVP visual.
- **Estilos: portar `styles.css` casi tal cual, Tailwind solo para lo nuevo** — minimiza el riesgo de desviarse del look neón ya validado en el prototipo; reescribir todo a tokens de Tailwind v4 es más trabajo sin beneficio claro para este MVP.
- **Rutas en español (`/juego/[id]`, `/salon`, `/ingresar`)** — consistente con que todo el copy del producto está en español.
- **`lib/data.ts` como módulo único de datos mock** — reemplaza los globals `window.GAMES`/`window.CATS`/`window.seededScores` del prototipo con imports ES normales, sin cambiar la forma de los datos.
- **Sin autenticación OAuth real** — los botones de Google/GitHub quedan decorativos porque implementar OAuth real está fuera del alcance "solo visual" de este spec.
