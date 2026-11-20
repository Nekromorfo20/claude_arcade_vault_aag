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
