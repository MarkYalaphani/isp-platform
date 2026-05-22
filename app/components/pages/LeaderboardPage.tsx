'use client';
import { useState, useMemo } from 'react';
import { Athlete, Page } from '@/lib/types';

interface Props { athletes: Athlete[]; onNavigate: (p: Page, id?: string) => void; }

const METRICS = [
  { key: 'Rating',   label: 'Overall Rating', icon: 'bi-star-fill',            color: '#f59e0b', hi: true,  unit: '' },
  { key: 'Speed30',  label: 'Speed 30m',       icon: 'bi-lightning-charge-fill',color: '#f97316', hi: false, unit: 's' },
  { key: 'CMJ',      label: 'CMJ',             icon: 'bi-arrow-up-circle-fill', color: '#f472b6', hi: true,  unit: 'cm' },
  { key: 'YoYo',     label: 'Shuttle / Yo-Yo', icon: 'bi-heart-pulse-fill',     color: '#ef4444', hi: true,  unit: 'm' },
  { key: 'Agility',  label: 'Agility',         icon: 'bi-shuffle',              color: '#34d399', hi: false, unit: 's' },
  { key: 'LongJump', label: 'Long Jump',        icon: 'bi-box-arrow-up-right',   color: '#818cf8', hi: true,  unit: 'cm' },
  { key: 'Situp',    label: 'Sit-up',           icon: 'bi-person',               color: '#06b6d4', hi: true,  unit: 'reps' },
  { key: 'Pushup',   label: 'Push-up',          icon: 'bi-activity',             color: '#6366f1', hi: true,  unit: 'reps' },
] as const;

type MetricKey = typeof METRICS[number]['key'];

function medalColor(i: number) {
  if (i === 0) return { bg: '#fef9c3', color: '#b45309', border: '#fde047' };
  if (i === 1) return { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' };
  if (i === 2) return { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
  return { bg: 'var(--bg)', color: 'var(--text-muted)', border: 'var(--border)' };
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', borderRadius: 6, background: color, width: `${Math.min(100, pct)}%`, transition: 'width 0.5s' }} />
    </div>
  );
}

export default function LeaderboardPage({ athletes, onNavigate }: Props) {
  const [metric, setMetric]     = useState<MetricKey>('Rating');
  const [filterTeam, setFilterTeam] = useState('ALL');

  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a => a.Team).filter(Boolean))).sort()], [athletes]);
  const m = METRICS.find(x => x.key === metric)!;

  const ranked = useMemo(() => {
    const pool = athletes.filter(a => filterTeam === 'ALL' || a.Team === filterTeam);
    return pool
      .map(a => ({ a, val: Number(a.Latest?.[m.key as keyof typeof a.Latest]) || 0 }))
      .filter(x => x.val > 0)
      .sort((x, y) => m.hi ? y.val - x.val : x.val - y.val);
  }, [athletes, metric, filterTeam, m]);

  const maxVal = ranked[0]?.val || 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Leaderboard</h2>
          <p className="page-subtitle">อันดับนักกีฬา · เปรียบเทียบผลการทดสอบ</p>
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          {teams.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ทุกทีม' : t}</option>)}
        </select>
      </div>

      {/* Metric tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {METRICS.map(x => (
          <button key={x.key} onClick={() => setMetric(x.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 10, border: `2px solid ${metric === x.key ? x.color : 'var(--border)'}`,
            background: metric === x.key ? x.color + '18' : 'var(--surface)',
            color: metric === x.key ? x.color : 'var(--text-muted)',
            fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
          }}>
            <i className={`bi ${x.icon}`} />
            {x.label}
          </button>
        ))}
      </div>

      {/* Podium top 3 */}
      {ranked.length >= 3 && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'center', marginBottom: 24, padding: '0 16px' }}>
          {[ranked[1], ranked[0], ranked[2]].map((entry, idx) => {
            const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const h = rank === 1 ? 120 : rank === 2 ? 90 : 75;
            const mc = medalColor(rank - 1);
            return (
              <div key={entry.a.PlayerID} style={{ flex: 1, maxWidth: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                onClick={() => onNavigate('scout', entry.a.PlayerID)}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${mc.border}`, background: mc.bg }}>
                  {entry.a.PhotoUrl
                    ? <img src={entry.a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.2rem', color: mc.color }}>{(entry.a.Name||'?')[0]}</div>
                  }
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.82rem', color: mc.color }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.78rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.a.Name}</div>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: m.color }}>{entry.val}{m.unit && <span style={{ fontSize: '0.65rem', marginLeft: 2 }}>{m.unit}</span>}</div>
                  {entry.a.Team && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{entry.a.Team}</div>}
                </div>
                <div style={{ width: '100%', height: h, background: mc.bg, border: `2px solid ${mc.border}`, borderRadius: '8px 8px 0 0' }} />
              </div>
            );
          })}
        </div>
      )}

      {ranked.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <i className="bi bi-trophy" style={{ fontSize: '3rem', display: 'block', marginBottom: 10, color: '#cbd5e1' }} />
          <p>ยังไม่มีข้อมูลสำหรับ {m.label}</p>
        </div>
      )}

      {/* Full list */}
      <div className="surface" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className={`bi ${m.icon}`} style={{ color: m.color }} />
          {m.label} — {ranked.length} คน
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {m.hi ? 'มากกว่า = ดีกว่า' : 'น้อยกว่า = ดีกว่า'}
          </span>
        </div>
        {ranked.map((entry, i) => {
          const mc = medalColor(i);
          const pct = m.hi ? (entry.val / maxVal) * 100 : ((maxVal - entry.val + ranked[ranked.length-1]?.val) / maxVal) * 100;
          return (
            <div key={entry.a.PlayerID} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: i < 3 ? mc.bg : 'transparent', transition: 'background 0.1s',
            }} onClick={() => onNavigate('scout', entry.a.PlayerID)}>
              <div style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: i < 3 ? '1.1rem' : '0.8rem', color: mc.color, flexShrink: 0 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', background: 'var(--bg)', flexShrink: 0 }}>
                {entry.a.PhotoUrl
                  ? <img src={entry.a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#94a3b8' }}>{(entry.a.Name||'?')[0]}</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.a.Name}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  {entry.a.Nickname && <span>"{entry.a.Nickname}" · </span>}
                  {entry.a.Team || '—'} · {entry.a.Position || '—'}
                </div>
              </div>
              <Bar pct={pct} color={m.color} />
              <div style={{ fontWeight: 900, fontSize: '1rem', color: m.color, minWidth: 54, textAlign: 'right', flexShrink: 0 }}>
                {entry.val}<span style={{ fontSize: '0.6rem', marginLeft: 2, color: 'var(--text-muted)' }}>{m.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
