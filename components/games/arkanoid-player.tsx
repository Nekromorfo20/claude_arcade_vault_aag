"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { saveScore } from "@/lib/scores";
import { LEVELS } from "@/components/games/arkanoid-levels";
import {
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  drawFrame,
  drawSprite,
  loadSpritesheet,
} from "@/components/games/arkanoid-sprites";
// ── Constantes del motor ─────────────────────────────────────────────────────
const W = 800;
const H = 600;
const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const TOTAL_LEVELS = 5;
type GameState = "playing" | "paused" | "gameover" | "win";
interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}
interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  alive: boolean;
}
interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  elapsed: number;
}
function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
// ── Motor del juego ───────────────────────────────────────────────────────────
interface EngineCallbacks {
  onStatsChange: (score: number, lives: number, level: number) => void;
  onStateChange: (state: GameState) => void;
}
class ArkanoidEngine {
  ctx: CanvasRenderingContext2D;
  callbacks: EngineCallbacks;
  paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  blocks: Block[] = [];
  explosions: Explosion[] = [];
  lives = 3;
  score = 0;
  currentLevel = 1;
  state: GameState = "playing";
  keys: Record<string, boolean> = { ArrowLeft: false, ArrowRight: false };
  bounceSound: HTMLAudioElement | null = null;
  breakSound: HTMLAudioElement | null = null;
  rafId: number | null = null;
  lastTime: number | null = null;
  private lastReportedScore = -1;
  private lastReportedLives = -1;
  private lastReportedLevel = -1;
  private lastReportedState: GameState | null = null;
  constructor(ctx: CanvasRenderingContext2D, callbacks: EngineCallbacks) {
    this.ctx = ctx;
    this.callbacks = callbacks;
    if (typeof window !== "undefined") {
      this.bounceSound = new Audio("/arkanoid/sounds/ball-bounce.mp3");
      this.breakSound = new Audio("/arkanoid/sounds/break-sound.mp3");
    }
    this.initPaddle();
    this.loadLevel(1);
  }
  initPaddle() {
    this.paddle.x = (W - this.paddle.w) / 2;
  }
  playBounce() {
    if (!this.bounceSound) return;
    (this.bounceSound.cloneNode(true) as HTMLAudioElement)
      .play()
      .catch(() => {});
  }
  playBreak() {
    if (!this.breakSound) return;
    (this.breakSound.cloneNode(true) as HTMLAudioElement)
      .play()
      .catch(() => {});
  }
  loadLevel(n: number) {
    this.currentLevel = n;
    const level = LEVELS[n - 1];
    this.blocks = level.blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    this.explosions = [];
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * level.speed;
    this.ball.vy = BASE_BALL_VY * level.speed;
  }
  initGame() {
    this.lives = 3;
    this.score = 0;
    this.state = "playing";
    this.initPaddle();
    this.loadLevel(1);
    this.reportStats();
  }
  initBall() {
    const speed = LEVELS[this.currentLevel - 1].speed;
    this.ball.x = this.paddle.x + (this.paddle.w - this.ball.w) / 2;
    this.ball.y = this.paddle.y - this.ball.h;
    this.ball.vx = BASE_BALL_VX * speed;
    this.ball.vy = BASE_BALL_VY * speed;
  }
  reportStats() {
    const { score, lives, currentLevel, state } = this;
    if (
      score !== this.lastReportedScore ||
      lives !== this.lastReportedLives ||
      currentLevel !== this.lastReportedLevel
    ) {
      this.lastReportedScore = score;
      this.lastReportedLives = lives;
      this.lastReportedLevel = currentLevel;
      this.callbacks.onStatsChange(score, lives, currentLevel);
    }
    if (state !== this.lastReportedState) {
      this.lastReportedState = state;
      this.callbacks.onStateChange(state);
    }
  }
  update(dt: number) {
    if (this.state !== "playing") {
      this.reportStats();
      return;
    }
    const { paddle, ball } = this;
    if (this.keys.ArrowLeft)
      paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (this.keys.ArrowRight)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      this.playBounce();
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      this.playBounce();
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      this.playBounce();
    }
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      this.playBounce();
    }
    for (const block of this.blocks) {
      if (!block.alive) continue;
      if (collideAABB(ball, block)) {
        block.alive = false;
        this.explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        this.score += 10;
        ball.vy = -ball.vy;
        this.playBreak();
        if (this.blocks.every((b) => !b.alive)) {
          if (this.currentLevel < TOTAL_LEVELS) {
            this.loadLevel(this.currentLevel + 1);
          } else {
            this.state = "win";
          }
        }
        break;
      }
    }
    for (const exp of this.explosions) exp.elapsed += dt * 1000;
    this.explosions = this.explosions.filter(
      (exp) => exp.elapsed < EXPLOSION_DURATION,
    );
    if (ball.y > H) {
      this.lives--;
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "gameover";
      } else {
        this.initBall();
      }
    }
    this.reportStats();
  }
  draw() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    for (const block of this.blocks) {
      if (block.alive)
        drawSprite(
          ctx,
          "block_" + block.color,
          block.x,
          block.y,
          block.w,
          block.h,
        );
    }
    for (const exp of this.explosions) {
      const frameIndex = Math.min(
        Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
        3,
      );
      const frames = EXPLOSION_FRAMES[exp.color];
      drawFrame(ctx, frames[frameIndex], exp.x, exp.y, exp.w, exp.h);
    }
    drawSprite(
      ctx,
      "paddle",
      this.paddle.x,
      this.paddle.y,
      this.paddle.w,
      this.paddle.h,
    );
    drawSprite(ctx, "ball", this.ball.x, this.ball.y, this.ball.w, this.ball.h);
  }
  loop = (ts: number) => {
    const dt = this.lastTime === null ? 0 : (ts - this.lastTime) / 1000;
    this.lastTime = ts;
    if (this.state === "playing") this.update(dt);
    this.draw();
    if (this.state !== "paused") {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };
  start() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.loop);
  }
  stop() {
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
    if (this.state === "gameover" || this.state === "win") return;
    if (this.state === "playing") {
      this.state = "paused";
      this.stop();
    } else if (this.state === "paused") {
      this.state = "playing";
      this.resume();
    }
    this.reportStats();
  }
  jumpToLevel(n: number) {
    if (this.state !== "paused") return;
    this.loadLevel(n);
    this.reportStats();
  }
  handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft") this.keys.ArrowLeft = true;
    if (e.code === "ArrowRight") this.keys.ArrowRight = true;
    if (
      (e.code === "KeyP" || e.code === "Escape") &&
      this.state !== "gameover" &&
      this.state !== "win"
    ) {
      this.togglePause();
    }
  };
  handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft") this.keys.ArrowLeft = false;
    if (e.code === "ArrowRight") this.keys.ArrowRight = false;
  };
  handleMouseMove = (mouseX: number) => {
    if (this.state !== "playing") return;
    this.paddle.x = Math.max(
      0,
      Math.min(W - this.paddle.w, mouseX - this.paddle.w / 2),
    );
  };
}
export function ArkanoidPlayer({ game }: { game: Game }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ArkanoidEngine | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const engine = new ArkanoidEngine(ctx, {
      onStatsChange: (s, l, lvl) => {
        setScore(s);
        setLives(l);
        setLevel(lvl);
      },
      onStateChange: (state) => {
        setPaused(state === "paused");
        if (state === "gameover") setOver(true);
        if (state === "win") setWon(true);
      },
    });
    engineRef.current = engine;
    const handleKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e);
    const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e);
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      engine.handleMouseMove((e.clientX - rect.left) * scaleX);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    loadSpritesheet(() => engine.start());
    return () => {
      engine.stop();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      engineRef.current = null;
    };
  }, []);
  const togglePause = () => {
    engineRef.current?.togglePause();
  };
  const jumpToLevel = (n: number) => {
    engineRef.current?.jumpToLevel(n);
  };
  const endGame = () => setOver(true);
  const restart = () => {
    const engine = engineRef.current;
    if (engine) engine.initGame();
    setPaused(false);
    setOver(false);
    setWon(false);
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
  const finished = over || won;
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
            <div className="l">Vidas</div>
            <div className="v">{lives}</div>
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
        <div className="crt-screen">
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
                  SALTAR AL NIVEL
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 12,
                    justifyContent: "center",
                  }}
                >
                  {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        className={n === level ? "btn yellow" : "btn ghost"}
                        onClick={() => jumpToLevel(n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 14,
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
      {finished && (
        <div className="modal-bd">
          <div className="modal">
            <h2>{won ? "¡GANASTE!" : "FIN DEL JUEGO"}</h2>
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
