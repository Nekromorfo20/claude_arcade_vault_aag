# 03 - About Page y Contacto

**Estado:** Aprobado
**Depende de:** SPEC 01, SPEC 02
**Fecha:** 2026-10-20

**Objetivo:** Portar `references/templates/home-about/about.jsx` como la página real "Acerca de" en `/acerca-de`, conectando el formulario de contacto a un envío de correo real mediante Resend.

## Alcance

**Incluido:**

- Nueva ruta `app/acerca-de/page.tsx` que renderiza un componente `About` portado de `about.jsx`: sección hero ("Acerca de Arcade Vault" + misión + 3 highlights), divider animado, y sección de contacto con formulario.
- Componente `components/about.tsx` (`"use client"`), portando `About` y `HighlightIcon` de `about.jsx`, incluyendo el hook de scroll-reveal vía `IntersectionObserver` (mismo patrón ya usado en `components/home.tsx` del spec 02).
- Validación en cliente igual al prototipo: si nombre, email o mensaje están vacíos al enviar, se dispara el efecto `shake` y no se envía nada.
- Nuevo endpoint `app/api/contacto/route.ts` (Next.js Route Handler, `POST`) que recibe `{ name, email, msg }`, valida en servidor que los tres campos no estén vacíos y que `email` tenga formato de correo válido (regex simple), y si es válido llama a Resend para enviar el mensaje.
- Integración real con Resend: se agrega la dependencia `resend` al proyecto, se usa `RESEND_API_KEY` desde variable de entorno para autenticar, `CONTACT_TO_EMAIL` como destinatario y `CONTACT_FROM_EMAIL` como remitente verificado — ambas también por variable de entorno.
- El correo enviado es texto plano: asunto `Nuevo mensaje de contacto — {nombre}`, cuerpo con nombre, email y mensaje del formulario.
- Tres estados de UI en el formulario, manejados desde `components/about.tsx`:
  - **Inicial/edición:** formulario vacío o con datos, igual al prototipo.
  - **Enviando:** mientras la llamada a `/api/contacto` está en curso, se deshabilita el botón de envío (se puede mostrar un texto de carga en el propio botón, ej. "ENVIANDO...").
  - **Éxito:** se reutiliza el bloque `terminal-success` del prototipo tal cual, con las líneas de progreso y el mensaje final de confirmación.
  - **Error:** se reutiliza el mismo bloque visual tipo terminal, pero con líneas indicando el fallo (ej. `[ERROR] No se pudo enviar el mensaje`) y un botón para reintentar sin perder lo escrito en el formulario (los campos conservan sus valores).
- Actualización de `components/nav.tsx`: se agrega el link "Acerca de" tanto en los links de desktop como en el panel móvil, apuntando a `/acerca-de`, con su correspondiente estado activo en `isActive`.
- Estilos de `references/templates/home-about/styles.css` relacionados a About (clases `about-*`, `highlight*`, `contact-*`, `terminal-success`, `term-*`, `tip-*`) se portan/fusionan en `app/globals.css`, evitando duplicar reglas ya existentes (variables de color, `pixel`/`mono`, `btn`, `card`, `reveal`).
- Variables de entorno nuevas documentadas: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (se agregan a un `.env.example` si no existe ya uno en el repo, o se documentan en el README si existe).

**No incluido (fuera de alcance de este spec):**

- Protección anti-spam o anti-abuso en el endpoint de contacto (honeypot, rate limiting, captcha) — se deja para un spec futuro si se vuelve necesario.
- Plantilla HTML con estilo de marca para el correo recibido — el correo es texto plano simple.
- Persistencia de los mensajes de contacto en una base de datos o localStorage — el mensaje solo se envía por correo, no se guarda en ningún lado.
- Notificaciones de confirmación al usuario que escribió el mensaje (correo de "recibimos tu mensaje") — solo se notifica al equipo (`CONTACT_TO_EMAIL`).
- Cambios al modelo de datos de `lib/data.ts` o a `GAMES`.
- Tests automatizados (no hay test runner configurado en el repo).
- Internacionalización — todo el copy permanece en español.

## Modelo de datos

No se introduce modelo de datos persistente. El único "dato" nuevo es el payload transitorio del formulario de contacto:

```ts
type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};
```

Este payload viaja del cliente (`components/about.tsx`) al `POST /api/contacto` y de ahí a Resend; no se almacena en ningún lugar del sistema.

## Plan de implementación

1. Instalar la dependencia `resend` (`npm install resend`).
2. Crear `app/api/contacto/route.ts`: `POST` handler que parsea el body JSON, valida `name`/`email`/`msg` no vacíos y formato de `email`, devuelve `400` con mensaje de error si la validación falla, y si es válida llama a `Resend` (instanciado con `RESEND_API_KEY`) para enviar el correo de texto plano a `CONTACT_TO_EMAIL` desde `CONTACT_FROM_EMAIL`. Devuelve `200` en éxito o `500`/error descriptivo si Resend falla.
3. Crear `components/about.tsx` (`"use client"`) portando `About` y `HighlightIcon` desde `references/templates/home-about/about.jsx`, con el hook de scroll-reveal ya usado en `components/home.tsx`.
4. En `components/about.tsx`, reemplazar el `onSubmit` mock (que solo hacía `setSent`) por una llamada real a `fetch("/api/contacto", { method: "POST", ... })`, agregando el estado `sending` (deshabilita el botón) y el estado `error` (muestra el bloque terminal con líneas de error y botón de reintentar), preservando el comportamiento existente de `shake` para campos vacíos y de `sent` para éxito.
5. Crear `app/acerca-de/page.tsx` que renderiza `<About />`.
6. Actualizar `components/nav.tsx`: agregar "Acerca de" (→ `/acerca-de`) en los links de desktop y en el panel móvil, con su estado activo correspondiente.
7. Portar las clases CSS necesarias de `references/templates/home-about/styles.css` a `app/globals.css` (secciones `about-hero`, `highlight-row`, `about-divider`, `about-contact`, `contact-grid`, `contact-form`, `terminal-success`/`term-*`), evitando duplicar reglas ya portadas en specs anteriores.
8. Documentar `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` en un `.env.example` (crearlo si no existe) y asegurarse de que `.env.example` esté trackeado por git mientras cualquier `.env.local` real permanezca ignorado.
9. Probar manualmente con `npm run dev`: enviar el formulario con una API key real de Resend en modo de prueba (o una API key inválida para forzar el camino de error) y verificar ambos estados (éxito y error) en la UI.
10. Ejecutar `npm run lint` y `npm run build` para confirmar que `app/`, `components/` y `lib/` compilan sin errores nuevos.

## Criterios de aceptación

- [ ] `/acerca-de` renderiza el hero "Acerca de Arcade Vault" con los 3 highlights, el divider animado, y la sección de contacto, visualmente equivalente a `references/templates/home-about/arcade-vault-standalone.html`.
- [ ] Las secciones marcadas con `reveal` en el prototipo (`about-divider`, `about-contact`) aparecen con la animación de entrada al hacer scroll.
- [ ] Si se intenta enviar el formulario con nombre, email o mensaje vacío, se dispara el efecto `shake` y no se hace ninguna llamada de red.
- [ ] Si se envía el formulario con un email de formato inválido (ej. `"abc"`), el servidor responde con error y la UI lo muestra sin perder los datos escritos.
- [ ] Al enviar el formulario con datos válidos y Resend configurado correctamente, el usuario recibe el correo en `CONTACT_TO_EMAIL` con asunto `Nuevo mensaje de contacto — {nombre}` y el cuerpo contiene nombre, email y mensaje.
- [ ] Mientras la petición a `/api/contacto` está en curso, el botón de envío muestra estado "enviando" y está deshabilitado.
- [ ] Al completarse el envío con éxito, se muestra el bloque `terminal-success` con el mensaje de confirmación, igual que en el prototipo.
- [ ] Si la llamada a Resend falla (ej. API key inválida), se muestra un bloque de error con el mismo estilo terminal, y el formulario permite reintentar sin perder los datos escritos.
- [ ] El Nav muestra "Acerca de" como entrada separada en desktop y en el panel móvil, resaltada como activa en `/acerca-de`.
- [ ] `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` están documentadas en `.env.example`.
- [ ] `npm run build` completa sin errores en `app/`, `components/` y `lib/`.
- [ ] `npm run lint` no reporta errores nuevos fuera de los ya existentes en `references/templates/*.jsx`.

## Decisiones tomadas y descartadas

- **Envío real vía Route Handler de Next.js (`app/api/contacto/route.ts`), no Server Action** — un endpoint explícito es más directo de probar de forma aislada (curl/Postman) y separa claramente la responsabilidad de red del componente cliente.
- **Validación de formato de email en servidor** — el prototipo original solo validaba campos no vacíos; al conectar un envío real se agrega validación de formato básica en el backend para evitar enviar correos a direcciones claramente inválidas, sin añadir dependencias nuevas de validación (regex simple es suficiente para el MVP).
- **Estado de error reutiliza el estilo `terminal-success`** — mantiene consistencia visual con el estado de éxito ya diseñado en el prototipo, en vez de introducir un patrón de error genérico distinto al lenguaje visual del resto de la app.
- **Sin protección anti-spam en este spec** — es un MVP; se prioriza tener el flujo de contacto funcionando end-to-end antes de invertir en mitigaciones de abuso, que se pueden agregar después si se detecta necesidad real.
- **Correo en texto plano, sin plantilla HTML de marca** — reduce el alcance de este spec a la integración funcional con Resend; un rediseño del correo con la identidad visual de Arcade Vault puede hacerse en una iteración posterior sin afectar el contrato del endpoint.
- **Se agrega "Acerca de" al Nav en este spec** — a diferencia del spec 02 (que lo omitió porque About no existía todavía), ahora que la página se implementa tiene sentido exponerla en la navegación, siguiendo el prototipo `nav.jsx` que ya la incluye.
- **Variables de entorno para destinatario y remitente, no hardcodeadas** — permite cambiar las direcciones de correo sin tocar código ni redeploy del lado del código fuente, y evita exponer direcciones reales en el repo.

## Riesgos identificados

- **Dominio de remitente no verificado en Resend:** si `CONTACT_FROM_EMAIL` usa un dominio no verificado en la cuenta de Resend, el envío fallará en producción aunque funcione con el dominio de pruebas de Resend en desarrollo. Mitigación: documentar en `.env.example` que `CONTACT_FROM_EMAIL` debe usar un dominio verificado en el dashboard de Resend antes de desplegar a producción.
- **`RESEND_API_KEY` ausente o inválida en el entorno de despliegue:** el endpoint fallaría en tiempo de ejecución. Mitigación: el Route Handler debe devolver un error claro (no un crash sin manejar) si la variable de entorno no está configurada, y esto queda cubierto por el mismo estado de error de la UI.
