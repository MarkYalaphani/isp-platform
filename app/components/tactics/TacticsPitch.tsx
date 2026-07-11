'use client';

import { useRef, useState, useCallback } from 'react';
import { TBFrame, TBToken, TBArrow, TBShape, TBText, TokenKind, LineStyle, ArrowShape } from '@/lib/tactics';

export type DrawTool =
  | 'select'
  | `arrow-${ArrowShape}` | 'rect' | 'circle' | 'text' | 'note';

export type Selection = { kind: 'token' | 'arrow' | 'shape' | 'text'; id: string } | null;

interface DragPayload { kind: TokenKind; color: string; label: string; }

interface Props {
  frame: TBFrame;
  orientation: 'vertical' | 'horizontal';
  tool: DrawTool;
  activeColor: string;
  activeLineStyle: LineStyle;
  arrowHead: boolean;
  locked: boolean;
  selected: Selection;
  onSelect: (s: Selection) => void;
  onChange: (updater: (f: TBFrame) => TBFrame) => void;
  transparency: number; // 0-1, applied to selected shape
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const dash = (s: LineStyle) => s === 'dashed' ? '5 4' : s === 'dotted' ? '1.5 4' : undefined;

function squigglyPath(x1: number, y1: number, x2: number, y2: number): string {
  const segs = 10;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // perpendicular unit vector
  const amp = 1.6;
  let d = `M ${x1} ${y1}`;
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    const px = x1 + dx * t, py = y1 + dy * t;
    const off = (i % 2 === 0 ? 1 : -1) * (i === segs ? 0 : amp);
    d += ` L ${px + nx * off} ${py + ny * off}`;
  }
  return d;
}

function curvedPath(x1: number, y1: number, x2: number, y2: number, bend: number): { d: string; cx: number; cy: number } {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const cx = mx + nx * bend, cy = my + ny * bend;
  return { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, cx, cy };
}

function TokenGlyph({ token }: { token: TBToken }) {
  const { kind, color, label } = token;
  if (kind === 'player') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: color,
        border: '2px solid rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.72rem', fontWeight: 800, color: color === '#f8fafc' || color === '#eab308' ? '#111827' : '#fff',
        boxShadow: '0 2px 5px rgba(0,0,0,0.35)', userSelect: 'none',
      }}>{label}</div>
    );
  }
  if (kind === 'cone') return <i className="bi bi-triangle-fill" style={{ color, fontSize: '1.15rem', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))' }} />;
  if (kind === 'disc') return <div style={{ width: 18, height: 8, borderRadius: '50%', background: color, boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />;
  if (kind === 'pole') return <div style={{ width: 5, height: 30, borderRadius: 3, background: color, boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />;
  if (kind === 'mannequin') return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
      <i className="bi bi-person-fill" style={{ color: '#fff', fontSize: '0.95rem' }} />
    </div>
  );
  if (kind === 'miniGoal') return (
    <div style={{ width: 34, height: 16, border: '3px solid #f1f5f9', borderBottom: 'none', borderRadius: '3px 3px 0 0', boxShadow: '0 2px 3px rgba(0,0,0,0.35)' }} />
  );
  if (kind === 'bench') return <div style={{ width: 34, height: 9, borderRadius: 3, background: color, boxShadow: '0 2px 3px rgba(0,0,0,0.4)' }} />;
  return <span style={{ fontSize: '1.15rem' }}>⚽</span>;
}

export default function TacticsPitch({
  frame, orientation, tool, activeColor, activeLineStyle, arrowHead, locked,
  selected, onSelect, onChange, transparency,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  const dragRef = useRef<{ mode: 'token' | 'arrowEnd' | 'arrowStart' | 'arrowBend' | 'shapeMove' | 'shapeResize' | 'textMove' | 'noteTail'; id: string; offX?: number; offY?: number } | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);

  const toPct = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100), y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100) };
  }, []);

  // ── Drop a token from the side panel ─────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (locked) return;
    const raw = e.dataTransfer.getData('application/tb-token');
    if (!raw) return;
    const payload = JSON.parse(raw) as DragPayload;
    const { x, y } = toPct(e.clientX, e.clientY);
    const token: TBToken = { id: crypto.randomUUID(), kind: payload.kind, x, y, color: payload.color, label: payload.label, rotation: 0 };
    onChange(f => ({ ...f, tokens: [...f.tokens, token] }));
    onSelect({ kind: 'token', id: token.id });
  };

  // ── Pointer-based free dragging of existing tokens / handles ────────────
  const onPointerMoveCanvas = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) {
      if (draft) {
        const { x, y } = toPct(e.clientX, e.clientY);
        setDraft(d => d ? { ...d, to: { x, y } } : d);
      }
      return;
    }
    const { x, y } = toPct(e.clientX, e.clientY);
    if (drag.mode === 'token') {
      onChange(f => ({ ...f, tokens: f.tokens.map(t => t.id === drag.id ? { ...t, x, y } : t) }));
    } else if (drag.mode === 'arrowStart' || drag.mode === 'arrowEnd') {
      onChange(f => ({ ...f, arrows: f.arrows.map(a => a.id === drag.id
        ? { ...a, [drag.mode === 'arrowStart' ? 'from' : 'to']: { x, y } } : a) }));
    } else if (drag.mode === 'arrowBend') {
      onChange(f => ({ ...f, arrows: f.arrows.map(a => {
        if (a.id !== drag.id) return a;
        const dx = a.to.x - a.from.x, dy = a.to.y - a.from.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const mx = (a.from.x + a.to.x) / 2, my = (a.from.y + a.to.y) / 2;
        const bend = (x - mx) * nx + (y - my) * ny;
        return { ...a, bend };
      }) }));
    } else if (drag.mode === 'shapeMove') {
      onChange(f => ({ ...f, shapes: f.shapes.map(s => s.id === drag.id
        ? { ...s, x: x - (drag.offX ?? 0), y: y - (drag.offY ?? 0) } : s) }));
    } else if (drag.mode === 'shapeResize') {
      onChange(f => ({ ...f, shapes: f.shapes.map(s => s.id === drag.id ? { ...s, w: x - s.x, h: y - s.y } : s) }));
    } else if (drag.mode === 'textMove') {
      onChange(f => ({ ...f, texts: f.texts.map(t => t.id === drag.id ? { ...t, x, y } : t) }));
    } else if (drag.mode === 'noteTail') {
      onChange(f => ({ ...f, texts: f.texts.map(t => t.id === drag.id ? { ...t, tailX: x, tailY: y } : t) }));
    }
  };

  const endDrag = () => { dragRef.current = null; };

  const startTokenDrag = (e: React.PointerEvent, id: string) => {
    if (locked) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { mode: 'token', id };
    onSelect({ kind: 'token', id });
  };

  // ── Draw arrows / shapes ─────────────────────────────────────────────────
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    if ((e.target as Element).closest('[data-tb-item]')) return; // clicked an existing object — handled by its own handler
    const p = toPct(e.clientX, e.clientY);

    if (tool.startsWith('arrow-') || tool === 'rect' || tool === 'circle') {
      svgRef.current?.setPointerCapture(e.pointerId);
      setDraft({ from: p, to: p });
      return;
    }
    if (tool === 'text' || tool === 'note') {
      const text: TBText = {
        id: crypto.randomUUID(), kind: tool === 'note' ? 'note' : 'label',
        x: p.x, y: p.y, tailX: p.x + 8, tailY: p.y + 8,
        text: '', color: activeColor, fontSize: 13, bold: false,
      };
      onChange(f => ({ ...f, texts: [...f.texts, text] }));
      onSelect({ kind: 'text', id: text.id });
      setEditingText(text.id);
      return;
    }
    onSelect(null);
  };

  const onCanvasPointerUp = (e: React.PointerEvent) => {
    if (!draft) return;
    const p = toPct(e.clientX, e.clientY);
    const from = draft.from, to = p;
    if (Math.hypot(to.x - from.x, to.y - from.y) < 1.2) { setDraft(null); return; }

    if (tool.startsWith('arrow-')) {
      const shape = tool.replace('arrow-', '') as ArrowShape;
      const arrow: TBArrow = { id: crypto.randomUUID(), shape, lineStyle: activeLineStyle, color: activeColor, from, to, bend: 8, head: arrowHead, label: '' };
      onChange(f => ({ ...f, arrows: [...f.arrows, arrow] }));
      onSelect({ kind: 'arrow', id: arrow.id });
    } else if (tool === 'rect' || tool === 'circle') {
      const shape: TBShape = { id: crypto.randomUUID(), kind: tool, x: from.x, y: from.y, w: to.x - from.x, h: to.y - from.y, color: activeColor, opacity: 0.35 };
      onChange(f => ({ ...f, shapes: [...f.shapes, shape] }));
      onSelect({ kind: 'shape', id: shape.id });
    }
    setDraft(null);
  };

  const deleteSelected = useCallback(() => {
    if (!selected) return;
    onChange(f => ({
      ...f,
      tokens: selected.kind === 'token' ? f.tokens.filter(t => t.id !== selected.id) : f.tokens,
      arrows: selected.kind === 'arrow' ? f.arrows.filter(a => a.id !== selected.id) : f.arrows,
      shapes: selected.kind === 'shape' ? f.shapes.filter(s => s.id !== selected.id) : f.shapes,
      texts: selected.kind === 'text' ? f.texts.filter(t => t.id !== selected.id) : f.texts,
    }));
    onSelect(null);
  }, [selected, onChange, onSelect]);

  // expose delete via keyboard
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected && editingText === null) deleteSelected();
  };

  const arrowGeometry = (a: TBArrow) => {
    if (a.shape === 'squiggly') return { d: squigglyPath(a.from.x, a.from.y, a.to.x, a.to.y) };
    if (a.shape === 'curved') return curvedPath(a.from.x, a.from.y, a.to.x, a.to.y, a.bend);
    return { d: `M ${a.from.x} ${a.from.y} L ${a.to.x} ${a.to.y}` };
  };

  return (
    <div
      className="pitch-3d"
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{
        position: 'relative', width: '100%',
        aspectRatio: orientation === 'vertical' ? '0.68' : '1.54',
        borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
        background: 'repeating-linear-gradient(' + (orientation === 'vertical' ? '180deg' : '90deg') + ', #2f9e44 0 8%, #37b24d 8% 16%)',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* pitch line markings + interactive layer, both in 0-100 percent space */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none' }}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMoveCanvas}
        onPointerUp={e => { onCanvasPointerUp(e); endDrag(); }}
      >
        <g stroke="rgba(255,255,255,0.85)" strokeWidth="0.4" fill="none" vectorEffect="non-scaling-stroke">
          <rect x="3" y="3" width="94" height="94" />
          <line x1="3" y1="50" x2="97" y2="50" />
          <circle cx="50" cy="50" r="9" />
          <rect x="30" y="3" width="40" height="16" /><rect x="30" y="81" width="40" height="16" />
          <rect x="40" y="3" width="20" height="6" /><rect x="40" y="91" width="20" height="6" />
        </g>

        {/* shapes */}
        {frame.shapes.map(s => {
          const nx = Math.min(s.x, s.x + s.w), ny = Math.min(s.y, s.y + s.h);
          const nw = Math.abs(s.w), nh = Math.abs(s.h);
          const isSel = selected?.kind === 'shape' && selected.id === s.id;
          const op = isSel ? transparency : s.opacity;
          return (
            <g key={s.id} data-tb-item
              onPointerDown={e => { e.stopPropagation(); if (locked) return; svgRef.current?.setPointerCapture(e.pointerId); const p = toPct(e.clientX, e.clientY); dragRef.current = { mode: 'shapeMove', id: s.id, offX: p.x - s.x, offY: p.y - s.y }; onSelect({ kind: 'shape', id: s.id }); }}
              style={{ cursor: locked ? 'default' : 'move' }}
            >
              {s.kind === 'rect'
                ? <rect x={nx} y={ny} width={nw} height={nh} fill={s.color} fillOpacity={op} stroke={isSel ? '#38bdf8' : s.color} strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
                : <ellipse cx={nx + nw / 2} cy={ny + nh / 2} rx={nw / 2} ry={nh / 2} fill={s.color} fillOpacity={op} stroke={isSel ? '#38bdf8' : s.color} strokeWidth="0.35" vectorEffect="non-scaling-stroke" />}
              {isSel && !locked && (
                <circle cx={s.x + s.w} cy={s.y + s.h} r="1.6" fill="#38bdf8" stroke="#fff" strokeWidth="0.3"
                  onPointerDown={e => { e.stopPropagation(); svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'shapeResize', id: s.id }; }} />
              )}
            </g>
          );
        })}

        {/* arrows */}
        {frame.arrows.map(a => {
          const geo = arrowGeometry(a);
          const isSel = selected?.kind === 'arrow' && selected.id === a.id;
          return (
            <g key={a.id} data-tb-item>
              <defs>
                <marker id={`head-${a.id}`} markerWidth="6" markerHeight="6" refX="4.5" refY="2.5" orient="auto">
                  <path d="M0,0 L5,2.5 L0,5 Z" fill={a.color} />
                </marker>
              </defs>
              <path d={geo.d} stroke={a.color} strokeWidth={isSel ? 0.9 : 0.6} strokeDasharray={dash(a.lineStyle)}
                markerEnd={a.head ? `url(#head-${a.id})` : undefined}
                onPointerDown={e => { e.stopPropagation(); onSelect({ kind: 'arrow', id: a.id }); }}
                style={{ cursor: locked ? 'default' : 'pointer' }} fill="none" />
              {isSel && !locked && (
                <>
                  <circle cx={a.from.x} cy={a.from.y} r="1.4" fill="#fff" stroke="#38bdf8" strokeWidth="0.4"
                    onPointerDown={e => { e.stopPropagation(); svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'arrowStart', id: a.id }; }} />
                  <circle cx={a.to.x} cy={a.to.y} r="1.4" fill="#fff" stroke="#38bdf8" strokeWidth="0.4"
                    onPointerDown={e => { e.stopPropagation(); svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'arrowEnd', id: a.id }; }} />
                  {a.shape === 'curved' && 'cx' in geo && (
                    <circle cx={geo.cx} cy={geo.cy} r="1.2" fill="#38bdf8" stroke="#fff" strokeWidth="0.3"
                      onPointerDown={e => { e.stopPropagation(); svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'arrowBend', id: a.id }; }} />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* live draft preview while drawing */}
        {draft && (tool.startsWith('arrow-')
          ? <path d={tool === 'arrow-squiggly' ? squigglyPath(draft.from.x, draft.from.y, draft.to.x, draft.to.y) : tool === 'arrow-curved' ? curvedPath(draft.from.x, draft.from.y, draft.to.x, draft.to.y, 8).d : `M ${draft.from.x} ${draft.from.y} L ${draft.to.x} ${draft.to.y}`}
              stroke={activeColor} strokeWidth="0.6" strokeDasharray={dash(activeLineStyle)} fill="none" opacity={0.75} />
          : (tool === 'rect'
            ? <rect x={Math.min(draft.from.x, draft.to.x)} y={Math.min(draft.from.y, draft.to.y)} width={Math.abs(draft.to.x - draft.from.x)} height={Math.abs(draft.to.y - draft.from.y)} fill={activeColor} fillOpacity={0.3} stroke={activeColor} strokeWidth="0.35" />
            : <ellipse cx={(draft.from.x + draft.to.x) / 2} cy={(draft.from.y + draft.to.y) / 2} rx={Math.abs(draft.to.x - draft.from.x) / 2} ry={Math.abs(draft.to.y - draft.from.y) / 2} fill={activeColor} fillOpacity={0.3} stroke={activeColor} strokeWidth="0.35" />
          ))
        }
        {/* note connector lines */}
        {frame.texts.filter(t => t.kind === 'note').map(t => (
          <line key={`tail-${t.id}`} x1={t.x} y1={t.y} x2={t.tailX} y2={t.tailY} stroke="rgba(20,20,20,0.75)" strokeWidth="0.35"
            data-tb-item
            onPointerDown={e => { e.stopPropagation(); if (locked) return; svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'noteTail', id: t.id }; onSelect({ kind: 'text', id: t.id }); }} />
        ))}
      </svg>

      {/* tokens (plain DOM for crisp icons/photos) */}
      {frame.tokens.map(t => {
        const isSel = selected?.kind === 'token' && selected.id === t.id;
        return (
          <div key={t.id} data-tb-item
            onPointerDown={e => startTokenDrag(e, t.id)}
            style={{
              position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)',
              cursor: locked ? 'default' : 'grab', touchAction: 'none',
              outline: isSel ? '2px solid #38bdf8' : 'none', outlineOffset: 3, borderRadius: '50%',
            }}
          >
            <TokenGlyph token={t} />
          </div>
        );
      })}

      {/* text / note labels */}
      {frame.texts.map(t => {
        const isSel = selected?.kind === 'text' && selected.id === t.id;
        const isEditing = editingText === t.id;
        return (
          <div key={t.id} data-tb-item
            style={{ position: 'absolute', left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%,-50%)', zIndex: 5 }}
            onPointerDown={e => { if (isEditing) return; e.stopPropagation(); if (locked) return; svgRef.current?.setPointerCapture(e.pointerId); dragRef.current = { mode: 'textMove', id: t.id }; onSelect({ kind: 'text', id: t.id }); }}
            onDoubleClick={() => setEditingText(t.id)}
          >
            <div style={{
              padding: t.kind === 'note' ? '8px 12px' : '2px 6px', borderRadius: t.kind === 'note' ? 16 : 4,
              background: t.kind === 'note' ? 'rgba(226,232,240,0.96)' : 'transparent',
              border: isSel ? '1.5px solid #38bdf8' : t.kind === 'note' ? '1px solid rgba(0,0,0,0.15)' : 'none',
              color: t.kind === 'note' ? '#111827' : t.color, fontWeight: t.bold ? 800 : 600, fontSize: t.fontSize,
              boxShadow: t.kind === 'note' ? '0 4px 14px rgba(0,0,0,0.25)' : 'none', maxWidth: 220, textAlign: 'center',
              cursor: locked ? 'default' : 'move', whiteSpace: 'pre-wrap',
            }}>
              {isEditing ? (
                <textarea
                  autoFocus rows={2}
                  value={t.text}
                  onChange={e => onChange(f => ({ ...f, texts: f.texts.map(x => x.id === t.id ? { ...x, text: e.target.value } : x) }))}
                  onBlur={() => {
                    setEditingText(null);
                    if (!t.text.trim()) onChange(f => ({ ...f, texts: f.texts.filter(x => x.id !== t.id) }));
                  }}
                  style={{ background: 'transparent', border: 'none', outline: 'none', resize: 'none', font: 'inherit', color: 'inherit', width: 140, textAlign: 'center' }}
                />
              ) : (t.text || 'ข้อความ')}
            </div>
          </div>
        );
      })}
    </div>
  );
}
