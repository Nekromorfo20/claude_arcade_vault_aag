"use client";
type Direction = "up" | "down" | "left" | "right";
interface TouchActionButton {
  code: string;
  label: string;
}
interface TouchControlsProps {
  onDirectionStart: (dir: Direction) => void;
  onDirectionEnd: (dir: Direction) => void;
  onActionStart?: (code: string) => void;
  onActionEnd?: (code: string) => void;
  actionButtons?: TouchActionButton[];
  disabledDirections?: Direction[];
}
const DIRECTIONS: { dir: Direction; label: string; area: string }[] = [
  { dir: "up", label: "▲", area: "up" },
  { dir: "left", label: "◀", area: "left" },
  { dir: "right", label: "▶", area: "right" },
  { dir: "down", label: "▼", area: "down" },
];
export function TouchControls({
  onDirectionStart,
  onDirectionEnd,
  onActionStart,
  onActionEnd,
  actionButtons = [],
  disabledDirections = [],
}: TouchControlsProps) {
  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        {DIRECTIONS.map(({ dir, label, area }) => {
          const disabled = disabledDirections.includes(dir);
          return (
            <button
              key={dir}
              type="button"
              className="touch-dpad-btn"
              style={{ gridArea: area }}
              disabled={disabled}
              onPointerDown={(e) => {
                if (disabled) return;
                e.preventDefault();
                onDirectionStart(dir);
              }}
              onPointerUp={(e) => {
                if (disabled) return;
                e.preventDefault();
                onDirectionEnd(dir);
              }}
              onPointerCancel={(e) => {
                if (disabled) return;
                e.preventDefault();
                onDirectionEnd(dir);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {actionButtons.length > 0 && (
        <div className="touch-action-buttons">
          {actionButtons.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              className="touch-action-btn"
              onPointerDown={(e) => {
                e.preventDefault();
                onActionStart?.(code);
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onActionEnd?.(code);
              }}
              onPointerCancel={(e) => {
                e.preventDefault();
                onActionEnd?.(code);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
