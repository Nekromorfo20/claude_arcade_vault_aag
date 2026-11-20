"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { saveScore } from "@/lib/scores";
import {
  drawFruitSprite,
  isFruitSpritesheetLoaded,
  loadFruitSpritesheet,
  randomFruitName,
} from "@/components/games/snake-sprites";
import {
  DEFAULT_SKIN,
  loadSkinPreference,
  saveSkinPreference,
  SNAKE_SKINS,
  type SkinId,
  type SkinPalette,
} from "@/lib/skins";
import { TouchControls } from "@/components/games/touch-controls";
import { useIsTouchDevice } from "@/lib/use-is-touch-device";
// ── Constantes del motor ─────────────────────────────────────────────────────
const COLS = 24;
const ROWS = 24;
const CELL = 24;
const W = COLS * CELL;
const H = ROWS * CELL;
const BASE_TICK = 140;
const LEVEL_UP_EVERY = 5;
type GameState = "playing" | "paused" | "gameover";
interface Point {
  x: number;
  y: number;
}
type Direction = "up" | "down" | "left" | "right";
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
function randomEmptyCell(occupied: Point[]): Point {
  let cell: Point;
  do {
    cell = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
}
// ── Motor del juego ───────────────────────────────────────────────────────────
interface EngineCallbacks {
  onStatsChange: (score: number, length: number, level: number) => void;
  onStateChange: (state: GameState) => void;
}
class SnakeEngine {
  ctx: CanvasRenderingContext2D;
  callbacks: EngineCallbacks;
  snake: Point[] = [];
  direction: Direction = "right";
  nextDirection: Direction = "right";
  fruit: Point = { x: 0, y: 0 };
  fruitName: string = randomFruitName();
  score = 0;
  level = 1;
  fruitsEaten = 0;
  state: GameState = "playing";
  tickAccum = 0;
  tickInterval = BASE_TICK;
  lastTime: number | null = null;
  rafId: number | null = null;
  paused = false;
  palette: SkinPalette;
  private lastReportedScore = -1;
  private lastReportedLength = -1;
  private lastReportedLevel = -1;
  private lastReportedState: GameState | null = null;
  constructor(
    ctx: CanvasRenderingContext2D,
    callbacks: EngineCallbacks,
    palette: SkinPalette = SNAKE_SKINS[DEFAULT_SKIN],
  ) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.palette = palette;
    this.initGame();
  }
  setPalette(p: SkinPalette) {
    this.palette = p;
  }
  initGame() {
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    this.snake = [
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
      { x: startX - 3, y: startY },
    ];
    this.direction = "right";
    this.nextDirection = "right";
    this.score = 0;
    this.level = 1;
    this.fruitsEaten = 0;
    this.state = "playing";
    this.tickInterval = BASE_TICK;
    this.tickAccum = 0;
    this.fruit = randomEmptyCell(this.snake);
    this.fruitName = randomFruitName();
    this.reportStats();
  }
  reportStats() {
    const { score, state } = this;
    const length = this.snake.length;
    if (
      score !== this.lastReportedScore ||
      length !== this.lastReportedLength ||
      this.level !== this.lastReportedLevel
    ) {
      this.lastReportedScore = score;
      this.lastReportedLength = length;
      this.lastReportedLevel = this.level;
      this.callbacks.onStatsChange(score, length, this.level);
    }
    if (state !== this.lastReportedState) {
      this.lastReportedState = state;
      this.callbacks.onStateChange(state);
    }
  }
  advance() {
    this.direction = this.nextDirection;
    const head = this.snake[0];
    const next: Point = { x: head.x, y: head.y };
    if (this.direction === "up") next.y--;
    else if (this.direction === "down") next.y++;
    else if (this.direction === "left") next.x--;
    else next.x++;
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      this.state = "gameover";
      return;
    }
    const bodyWithoutTail = this.snake.slice(0, -1);
    if (bodyWithoutTail.some((p) => p.x === next.x && p.y === next.y)) {
      this.state = "gameover";
      return;
    }
    const ateFruit = next.x === this.fruit.x && next.y === this.fruit.y;
    this.snake.unshift(next);
    if (ateFruit) {
      this.score += 10;
      this.fruitsEaten++;
      if (this.fruitsEaten % LEVEL_UP_EVERY === 0) {
        this.level++;
        this.tickInterval = Math.max(60, BASE_TICK - (this.level - 1) * 12);
      }
      this.fruit = randomEmptyCell(this.snake);
      this.fruitName = randomFruitName();
    } else {
      this.snake.pop();
    }
  }
  update(dt: number) {
    if (this.state !== "playing") {
      this.reportStats();
      return;
    }
    this.tickAccum += dt;
    if (this.tickAccum >= this.tickInterval) {
      this.tickAccum = 0;
      this.advance();
    }
    this.reportStats();
  }
  drawGrid() {
    this.ctx.strokeStyle = this.palette.grid ?? "rgba(255,255,255,0.06)";
    this.ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * CELL, 0);
      this.ctx.lineTo(c * CELL, H);
      this.ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * CELL);
      this.ctx.lineTo(W, r * CELL);
      this.ctx.stroke();
    }
  }
  drawSnake() {
    const ctx = this.ctx;
    this.snake.forEach((segment, i) => {
      ctx.fillStyle =
        i === 0 ? this.palette.entities.head : this.palette.entities.body;
      ctx.fillRect(
        segment.x * CELL + 1,
        segment.y * CELL + 1,
        CELL - 2,
        CELL - 2,
      );
    });
  }
  drawFruit() {
    const ctx = this.ctx;
    if (isFruitSpritesheetLoaded()) {
      drawFruitSprite(
        ctx,
        this.fruitName,
        this.fruit.x * CELL,
        this.fruit.y * CELL,
        CELL,
        CELL,
      );
      return;
    }
    ctx.fillStyle = this.palette.entities.fruitFallback;
    ctx.fillRect(
      this.fruit.x * CELL + 3,
      this.fruit.y * CELL + 3,
      CELL - 6,
      CELL - 6,
    );
  }
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(0, 0, W, H);
    this.drawGrid();
    this.drawFruit();
    this.drawSnake();
  }
  loop = (ts: number) => {
    const dt = this.lastTime === null ? 0 : ts - this.lastTime;
    this.lastTime = ts;
    this.update(dt);
    this.draw();
    if (!this.paused && this.state !== "gameover") {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };
  start() {
    if (this.rafId !== null) return;
    this.paused = false;
    this.rafId = requestAnimationFrame(this.loop);
  }
  stop() {
    this.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  resume() {
    this.lastTime = null;
    this.tickAccum = 0;
    this.start();
  }
  restart() {
    this.initGame();
    this.start();
  }
  togglePause() {
    if (this.state === "gameover") return;
    if (this.state === "playing") {
      this.state = "paused";
      this.stop();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.resume();
    }
    this.reportStats();
  }
  handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyP") {
      this.togglePause();
      return;
    }
    if (this.state !== "playing") return;
    let wanted: Direction | null = null;
    switch (e.code) {
      case "ArrowUp":
      case "KeyW":
        wanted = "up";
        break;
      case "ArrowDown":
      case "KeyS":
        wanted = "down";
        break;
      case "ArrowLeft":
      case "KeyA":
        wanted = "left";
        break;
      case "ArrowRight":
      case "KeyD":
        wanted = "right";
        break;
    }
    if (wanted && wanted !== OPPOSITE[this.direction]) {
      this.nextDirection = wanted;
    }
  };
  handleKeyUp = () => {};
}
const DIRECTION_CODES: Record<Direction, string> = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
};
export function SnakePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const [score, setScore] = useState(0);
  const [length, setLength] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [skinId, setSkinId] = useState<SkinId>(() =>
    loadSkinPreference(game.id),
  );
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) setName(profile.username);
        });
    });
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const engine = new SnakeEngine(
      ctx,
      {
        onStatsChange: (s, l, lvl) => {
          setScore(s);
          setLength(l);
          setLevel(lvl);
        },
        onStateChange: (state) => {
          setPaused(state === "paused");
          if (state === "gameover") setOver(true);
        },
      },
      SNAKE_SKINS[loadSkinPreference(game.id)],
    );
    engineRef.current = engine;
    window.addEventListener("keydown", engine.handleKeyDown);
    window.addEventListener("keyup", engine.handleKeyUp);
    let cancelled = false;
    loadFruitSpritesheet(() => {
      if (!cancelled) engine.start();
    });
    return () => {
      cancelled = true;
      engine.stop();
      window.removeEventListener("keydown", engine.handleKeyDown);
      window.removeEventListener("keyup", engine.handleKeyUp);
      engineRef.current = null;
    };
  }, []);
  const togglePause = () => {
    engineRef.current?.togglePause();
  };
  const changeSkin = (id: SkinId) => {
    setSkinId(id);
    saveSkinPreference(game.id, id);
    engineRef.current?.setPalette(SNAKE_SKINS[id]);
  };
  const endGame = () => setOver(true);
  const restart = () => {
    const engine = engineRef.current;
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    engine?.restart();
  };
  const exit = () => {
    router.push(`/juego/${game.id}`);
  };
  const confirmSave = async () => {
    if (!userId) return;
    setSaving(true);
    await saveScore(game.id, userId, score);
    setSaving(false);
    setSaved(true);
  };
  const handleDirectionStart = (dir: Direction) => {
    engineRef.current?.handleKeyDown({
      code: DIRECTION_CODES[dir],
      preventDefault: () => {},
    } as KeyboardEvent);
  };
  const handleDirectionEnd = () => {
    engineRef.current?.handleKeyUp();
  };
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Longitud</div>
            <div className="v">{length}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {(Object.keys(SNAKE_SKINS) as SkinId[]).map((id) => (
            <button
              key={id}
              className="btn ghost"
              style={
                skinId === id
                  ? { borderColor: "var(--cyan)", color: "var(--cyan)" }
                  : undefined
              }
              onClick={() => changeSkin(id)}
            >
              {SNAKE_SKINS[id].label.toUpperCase()}
            </button>
          ))}
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={exit}>
            SALIR
          </button>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen" style={{ display: "flex", gap: 16 }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{
              width: "100%",
              height: "auto",
              aspectRatio: `${W} / ${H}`,
              display: "block",
            }}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      {isTouch && (
        <TouchControls
          onDirectionStart={handleDirectionStart}
          onDirectionEnd={handleDirectionEnd}
        />
      )}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {saved ? (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            ) : userId ? (
              <div className="input-row">
                <button
                  className="btn yellow"
                  disabled={saving}
                  onClick={confirmSave}
                >
                  {saving ? "GUARDANDO..." : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="input-row">
                <button
                  className="btn yellow"
                  onClick={() => router.push("/ingresar")}
                >
                  INICIAR SESIÓN PARA GUARDAR
                </button>
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/biblioteca")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
