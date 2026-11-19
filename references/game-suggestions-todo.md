# Sugerencias de juegos — Arcade Vault

Memoria del agente `game-planner`. Registra qué juegos se evaluaron, con qué veredicto y en qué fecha, para no repetir propuestas entre sesiones.
Última actualización: 2026-11-19

| Juego | Origen | Estado | Puntaje | Ronda | Notas |
| ----- | ------ | ------ | ------- | ----- | ----- |
| Asteroides | `references/started-games/02-asteroids` | portado | — | 2026-11-19 | SPEC 05. Real como `asteroides`; convive con el mock `rocas`. |
| Tetris | `references/started-games/03-tetris` | portado | — | 2026-11-19 | SPEC 07. Real como `tetris`; convive con el mock `caida`. |
| Arkanoid | `references/started-games/04-arkanoid` | portado | — | 2026-11-19 | SPEC 08. Real como `arkanoid`; convive con el mock `bloque-buster`. |
| Serpiente | `references/source-assets/snake-assets` | portado | — | 2026-11-19 | SPEC 09. Real como `serpiente`; convive con el mock `serpentina`. |
| Pong | mock de catálogo: `duelo-pixel` | recomendado | 13/15 | 2026-11-19 | Candidato #1 de la ronda 2026-11-19. Llena VERSUS, la única categoría en 0 juegos reales. Reutiliza `cover-duelo`, color cyan, cero assets. Id nuevo sugerido: `pong`; el mock `duelo-pixel` se conserva. `onStatsChange(score, rival, rally)` — el marcador de la CPU va en `a`, a validar en el spec. Riesgo principal: el Pong canónico tiene tope fijo (11); hay que reformular el score como acumulativo por rally para que el leaderboard tenga rango. |
| Invasores del Espacio | mock de catálogo: `invasores` | sugerido | 12/15 | 2026-11-19 | Candidato #2. Encaje de motor y score impecables, `cover-invaders` libre, cero assets si se dibuja con primitivas. Lo frena el balance: sería el 2º SHOOTER mientras VERSUS sigue vacío, y solapa parcialmente con Asteroides. Fuerte opción para la ronda siguiente. |
| Glotón (tipo Pac-Man) | mock de catálogo: `gloton` | sugerido | 8/15 | 2026-11-19 | Candidato #3. Score natural y `cover-glot` libre, pero es el porting más caro de los mocks: IA de 4 fantasmas, diseño de laberinto y modo power-pellet. ARCADE ya tiene 2 reales. |
| Ranaria (tipo Frogger) | mock de catálogo: `ranaria` | sugerido | 8/15 | 2026-11-19 | Candidato #4. Barato en assets (todo primitivas) y `cover-rana` libre, pero el score por travesía es escalonado y de rango corto → leaderboard chato con muchos empates. ARCADE ya saturado. |
| Versus con red / multijugador online | conocimiento propio | descartado | — | 2026-11-19 | No pasa el Filtro A. El contrato de motor es canvas local con RAF y el esquema `games`/`scores` no modela partidas entre dos usuarios. Un VERSUS en Arcade Vault tiene que ser jugador vs CPU local. |
| Puzzles sin puntaje (tipo Sokoban) | conocimiento propio | descartado | — | 2026-11-19 | No pasa el Filtro B. Sin `score` numérico natural y creciente rompen el leaderboard `scores`: son de completar/no completar. Se descartan salvo que se invente una métrica artificial. |
