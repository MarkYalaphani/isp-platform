'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Athlete } from '@/lib/types';

const TEAM_COLORS: Record<string,string> = {
  U8:'#6366f1',U9:'#38bdf8',U10:'#10b981',U11:'#f59e0b',
  U12:'#ef4444',U13:'#8b5cf6',U14:'#06b6d4',U15:'#f97316',
  U16:'#ec4899',U17:'#14b8a6',U18:'#84cc16',Senior:'#1d4ed8',
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
}

interface Props {
  athletes: Athlete[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  accentColor?: string;
}

interface DropPos { top: number; left: number; width: number; flipUp: boolean; }

export default function AthleteSearchSelect({
  athletes, value, onChange,
  placeholder = '— เลือกนักกีฬา —',
  accentColor,
}: Props) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [dropPos, setDropPos]     = useState<DropPos | null>(null);
  const [mounted, setMounted]     = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropRef    = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const selected = athletes.find(a => a.PlayerID === value);

  const teams = useMemo(() => {
    const t = new Set(athletes.map(a => a.Team).filter(Boolean));
    return Array.from(t).sort();
  }, [athletes]);

  const filtered = useMemo(() => {
    let list = athletes;
    if (filterTeam) list = list.filter(a => a.Team === filterTeam);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(a =>
        a.Name.toLowerCase().includes(q) ||
        (a.Nickname || '').toLowerCase().includes(q) ||
        (a.Team || '').toLowerCase().includes(q) ||
        (a.Position || '').toLowerCase().includes(q)
      );
    }
    return list.slice(0, 120);
  }, [athletes, filterTeam, query]);

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const flipUp = spaceBelow < 320 && spaceAbove > spaceBelow;
    setDropPos({
      top:   flipUp ? r.top + window.scrollY - 4 : r.bottom + window.scrollY + 4,
      left:  r.left + window.scrollX,
      width: r.width,
      flipUp,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    calcPos();
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
    else { setQuery(''); setFilterTeam(''); }
  }, [open]);

  const handleSelect = (id: string) => { onChange(id); setOpen(false); };

  const tc = selected?.Team ? (TEAM_COLORS[selected.Team] || '#6366f1') : '#94a3b8';
  const borderColor = open ? (accentColor || '#38bdf8') : value ? (accentColor || '#38bdf8') : 'var(--border)';

  const dropdown = dropPos && open && mounted ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: 'absolute',
        top:   dropPos.flipUp ? undefined : dropPos.top,
        bottom: dropPos.flipUp ? window.innerHeight - dropPos.top + window.scrollY : undefined,
        left:  dropPos.left,
        width: dropPos.width,
        zIndex: 99999,
        background: 'var(--surface)',
        border: '1.5px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 10px 36px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}
    >
      {/* Search + team filter */}
      <div style={{ padding: '10px 10px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 7 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <i className="bi bi-search" style={{
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', fontSize: '0.78rem', pointerEvents: 'none',
          }} />
          <input
            ref={inputRef}
            className="form-control"
            style={{ paddingLeft: 28, fontSize: '0.84rem', height: 36 }}
            placeholder="ค้นชื่อ, ชื่อเล่น, รุ่น, ตำแหน่ง..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && filtered.length === 1) handleSelect(filtered[0].PlayerID);
            }}
          />
        </div>
        {teams.length > 1 && (
          <select
            className="form-select"
            style={{ width: 88, fontSize: '0.78rem', height: 36, padding: '4px 6px', flexShrink: 0 }}
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
          >
            <option value="">ทุกรุ่น</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Result count */}
      <div style={{ padding: '5px 12px', fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        แสดง {filtered.length} จาก {athletes.length} คน
        {query && ` · ค้นหา "${query}"`}
      </div>

      {/* List */}
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            <i className="bi bi-search" style={{ display: 'block', fontSize: '1.8rem', marginBottom: 8, color: '#cbd5e1' }} />
            ไม่พบนักกีฬา
          </div>
        ) : (
          filtered.map(a => {
            const atc = TEAM_COLORS[a.Team] || '#6366f1';
            const isSel = a.PlayerID === value;
            return (
              <div
                key={a.PlayerID}
                onMouseDown={e => { e.preventDefault(); handleSelect(a.PlayerID); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', cursor: 'pointer',
                  background: isSel ? 'rgba(56,189,248,0.08)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(56,189,248,0.04)'; }}
                onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: a.PhotoUrl ? 'transparent' : atc,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 800, color: 'white',
                  border: isSel ? '2px solid #38bdf8' : '2px solid transparent',
                }}>
                  {a.PhotoUrl
                    ? <img src={a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(a.Name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: isSel ? 700 : 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSel ? '#38bdf8' : 'var(--text-main)' }}>
                    {a.Name}
                  </div>
                  {(a.Nickname || a.Position) && (
                    <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
                      {a.Nickname && `"${a.Nickname}"${a.Position ? ' · ' : ''}`}{a.Position}
                    </div>
                  )}
                </div>
                {a.Team && (
                  <span style={{
                    background: `${atc}22`, color: atc, borderRadius: 6,
                    padding: '2px 7px', fontSize: '0.67rem', fontWeight: 800, flexShrink: 0,
                  }}>{a.Team}</span>
                )}
                {isSel && <i className="bi bi-check2-circle" style={{ color: '#38bdf8', flexShrink: 0 }} />}
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Trigger ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
          background: 'var(--bg)', border: `1.5px solid ${borderColor}`,
          borderRadius: 10, fontFamily: 'inherit', fontSize: '0.9rem',
          color: 'var(--text-main)', transition: 'border-color 0.2s',
          boxShadow: open ? `0 0 0 3px ${(accentColor||'#38bdf8')}22` : 'none',
        }}
      >
        {selected ? (
          <>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: selected.PhotoUrl ? 'transparent' : tc,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 800, color: 'white',
            }}>
              {selected.PhotoUrl
                ? <img src={selected.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials(selected.Name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.Name}
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: 1 }}>
                {selected.Nickname && `"${selected.Nickname}"${selected.Team || selected.Position ? ' · ' : ''}`}
                {selected.Team}{selected.Position ? ` · ${selected.Position}` : ''}
              </div>
            </div>
            {selected.Team && (
              <span style={{
                background: `${tc}22`, color: tc, borderRadius: 6,
                padding: '2px 8px', fontSize: '0.67rem', fontWeight: 800, flexShrink: 0,
              }}>{selected.Team}</span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)', flex: 1 }}>{placeholder}</span>
        )}
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '0.72rem', flexShrink: 0 }} />
      </button>

      {dropdown}
    </div>
  );
}
