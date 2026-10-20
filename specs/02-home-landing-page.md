# 02 - Home Landing Page

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-10-20

**Objetivo:** Portar `references/templates/home-about/home.jsx` como la nueva página de inicio real en `/`, moviendo la Biblioteca actual a `/biblioteca` y actualizando todos los enlaces internos que hoy asumen que `/` es la Biblioteca.

## Alcance

**Incluido:**

- Nueva ruta `/` → Home (landing), portando `home.jsx`: hero con silhouettes flotantes animados, sección "¿Por qué Arcade Vault?", preview de juegos (primeros 6 de `GAMES`), sección de stats, sección "Actividad en vivo" (últimas puntuaciones + top jugadores del día), sección de precios con FAQ, y CTA final.
- `app/biblioteca/page.tsx`: nueva ruta que renderiza el componente `Library` existente (lo que hoy vive en `app/page.tsx`).
- `app/page.tsx` reemplazado para renderizar el nuevo componente `Home`.
- Nuevo componente `components/home.tsx` (`"use client"`), portando `Home`, `FloatingSilhouettes`, `MiniCard` y `FeatureIcon` de `home.jsx`, adaptado a Next.js (`next/navigation`/`next/link` en vez de la prop `navigate`, `GAMES` importado desde `lib/data.ts` en vez de global).
- El hook `useReveal` (scroll-reveal vía `IntersectionObserver`) se porta tal cual, como hook interno del componente o en un módulo compartido si ya existe un patrón similar en el repo.
- Los datos de "Actividad en vivo" (últimas puntuaciones y top jugadores) se portan como arrays estáticos hardcodeados dentro del componente, igual que en el prototipo — no se conectan a `av_scores` real.
- Los primeros 6 juegos de la sección "Juegos disponibles ahora" se toman de `GAMES` (de `lib/data.ts`), igual que `GAMES.slice(0, 6)` en el prototipo.
- Estilos de `references/templates/home-about/styles.css` relacionados a Home (clases `home-*`, `feature-*`, `mini-*`, `stat-*`, `activity-*`, `ticker`, `top-*`, `pricing-*`, `price-*`, `faq-*`, `final-*`) se portan/fusionan en `app/globals.css`, evitando duplicar reglas ya existentes (variables de color, `pixel`/`mono`, `btn`, `card`).
- Actualización de `components/nav.tsx`: el logo (click) pasa a apuntar a `/` como Home (ya lo hace); se agrega entrada "Inicio" en los links de desktop y en el panel móvil, apuntando a `/`; el link "Biblioteca" pasa a apuntar a `/biblioteca`; la lógica `isActive` se ajusta para que "Inicio" esté activo solo en `/` exacto y "Biblioteca" esté activo en `/biblioteca` y `/juego/*`.
- Actualización de todos los `router.push("/")` y `Link href="/"` existentes que hoy significan "volver a biblioteca", para que apunten a `/biblioteca`: `components/game-detail.tsx` (botón volver), `components/game-player.tsx` (botón salir y botón del modal de fin de juego), `components/hall-of-fame.tsx` (botón de volver), `components/auth.tsx` (redirección tras login y tras "jugar como invitado").
- Los CTAs del propio Home ("Explorar juegos", "Ver todos los juegos", "Insertar moneda") navegan a `/biblioteca`; los CTAs de cuenta ("Crear cuenta", "Empezar gratis") navegan a `/ingresar`; el link "Ver salón" de la sección de actividad navega a `/salon`.

**No incluido (fuera de alcance de este spec):**

- La página "Acerca de" / Contacto (`about.jsx`) — queda para un spec futuro.
- Cualquier cambio al link "Acerca de" en el Nav — hoy no existe ese link en `components/nav.tsx`, y este spec no lo agrega.
- Conectar la sección "Actividad en vivo" a datos reales de `localStorage` (`av_scores`) — se mantiene con datos de ejemplo hardcodeados, igual que el prototipo.
- Cambios al modelo de datos en `lib/data.ts` más allá de reutilizar `GAMES` tal como existe.
- Tests automatizados (no hay test runner configurado en el repo).
- Internacionalización — todo el copy permanece en español.
- Backend, autenticación real o persistencia distinta a la ya existente (`localStorage`).

## Modelo de datos

No se introduce modelo de datos nuevo. Se reutiliza `GAMES` desde `lib/data.ts` (spec 01). Los datos de "últimas puntuaciones" y "top jugadores" de la sección Actividad en Vivo son arrays literales locales al componente `Home`, con la misma forma que en el prototipo (`{ p, g, s, t, c }` para el ticker y `{ r, p, s }` para el top), sin tipos compartidos ni persistencia.

## Plan de implementación

1. Crear `app/biblioteca/page.tsx` que renderiza `<Library />` (el mismo contenido que hoy tiene `app/page.tsx`).
2. Crear `components/home.tsx` (`"use client"`) portando `Home`, `FloatingSilhouettes`, `MiniCard` y `FeatureIcon` desde `references/templates/home-about/home.jsx`, reemplazando `navigate(...)` por `useRouter()`/`Link` de Next.js y usando `GAMES` importado de `@/lib/data`.
3. Reemplazar `app/page.tsx` para renderizar `<Home />` en vez de `<Library />`.
4. Portar las clases CSS necesarias de `references/templates/home-about/styles.css` a `app/globals.css` (secciones hero, features, mini-rail, stats, activity/ticker, pricing/faq, final CTA), evitando duplicar variables o utilidades ya portadas en el spec 01.
5. Actualizar `components/nav.tsx`: agregar "Inicio" (→ `/`) en desktop y panel móvil, cambiar "Biblioteca" para apuntar a `/biblioteca`, y ajustar `isActive` para distinguir Home de Biblioteca.
6. Actualizar las navegaciones que hoy apuntan a `/` como "volver a biblioteca" en `components/game-detail.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx` y `components/auth.tsx`, para que apunten a `/biblioteca`.
7. Verificar con `npm run dev` que `/` muestra Home, `/biblioteca` muestra el grid de juegos, y que toda la navegación cruzada (nav, botones de volver, CTAs del Home, redirecciones de auth) lleva a la ruta correcta.
8. Revisión visual manual del Home en desktop y mobile width, comparando contra `references/templates/home-about/arcade-vault-standalone.html` abierto en paralelo: hero, silhouettes animados, reveal al hacer scroll, preview de juegos, stats, actividad en vivo, pricing/FAQ y CTA final.
9. Ejecutar `npm run lint` y `npm run build` para confirmar que `app/`, `components/` y `lib/` compilan sin errores nuevos.

## Criterios de aceptación

- [X] `/` renderiza el nuevo Home (hero, why-cards, preview de juegos, stats, actividad en vivo, pricing/FAQ, CTA final) y ya no renderiza la Biblioteca.
- [X] `/biblioteca` renderiza el grid de juegos con búsqueda y filtro por categoría, igual que antes vivía en `/`.
- [X] El hero del Home muestra las silhouettes SVG flotantes y el texto con el efecto `blink` del cursor.
- [X] Las secciones marcadas con `reveal` en el prototipo aparecen con la animación de entrada al hacer scroll (usando `IntersectionObserver`).
- [X] La sección "Juegos disponibles ahora" muestra exactamente los primeros 6 juegos de `GAMES` y cada tarjeta navega a `/juego/[id]` al hacer click.
- [X] Los botones "Explorar juegos", "Ver todos los juegos →" e "Insertar moneda →" navegan a `/biblioteca`.
- [X] Los botones "Crear cuenta" y "Empezar gratis →" navegan a `/ingresar`.
- [X] El link "Ver salón →" de la sección de actividad navega a `/salon`.
- [X] El Nav muestra "Inicio" y "Biblioteca" como entradas separadas, cada una resaltada como activa en su ruta correspondiente (`/` para Inicio, `/biblioteca` y `/juego/*` para Biblioteca).
- [X] El logo del Nav navega a `/` (Home).
- [X] Los botones "volver"/"salir" en detalle de juego, reproductor y salón de la fama navegan a `/biblioteca` (ya no a `/`).
- [X] El login y "jugar como invitado" en `/ingresar` redirigen a `/biblioteca` (ya no a `/`).
- [X] `npm run build` completa sin errores en `app/`, `components/` y `lib/`.
- [X] `npm run lint` no reporta errores nuevos fuera de los ya existentes en `references/templates/*.jsx`.
- [X] La estética neón-pixel del Home es visualmente equivalente a `references/templates/home-about/arcade-vault-standalone.html` al compararlos lado a lado, en desktop y mobile width.

## Decisiones tomadas y descartadas

- **`/` pasa a ser Home y Biblioteca se mueve a `/biblioteca`** — se descarta dejar Biblioteca en `/` porque el prototipo trata Home como la landing raíz del sitio (el logo del Nav navega a `home`, no a `biblioteca`); mantener Biblioteca en `/` habría sido inconsistente con esa jerarquía y con cómo crecerá el sitio (Home como entrada, Biblioteca como sección de producto).
- **Página "Acerca de" fuera de este spec** — aunque vive en la misma carpeta `home-about/`, es una pantalla independiente (con su propio formulario de contacto); se separa para mantener este spec enfocado y del tamaño de un MVP incremental.
- **No se agrega el link "Acerca de" al Nav** — ya que About no se implementa en este spec, agregar un link roto o a una página inexistente generaría una UX peor que simplemente no mostrarlo todavía.
- **Actividad en vivo con datos hardcodeados, no conectada a `av_scores`** — igual que en el prototipo; conectarla a datos reales requeriría que existan partidas jugadas, lo cual no está garantizado y no es el objetivo visual de este spec.
- **Se actualizan todas las navegaciones existentes que asumían `/` como Biblioteca** — necesario para no dejar la navegación rota tras mover Biblioteca a su propia ruta; es un efecto directo y obligatorio del cambio de estructura de rutas, no una ampliación de alcance.
- **Silhouettes y animaciones `reveal` se portan tal cual** — consistente con el enfoque "visualmente equivalente al prototipo" ya usado en el spec 01, en vez de simplificar y perder la sensación de entrada progresiva del diseño original.
