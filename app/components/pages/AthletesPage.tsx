'use client';

import { useState } from 'react';
import { Athlete, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import AthleteModal from '../AthleteModal';

interface Props {
  athletes: Athlete[];
  onRefresh: () => void;
  user: User;
  onNavigate: (page: Page) => void;
}

function getRatingGrade(r: number) {
  if (r >= 80) return { cls: 'badge-exc', label: 'Excellent' };
  if (r >= 60) return { cls: 'badge-good', label: 'Good' };
  if (r >= 40) return { cls: 'badge-avg', label: 'Average' };
  return { cls: 'badge-poor', label: 'Poor' };
}

function posTag(pos: string) {
  const p = pos?.toUpperCase();
  if (p?.includes('FWD') || p?.includes('FORWARD') || p?.includes('ST') || p?.includes('FW')) return 'tag-fwd';
  if (p?.includes('MID') || p?.includes('MF')) return 'tag-mid';
  if (p?.includes('DEF') || p?.includes('DF') || p?.includes('CB') || p?.includes('FB')) return 'tag-def';
  if (p?.includes('GK') || p?.includes('GOAL')) return 'tag-gk';
  return 'tag-mid';
}

const METRICS: { key: keyof Athlete['Latest']; label: string; hi?: boolean }[] = [
  { key: 'Speed30', label: 'Speed 30m', hi: false },
  { key: 'CMJ', label: 'CMJ (cm)', hi: true },
  { key: 'Agility', label: 'Agility (s)', hi: false },
  { key: 'YoYo', label: 'Yo-Yo (m)', hi: true },
];

export default function AthletesPage({ athletes, onRefresh, user, onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [selected, setSelected] = useState<Athlete | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const teams = Array.from(new Set(athletes.map(a => a.Team).filter(Boolean))).sort();
  const positions = Array.from(new Set(athletes.map(a => a.Position).filter(Boolean))).sort();

  const filtered = athletes.filter(a => {
    const q = search.toLowerCase();
    const matchQ = !q || a.Name?.toLowerCase().includes(q) || a.Nickname?.toLowerCase().includes(q) || a.PlayerID?.toLowerCase().includes(q);
    const matchPos = !posFilter || a.Position === posFilter;
    const matchTeam = !teamFilter || a.Team === teamFilter;
    return matchQ && matchPos && matchTeam;
  });

  const avgRating = athletes.length
    ? Math.round(athletes.reduce((s, a) => s + (Number(a.Latest?.Rating) || 0), 0) / athletes.length)
    : 0;
  const topRating = athletes.length ? Math.max(...athletes.map(a => Number(a.Latest?.Rating) || 0)) : 0;

  const handleDelete = async (a: Athlete) => {
    if (!confirm(`Delete ${a.Name} and all their test data?`)) return;
    setDeleting(a.PlayerID);
    try {
      await callGAS('deleteAthlete', { playerId: a.PlayerID });
      onRefresh();
      if (selected?.PlayerID === a.PlayerID) setSelected(null);
    } finally {
      setDeleting(null);
    }
  };

  const topByMetric = (key: keyof Athlete['Latest'], hi: boolean) =>
    [...athletes]
      .filter(a => a.Latest?.[key] && !isNaN(Number(a.Latest[key])))
      .sort((a, b) => hi
        ? Number(b.Latest[key]) - Number(a.Latest[key])
        : Number(a.Latest[key]) - Number(b.Latest[key]))
      .slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Athletes</h2>
          <p className="page-subtitle">{athletes.length} athletes registered</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline" onClick={() => onRefresh()} title="Refresh data">
            <i className="bi bi-arrow-clockwise" /> Refresh
          </button>
          <button className="btn-primary" onClick={() => onNavigate('register')}>
            <i className="bi bi-person-plus" /> Add Athlete
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-color': '#38bdf8' } as React.CSSProperties}>
          <div className="kpi-label">Total Athletes</div>
          <div className="kpi-value">{athletes.length}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#34d399' } as React.CSSProperties}>
          <div className="kpi-label">Avg Rating</div>
          <div className="kpi-value">{avgRating}<span className="kpi-unit">/100</span></div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#f472b6' } as React.CSSProperties}>
          <div className="kpi-label">Top Score</div>
          <div className="kpi-value">{topRating}<span className="kpi-unit">/100</span></div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#a78bfa' } as React.CSSProperties}>
          <div className="kpi-label">Teams</div>
          <div className="kpi-value">{new Set(athletes.map(a => a.Team).filter(Boolean)).size}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="surface mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <div className="search-wrap">
              <i className="bi bi-search" />
              <input className="form-control" placeholder="Search by name, nickname, ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={posFilter} onChange={e => setPosFilter(e.target.value)}>
              <option value="">All Positions</option>
              {positions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
              <option value="">All Teams</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="surface mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>#</th>
                <th>Athlete</th>
                <th>Position</th>
                <th>Team</th>
                <th>Age</th>
                <th>Tests</th>
                <th>Rating</th>
                <th style={{ paddingRight: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No athletes found</td></tr>
              )}
              {filtered.map((a, i) => {
                const rating = Number(a.Latest?.Rating) || 0;
                const grade = getRatingGrade(rating);
                const age = a.DOB ? Math.floor((Date.now() - new Date(a.DOB).getTime()) / 31557600000) : null;
                const initials = (a.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={a.PlayerID} className="animate-row">
                    <td style={{ paddingLeft: 20 }}>
                      <div className={`rank-badge${i < 3 ? ` rank-${i + 1}` : ''}`}>{i + 1}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar">
                          {a.PhotoUrl ? <img src={a.PhotoUrl} alt={a.Name} /> : initials}
                        </div>
                        <div>
                          <div className="clickable-name" onClick={() => setSelected(a)} style={{ fontWeight: 700 }}>{a.Name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.Nickname || a.PlayerID}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`tag ${posTag(a.Position)}`}>{a.Position || '—'}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.Team || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{age ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{a.History?.length || 0}</td>
                    <td>
                      {rating > 0
                        ? <><span className="score-pill">{rating}</span> <span className={grade.cls} style={{ marginLeft: 6 }}>{grade.label}</span></>
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</span>}
                    </td>
                    <td style={{ paddingRight: 20 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-outline btn-sm" onClick={() => setSelected(a)} title="View profile">
                          <i className="bi bi-eye" />
                        </button>
                        {user.role === 'admin' && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(a)}
                            disabled={deleting === a.PlayerID}
                            title="Delete"
                          >
                            {deleting === a.PlayerID ? <span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} /> : <i className="bi bi-trash" />}
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

      {/* Leaders */}
      <div className="leaders-wrap">
        <div className="leaders-title"><i className="bi bi-trophy me-2" style={{ color: '#fbbf24' }} />Top Performers by Metric</div>
        <div className="row g-3">
          {METRICS.map(m => {
            const leaders = topByMetric(m.key, m.hi !== false);
            return (
              <div key={m.key} className="col-md-3 col-6">
                <div className="leader-card" onClick={() => leaders[0] && setSelected(leaders[0])}>
                  <div className="leader-metric">{m.label}</div>
                  {leaders.map((a, i) => (
                    <div key={a.PlayerID} className="leader-row" onClick={e => { e.stopPropagation(); setSelected(a); }}>
                      <div className="leader-num">{i + 1}</div>
                      <div className="leader-name">{a.Name}</div>
                      <div className="leader-val">{a.Latest[m.key] || '—'}</div>
                    </div>
                  ))}
                  {leaders.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>No data</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <AthleteModal athlete={selected} onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); onRefresh(); }} user={user} />
      )}
    </div>
  );
}
