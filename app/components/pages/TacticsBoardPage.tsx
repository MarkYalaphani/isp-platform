'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TacticsSession, TBFrame, TBToken, TBArrow, TBShape, TBText, TokenKind, LineStyle,
  newSession, newFrame, cloneFrame, upsertSession,
  PLAYER_COLORS, DRAW_COLORS, EQUIPMENT, FORMATIONS, GK_COLOR,
} from '@/lib/tactics';
import type { DrawTool, Selection, TacticsPitch3DHandle } from '../tactics/TacticsPitch3D';
import TacticsLibraryModal from '../tactics/TacticsLibraryModal';
import { showToast } from '@/lib/toast';

const TacticsPitch3D = dynamic(() => import('../tactics/TacticsPitch3D'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%', aspectRatio: '1.54', borderRadius: 14,
      background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#94a3b8', fontWeight: 700, fontSize: '0.85rem',
    }}>
      กำลังโหลดกระดาน 3D...
    </div>
  ),
});

// ─── small building blocks ──────────────────────────────────────────────────
function ToolbarBtn({ icon, label, onClick, active, disabled }: { icon: string; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} className={`tb-toolbtn${active ? ' active' : ''}`}>
      <i className={`bi ${icon}`} />
      <span>{label}</span>
    </button>
  );
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="tb-accordion">
      <button className="tb-accordion-hd" onClick={onToggle}>
        <span>{title}</span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} />
      </button>
      {open && <div className="tb-accordion-body">{children}</div>}
    </div>
  );
}

function NotesModal({ session, onClose, onSave }: { session: TacticsSession; onClose: () => void; onSave: (s: Partial<TacticsSession>) => void }) {
  const [objective, setObjective] = useState(session.objective);
  const [level, setLevel] = useState(session.level);
  const [duration, setDuration] = useState(session.duration);
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        <h5 style={{ fontWeight: 800, marginBottom: 20 }}><i className="bi bi-clipboard2-pulse me-2" />รายละเอียดเซสชัน</h5>
        <div className="mb-3">
          <label className="form-label">วัตถุประสงค์ / คำอธิบาย</label>
          <textarea className="form-control" rows={4} value={objective} onChange={e => setObjective(e.target.value)} placeholder="เป้าหมายของแบบฝึกนี้..." />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="mb-3" style={{ flex: 1 }}>
            <label className="form-label">ระดับ</label>
            <input className="form-control" value={level} onChange={e => setLevel(e.target.value)} placeholder="เช่น U13-U15" />
          </div>
          <div className="mb-3" style={{ flex: 1 }}>
            <label className="form-label">ระยะเวลา</label>
            <input className="form-control" value={duration} onChange={e => setDuration(e.target.value)} placeholder="เช่น 20 นาที" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn-primary" onClick={() => { onSave({ objective, level, duration }); onClose(); }}><i className="bi bi-check-lg me-1" />บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ onClose, onImage, onPdf }: { onClose: () => void; onImage: () => void; onPdf: () => void }) {
  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 380 }}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>
        <h5 style={{ fontWeight: 800, marginBottom: 18 }}><i className="bi bi-share me-2" />ส่งออกเซสชัน</h5>
        <button className="btn-outline w-100 mb-3" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => { onImage(); onClose(); }}>
          <i className="bi bi-image" style={{ fontSize: '1.1rem' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>บันทึกเป็นรูปภาพ (PNG)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>เฟรมปัจจุบันเท่านั้น</div>
          </div>
        </button>
        <button className="btn-outline w-100" style={{ justifyContent: 'flex-start', gap: 10 }} onClick={() => { onPdf(); onClose(); }}>
          <i className="bi bi-file-pdf" style={{ fontSize: '1.1rem' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700 }}>บันทึกเป็น PDF</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ทุกเฟรม พร้อมรายละเอียดเซสชัน</div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─── main page ──────────────────────────────────────────────────────────────
export default function TacticsBoardPage() {
  const [session, setSession] = useState<TacticsSession>(() => newSession());
  const [frameIdx, setFrameIdx] = useState(0);
  const [tool, setTool] = useState<DrawTool>('select');
  const [activeColor, setActiveColor] = useState<string>(DRAW_COLORS[0]);
  const [activeLineStyle, setActiveLineStyle] = useState<LineStyle>('solid');
  const [arrowHead, setArrowHead] = useState(true);
  const [selected, setSelected] = useState<Selection>(null);
  const [locked, setLocked] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [transparency, setTransparency] = useState(0.35);
  const [playerColor, setPlayerColor] = useState(PLAYER_COLORS[0]);
  const [gkColor] = useState(GK_COLOR);
  const [playerNum, setPlayerNum] = useState(1);
  const [showLibrary, setShowLibrary] = useState<'open' | 'saveAs' | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ players: true, equipment: false, tools: true, viewer: false, formations: false });

  const historyRef = useRef<TBFrame[][]>([]);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<TacticsPitch3DHandle>(null);
  const [printSnapshots, setPrintSnapshots] = useState<string[] | null>(null);
  const [capturing, setCapturing] = useState(false);

  const currentFrame = session.frames[frameIdx] ?? session.frames[0];

  const updateFrame = useCallback((updater: (f: TBFrame) => TBFrame) => {
    setSession(s => {
      historyRef.current.push(s.frames);
      if (historyRef.current.length > 40) historyRef.current.shift();
      return { ...s, frames: s.frames.map((f, i) => i === frameIdx ? updater(f) : f) };
    });
  }, [frameIdx]);

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setSession(s => ({ ...s, frames: prev }));
    setSelected(null);
  };

  // ── frame navigation / playback ──────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrameIdx(i => (i + 1) % session.frames.length);
    }, 1300);
    return () => clearInterval(t);
  }, [playing, session.frames.length]);

  const addFrame = (duplicate: boolean) => {
    const f = duplicate ? cloneFrame(currentFrame) : newFrame();
    setSession(s => {
      const frames = [...s.frames];
      frames.splice(frameIdx + 1, 0, f);
      return { ...s, frames };
    });
    setFrameIdx(i => i + 1);
    setSelected(null);
  };

  const deleteFrame = () => {
    if (session.frames.length <= 1) return;
    setSession(s => ({ ...s, frames: s.frames.filter((_, i) => i !== frameIdx) }));
    setFrameIdx(i => Math.max(0, i - 1));
    setSelected(null);
  };

  // ── selected item helpers (duplicate / delete for bottom toolbar) ───────
  const findSelected = (): TBToken | TBArrow | TBShape | TBText | null => {
    if (!selected) return null;
    if (selected.kind === 'token') return currentFrame.tokens.find(t => t.id === selected.id) ?? null;
    if (selected.kind === 'arrow') return currentFrame.arrows.find(a => a.id === selected.id) ?? null;
    if (selected.kind === 'shape') return currentFrame.shapes.find(s => s.id === selected.id) ?? null;
    return currentFrame.texts.find(t => t.id === selected.id) ?? null;
  };

  const deleteSelected = () => {
    if (!selected) return;
    updateFrame(f => ({
      ...f,
      tokens: selected.kind === 'token' ? f.tokens.filter(t => t.id !== selected.id) : f.tokens,
      arrows: selected.kind === 'arrow' ? f.arrows.filter(a => a.id !== selected.id) : f.arrows,
      shapes: selected.kind === 'shape' ? f.shapes.filter(s => s.id !== selected.id) : f.shapes,
      texts: selected.kind === 'text' ? f.texts.filter(t => t.id !== selected.id) : f.texts,
    }));
    setSelected(null);
  };

  const duplicateSelected = () => {
    const item = findSelected();
    if (!item || !selected) return;
    const id = crypto.randomUUID();
    if (selected.kind === 'token') {
      const t = item as TBToken;
      updateFrame(f => ({ ...f, tokens: [...f.tokens, { ...t, id, x: t.x + 4, y: t.y + 4 }] }));
    } else if (selected.kind === 'arrow') {
      const a = item as TBArrow;
      updateFrame(f => ({ ...f, arrows: [...f.arrows, { ...a, id, from: { x: a.from.x + 4, y: a.from.y + 4 }, to: { x: a.to.x + 4, y: a.to.y + 4 } }] }));
    } else if (selected.kind === 'shape') {
      const s = item as TBShape;
      updateFrame(f => ({ ...f, shapes: [...f.shapes, { ...s, id, x: s.x + 4, y: s.y + 4 }] }));
    } else {
      const t = item as TBText;
      updateFrame(f => ({ ...f, texts: [...f.texts, { ...t, id, x: t.x + 4, y: t.y + 4, tailX: t.tailX + 4, tailY: t.tailY + 4 }] }));
    }
    setSelected({ kind: selected.kind, id });
  };

  // ── file operations ──────────────────────────────────────────────────────
  const handleNew = () => {
    if (!confirm('เริ่มเซสชันใหม่? งานที่ยังไม่บันทึกจะหายไป')) return;
    setSession(newSession());
    setFrameIdx(0); setSelected(null); historyRef.current = [];
  };

  const handleSave = () => {
    upsertSession(session);
    showToast('บันทึกเซสชันสำเร็จ', 'success');
  };

  const handleSaveAs = (name: string, folder: string) => {
    const copy: TacticsSession = { ...session, id: crypto.randomUUID(), name, folder };
    setSession(copy);
    upsertSession(copy);
    setShowLibrary(null);
    showToast(`บันทึกเป็น "${name}" สำเร็จ`, 'success');
  };

  const handleOpen = (s: TacticsSession) => {
    setSession(s); setFrameIdx(0); setSelected(null); historyRef.current = [];
    setShowLibrary(null);
  };

  const applyFormation = (formationId: string) => {
    const formation = FORMATIONS.find(f => f.id === formationId);
    if (!formation) return;
    if (currentFrame.tokens.length > 0 && !confirm('แทนที่ผู้เล่นทั้งหมดในเฟรมนี้ด้วยฟอร์เมชันนี้?')) return;
    let num = 1;
    const tokens: TBToken[] = formation.positions.map(p => ({
      id: crypto.randomUUID(), kind: 'player', x: p.x, y: p.y,
      color: p.role === 'GK' ? gkColor : playerColor, label: String(num++), rotation: 0,
    }));
    updateFrame(f => ({ ...f, tokens }));
    setOpen(o => ({ ...o, formations: false, players: true }));
  };

  // ── export ────────────────────────────────────────────────────────────────
  const waitForRender = () => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const exportImage = async () => {
    await waitForRender();
    const dataUrl = pitchRef.current?.captureImage();
    if (!dataUrl) { showToast('ไม่สามารถบันทึกรูปภาพได้', 'error'); return; }
    const link = document.createElement('a');
    link.download = `${session.name || 'tactics'}.png`;
    link.href = dataUrl;
    link.click();
  };

  const exportPdf = async () => {
    setCapturing(true);
    const originalIdx = frameIdx;
    const snapshots: string[] = [];
    for (let i = 0; i < session.frames.length; i++) {
      setFrameIdx(i);
      await waitForRender();
      const dataUrl = pitchRef.current?.captureImage();
      if (dataUrl) snapshots.push(dataUrl);
    }
    setFrameIdx(originalIdx);
    setPrintSnapshots(snapshots);
    setCapturing(false);
    await waitForRender();
    window.print();
    setPrintSnapshots(null);
  };

  // ── keyboard delete safety net (bottom toolbar covers click path) ───────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { deleteSelected(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, currentFrame]);

  const beginTokenDrag = (e: React.DragEvent, kind: TokenKind, color: string, label: string) => {
    e.dataTransfer.setData('application/tb-token', JSON.stringify({ kind, color, label }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const selIsShape = selected?.kind === 'shape';

  return (
    <div className="tb-page">
      <style>{`
        .tb-page { display:flex; flex-direction:column; gap:12px; }
        .tb-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:10px 14px; }
        .tb-name-input { font-weight:800; font-size:1rem; border:none; background:transparent; color:var(--text-main,var(--ink)); outline:none; min-width:120px; }
        .tb-toolbar-actions { display:flex; gap:4px; flex-wrap:wrap; }
        .tb-toolbtn { display:flex; flex-direction:column; align-items:center; gap:2px; background:none; border:1px solid transparent; border-radius:9px; padding:5px 9px; cursor:pointer; color:var(--text-muted); font-size:0.62rem; font-weight:700; transition:all .12s; }
        .tb-toolbtn i { font-size:1rem; }
        .tb-toolbtn:hover { background:var(--bg); color:var(--ink); }
        .tb-toolbtn.active { background:#38bdf822; color:#38bdf8; border-color:#38bdf855; }
        .tb-toolbtn:disabled { opacity:0.35; cursor:not-allowed; }
        .tb-body { display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap; }
        .tb-canvas-col { flex:1 1 520px; min-width:280px; max-width:800px; }
        .tb-panel { width:280px; flex-shrink:0; background:var(--surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
        .tb-accordion-hd { width:100%; display:flex; justify-content:space-between; align-items:center; padding:11px 14px; background:var(--bg); border:none; border-bottom:1px solid var(--border); cursor:pointer; font-weight:800; font-size:0.72rem; letter-spacing:0.05em; color:var(--text-muted); text-transform:uppercase; }
        .tb-accordion-body { padding:12px 14px; border-bottom:1px solid var(--border); }
        .tb-swatch { width:24px; height:24px; border-radius:50%; border:2px solid transparent; cursor:pointer; flex-shrink:0; }
        .tb-swatch.sel { border-color:#38bdf8; box-shadow:0 0 0 2px #38bdf855; }
        .tb-eq-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .tb-eq-item { display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 4px; border:1.5px solid var(--border); border-radius:10px; cursor:grab; background:var(--bg); font-size:0.62rem; font-weight:700; color:var(--text-muted); }
        .tb-eq-item i { font-size:1.2rem; }
        .tb-line-btn { flex:1; height:30px; border:1.5px solid var(--border); border-radius:8px; background:var(--bg); cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .tb-line-btn.sel { border-color:#38bdf8; background:#38bdf822; }
        .tb-tool-btn { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; border:1.5px solid var(--border); background:var(--bg); cursor:pointer; color:var(--ink); }
        .tb-tool-btn.sel { border-color:#38bdf8; background:#38bdf822; color:#38bdf8; }
        .tb-bottom-toolbar { display:flex; align-items:center; gap:14px; background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:8px 16px; overflow-x:auto; }
        .tb-bottom-group { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .tb-bottom-sep { width:1px; align-self:stretch; background:var(--border); flex-shrink:0; }
        .tb-frame-chip { width:26px; height:26px; border-radius:7px; border:1.5px solid var(--border); background:var(--bg); font-size:0.68rem; font-weight:800; cursor:pointer; color:var(--text-muted); flex-shrink:0; }
        .tb-frame-chip.sel { background:#38bdf8; color:#fff; border-color:#38bdf8; }
        @media (max-width:900px) { .tb-panel { width:100%; } }
        @media print { .tb-no-print { display:none !important; } }
      `}</style>

      {/* ── top toolbar ── */}
      <div className="tb-toolbar tb-no-print">
        <input className="tb-name-input" value={session.name} onChange={e => setSession(s => ({ ...s, name: e.target.value }))} />
        <div className="tb-toolbar-actions">
          <ToolbarBtn icon="bi-file-earmark-plus" label="New" onClick={handleNew} />
          <ToolbarBtn icon="bi-folder2-open" label="Open" onClick={() => setShowLibrary('open')} />
          <ToolbarBtn icon="bi-save" label="Save" onClick={handleSave} />
          <ToolbarBtn icon="bi-save2-fill" label="Save As" onClick={() => setShowLibrary('saveAs')} />
          <ToolbarBtn icon="bi-clipboard2-pulse" label="Notes" onClick={() => setShowNotes(true)} />
          <ToolbarBtn icon="bi-share" label="Export" onClick={() => setShowExport(true)} />
          <ToolbarBtn icon={session.orientation === 'vertical' ? 'bi-phone' : 'bi-tablet-landscape'} label="หมุนสนาม"
            onClick={() => setSession(s => ({ ...s, orientation: s.orientation === 'vertical' ? 'horizontal' : 'vertical' }))} />
        </div>
      </div>

      {/* ── canvas + right panel ── */}
      <div className="tb-body">
        <div className="tb-canvas-col">
          <div ref={canvasWrapRef} style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform .15s' }}>
            <TacticsPitch3D
              ref={pitchRef}
              frame={currentFrame}
              orientation={session.orientation}
              tool={tool}
              activeColor={activeColor}
              activeLineStyle={activeLineStyle}
              arrowHead={arrowHead}
              locked={locked}
              selected={selected}
              onSelect={setSelected}
              onChange={updateFrame}
              transparency={transparency}
            />
          </div>
        </div>

        <div className="tb-panel tb-no-print">
          <Accordion title="Players" open={open.players} onToggle={() => setOpen(o => ({ ...o, players: !o.players }))}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div draggable onDragStart={e => beginTokenDrag(e, 'player', playerColor, String(playerNum))}
                style={{ width: 40, height: 40, borderRadius: '50%', background: playerColor, border: '2px solid rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: playerColor === '#f8fafc' ? '#111' : '#fff', cursor: 'grab', flexShrink: 0 }}>
                {playerNum}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: 5 }}>ผู้เล่น — ลากลงสนาม</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PLAYER_COLORS.map(c => (
                    <button key={c} className={`tb-swatch${playerColor === c ? ' sel' : ''}`} style={{ background: c }} onClick={() => setPlayerColor(c)} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>เบอร์ถัดไป</span>
                  <input type="number" className="form-control" style={{ width: 56, padding: '2px 6px', fontSize: '0.75rem' }} value={playerNum} onChange={e => setPlayerNum(Number(e.target.value) || 1)} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div draggable onDragStart={e => beginTokenDrag(e, 'player', gkColor, 'GK')}
                style={{ width: 40, height: 40, borderRadius: '50%', background: gkColor, border: '2px solid rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.68rem', color: '#111', cursor: 'grab', flexShrink: 0 }}>
                GK
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>ผู้รักษาประตู — ลากลงสนาม</div>
              </div>
            </div>
          </Accordion>

          <Accordion title="Equipment" open={open.equipment} onToggle={() => setOpen(o => ({ ...o, equipment: !o.equipment }))}>
            <div className="tb-eq-grid">
              {EQUIPMENT.map(eq => (
                <div key={eq.kind} className="tb-eq-item" draggable onDragStart={e => beginTokenDrag(e, eq.kind, eq.color, '')}>
                  <i className={`bi ${eq.icon}`} style={{ color: eq.color }} />
                  {eq.label}
                </div>
              ))}
            </div>
          </Accordion>

          <Accordion title="Tools" open={open.tools} onToggle={() => setOpen(o => ({ ...o, tools: !o.tools }))}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>สี</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DRAW_COLORS.map(c => (
                  <button key={c} className={`tb-swatch${activeColor === c ? ' sel' : ''}`} style={{ background: c, border: c === '#f8fafc' ? '2px solid #cbd5e1' : undefined }} onClick={() => setActiveColor(c)} />
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>เส้น</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(ls => (
                  <button key={ls} className={`tb-line-btn${activeLineStyle === ls ? ' sel' : ''}`} onClick={() => setActiveLineStyle(ls)}>
                    <svg width="30" height="6"><line x1="1" y1="3" x2="29" y2="3" stroke="var(--ink,#333)" strokeWidth="2" strokeDasharray={ls === 'dashed' ? '5 3' : ls === 'dotted' ? '1.5 3' : undefined} /></svg>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>ลูกศร / รูปทรง</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={`tb-tool-btn${tool === 'arrow-straight' ? ' sel' : ''}`} title="เส้นตรง" onClick={() => setTool('arrow-straight')}><i className="bi bi-arrow-up-right" /></button>
                <button className={`tb-tool-btn${tool === 'arrow-curved' ? ' sel' : ''}`} title="เส้นโค้ง" onClick={() => setTool('arrow-curved')}><i className="bi bi-arrow-return-right" /></button>
                <button className={`tb-tool-btn${tool === 'arrow-squiggly' ? ' sel' : ''}`} title="เส้นหยัก (เลี้ยงบอล)" onClick={() => setTool('arrow-squiggly')}><i className="bi bi-tsunami" /></button>
                <button className={`tb-tool-btn${arrowHead ? ' sel' : ''}`} title="หัวลูกศร" onClick={() => setArrowHead(a => !a)}><i className="bi bi-signpost-split" /></button>
                <button className={`tb-tool-btn${tool === 'rect' ? ' sel' : ''}`} title="โซนสี่เหลี่ยม" onClick={() => setTool('rect')}><i className="bi bi-square" /></button>
                <button className={`tb-tool-btn${tool === 'circle' ? ' sel' : ''}`} title="โซนวงกลม" onClick={() => setTool('circle')}><i className="bi bi-circle" /></button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>ข้อความ</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`tb-tool-btn${tool === 'text' ? ' sel' : ''}`} title="ป้ายข้อความ" onClick={() => setTool('text')}><i className="bi bi-fonts" /></button>
                <button className={`tb-tool-btn${tool === 'note' ? ' sel' : ''}`} title="กล่องคำอธิบาย" onClick={() => setTool('note')}><i className="bi bi-chat-square-text" /></button>
                <button className={`tb-tool-btn${tool === 'select' ? ' sel' : ''}`} title="เลือก/ย้าย" onClick={() => setTool('select')}><i className="bi bi-cursor-fill" /></button>
              </div>
            </div>
          </Accordion>

          <Accordion title="Session Viewer" open={open.viewer} onToggle={() => setOpen(o => ({ ...o, viewer: !o.viewer }))}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {session.frames.map((f, i) => (
                <button key={f.id} className={`tb-frame-chip${i === frameIdx ? ' sel' : ''}`} onClick={() => { setPlaying(false); setFrameIdx(i); setSelected(null); }}>{i + 1}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn-outline btn-sm" onClick={() => addFrame(true)} title="ทำสำเนาเฟรม"><i className="bi bi-copy" /></button>
              <button className="btn-outline btn-sm" onClick={() => addFrame(false)} title="เพิ่มเฟรมเปล่า"><i className="bi bi-plus-lg" /></button>
              <button className="btn-outline btn-sm" onClick={deleteFrame} disabled={session.frames.length <= 1} title="ลบเฟรม"><i className="bi bi-trash" /></button>
              <button className="btn-primary btn-sm" onClick={() => setPlaying(p => !p)} style={{ marginLeft: 'auto' }}>
                <i className={`bi bi-${playing ? 'pause-fill' : 'play-fill'} me-1`} />{playing ? 'หยุด' : 'เล่น'}
              </button>
            </div>
          </Accordion>

          <Accordion title="Formations" open={open.formations} onToggle={() => setOpen(o => ({ ...o, formations: !o.formations }))}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {FORMATIONS.map(f => (
                <button key={f.id} className="btn-outline btn-sm" style={{ justifyContent: 'space-between' }} onClick={() => applyFormation(f.id)}>
                  {f.name}<i className="bi bi-diagram-3" />
                </button>
              ))}
            </div>
          </Accordion>
        </div>
      </div>

      {/* ── bottom toolbar ── */}
      <div className="tb-bottom-toolbar tb-no-print">
        <div className="tb-bottom-group">
          <button className={`tb-tool-btn${tool === 'select' ? ' sel' : ''}`} title="เลือก" onClick={() => setTool('select')}><i className="bi bi-cursor-fill" /></button>
          <button className="tb-tool-btn" title="ทำสำเนา" disabled={!selected} onClick={duplicateSelected}><i className="bi bi-files" /></button>
          <button className="tb-tool-btn" title="ลบ" disabled={!selected} onClick={deleteSelected}><i className="bi bi-trash" /></button>
          <button className="tb-tool-btn" title="เลิกทำ" onClick={undo}><i className="bi bi-arrow-counterclockwise" /></button>
        </div>
        <div className="tb-bottom-sep" />
        <div className="tb-bottom-group">
          <button className={`tb-tool-btn${!locked ? ' sel' : ''}`} title="ปลดล็อก" onClick={() => setLocked(false)}><i className="bi bi-unlock-fill" /></button>
          <button className={`tb-tool-btn${locked ? ' sel' : ''}`} title="ล็อกกระดาน" onClick={() => setLocked(true)}><i className="bi bi-lock-fill" /></button>
        </div>
        <div className="tb-bottom-sep" />
        <div className="tb-bottom-group" style={{ minWidth: 150 }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>โปร่งใส</span>
          <input type="range" min={0} max={100} value={transparency * 100} disabled={!selIsShape}
            onChange={e => {
              const v = Number(e.target.value) / 100;
              setTransparency(v);
              if (selected?.kind === 'shape') updateFrame(f => ({ ...f, shapes: f.shapes.map(s => s.id === selected.id ? { ...s, opacity: v } : s) }));
            }} />
        </div>
        <div className="tb-bottom-sep" />
        <div className="tb-bottom-group" style={{ minWidth: 170 }}>
          <i className="bi bi-zoom-in" style={{ color: 'var(--text-muted)' }} />
          <input type="range" min={50} max={150} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', width: 34 }}>{zoom}%</span>
        </div>
        <div className="tb-bottom-sep" />
        <div className="tb-bottom-group" style={{ marginLeft: 'auto' }}>
          <button className="tb-tool-btn" disabled={frameIdx === 0} onClick={() => { setPlaying(false); setFrameIdx(i => i - 1); }}><i className="bi bi-skip-backward-fill" /></button>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 4px' }}>{frameIdx + 1}/{session.frames.length}</span>
          <button className="tb-tool-btn" disabled={frameIdx === session.frames.length - 1} onClick={() => { setPlaying(false); setFrameIdx(i => i + 1); }}><i className="bi bi-skip-forward-fill" /></button>
        </div>
      </div>

      {/* ── print-only export layout ── */}
      <div className="print-only">
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800 }}>{session.name}</h2>
          {session.objective && <p>{session.objective}</p>}
          <p style={{ color: '#555', fontSize: '0.85rem' }}>
            {session.level && <>ระดับ: {session.level} · </>}
            {session.duration && <>ระยะเวลา: {session.duration} · </>}
            {session.frames.length} เฟรม
          </p>
        </div>
        {session.frames.map((f, i) => (
          <div key={f.id} style={{ pageBreakInside: 'avoid', marginBottom: 28 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>เฟรมที่ {i + 1}</div>
            {printSnapshots?.[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={printSnapshots[i]} alt={`เฟรมที่ ${i + 1}`} style={{ width: '100%', borderRadius: 8 }} />
            )}
          </div>
        ))}
      </div>

      {capturing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
        }} className="tb-no-print">
          <i className="bi bi-hourglass-split me-2" /> กำลังจับภาพทุกเฟรมสำหรับ PDF...
        </div>
      )}

      {showLibrary === 'open' && <TacticsLibraryModal mode="open" onClose={() => setShowLibrary(null)} onOpen={handleOpen} />}
      {showLibrary === 'saveAs' && <TacticsLibraryModal mode="saveAs" onClose={() => setShowLibrary(null)} onSaveAs={handleSaveAs} currentName={session.name} currentFolder={session.folder} />}
      {showNotes && <NotesModal session={session} onClose={() => setShowNotes(false)} onSave={patch => setSession(s => ({ ...s, ...patch }))} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onImage={exportImage} onPdf={exportPdf} />}
    </div>
  );
}
