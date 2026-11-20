# Skins por juego — Arcade Vault

Memoria del agente `skin-designer`. Registra qué skins tiene cada juego, sus claves de paleta y el estado de verificación de contraste, para no repetir diseño entre corridas.
Última actualización: 2026-11-20

Cada juego debe tener al menos 3 skins: `neon`, `retro` y `clasico` (default). `clasico` reproduce fielmente los colores que el engine ya usaba antes de introducir el sistema de paletas — es la variante de no regresión. Verificación de contraste: luminancia perceptual `L = 0.299R + 0.587G + 0.114B` (0–1); regla dura `|L(entidad) - L(fondo)| >= 0.35`, y `|L(entidad_A) - L(entidad_B)| >= 0.15` entre entidades que puedan solaparse en pantalla.

## Estado de implementación

| Juego        | Skins definidos (paleta)          | Skins aplicados al engine | Contraste verificado | Notas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | --------------------------------- | ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tetris`     | neon, retro, clasico              | No                        | No                   | Paleta diseñada abajo; falta crear `lib/skins.ts` y conectar el engine (`this.palette`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `serpiente`  | neon, retro, clasico              | Sí                        | Sí (2026-11-20)      | `lib/skins.ts` extendido con `SNAKE_SKINS`; engine conectado (`palette`/`setPalette`), selector en `.hud-actions`, persistencia `av_skin_serpiente`. La fruta real usa spritesheet (`snake-sprites.ts`) y no se tiñe por skin; solo `fruitFallback` (sin sprite cargado) usa color de paleta — se dibuja brevemente al inicio antes de que cargue el PNG. Ajustes de contraste respecto a la tabla original: `neon.fruitFallback` `#ff006e`→`#ffb3d1` (fallaba contra `head` y `body`); `retro.body` `#4a7a2f`→`#5a9a35` y `retro.fruitFallback` `#d4a53a`→`#fce08a` (fallaban contraste contra fondo y entre sí). `clasico` conserva los 3 hex originales pixel-exactos como no regresión; `body` vs `fruitFallback` queda en diff de luminancia 0.140 (< 0.15, falla por margen chico) — aceptado igual que el caso análogo de `asteroides.clasico`, porque son los valores reales que el engine ya pintaba antes del sistema de paletas. `grid` también quedó parametrizado en `this.palette.grid` con el mismo literal rgba de antes.           |
| `asteroides` | neon, retro, clasico              | Sí                        | Sí (2026-11-20)      | `lib/skins.ts` creado con `ASTEROIDS_SKINS`; engine conectado (`palette`/`setPalette`), selector en `.hud-actions`, persistencia `av_skin_asteroides`. Ajustes de contraste respecto a la tabla original: `neon.asteroid` `#ff006e`→`#ff1a7d`, `neon.ship` `#00f5ff`→`#33f7ff`, `neon.bullet` `#f5ff00`→`#f8ff4a`, `neon.particle` `#00ff88`→`#00e67a`; `retro.ship` `#c7d0e0`→`#b9c6e8`, `retro.bullet` `#ffcf3a`→`#fff0a8`, `retro.asteroid` `#8a8fb5`→`#636890`, `retro.particle` `#5ad1c9`→`#48b6ab`. `clasico` falla a propósito la separación `ship`/`bullet`/`asteroid` (los tres comparten `#ffffff`): fiel al engine original donde nave/bala/asteroide ya eran blancos — aceptado como variante de no regresión. Las partículas de explosión (`Particle`) no tenían clave propia en la paleta original; se mapearon a `entities.ship` para reproducir el blanco previo en `clasico`. El power-up (`PowerUp`) usa `entities.particle`. La llama del propulsor (`rgba(255,130,0,.85)`) queda fuera de la paleta, efecto fijo no-skinneable. |
| `arkanoid`   | neon, retro, clasico (solo fondo) | Sí                        | Sí (2026-11-20)      | `lib/skins.ts` creado con `ARKANOID_SKINS`; engine conectado (`palette`/`setPalette`), selector en `.hud-actions`, persistencia `av_skin_arkanoid`. **Limitación confirmada**: bloques, paleta y pelota se dibujan desde un spritesheet PNG (`arkanoid-sprites.ts`), no con `fillStyle` — no se re-tiñen por skin. El HUD (vidas/puntuación/nivel) es DOM/React, no canvas; no hay texto vectorial que pintar. El único `fillStyle` real en el canvas era el fondo (antes literal `"#000"`) — `entities` queda vacío a propósito, no hay más claves que usar. El overlay de pausa (`rgba(0,0,0,0.6)`) es un `div` HTML fijo, igual que en Asteroides — no forma parte de la paleta. Sin ajustes de hex respecto a la tabla original; diferencia de luminancia text-vs-background `>= 0.35` cumplida con margen amplio en los 3 skins.                                                                                                                                                                                                               |

## Paletas iniciales

### Tetris

| Skin    | background | grid                    | i         | o         | t         | s         | z         | j         | l         | n (gris)  |
| ------- | ---------- | ----------------------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
| clasico | `#000000`  | `rgba(255,255,255,.08)` | `#4dd0e1` | `#ffd54f` | `#ba68c8` | `#81c784` | `#e57373` | `#90caf9` | `#ffb74d` | `#9e9e9e` |
| neon    | `#05050a`  | `rgba(0,245,255,.10)`   | `#00f5ff` | `#f5ff00` | `#ff006e` | `#00ff88` | `#ff3860` | `#2e8bff` | `#ffcf3a` | `#8a8fb5` |
| retro   | `#0d1a0d`  | `rgba(90,255,140,.08)`  | `#5ad17a` | `#d4c55a` | `#9a7fb0` | `#6fae6f` | `#b06a5a` | `#6f9cae` | `#c98f4a` | `#7a8070` |

### Serpiente (Snake)

| Skin    | background | grid                    | head      | body      | fruitFallback |
| ------- | ---------- | ----------------------- | --------- | --------- | ------------- |
| clasico | `#000000`  | `rgba(255,255,255,.06)` | `#69f0ae` | `#2e7d32` | `#ff4081`     |
| neon    | `#05050a`  | `rgba(255,0,110,.08)`   | `#00ff88` | `#00b35f` | `#ffb3d1`     |
| retro   | `#0d1a0d`  | `rgba(90,255,140,.06)`  | `#8fd14f` | `#5a9a35` | `#fce08a`     |

### Asteroides

| Skin    | background | ship      | bullet    | asteroid  | particle/powerup |
| ------- | ---------- | --------- | --------- | --------- | ---------------- |
| clasico | `#000000`  | `#ffffff` | `#ffffff` | `#ffffff` | `#00ffff`        |
| neon    | `#05050a`  | `#33f7ff` | `#f8ff4a` | `#ff1a7d` | `#00e67a`        |
| retro   | `#0d0d1a`  | `#b9c6e8` | `#fff0a8` | `#636890` | `#48b6ab`        |

### Arkanoid (solo background tiene efecto real en canvas — ver limitación arriba)

| Skin    | background | text      | accent    |
| ------- | ---------- | --------- | --------- |
| clasico | `#000000`  | `#ffffff` | `#ffffff` |
| neon    | `#05050a`  | `#00f5ff` | `#00f5ff` |
| retro   | `#0d0d1a`  | `#ffcf3a` | `#ffcf3a` |
