"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScoreRow } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import {
  getMyBestRank,
  getRealGames,
  getTopScores,
  type RealGame,
} from "@/lib/scores";
export function HallOfFame() {
  const router = useRouter();
  const [games, setGames] = useState<RealGame[] | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [youRow, setYouRow] = useState<ScoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getRealGames().then((g) => {
      setGames(g);
      setTab(g[0]?.id ?? null);
    });
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);
  useEffect(() => {
    if (!tab) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getTopScores(tab, 10),
      userId ? getMyBestRank(tab, userId) : Promise.resolve(null),
    ]).then(([top, mine]) => {
      setRows(top);
      const isInTop = mine ? top.some((r) => r.rank === mine.rank) : false;
      setYouRow(mine && !isInTop ? mine : null);
      setLoading(false);
    });
  }, [tab, userId]);
  if (!games || games.length === 0) {
    return (
      <div className="av-hall fade-in">
        <div className="hall-head">
          <h1>SALÓN DE LA FAMA</h1>
          <p className="pixel" style={{ fontSize: 10 }}>
            LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
          </p>
        </div>
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p className="mono" style={{ color: "var(--ink-dim)" }}>
            {games === null
              ? "CARGANDO..."
              : "SIN JUEGOS EN EL RANKING TODAVÍA"}
          </p>
        </div>
      </div>
    );
  }
  const game = games.find((g) => g.id === tab)!;
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <div className="hall-tabs">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p className="mono" style={{ color: "var(--ink-dim)" }}>
            CARGANDO RANKING...
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <p className="mono" style={{ color: "var(--ink-dim)" }}>
            SIN PUNTUACIONES TODAVÍA
          </p>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">
                  {rows[1].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            {rows[0] && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{
                    fontSize: 9,
                    color: "var(--gold)",
                    letterSpacing: "0.18em",
                  }}
                >
                  CAMPEÓN
                </div>
                <div
                  className="rank-num"
                  style={{ fontSize: 36, marginTop: 4 }}
                >
                  01
                </div>
                <div className="name">{rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {rows[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[0].date}</div>
              </div>
            )}
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">
                  {rows[2].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>
          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            {youRow && (
              <>
                <div className="tr you-label">
                  ▸ TU MEJOR MARCA EN {game.title}
                </div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    #{String(youRow.rank).padStart(2, "0")}
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {youRow.name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {youRow.score.toLocaleString("es-ES")}
                  </div>
                  <div className="dt">{youRow.date}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => router.push("/biblioteca")}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
