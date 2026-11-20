export type SkinId = "neon" | "retro" | "clasico";
export interface SkinPalette {
  id: SkinId;
  label: string;
  background: string;
  grid?: string;
  text: string;
  accent: string;
  entities: Record<string, string>;
}
export const DEFAULT_SKIN: SkinId = "clasico";
export const ASTEROIDS_SKINS: Record<SkinId, SkinPalette> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    background: "#000000",
    text: "#ffffff",
    accent: "#00ffff",
    entities: {
      ship: "#ffffff",
      bullet: "#ffffff",
      asteroid: "#ffffff",
      particle: "#00ffff",
    },
  },
  neon: {
    id: "neon",
    label: "Neón",
    background: "#05050a",
    text: "#f8ff4a",
    accent: "#33f7ff",
    entities: {
      ship: "#33f7ff",
      bullet: "#f8ff4a",
      asteroid: "#ff1a7d",
      particle: "#00e67a",
    },
  },
  retro: {
    id: "retro",
    label: "Retro",
    background: "#0d0d1a",
    text: "#fff0a8",
    accent: "#b9c6e8",
    entities: {
      ship: "#b9c6e8",
      bullet: "#fff0a8",
      asteroid: "#636890",
      particle: "#48b6ab",
    },
  },
};
export const SNAKE_SKINS: Record<SkinId, SkinPalette> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    background: "#000000",
    grid: "rgba(255,255,255,0.06)",
    text: "#ffffff",
    accent: "#69f0ae",
    entities: {
      head: "#69f0ae",
      body: "#2e7d32",
      fruitFallback: "#ff4081",
    },
  },
  neon: {
    id: "neon",
    label: "Neón",
    background: "#05050a",
    grid: "rgba(255,0,110,0.08)",
    text: "#00ff88",
    accent: "#ff006e",
    entities: {
      head: "#00ff88",
      body: "#00b35f",
      fruitFallback: "#ffb3d1",
    },
  },
  retro: {
    id: "retro",
    label: "Retro",
    background: "#0d1a0d",
    grid: "rgba(90,255,140,0.06)",
    text: "#8fd14f",
    accent: "#fce08a",
    entities: {
      head: "#8fd14f",
      body: "#5a9a35",
      fruitFallback: "#fce08a",
    },
  },
};
export const ARKANOID_SKINS: Record<SkinId, SkinPalette> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    background: "#000000",
    text: "#ffffff",
    accent: "#ffffff",
    entities: {},
  },
  neon: {
    id: "neon",
    label: "Neón",
    background: "#05050a",
    text: "#00f5ff",
    accent: "#00f5ff",
    entities: {},
  },
  retro: {
    id: "retro",
    label: "Retro",
    background: "#0d0d1a",
    text: "#ffcf3a",
    accent: "#ffcf3a",
    entities: {},
  },
};
export function loadSkinPreference(gameId: string): SkinId {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  try {
    const v = localStorage.getItem(`av_skin_${gameId}`);
    return v === "neon" || v === "retro" || v === "clasico" ? v : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}
export function saveSkinPreference(gameId: string, skin: SkinId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`av_skin_${gameId}`, skin);
  } catch {
    /* ignorar errores de storage */
  }
}
