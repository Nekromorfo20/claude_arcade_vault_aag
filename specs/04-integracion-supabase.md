# 04 - Integración Base de Supabase (BD + Auth)

**Estado:** Aprobado
**Depende de:** SPEC 01
**Fecha:** 2026-10-29

**Objetivo:** Conectar el proyecto Next.js a Supabase (cliente browser, cliente server y middleware de sesión vía `@supabase/ssr`) como infraestructura base para Auth y Base de Datos, sin migrar todavía la UI de `auth.jsx` ni crear tablas de producto.

## Alcance

**Incluido:**

- Instalación de las dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- `lib/supabase/client.ts`: factory del cliente Supabase para Componentes de Cliente (browser), usando `createBrowserClient` de `@supabase/ssr`.
- `lib/supabase/server.ts`: factory del cliente Supabase para Server Components y Route Handlers, usando `createServerClient` de `@supabase/ssr` con manejo de cookies de Next.js (`next/headers`).
- `lib/supabase/middleware.ts`: helper `updateSession` que refresca la sesión de Supabase a partir de las cookies de la request/response, siguiendo el patrón oficial de `@supabase/ssr` para Next.js App Router.
- `middleware.ts` en la raíz del proyecto, que invoca `updateSession` en cada request (con `matcher` excluyendo assets estáticos), de forma que las cookies de sesión se mantengan válidas en toda la app. No bloquea ninguna ruta todavía (no hay lógica de "redirigir si no hay sesión").
- Variables de entorno nuevas: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example` con placeholders (ya existe `.env.example` en el repo, se agregan estas dos líneas).
- Endpoint temporal `app/api/supabase-healthcheck/route.ts` (`GET`): instancia el cliente server de Supabase y ejecuta una llamada mínima (`supabase.auth.getSession()`); responde `200` con `{ ok: true }` si no hay error de conexión/credenciales, o `500` con el mensaje de error si falla. Este endpoint es temporal, pensado para verificar la integración durante este spec y specs futuros cercanos — no es un healthcheck de producción permanente.
- Configuración del proyecto Supabase (ya existente, `jkmqjfliuqbqazakqdsq`, conectado vía MCP): se confirma que **auto-confirmación de email está activa** (los usuarios pueden iniciar sesión inmediatamente tras `signUp`, sin click en link de confirmación) — se ajusta en el dashboard/config de Supabase si no lo está ya, no se crea código nuevo para esto.
- Nota de seguridad en el propio spec (sección de riesgos) sobre `SUPABASE_DB_PASSWORD` presente en texto plano en `.env.local`, y confirmación de que `.env.local` sigue listado en `.gitignore`.

**No incluido (fuera de alcance de este spec):**

- Conectar `components/auth.tsx`/`auth.jsx` a `signInWithPassword`/`signUp` reales de Supabase Auth — el formulario sigue usando `localStorage` (`av_user`) como hoy. Queda para un spec futuro.
- Cualquier tabla nueva en Postgres (`profiles`, `scores`, `games`, etc.) — no se crea ninguna migración de esquema en este spec.
- Protección efectiva de rutas (redirigir a `/ingresar` si no hay sesión) — el middleware solo refresca cookies, no aplica reglas de acceso.
- Supabase Realtime.
- Supabase Edge Functions.
- OAuth social (Google/GitHub) — los botones sociales de `auth.jsx` siguen siendo decorativos.
- Modo invitado ("jugar como invitado") como usuario anónimo de Supabase (`signInAnonymously`) — se mantiene igual que hoy, sin sesión real.
- Row Level Security (RLS) y políticas — no aplica porque no se crean tablas en este spec.
- Tests automatizados (no hay test runner configurado en el repo).

## Modelo de datos

No se introduce modelo de datos nuevo ni se crean tablas, migraciones ni políticas RLS. Este spec es exclusivamente infraestructura de conexión (clientes + sesión); el único "dato" nuevo son las variables de entorno de conexión.

## Plan de implementación

1. Instalar `@supabase/supabase-js` y `@supabase/ssr` (`npm install @supabase/supabase-js @supabase/ssr`).
2. Agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a `.env.example` (con placeholders) y a `.env.local` (con los valores reales del proyecto `jkmqjfliuqbqazakqdsq`, obtenidos vía `mcp__supabase__get_project_url` y `mcp__supabase__get_publishable_keys`).
3. Crear `lib/supabase/client.ts` exportando una función `createClient()` que devuelve el cliente browser (`createBrowserClient` de `@supabase/ssr`, usando las dos variables `NEXT_PUBLIC_*`).
4. Crear `lib/supabase/server.ts` exportando una función `async createClient()` que devuelve el cliente server (`createServerClient`), leyendo/escribiendo cookies vía `next/headers` (`cookies()`), para uso en Server Components y Route Handlers.
5. Crear `lib/supabase/middleware.ts` exportando `updateSession(request: NextRequest)`, que instancia un cliente server ligado a la request/response de middleware y llama a `supabase.auth.getUser()` para refrescar el token de sesión en las cookies, devolviendo el `NextResponse` resultante.
6. Crear `middleware.ts` en la raíz del proyecto, que invoca `updateSession` y define un `matcher` que excluye archivos estáticos (`_next/static`, `_next/image`, `favicon.ico`, extensiones de imagen).
7. Crear `app/api/supabase-healthcheck/route.ts` (`GET`): usa el cliente de `lib/supabase/server.ts`, llama a `supabase.auth.getSession()`, devuelve `{ ok: true }` (200) o `{ ok: false, error }` (500).
8. En el proyecto Supabase conectado (`jkmqjfliuqbqazakqdsq`), confirmar/activar que la confirmación de email esté deshabilitada (auto-confirm) para el provider de email/password.
9. Ejecutar `npm run dev`, visitar `/api/supabase-healthcheck` y confirmar respuesta `200 { ok: true }`.
10. Ejecutar `npm run lint` y `npm run build` para confirmar que `app/`, `components/` y `lib/` compilan sin errores nuevos.

## Criterios de aceptación

- [ ] `npm install` deja `@supabase/supabase-js` y `@supabase/ssr` en `package.json`/`package-lock.json`.
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts` y `lib/supabase/middleware.ts` existen y exportan sus respectivas factories de cliente.
- [ ] `middleware.ts` en la raíz invoca `updateSession` en cada request no estática.
- [ ] `.env.example` incluye `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con placeholders.
- [ ] `.env.local` contiene los valores reales de esas dos variables para el proyecto `jkmqjfliuqbqazakqdsq`, y `.env.local` sigue ignorado por git (`git check-ignore .env.local` confirma que está ignorado).
- [ ] `GET /api/supabase-healthcheck` responde `200 { ok: true }` con `npm run dev` corriendo.
- [ ] La confirmación de email está deshabilitada en el proyecto Supabase (un `signUp` de prueba permite iniciar sesión sin click en link de confirmación) — verificable manualmente desde el dashboard o vía una llamada de prueba.
- [ ] No se crea ninguna tabla, migración ni política RLS nueva (`mcp__supabase__list_tables` sigue devolviendo la lista vacía o sin cambios respecto a antes de este spec).
- [ ] `components/auth.tsx`/`auth.jsx` no se modifica — sigue usando `localStorage` (`av_user`) sin cambios.
- [ ] `npm run build` completa sin errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores nuevos fuera de los ya existentes en `references/templates/*.jsx`.

## Decisiones tomadas y descartadas

- **Alcance acotado a infraestructura (clientes + sesión), sin tocar `auth.jsx` ni crear tablas** — decisión explícita del usuario: este spec es la base de conexión; migrar el login real y modelar `profiles`/`scores` se trata en specs futuros, cada uno más chico y verificable por separado.
- **`@supabase/ssr` en vez de `@supabase/supabase-js` a secas** — es el paquete oficial recomendado por Supabase para Next.js App Router, maneja correctamente la sincronización de cookies entre Server Components, Route Handlers y middleware; usar solo `supabase-js` dejaría la sesión únicamente en el cliente, igual de frágil que el `localStorage` actual.
- **Email + contraseña como método de autenticación objetivo (aunque no se conecte aún)** — más simple de spec-ear y corresponde 1:1 con el formulario ya existente en `auth.jsx`; magic link u OAuth social cambiarían la UX del formulario y se descartan para no ampliar el alcance de este spec.
- **Auto-confirmación de email (sin requerir click de verificación)** — prioriza velocidad de desarrollo/pruebas en este MVP; se puede activar la confirmación por email más adelante desde el dashboard de Supabase sin tocar código.
- **Middleware se agrega ya, aunque todavía no bloquee rutas** — es necesario para que las cookies de sesión de Supabase se mantengan frescas entre requests; agregarlo ahora evita tener que retrofitearlo cuando un spec futuro conecte `auth.jsx` y necesite sesión funcionando de punta a punta.
- **Healthcheck como endpoint temporal, no como feature permanente** — su único propósito es verificar que las credenciales y el cliente server funcionan durante este spec; no se diseña como endpoint de monitoreo de producción.
- **No se crean tablas, migraciones ni RLS en este spec** — decisión explícita del usuario; evita tomar decisiones de modelado de datos (forma de `profiles`, relación con `GAMES`, etc.) antes de que exista un spec que las necesite concretamente.
- **Modo invitado se mantiene sin sesión real de Supabase** — decisión explícita del usuario; usar `signInAnonymously()` se descarta por ahora para no acoplar el modo invitado a Supabase antes de que el resto de Auth esté conectado.

## Riesgos identificados

- **`SUPABASE_DB_PASSWORD` en texto plano en `.env.local`:** el archivo `.env.local` ya contiene una contraseña de base de datos en texto plano (detectada durante la Fase 1 de este spec). Mitigación: este spec no agrega ningún uso nuevo de esa variable (no se necesita para `@supabase/ssr`, que solo usa URL + anon key); se confirma que `.env.local` está en `.gitignore` y no se sube nunca al repo. Si se requiere rotar esa contraseña por higiene, es una acción separada fuera del alcance de este spec.
- **Clave anónima (`anon key`) expuesta al cliente vía `NEXT_PUBLIC_*`:** es el comportamiento esperado y seguro de Supabase (la anon key está diseñada para ser pública y se restringe con RLS), pero como este spec no crea tablas ni políticas RLS todavía, cualquier tabla que se cree en specs futuros debe definir sus políticas RLS antes de exponer datos sensibles.
