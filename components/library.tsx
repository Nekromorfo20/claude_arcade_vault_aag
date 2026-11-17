"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GAMES, CATS } from "@/lib/data";
import { GameCard } from "@/components/game-card";
import { getGameStats } from "@/lib/scores";
const REAL_GAME_IDS = ["asteroides", "tetris"];
export function Library() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("TODOS");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [realStats, setRealStats] = useState<
    Record<string, { best: number; plays: number }>
  >({});
  useEffect(() => {
    REAL_GAME_IDS.forEach((id) => {
      getGameStats(id).then((stats) => {
        setRealStats((prev) => ({ ...prev, [id]: stats }));
      });
    });
  }, []);
  const filtered = useMemo(() => {
    return GAMES.filter(
      (g) =>
        (cat === "TODOS" || g.cat === cat) &&
        g.title.toLowerCase().includes(q.toLowerCase()),
    );
  }, [q, cat]);
  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>
      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {CATS.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="av-chips">
          <button
            className={"chip" + (view === "grid" ? " active" : "")}
            onClick={() => setView("grid")}
          >
            GRID
          </button>
          <button
            className={"chip" + (view === "table" ? " active" : "")}
            onClick={() => setView("table")}
          >
            TABLA
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            NO HAY RESULTADOS
          </div>
          <div>Intenta otra búsqueda o categoría.</div>
        </div>
      ) : view === "grid" ? (
        <div className="av-grid">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="hall-table">
          <div className="th">
            <div>TÍTULO</div>
            <div>CATEGORÍA</div>
            <div>MEJOR PUNTUACIÓN</div>
            <div>PARTIDAS JUGADAS</div>
          </div>
          {filtered.map((g) => {
            const stats = REAL_GAME_IDS.includes(g.id) ? realStats[g.id] : null;
            const best = stats ? stats.best : g.best;
            const plays = stats ? stats.plays.toLocaleString("es-ES") : g.plays;
            return (
              <div
                key={g.id}
                className="tr"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/juego/${g.id}`)}
              >
                <div className="pl">{g.title}</div>
                <div>{g.cat}</div>
                <div className="sc">{best.toLocaleString("es-ES")}</div>
                <div>{plays}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
