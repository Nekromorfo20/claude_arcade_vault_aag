# 06 - Leaderboard y tabla de juegos

**Estado:** Implementado
**Depende de:** SPEC 01, SPEC 04, SPEC 05
**Fecha:** 2026-11-17

**Objetivo:** Migrar la autenticación y los datos de juegos/puntuaciones de `localStorage`/mocks a Supabase (tablas `profiles`, `games`, `scores`), para que el Salón de la Fama muestre un ranking real top 10 por juego con confirmación manual al guardar, y la biblioteca ofrezca una vista alternable entre grid de cards y tabla de filas.

## Alcance

**Incluido:**

- Migración `supabase/migrations/`: nuevas tablas `profiles` (`id` FK a `auth.users`, `username` único), `games` (`id` texto PK, `title`, `short`, `long`, `cat`, `cover`, `color` — mismo shape que `Game` en `lib/data.ts`, sin `best`/`plays`) y `scores` (`id`, `game_id` FK a `games`, `user_id` FK a `profiles`, `score` integer, `created_at` timestamptz default `now()`), con RLS habilitado: lectura pública de `games`/`scores`/`profiles`, escritura de `scores` solo para el usuario autenticado dueño del `user_id`, escritura de `profiles` solo para el propio usuario.
- Seed de la migración: insertar únicamente el registro de `asteroides` (tomado de `lib/data.ts`) en la tabla `games`. El resto de los juegos del catálogo mock permanece sin tabla y sigue leyendo de `lib/data.ts`.
- Migrar `components/auth.tsx` (y el estado de sesión usado por `nav.tsx`/rutas protegidas) de `localStorage` (`av_user`) a Supabase Auth real: registro con email + password + username (inserta en `profiles`), login con email + password. Se usa el auto-confirm de email ya activado en el proyecto Supabase (spec 04). No se migran los datos existentes en `av_user`/`av_scores`: se descartan.
- Nuevo helper de datos (`lib/scores.ts` o equivalente) con funciones para: insertar un score (`game_id`, `user_id`, `score`) y para leer el top 10 de `scores` de un `game_id` ordenado descendente por `score`, incluyendo el `username` vía join con `profiles`.
- `components/games/asteroids-player.tsx` (spec 05): al finalizar la partida (fin automático o botón FIN), el modal de fin de partida existente agrega una confirmación explícita ("Guardar puntuación" / cerrar sin guardar) antes de insertar el score en Supabase. Solo se ejecuta el insert si el usuario está autenticado; si no lo está, el modal ofrece ir a `/ingresar` en vez del botón de guardar.
- `components/hall-of-fame.tsx` (ruta `/salon`): se reemplaza `seededScores` por una consulta real a Supabase. Mantiene el layout por tabs — un tab por cada `id` presente en la tabla `games` (hoy solo `asteroides`) — mostrando podio top 3 y tabla con columnas RANGO/JUGADOR/PUNTUACIÓN/FECHA para el top 10 real de ese juego. Si el usuario autenticado tiene un score propio fuera del top 10, se agrega igualmente la fila "TU MEJOR MARCA" al final con su rango real.
- Estados nuevos en `/salon`: loading (spinner/skeleton mientras se consulta Supabase) y vacío ("Sin puntuaciones todavía" cuando la tabla `scores` no tiene filas para ese juego). No existía ninguno de los dos en el prototipo (era todo síncrono con mocks).
- `components/library.tsx` (ruta `/biblioteca`): se agrega un toggle de vista (grid / tabla) junto a los filtros existentes (búsqueda, chips de categoría), persistido solo en estado de componente (no en URL ni localStorage). La vista tabla muestra filas con columnas TÍTULO, CATEGORÍA, MEJOR PUNTUACIÓN y PARTIDAS JUGADAS. Para `asteroides`, "mejor puntuación" y "partidas jugadas" se calculan en vivo desde la tabla `scores` (`MAX(score)` y `COUNT(*)` por `game_id`); para el resto de los juegos (sin tabla real todavía) se siguen mostrando los valores mock `best`/`plays` de `lib/data.ts`. Los filtros de búsqueda y categoría existentes aplican igual sobre ambas vistas.
- El botón JUGAR y la navegación a `/juego/[id]` se mantienen idénticos en ambas vistas (grid y tabla).

**No incluido (fuera de alcance de este spec):**

- Login social / OAuth (Google, etc.) — solo email + password.
- Migrar o portar los juegos restantes del catálogo mock (`rocas`, etc.) a la tabla `games` de Supabase — queda para specs futuros cuando esos juegos se implementen de verdad (como pasó con Asteroides en spec 05).
- Ranking global combinando puntajes de distintos juegos — el leaderboard sigue siendo por juego (tabs), sin una vista agregada cross-juego.
- Historial de partidas por usuario (ej. "mis últimas 10 partidas") — solo se expone el mejor puesto en el ranking vía "TU MEJOR MARCA".
- Edición/borrado de perfil (cambiar username, avatar, borrar cuenta) — el registro crea el `profile` una sola vez y no se gestiona después.
- Recuperación de contraseña / reseteo de email — no se implementa flujo de "olvidé mi contraseña" en este spec.
- Paginación o infinite scroll en la tabla de juegos o en el leaderboard (el leaderboard ya está acotado a top 10; la tabla de juegos lista todos los juegos del catálogo, que hoy son pocos).
- Tests automatizados (no hay test runner configurado en el repo).

## Modelo de datos

Tablas nuevas en Supabase (vía migración SQL en `supabase/migrations/`):

```sql
profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  created_at  timestamptz not null default now()
)

games (
  id      text primary key,
  title   text not null,
  short   text not null,
  long    text not null,
  cat     text not null,
  cover   text not null,
  color   text not null
)

scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references games(id),
  user_id     uuid not null references profiles(id),
  score       integer not null,
  created_at  timestamptz not null default now()
)
```

RLS: `profiles`, `games` y `scores` con lectura pública (`select` para `anon`/`authenticated`). Escritura en `profiles` restringida a `auth.uid() = id`. Escritura (`insert`) en `scores` restringida a `auth.uid() = user_id`. `games` sin política de escritura para clientes (solo se puebla vía migración/seed).

Se mantiene el tipo `Game` existente en `lib/data.ts` para los juegos que aún no tienen fila en `games` (todos excepto `asteroides`); no se elimina `GAMES` del archivo mock.

## Plan de implementación

1. Crear la migración SQL con las tablas `profiles`, `games`, `scores`, sus políticas RLS, y el seed del registro `asteroides` en `games`. Aplicarla al proyecto Supabase (`jkmqjfliuqbqazakqdsq`). El sistema sigue funcionando igual que antes (nadie consume las tablas nuevas todavía).
2. Migrar `components/auth.tsx` a Supabase Auth real: formulario de registro (email, password, username → crea fila en `profiles`) y login (email, password). Actualizar el estado de sesión consumido por `nav.tsx` y las rutas protegidas para leer la sesión de Supabase en vez de `av_user`. El login/registro ya funciona end-to-end contra Supabase, sin tocar aún scores ni leaderboard.
3. Crear `lib/scores.ts` con las funciones de inserción de score y lectura de top 10 por `game_id` (join con `profiles` para `username`).
4. Actualizar `components/games/asteroids-player.tsx`: el modal de fin de partida pide confirmación y, si el usuario está autenticado, inserta el score vía `lib/scores.ts`; si no, ofrece ir a `/ingresar`. El guardado en `localStorage` (`av_scores`) se elimina para Asteroides.
5. Actualizar `components/hall-of-fame.tsx`: reemplazar `seededScores` por la consulta real del top 10 (y la fila "TU MEJOR MARCA" si aplica), agregar estados de loading y vacío. El Salón de la Fama ya muestra datos reales de partidas jugadas.
6. Actualizar `components/library.tsx`: agregar el toggle grid/tabla, la vista de tabla con sus columnas, y el cálculo en vivo de mejor puntuación/partidas jugadas para `asteroides` (fallback a los valores mock para el resto). La biblioteca queda funcional en ambas vistas, con filtros existentes aplicando a las dos.

## Criterios de aceptación

- [X] Las tablas `profiles`, `games`, `scores` existen en Supabase con las políticas RLS descritas, y `games` contiene exactamente un registro (`asteroides`).
- [X] Un usuario nuevo puede registrarse con email + password + username y queda autenticado con una fila creada en `profiles`.
- [X] Un usuario existente puede iniciar sesión con email + password sin pasos adicionales (auto-confirm ya activo).
- [X] `av_user` deja de usarse como fuente de verdad de sesión en `auth.tsx`/`nav.tsx`.
- [X] Al terminar una partida de Asteroides estando autenticado, el modal de fin de partida permite confirmar el guardado del score, y tras confirmar aparece una nueva fila en la tabla `scores` de Supabase.
- [X] Al terminar una partida de Asteroides sin estar autenticado, el modal ofrece ir a `/ingresar` en vez de guardar directamente.
- [X] `/salon`, tab "Asteroides", muestra el top 10 real ordenado por puntuación descendente, con podio para el top 3, leído desde la tabla `scores`.
- [X] `/salon` muestra un estado de carga mientras consulta Supabase y un estado vacío si `scores` no tiene filas para ese juego.
- [X] Si el usuario autenticado tiene un score fuera del top 10, `/salon` agrega la fila "TU MEJOR MARCA" con su rango real calculado.
- [X] `/biblioteca` permite alternar entre vista grid y vista tabla sin perder los filtros de búsqueda/categoría aplicados.
- [X] En la vista tabla, la fila de "asteroides" muestra mejor puntuación y cantidad de partidas jugadas calculadas en vivo desde Supabase (no desde `lib/data.ts`).
- [X] En la vista tabla, el resto de los juegos sigue mostrando los valores mock `best`/`plays` de `lib/data.ts` sin error.

## Decisiones tomadas y descartadas

- **Auth real incluida en este spec, no en uno separado**: se decidió así porque sin un usuario autenticado real no hay a quién asociar un score de forma segura (RLS por `user_id`); separarlo habría dejado este spec bloqueado sin poder completarse.
- **Username en tabla `profiles` en vez de mostrar el email**: se prioriza no exponer el email de los jugadores en un ranking público.
- **Confirmación manual antes de guardar el score** (en vez de guardado automático): el usuario decide explícitamente si su partida queda registrada en el ranking público.
- **Se migra solo `asteroides` a la tabla `games`**, no todo el catálogo mock: es el único juego real implementado (spec 05); el resto son simulaciones sin partidas reales que registrar. Se evita sembrar datos ficticios en una tabla pensada para datos reales.
- **No se migran los datos existentes de `localStorage`** (`av_user`, `av_scores`): son datos de desarrollo/mock sin valor, migrar lógica de importación habría sido complejidad innecesaria.
- **Se guarda cada partida jugada como fila nueva en `scores`** (no upsert del mejor puntaje): permite mantener historial real y calcular "partidas jugadas" (`COUNT(*)`) además del mejor puntaje (`MAX(score)`), ambos usados en la vista de tabla de `/biblioteca`.
- **La vista tabla convive con el grid** (toggle) en vez de reemplazarlo: el grid de cards ya es parte del lenguaje visual aprobado del proyecto (spec 01); se agrega la tabla como alternativa sin descartar trabajo previo.
- **Sin OAuth ni recuperación de contraseña**: mantiene el alcance acotado a lo mínimo necesario para que el leaderboard funcione con datos reales; ambos pueden ser specs futuros si se necesitan.

## Riesgos identificados

- **RLS mal configurado** podría permitir que un usuario inserte scores a nombre de otro `user_id`, o que cualquiera pueda escribir en `profiles`/`games`. Mitigación: las políticas quedan explícitas en el modelo de datos y deben verificarse con `get_advisors` de Supabase tras aplicar la migración.
- **Inconsistencia de datos entre juegos**: mientras solo `asteroides` tenga tabla real y el resto siga en mocks, la vista de tabla en `/biblioteca` combina dos fuentes de datos distintas (Supabase vs. `lib/data.ts`). Si se agregan más juegos reales sin actualizar este criterio, puede generar confusión sobre qué juegos tienen estadísticas reales.
