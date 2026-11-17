"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export interface AvUser {
  name: string;
}
export async function signOutAvUser() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
function useAvSession() {
  const [user, setUser] = useState<AvUser | null>(null);
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();
      if (active) setUser(data ? { name: data.username } : null);
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) loadProfile(data.user.id);
      else if (active) setUser(null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) loadProfile(session.user.id);
        else setUser(null);
      },
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  return user;
}
export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = useAvSession();
  const isActive = (
    name: "home" | "biblioteca" | "salon" | "acerca-de" | "auth",
  ) => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca")
      return pathname === "/biblioteca" || pathname.startsWith("/juego");
    if (name === "salon") return pathname === "/salon";
    if (name === "acerca-de") return pathname === "/acerca-de";
    return pathname === "/ingresar";
  };
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const handleSignOut = () => {
    signOutAvUser();
  };
  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => go("/")}>
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </div>
        <div className="links">
          <Link href="/" className={isActive("home") ? "active" : ""}>
            Inicio
          </Link>
          <Link
            href="/biblioteca"
            className={isActive("biblioteca") ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link
            href="/acerca-de"
            className={isActive("acerca-de") ? "active" : ""}
          >
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/ingresar" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={() => setOpen(false)}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <a className={isActive("home") ? "active" : ""} onClick={() => go("/")}>
          Inicio
        </a>
        <a
          className={isActive("biblioteca") ? "active" : ""}
          onClick={() => go("/biblioteca")}
        >
          Biblioteca
        </a>
        <a
          className={isActive("salon") ? "active" : ""}
          onClick={() => go("/salon")}
        >
          Salón de la Fama
        </a>
        <a
          className={isActive("acerca-de") ? "active" : ""}
          onClick={() => go("/acerca-de")}
        >
          Acerca de
        </a>
        <a
          className={isActive("auth") ? "active" : ""}
          onClick={() => go("/ingresar")}
        >
          {user ? "Cuenta" : "Iniciar Sesión"}
        </a>
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
