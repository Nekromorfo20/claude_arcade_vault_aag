"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function Auth() {
  const router = useRouter();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (tab === "in") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      setLoading(false);
      if (signInError) {
        setError("Email o contraseña incorrectos.");
        return;
      }
      router.push("/biblioteca");
      return;
    }
    const username = user.toUpperCase().slice(0, 10);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: data.user.id, username });
      if (profileError) {
        setLoading(false);
        setError("No se pudo crear el perfil: " + profileError.message);
        return;
      }
    }
    setLoading(false);
    router.push("/biblioteca");
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>
        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div
              className="mono"
              style={{ color: "var(--magenta)", fontSize: 12, marginTop: 8 }}
            >
              {error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={loading}
            style={{ width: "100%", marginTop: 8 }}
          >
            {loading
              ? "PROCESANDO..."
              : tab === "in"
                ? "ENTRAR AL VAULT"
                : "CREAR Y JUGAR"}
          </button>
        </form>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
