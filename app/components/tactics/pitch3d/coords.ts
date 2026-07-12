// ─── Pitch coordinate system ────────────────────────────────────────────────
// The data model (lib/tactics.ts) stores everything as 0-100% (x, y), where
// x = left-right across the pitch, y = goal-to-goal (0 = top goal, 100 = bottom goal).
// We map that onto a fixed 3D world frame — orientation never rotates this
// frame, only the camera moves, so every raycast/hit-test stays identical
// regardless of which way the board is being viewed.

export const PITCH_WIDTH = 68;   // world units, left-right (x)
export const PITCH_LENGTH = 105; // world units, goal-to-goal (z)
export const GROUND_Y = 0;

export function pctToWorld(x: number, y: number): [number, number, number] {
  const wx = (x / 100 - 0.5) * PITCH_WIDTH;
  const wz = (y / 100 - 0.5) * PITCH_LENGTH;
  return [wx, GROUND_Y, wz];
}

export function worldToPct(wx: number, wz: number): { x: number; y: number } {
  const x = (wx / PITCH_WIDTH + 0.5) * 100;
  const y = (wz / PITCH_LENGTH + 0.5) * 100;
  return { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
