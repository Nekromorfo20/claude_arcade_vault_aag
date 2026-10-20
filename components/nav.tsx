"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export interface AvUser {
  name: string;
}

const AV_USER_EVENT = "av_user_change";

export function readAvUser(): AvUser | null {
  try {
    return JSON.parse(localStorage.getItem("av_user") || "null");
  } catch {
    return null;
  }
}

export function setAvUser(user: AvUser | null) {
  if (user) {
    localStorage.setItem("av_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("av_user");
  }
  window.dispatchEvent(new Event(AV_USER_EVENT));
}

export function signOutAvUser() {
  setAvUser(null);
}

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AvUser | null>(() => readAvUser());

  useEffect(() => {
    const onChange = () => setUser(readAvUser());
    window.addEventListener(AV_USER_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AV_USER_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const isActive = (name: "home" | "biblioteca" | "salon" | "acerca-de" | "auth") => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca") return pathname === "/biblioteca" || pathname.startsWith("/juego");
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
    setUser(null);
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
          <Link href="/biblioteca" className={isActive("biblioteca") ? "active" : ""}>
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/acerca-de" className={isActive("acerca-de") ? "active" : ""}>
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
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <a className={isActive("home") ? "active" : ""} onClick={() => go("/")}>
          Inicio
        </a>
        <a className={isActive("biblioteca") ? "active" : ""} onClick={() => go("/biblioteca")}>
          Biblioteca
        </a>
        <a className={isActive("salon") ? "active" : ""} onClick={() => go("/salon")}>
          Salón de la Fama
        </a>
        <a className={isActive("acerca-de") ? "active" : ""} onClick={() => go("/acerca-de")}>
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
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
