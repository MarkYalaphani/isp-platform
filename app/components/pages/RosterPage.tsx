'use client';

import { useState, useMemo, useCallback } from 'react';
import { Athlete, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';
import EditAthleteModal from '../EditAthleteModal';

interface Props { athletes: Athlete[]; onRefresh: () => void; user: User; onNavigate: (p: Page, id?: string) => void; }

/* ── helpers ─────────────────────────────────────────────── */
function calcAge(dob: string) {
  if (!dob || dob === '-') return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 31557600000);
}
function ageGroup(age: number | null) {
  if (age === null) return 'unknown';
  if (age <= 12) return 'U-12';
  if (age <= 15) return 'U-15';
  if (age <= 18) return 'U-18';
  return 'Senior';
}
function getInitials(name: string) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function posColor(pos: string) {
  const p = (pos || '').toLowerCase();
  if (p.includes('forward') || p.includes('fwd') || p.includes('st') || p.includes('striker')) return { bg: '#fef9c3', color: '#ca8a04', border: '#fde047' };
  if (p.includes('def') || p.includes('cb') || p.includes('lb') || p.includes('rb')) return { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' };
  if (p.includes('goal') || p.includes('gk')) return { bg: '#fce7f3', color: '#be185d', border: '#f9a8d4' };
  return { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' }; // mid
}
function ratingColor(r: number) {
  if (r >= 80) return '#10b981';
  if (r >= 65) return '#38bdf8';
  if (r >= 50) return '#f59e0b';
  if (r >= 35) return '#f97316';
  return '#ef4444';
}
function daysSince(ts: string) {
  if (!ts) return 999;
  const d = new Date(ts); if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function lastTestLabel(days: number) {
  if (days >= 999) return { label: 'ยังไม่ทดสอบ', color: '#ef4444' };
  if (days === 0)  return { label: 'วันนี้', color: '#10b981' };
  if (days <= 30)  return { label: `${days} วันที่แล้ว`, color: '#22c55e' };
  if (days <= 90)  return { label: `${days} วันที่แล้ว`, color: '#f59e0b' };
  return { label: `${days} วันที่แล้ว`, color: '#ef4444' };
}

type SortKey = 'name' | 'rating' | 'age' | 'lastTest' | 'speed' | 'team';
type ViewMode = 'table' | 'grid';

const PAGE_SIZE = 30;

/* ── Rating ring ─────────────────────────────────────────── */
function RatingRing({ rating, size = 44 }: { rating: number; size?: number }) {
  const r = rating || 0;
  const color = ratingColor(r);
  const pct = r / 100;
  const circ = 2 * Math.PI * (size / 2 - 4);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke="var(--border)" strokeWidth={3.5} />
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 40 ? '0.85rem' : '0.65rem', fontWeight: 900, color }}>
        {r || '—'}
      </div>
    </div>
  );
}

/* ── Athlete Card (grid view) ───────────────────────────── */
function AthleteCard({ a, onView, onEdit, onDelete, canDelete, deleting }: {
  a: Athlete; onView: () => void; onEdit: () => void;
  onDelete: () => void; canDelete: boolean; deleting: boolean;
}) {
  const age = calcAge(a.DOB);
  const pc  = posColor(a.Position);
  const days = daysSince(a.History?.length ? a.History[a.History.length-1]?.Timestamp || '' : '');
  const lt = lastTestLabel(days);

  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 16,
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.14)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      {/* Photo */}
      <div style={{ position: 'relative', height: 100, background: 'linear-gradient(135deg,#1e3a5f,#0f172a)', flexShrink: 0 }} onClick={onView}>
        {a.PhotoUrl
          ? <img src={a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: 0.85 }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>{getInitials(a.Name)}</div>
        }
        {/* Position badge */}
        {a.Position && (
          <span style={{ position: 'absolute', top: 8, left: 8, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 6, padding: '2px 7px', fontSize: '0.62rem', fontWeight: 800 }}>
            {a.Position.toUpperCase()}
          </span>
        )}
        {/* Last test dot */}
        <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: lt.color, boxShadow: `0 0 6px ${lt.color}` }} title={lt.label} />
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }} onClick={onView}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.Name}</div>
            {a.Nickname && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{a.Nickname}</div>}
          </div>
          <RatingRing rating={Number(a.Latest?.Rating) || 0} size={40} />
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {a.Team && <span><i className="bi bi-shield-fill me-1" />{a.Team}</span>}
          {age !== null && <span><i className="bi bi-person me-1" />{age} ปี</span>}
        </div>
        {/* Key stats */}
        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {[
            { label: 'SPD', val: a.Latest?.Speed30, color: '#f59e0b' },
            { label: 'CMJ', val: a.Latest?.CMJ, color: '#f472b6' },
            { label: 'Y-Y', val: a.Latest?.YoYo, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', background: 'var(--bg)', borderRadius: 6, padding: '3px 0' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 900, color: s.val ? s.color : 'var(--text-muted)' }}>{s.val || '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
        <button onClick={onView} style={{ flex: 1, padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>
          <i className="bi bi-eye me-1" />ดูรายงาน
        </button>
        <button onClick={onEdit} style={{ padding: '8px 12px', background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <i className="bi bi-pencil" />
        </button>
        {canDelete && (
          <button onClick={onDelete} disabled={deleting} style={{ padding: '8px 12px', background: 'none', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem' }}>
            {deleting ? <span className="spinner-ring" style={{ width: 12, height: 12, borderWidth: 2, margin: 0 }} /> : <i className="bi bi-trash" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function RosterPage({ athletes, onRefresh, user, onNavigate }: Props) {
  const [search,     setSearch]     = useState('');
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [filterPos,  setFilterPos]  = useState('ALL');
  const [filterAge,  setFilterAge]  = useState('ALL');
  const [sortKey,    setSortKey]    = useState<SortKey>('rating');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('desc');
  const [viewMode,   setViewMode]   = useState<ViewMode>('table');
  const [page,       setPage]       = useState(1);
  const [deleting,   setDeleting]   = useState('');
  const [editAthlete, setEditAthlete] = useState<Athlete | null>(null);

  /* options */
  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a => a.Team).filter(Boolean))).sort()], [athletes]);
  const positions = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a => a.Position).filter(Boolean))).sort()], [athletes]);

  /* filter + sort */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return athletes.filter(a => {
      if (filterTeam !== 'ALL' && a.Team !== filterTeam) return false;
      if (filterPos  !== 'ALL' && a.Position !== filterPos) return false;
      if (filterAge  !== 'ALL' && ageGroup(calcAge(a.DOB)) !== filterAge) return false;
      if (q) {
        const hay = `${a.Name} ${a.Nickname} ${a.Team} ${a.Position} ${a.Club} ${a.PlayerID}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }, [athletes, search, filterTeam, filterPos, filterAge]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':     return dir * (a.Name || '').localeCompare(b.Name || '');
        case 'rating':   return dir * ((Number(a.Latest?.Rating) || 0) - (Number(b.Latest?.Rating) || 0));
        case 'age':      return dir * ((calcAge(a.DOB) ?? 0) - (calcAge(b.DOB) ?? 0));
        case 'team':     return dir * (a.Team || '').localeCompare(b.Team || '');
        case 'speed':    return dir * ((Number(a.Latest?.Speed30) || 99) - (Number(b.Latest?.Speed30) || 99));
        case 'lastTest': {
          const da = daysSince(a.History?.length ? a.History[a.History.length-1]?.Timestamp || '' : '');
          const db = daysSince(b.History?.length ? b.History[b.History.length-1]?.Timestamp || '' : '');
          return dir * (da - db);
        }
        default: return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = useCallback(() => setPage(1), []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    resetPage();
  };

  const clearFilters = () => { setSearch(''); setFilterTeam('ALL'); setFilterPos('ALL'); setFilterAge('ALL'); resetPage(); };
  const hasFilter = search || filterTeam !== 'ALL' || filterPos !== 'ALL' || filterAge !== 'ALL';

  const handleDelete = async (a: Athlete) => {
    if (!confirm(`ลบข้อมูลของ "${a.Name}"?\n\nประวัติทั้งหมดจะถูกลบด้วย`)) return;
    setDeleting(a.PlayerID);
    try {
      const res = await callGAS('deleteAthlete', { playerId: a.PlayerID }) as { status: string; message?: string };
      if (res.status === 'success') {
        showToast(`ลบ ${a.Name} สำเร็จ`, 'success');
        onRefresh();
      } else {
        showToast(res.message || 'ลบไม่สำเร็จ', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด', 'error');
    } finally { setDeleting(''); }
  };

  /* summary stats */
  const stats = useMemo(() => {
    const rated = athletes.filter(a => Number(a.Latest?.Rating) > 0);
    const avgRating = rated.length ? Math.round(rated.reduce((s, a) => s + (Number(a.Latest?.Rating) || 0), 0) / rated.length) : 0;
    const neverTested = athletes.filter(a => !a.History?.length).length;
    const top = athletes.reduce((best, a) => (Number(a.Latest?.Rating) || 0) > (Number(best?.Latest?.Rating) || 0) ? a : best, athletes[0]);
    return { total: athletes.length, avgRating, neverTested, topName: top?.Name || '—' };
  }, [athletes]);

  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k ? <i className="bi bi-arrow-down-up ms-1" style={{ opacity: 0.3, fontSize: '0.65rem' }} /> :
    <i className={`bi bi-arrow-${sortDir === 'asc' ? 'up' : 'down'} ms-1`} style={{ color: '#38bdf8', fontSize: '0.65rem' }} />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Athlete Roster</h2>
          <p className="page-subtitle">
            {athletes.length} นักกีฬา ·
            <span style={{ color: '#38bdf8', marginLeft: 6 }}>Rating เฉลี่ย {stats.avgRating}</span>
            {stats.neverTested > 0 && <span style={{ color: '#ef4444', marginLeft: 6 }}>· {stats.neverTested} ยังไม่ทดสอบ</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {(['table', 'grid'] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: '7px 12px', background: viewMode === m ? '#38bdf8' : 'var(--surface)', color: viewMode === m ? 'white' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                <i className={`bi bi-${m === 'table' ? 'table' : 'grid-1x2'}`} />
              </button>
            ))}
          </div>
          <button className="btn-outline" onClick={() => window.print()}><i className="bi bi-printer me-1" />Print</button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'นักกีฬาทั้งหมด', val: stats.total, icon: 'bi-people-fill', color: '#38bdf8' },
          { label: 'Rating เฉลี่ย', val: stats.avgRating, icon: 'bi-star-fill', color: '#f59e0b' },
          { label: 'ยังไม่ทดสอบ', val: stats.neverTested, icon: 'bi-exclamation-triangle-fill', color: '#ef4444' },
          { label: 'คะแนนสูงสุด', val: stats.topName, icon: 'bi-trophy-fill', color: '#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', borderLeft: `3px solid ${s.color}` }}>
            <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize: '0.9rem', marginBottom: 4, display: 'block' }} />
            <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{s.val}</div>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div className="search-wrap" style={{ flex: 1, minWidth: 180 }}>
          <i className="bi bi-search" />
          <input className="form-control" placeholder="ค้นหา ชื่อ · ทีม · ตำแหน่ง · รหัส..." value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} />
        </div>
        {/* Team */}
        <select className="form-select" style={{ width: 'auto', minWidth: 110 }} value={filterTeam} onChange={e => { setFilterTeam(e.target.value); resetPage(); }}>
          {teams.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ทุกทีม' : t}</option>)}
        </select>
        {/* Position */}
        <select className="form-select" style={{ width: 'auto', minWidth: 100 }} value={filterPos} onChange={e => { setFilterPos(e.target.value); resetPage(); }}>
          <option value="ALL">ทุกตำแหน่ง</option>
          {positions.slice(1).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {/* Age group */}
        <select className="form-select" style={{ width: 'auto' }} value={filterAge} onChange={e => { setFilterAge(e.target.value); resetPage(); }}>
          {['ALL', 'U-12', 'U-15', 'U-18', 'Senior'].map(g => <option key={g} value={g}>{g === 'ALL' ? 'ทุกกลุ่มอายุ' : g}</option>)}
        </select>
        {/* Sort */}
        <select className="form-select" style={{ width: 'auto' }} value={`${sortKey}_${sortDir}`}
          onChange={e => { const [k, d] = e.target.value.split('_'); setSortKey(k as SortKey); setSortDir(d as 'asc'|'desc'); resetPage(); }}>
          <option value="rating_desc">Rating สูง→ต่ำ</option>
          <option value="rating_asc">Rating ต่ำ→สูง</option>
          <option value="name_asc">ชื่อ A→Z</option>
          <option value="name_desc">ชื่อ Z→A</option>
          <option value="age_asc">อายุน้อย→มาก</option>
          <option value="age_desc">อายุมาก→น้อย</option>
          <option value="team_asc">ทีม A→Z</option>
          <option value="lastTest_asc">ทดสอบล่าสุด</option>
          <option value="lastTest_desc">ทดสอบนานที่สุด</option>
        </select>
        {/* Clear */}
        {hasFilter && (
          <button className="btn-outline" onClick={clearFilters} style={{ whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
            <i className="bi bi-x-circle me-1" />ล้างตัวกรอง
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>
          {filtered.length !== athletes.length ? `${filtered.length} / ${athletes.length}` : `${athletes.length} คน`}
        </span>
      </div>

      {/* ══ TABLE VIEW ══ */}
      {viewMode === 'table' && (
        <div className="surface" style={{ padding: 0 }} id="rosterPrintArea">
          <div style={{ overflowX: 'auto' }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>#</th>
                  <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>นักกีฬา <SortIcon k="name" /></th>
                  <th onClick={() => toggleSort('team')} style={{ cursor: 'pointer', userSelect: 'none' }}>ทีม <SortIcon k="team" /></th>
                  <th onClick={() => toggleSort('rating')} style={{ cursor: 'pointer', userSelect: 'none' }}>Rating <SortIcon k="rating" /></th>
                  <th onClick={() => toggleSort('age')} style={{ cursor: 'pointer', userSelect: 'none' }}>อายุ <SortIcon k="age" /></th>
                  <th>Ht</th><th>Wt</th>
                  <th onClick={() => toggleSort('speed')} style={{ cursor: 'pointer', userSelect: 'none' }}>Speed <SortIcon k="speed" /></th>
                  <th>CMJ</th><th>Agility</th><th>Sit-up</th><th>L.Jump</th><th>Yo-Yo</th><th>Push-up</th>
                  <th onClick={() => toggleSort('lastTest')} style={{ cursor: 'pointer', userSelect: 'none' }}>ทดสอบล่าสุด <SortIcon k="lastTest" /></th>
                  <th style={{ textAlign: 'center' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr><td colSpan={16} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <i className="bi bi-search" style={{ fontSize: '2rem', display: 'block', marginBottom: 8, color: '#cbd5e1' }} />
                    ไม่พบนักกีฬาที่ตรงกับเงื่อนไข
                  </td></tr>
                )}
                {paginated.map((a, i) => {
                  const age = calcAge(a.DOB);
                  const pc  = posColor(a.Position);
                  const days = daysSince(a.History?.length ? a.History[a.History.length-1]?.Timestamp || '' : '');
                  const lt = lastTestLabel(days);
                  const rating = Number(a.Latest?.Rating) || 0;
                  return (
                    <tr key={a.PlayerID}>
                      <td style={{ paddingLeft: 16, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{(page-1)*PAGE_SIZE + i + 1}</td>
                      <td>
                        <div className="clickable-name" style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={() => onNavigate('scout', a.PlayerID)}>
                          <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem', flexShrink: 0 }}>
                            {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" /> : getInitials(a.Name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{a.Name}</div>
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 1 }}>
                              {a.Nickname && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{a.Nickname}</span>}
                              {a.Position && <span style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, borderRadius: 4, padding: '0px 5px', fontSize: '0.58rem', fontWeight: 800 }}>{a.Position.toUpperCase()}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.Team || '—'}</td>
                      <td><RatingRing rating={rating} size={36} /></td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {age !== null ? (
                          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                            <span style={{ fontWeight: 700 }}>{age}</span>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{ageGroup(age)}</span>
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.Latest?.Height || '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.Latest?.Weight || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#f59e0b' }}>{a.Latest?.Speed30 || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#f472b6' }}>{a.Latest?.CMJ || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>{a.Latest?.Agility || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.Latest?.Situp || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.Latest?.LongJump || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#ef4444' }}>{a.Latest?.YoYo || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{a.Latest?.Pushup || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: lt.color, whiteSpace: 'nowrap' }}>{lt.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                          <button className="btn-primary btn-sm" style={{ padding: '4px 8px' }} onClick={() => onNavigate('scout', a.PlayerID)} title="ดูรายงาน"><i className="bi bi-eye" /></button>
                          <button className="btn-outline btn-sm" style={{ padding: '4px 8px' }} onClick={() => setEditAthlete(a)} title="แก้ไข"><i className="bi bi-pencil" /></button>
                          {(user.role === 'admin' || (user.role !== 'admin' && a.ClubID === user.clubId)) && (
                            <button className="btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleDelete(a)} disabled={deleting === a.PlayerID} title="ลบ">
                              {deleting === a.PlayerID ? <span className="spinner-ring" style={{ width: 12, height: 12, borderWidth: 2, margin: 0 }} /> : <i className="bi bi-trash" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ GRID VIEW ══ */}
      {viewMode === 'grid' && (
        paginated.length === 0
          ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <i className="bi bi-search" style={{ fontSize: '2.5rem', display: 'block', marginBottom: 10, color: '#cbd5e1' }} />ไม่พบนักกีฬาที่ตรงกับเงื่อนไข
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 14 }}>
              {paginated.map(a => (
                <AthleteCard key={a.PlayerID} a={a}
                  onView={() => onNavigate('scout', a.PlayerID)}
                  onEdit={() => setEditAthlete(a)}
                  onDelete={() => handleDelete(a)}
                  canDelete={user.role === 'admin' || a.ClubID === user.clubId}
                  deleting={deleting === a.PlayerID}
                />
              ))}
            </div>
      )}

      {/* ══ PAGINATION ══ */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn-outline" onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '6px 10px' }}><i className="bi bi-chevron-double-left" /></button>
          <button className="btn-outline" onClick={() => setPage(p => p - 1)} disabled={page === 1} style={{ padding: '6px 10px' }}><i className="bi bi-chevron-left" /></button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            return p <= totalPages ? (
              <button key={p} onClick={() => setPage(p)} style={{ padding: '6px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: page === p ? '#38bdf8' : 'var(--surface)', color: page === p ? 'white' : 'var(--text-muted)', border: `1.5px solid ${page === p ? '#38bdf8' : 'var(--border)'}` }}>{p}</button>
            ) : null;
          })}
          <button className="btn-outline" onClick={() => setPage(p => p + 1)} disabled={page === totalPages} style={{ padding: '6px 10px' }}><i className="bi bi-chevron-right" /></button>
          <button className="btn-outline" onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '6px 10px' }}><i className="bi bi-chevron-double-right" /></button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>หน้า {page}/{totalPages}</span>
        </div>
      )}

      {editAthlete && (
        <EditAthleteModal athlete={editAthlete} onClose={() => setEditAthlete(null)} onSaved={() => { setEditAthlete(null); onRefresh(); }} />
      )}
    </div>
  );
}
