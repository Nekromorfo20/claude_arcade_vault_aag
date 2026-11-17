export interface SpriteFrame {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}
// Fila pixel-art de fruits.png (y=136..295). Coordenadas tomadas de
// references/source-assets/snake-assets/sprites.js.
export const FRUIT_ATLAS: Record<string, SpriteFrame> = {
  banana: { sx: 34, sy: 136, sw: 110, sh: 160 },
  grape: { sx: 378, sy: 136, sw: 110, sh: 160 },
  apple: { sx: 2786, sy: 136, sw: 110, sh: 160 },
};
const FRUIT_NAMES = Object.keys(FRUIT_ATLAS);
type SpriteReadyCallback = () => void;
let ssImg: HTMLImageElement | null = null;
let ssLoaded = false;
const ssCallbacks: SpriteReadyCallback[] = [];
export function loadFruitSpritesheet(cb: SpriteReadyCallback) {
  if (typeof window === "undefined") return;
  if (ssLoaded) {
    cb();
    return;
  }
  ssCallbacks.push(cb);
  if (ssImg) return;
  const img = new Image();
  img.onload = () => {
    ssLoaded = true;
    ssCallbacks.forEach((f) => f());
  };
  img.onerror = () => console.error("Failed to load fruit spritesheet");
  img.src = "/serpiente/fruits.png";
  ssImg = img;
}
export function randomFruitName(): string {
  return FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
}
export function isFruitSpritesheetLoaded(): boolean {
  return ssLoaded;
}
export function drawFruitSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!ssLoaded || !ssImg) return;
  const frame = FRUIT_ATLAS[name];
  if (!frame) return;
  ctx.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
