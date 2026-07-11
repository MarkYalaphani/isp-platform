// ─── Tactics Board — types, presets, localStorage persistence ─────────────────

export type TokenKind = 'player' | 'cone' | 'disc' | 'pole' | 'mannequin' | 'miniGoal' | 'ball' | 'bench';

export interface TBToken {
  id: string;
  kind: TokenKind;
  x: number;        // 0-100 %
  y: number;        // 0-100 %
  color: string;
  label: string;     // shirt number / short text
  rotation: number;  // degrees — used by pole / miniGoal / bench
}

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowShape = 'straight' | 'curved' | 'squiggly';

export interface TBArrow {
  id: string;
  shape: ArrowShape;
  lineStyle: LineStyle;
  color: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  bend: number;       // curve offset, only used when shape === 'curved'
  head: boolean;
  label: string;
}

export interface TBShape {
  id: string;
  kind: 'rect' | 'circle';
  x: number; y: number; w: number; h: number; // bounding box in % (w/h can be negative during drag, normalize on read)
  color: string;
  opacity: number; // 0-1 fill opacity
}

export interface TBText {
  id: string;
  kind: 'label' | 'note';
  x: number; y: number;
  tailX: number; tailY: number; // note only
  text: string;
  color: string;
  fontSize: number;
  bold: boolean;
}

export interface TBFrame {
  id: string;
  tokens: TBToken[];
  arrows: TBArrow[];
  shapes: TBShape[];
  texts: TBText[];
}

export interface TacticsSession {
  id: string;
  name: string;
  folder: string;
  objective: string;
  level: string;
  duration: string;
  frames: TBFrame[];
  orientation: 'vertical' | 'horizontal';
  updatedAt: string;
}

export function newFrame(): TBFrame {
  return { id: crypto.randomUUID(), tokens: [], arrows: [], shapes: [], texts: [] };
}

export function newSession(name = 'Untitled Session'): TacticsSession {
  return {
    id: crypto.randomUUID(), name, folder: '', objective: '', level: '', duration: '',
    frames: [newFrame()], orientation: 'horizontal', updatedAt: new Date().toISOString(),
  };
}

export function cloneFrame(f: TBFrame): TBFrame {
  return {
    id: crypto.randomUUID(),
    tokens: f.tokens.map(t => ({ ...t, id: crypto.randomUUID() })),
    arrows: f.arrows.map(a => ({ ...a, id: crypto.randomUUID(), from: { ...a.from }, to: { ...a.to } })),
    shapes: f.shapes.map(s => ({ ...s, id: crypto.randomUUID() })),
    texts: f.texts.map(t => ({ ...t, id: crypto.randomUUID() })),
  };
}

// ─── Presets ────────────────────────────────────────────────────────────────
export const TEAM_A_COLOR = '#ef4444';
export const TEAM_B_COLOR = '#3b82f6';
export const GK_COLOR     = '#eab308';
export const NEUTRAL_COLOR = '#f8fafc';

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#f8fafc', '#111827', '#22c55e', '#f97316', '#a855f7'];
export const DRAW_COLORS   = ['#111827', '#eab308', '#ef4444', '#3b82f6', '#f8fafc', '#22c55e'];

export const EQUIPMENT: { kind: TokenKind; label: string; icon: string; color: string }[] = [
  { kind: 'cone',     label: 'กรวย',        icon: 'bi-triangle-fill',   color: '#f97316' },
  { kind: 'disc',     label: 'จานรอง',      icon: 'bi-circle-fill',     color: '#f59e0b' },
  { kind: 'pole',     label: 'เสาสไลด์',    icon: 'bi-minus',           color: '#facc15' },
  { kind: 'mannequin',label: 'หุ่นตั้ง',     icon: 'bi-person-fill',     color: '#dc2626' },
  { kind: 'miniGoal', label: 'ประตูเล็ก',   icon: 'bi-square',          color: '#e2e8f0' },
  { kind: 'ball',     label: 'ลูกบอล',      icon: 'bi-circle',          color: '#ffffff' },
  { kind: 'bench',    label: 'ม้านั่ง',      icon: 'bi-hr',              color: '#94a3b8' },
];

export interface FormationPos { x: number; y: number; role: 'GK' | 'DEF' | 'MID' | 'FWD'; }
export interface Formation { id: string; name: string; positions: FormationPos[]; }

export const FORMATIONS: Formation[] = [
  { id: '4-4-2', name: '4-4-2', positions: [
    { x:50,y:93,role:'GK' },
    { x:14,y:74,role:'DEF' },{ x:37,y:78,role:'DEF' },{ x:63,y:78,role:'DEF' },{ x:86,y:74,role:'DEF' },
    { x:14,y:50,role:'MID' },{ x:38,y:52,role:'MID' },{ x:62,y:52,role:'MID' },{ x:86,y:50,role:'MID' },
    { x:38,y:20,role:'FWD' },{ x:62,y:20,role:'FWD' },
  ]},
  { id: '4-3-3', name: '4-3-3', positions: [
    { x:50,y:93,role:'GK' },
    { x:14,y:74,role:'DEF' },{ x:37,y:78,role:'DEF' },{ x:63,y:78,role:'DEF' },{ x:86,y:74,role:'DEF' },
    { x:28,y:52,role:'MID' },{ x:50,y:48,role:'MID' },{ x:72,y:52,role:'MID' },
    { x:18,y:20,role:'FWD' },{ x:50,y:14,role:'FWD' },{ x:82,y:20,role:'FWD' },
  ]},
  { id: '4-2-3-1', name: '4-2-3-1', positions: [
    { x:50,y:93,role:'GK' },
    { x:14,y:74,role:'DEF' },{ x:37,y:78,role:'DEF' },{ x:63,y:78,role:'DEF' },{ x:86,y:74,role:'DEF' },
    { x:37,y:62,role:'MID' },{ x:63,y:62,role:'MID' },
    { x:20,y:38,role:'MID' },{ x:50,y:35,role:'MID' },{ x:80,y:38,role:'MID' },
    { x:50,y:14,role:'FWD' },
  ]},
  { id: '3-5-2', name: '3-5-2', positions: [
    { x:50,y:93,role:'GK' },
    { x:26,y:76,role:'DEF' },{ x:50,y:79,role:'DEF' },{ x:74,y:76,role:'DEF' },
    { x:12,y:55,role:'MID' },{ x:33,y:50,role:'MID' },{ x:50,y:46,role:'MID' },{ x:67,y:50,role:'MID' },{ x:88,y:55,role:'MID' },
    { x:38,y:18,role:'FWD' },{ x:62,y:18,role:'FWD' },
  ]},
  { id: '3-4-3', name: '3-4-3', positions: [
    { x:50,y:93,role:'GK' },
    { x:26,y:76,role:'DEF' },{ x:50,y:79,role:'DEF' },{ x:74,y:76,role:'DEF' },
    { x:14,y:54,role:'MID' },{ x:38,y:50,role:'MID' },{ x:62,y:50,role:'MID' },{ x:86,y:54,role:'MID' },
    { x:18,y:20,role:'FWD' },{ x:50,y:14,role:'FWD' },{ x:82,y:20,role:'FWD' },
  ]},
];

// ─── localStorage persistence ──────────────────────────────────────────────
const KEY = 'tb_sessions_v1';

export function loadAllSessions(): TacticsSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as TacticsSession[] : [];
  } catch { return []; }
}

function persist(list: TacticsSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

export function upsertSession(session: TacticsSession) {
  const list = loadAllSessions();
  const idx = list.findIndex(s => s.id === session.id);
  const toSave = { ...session, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = toSave; else list.unshift(toSave);
  persist(list);
}

export function deleteSession(id: string) {
  persist(loadAllSessions().filter(s => s.id !== id));
}

export function renameSession(id: string, name: string) {
  const list = loadAllSessions();
  const idx = list.findIndex(s => s.id === id);
  if (idx >= 0) { list[idx].name = name; persist(list); }
}
