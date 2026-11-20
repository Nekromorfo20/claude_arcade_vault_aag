"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { saveScore } from "@/lib/scores";
import { TouchControls } from "@/components/games/touch-controls";
import { useIsTouchDevice } from "@/lib/use-is-touch-device";
// ── Constantes del motor ─────────────────────────────────────────────────────
const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const W = COLS * BLOCK; // 300
const H = ROWS * BLOCK; // 600
const NEXT_SIZE = 120;
const NEXT_BLOCK = 30;
const COLORS = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];
const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
const LINE_SCORES = [0, 100, 300, 500, 800];
type GameState = "playing" | "paused" | "gameover";
interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}
function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}
function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 8) + 1;
  const shape = PIECES[type]!.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
function collide(
  board: number[][],
  shape: number[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length,
    cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
function drawBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha?: number,
) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color!;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}
// ── Motor del juego ───────────────────────────────────────────────────────────
interface EngineCallbacks {
  onStatsChange: (score: number, lines: number, level: number) => void;
  onStateChange: (state: GameState) => void;
}
class TetrisEngine {
  ctx: CanvasRenderingContext2D;
  nextCtx: CanvasRenderingContext2D;
  callbacks: EngineCallbacks;
  board: number[][] = createBoard();
  current: Piece = randomPiece();
  next: Piece = randomPiece();
  score = 0;
  lines = 0;
  level = 1;
  state: GameState = "playing";
  dropAccum = 0;
  dropInterval = 1000;
  lastTime: number | null = null;
  rafId: number | null = null;
  paused = false;
  private lastReportedScore = -1;
  private lastReportedLines = -1;
  private lastReportedLevel = -1;
  private lastReportedState: GameState | null = null;
  constructor(
    ctx: CanvasRenderingContext2D,
    nextCtx: CanvasRenderingContext2D,
    callbacks: EngineCallbacks,
  ) {
    this.ctx = ctx;
    this.nextCtx = nextCtx;
    this.callbacks = callbacks;
    this.initGame();
  }
  initGame() {
    this.board = createBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.state = "playing";
    this.dropInterval = 1000;
    this.dropAccum = 0;
    this.next = randomPiece();
    this.spawn();
    this.reportStats();
  }
  spawn() {
    this.current = this.next;
    this.next = randomPiece();
    if (
      collide(this.board, this.current.shape, this.current.x, this.current.y)
    ) {
      this.state = "gameover";
    }
  }
  tryRotate() {
    const rotated = rotateCW(this.current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (
        !collide(this.board, rotated, this.current.x + kick, this.current.y)
      ) {
        this.current.shape = rotated;
        this.current.x += kick;
        return;
      }
    }
  }
  merge() {
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          this.board[this.current.y + r][this.current.x + c] =
            this.current.shape[r][c];
  }
  clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((v) => v !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      this.lines += cleared;
      this.score += (LINE_SCORES[cleared] || 0) * this.level;
      this.level = Math.floor(this.lines / 10) + 1;
      this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 90);
    }
  }
  ghostY(): number {
    let gy = this.current.y;
    while (!collide(this.board, this.current.shape, this.current.x, gy + 1))
      gy++;
    return gy;
  }
  hardDrop() {
    const gy = this.ghostY();
    this.score += (gy - this.current.y) * 2;
    this.current.y = gy;
    this.lockPiece();
  }
  softDrop() {
    if (
      !collide(
        this.board,
        this.current.shape,
        this.current.x,
        this.current.y + 1,
      )
    ) {
      this.current.y++;
      this.score += 1;
    } else {
      this.lockPiece();
    }
  }
  lockPiece() {
    this.merge();
    this.clearLines();
    this.spawn();
  }
  reportStats() {
    const { score, lines, level, state } = this;
    if (
      score !== this.lastReportedScore ||
      lines !== this.lastReportedLines ||
      level !== this.lastReportedLevel
    ) {
      this.lastReportedScore = score;
      this.lastReportedLines = lines;
      this.lastReportedLevel = level;
      this.callbacks.onStatsChange(score, lines, level);
    }
    if (state !== this.lastReportedState) {
      this.lastReportedState = state;
      this.callbacks.onStateChange(state);
    }
  }
  update(dt: number) {
    if (this.state === "gameover") {
      this.reportStats();
      return;
    }
    this.dropAccum += dt;
    if (this.dropAccum >= this.dropInterval) {
      this.dropAccum = 0;
      if (
        !collide(
          this.board,
          this.current.shape,
          this.current.x,
          this.current.y + 1,
        )
      ) {
        this.current.y++;
      } else {
        this.lockPiece();
      }
    }
    this.reportStats();
  }
  drawGrid() {
    this.ctx.strokeStyle = "rgba(255,255,255,0.08)";
    this.ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      this.ctx.beginPath();
      this.ctx.moveTo(c * BLOCK, 0);
      this.ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      this.ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, r * BLOCK);
      this.ctx.lineTo(COLS * BLOCK, r * BLOCK);
      this.ctx.stroke();
    }
  }
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    this.drawGrid();
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        drawBlock(ctx, c, r, this.board[r][c], BLOCK);
    const gy = this.ghostY();
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        if (this.current.shape[r][c])
          drawBlock(
            ctx,
            this.current.x + c,
            gy + r,
            this.current.shape[r][c],
            BLOCK,
            0.2,
          );
    for (let r = 0; r < this.current.shape.length; r++)
      for (let c = 0; c < this.current.shape[r].length; c++)
        drawBlock(
          ctx,
          this.current.x + c,
          this.current.y + r,
          this.current.shape[r][c],
          BLOCK,
        );
    this.drawNext();
  }
  drawNext() {
    const nextCtx = this.nextCtx;
    nextCtx.fillStyle = "#000";
    nextCtx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
    const shape = this.next.shape;
    const offX = Math.floor((4 - shape[0].length) / 2);
    const offY = Math.floor((4 - shape.length) / 2);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
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
    if (e.code === "Space") e.preventDefault();
    if (e.code === "KeyP") {
      this.togglePause();
      return;
    }
    if (this.state !== "playing") return;
    switch (e.code) {
      case "ArrowLeft":
        if (
          !collide(
            this.board,
            this.current.shape,
            this.current.x - 1,
            this.current.y,
          )
        )
          this.current.x--;
        break;
      case "ArrowRight":
        if (
          !collide(
            this.board,
            this.current.shape,
            this.current.x + 1,
            this.current.y,
          )
        )
          this.current.x++;
        break;
      case "ArrowDown":
        this.softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        this.tryRotate();
        break;
      case "Space":
        this.hardDrop();
        break;
    }
    this.reportStats();
  };
  handleKeyUp = () => {};
}
export function TetrisPlayer({ game }: { game: Game }) {
  const router = useRouter();
  const isTouch = useIsTouchDevice();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TetrisEngine | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState("INVITADO");
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
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
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx = canvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");
    if (!ctx || !nextCtx) return;
    const engine = new TetrisEngine(ctx, nextCtx, {
      onStatsChange: (s, l, lvl) => {
        setScore(s);
        setLines(l);
        setLevel(lvl);
      },
      onStateChange: (state) => {
        setPaused(state === "paused");
        if (state === "gameover") setOver(true);
      },
    });
    engineRef.current = engine;
    window.addEventListener("keydown", engine.handleKeyDown);
    window.addEventListener("keyup", engine.handleKeyUp);
    engine.start();
    return () => {
      engine.stop();
      window.removeEventListener("keydown", engine.handleKeyDown);
      window.removeEventListener("keyup", engine.handleKeyUp);
      engineRef.current = null;
    };
  }, []);
  const togglePause = () => {
    engineRef.current?.togglePause();
  };
  const endGame = () => setOver(true);
  const restart = () => {
    const engine = engineRef.current;
    if (engine) engine.initGame();
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaving(false);
    engine?.start();
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
  const handleDirectionStart = (dir: "up" | "down" | "left" | "right") => {
    const codes: Record<typeof dir, string> = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    };
    engineRef.current?.handleKeyDown({
      code: codes[dir],
      preventDefault: () => {},
    } as KeyboardEvent);
  };
  const handleDirectionEnd = () => {
    engineRef.current?.handleKeyUp();
  };
  const handleActionStart = (code: string) => {
    engineRef.current?.handleKeyDown({
      code,
      preventDefault: () => {},
    } as KeyboardEvent);
  };
  const handleActionEnd = () => {
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
            <div className="l">Líneas</div>
            <div className="v">{lines}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
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
          <canvas
            ref={nextCanvasRef}
            width={NEXT_SIZE}
            height={NEXT_SIZE}
            style={{
              width: 120,
              height: 120,
              display: "block",
              flexShrink: 0,
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
          onActionStart={handleActionStart}
          onActionEnd={handleActionEnd}
          disabledDirections={["up"]}
          actionButtons={[
            { code: "ArrowUp", label: "⟲" },
            { code: "Space", label: "⇓" },
          ]}
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
