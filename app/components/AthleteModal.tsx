'use client';

import { useState } from 'react';
import { Athlete, User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';

interface Props {
  athlete: Athlete;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated?: (updated: Athlete) => void;
  user: User;
}

function getRatingGrade(r: number) {
  if (r >= 80) return { cls: 'grade-exc', label: 'Excellent' };
  if (r >= 60) return { cls: 'grade-good', label: 'Good' };
  if (r >= 40) return { cls: 'grade-avg', label: 'Average' };
  return { cls: 'grade-poor', label: 'Poor' };
}

const PERF_METRICS: { metric: string; latestKey: keyof Athlete['Latest']; label: string; unit: string; max: number; hi: boolean }[] = [
  { metric: 'speed30',  latestKey: 'Speed30',     label: 'Speed 30m',   unit: 's',  max: 6,    hi: false },
  { metric: 'cmj',      latestKey: 'CMJ',          label: 'CMJ',         unit: 'cm', max: 60,   hi: true  },
  { metric: 'agility',  latestKey: 'Agility',      label: 'Agility',     unit: 's',  max: 25,   hi: false },
  { metric: 'yoyo',     latestKey: 'YoYo',         label: 'Yo-Yo',       unit: 'm',  max: 2000, hi: true  },
  { metric: 'pushup',   latestKey: 'Pushup',       label: 'Push-up 40s', unit: '',   max: 60,   hi: true  },
  { metric: 'situp',    latestKey: 'Situp',        label: 'Sit-up 40s',  unit: '',   max: 70,   hi: true  },
  { metric: 'longjump', latestKey: 'LongJump',     label: 'Long Jump',   unit: 'cm', max: 280,  hi: true  },
  { metric: 'sitreach', latestKey: 'SitAndReach',  label: 'Sit & Reach', unit: 'cm', max: 35,   hi: true  },
];

const POSITIONS = ['FWD', 'MID', 'DEF', 'GK', 'FWD/MID', 'MID/DEF'];
const TEAMS = ['U10', 'U12', 'U14', 'U15', 'U17', 'U19', 'U21', 'Senior'];

export default function AthleteModal({ athlete: a, onClose, onDeleted, onUpdated, user }: Props) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: a.Name || '', nickname: a.Nickname || '', dob: a.DOB || '',
    team: a.Team || '', position: a.Position || '', club: a.Club || '',
    province: a.Province || '', domHand: a.DomHand || 'R', domFoot: a.DomFoot || 'R',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const rating = Number(a.Latest?.Rating) || 0;
  const grade = getRatingGrade(rating);
  const age = a.DOB ? Math.floor((Date.now() - new Date(a.DOB).getTime()) / 31557600000) : null;
  const initials = (a.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const setField = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  const handleDelete = async () => {
    if (!confirm(`ลบ ${a.Name} และประวัติทดสอบทั้งหมดออกจากระบบ?`)) return;
    setDeleting(true);
    try {
      await callGAS('deleteAthlete', { playerId: a.PlayerID });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setEditMsg(null);
    try {
      const res = await callGAS('updateAthlete', { playerId: a.PlayerID, ...editForm }) as { status: string; message: string };
      if (res.status === 'success') {
        setEditMsg({ type: 'success', text: res.message });
        setEditing(false);
        if (onUpdated) onUpdated({ ...a, ...editForm, Name: editForm.name, Nickname: editForm.nickname, DOB: editForm.dob, Team: editForm.team, Position: editForm.position, Club: editForm.club, Province: editForm.province, DomHand: editForm.domHand, DomFoot: editForm.domFoot });
      } else {
        setEditMsg({ type: 'error', text: res.message });
      }
    } catch {
      setEditMsg({ type: 'error', text: 'Connection error' });
    } finally {
      setSaving(false);
    }
  };

  // Calculate per-metric scores for S/W analysis
  const metricScores = PERF_METRICS.map(m => ({
    ...m,
    val: Number(a.Latest?.[m.latestKey]) || 0,
    score: a.Latest?.[m.latestKey] && a.DOB
      ? getScorePoint(m.metric, a.Latest[m.latestKey] as string, a.DOB)
      : 0,
  })).filter(m => m.val > 0);

  const strengths = metricScores.filter(m => m.score >= 4);
  const weaknesses = metricScores.filter(m => m.score <= 2);

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 820 }}>
        <button className="modal-close" onClick={onClose}><i className="bi bi-x" /></button>

        {/* Aurora header */}
        <div className="aurora-header">
          <div className="pc-info-wrap">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div className="avatar" style={{ width: 64, height: 64, fontSize: '1.2rem', borderRadius: 16, flexShrink: 0 }}>
                {a.PhotoUrl ? <img src={a.PhotoUrl} alt={a.Name} /> : initials}
              </div>
              <div>
                <div className="pc-label">Athlete Profile</div>
                <div className="pc-name" style={{ fontSize: '1.7rem', marginBottom: 0 }}>{a.Name}</div>
              </div>
            </div>
            <div className="pc-meta">
              {a.Nickname && <span className="pc-meta-item"><i className="bi bi-tag" />{a.Nickname}</span>}
              {a.Team && <span className="pc-meta-item"><i className="bi bi-shield" />{a.Team}</span>}
              {a.Position && <span className="pc-meta-item"><i className="bi bi-geo-alt" />{a.Position}</span>}
              {age && <span className="pc-meta-item"><i className="bi bi-calendar" />{age} yrs</span>}
              {a.Club && <span className="pc-meta-item"><i className="bi bi-building" />{a.Club}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, position: 'relative', zIndex: 2 }}>
            {rating > 0 && (
              <div className={`pc-rating-badge ${grade.cls}`}>
                <div className="pc-rating-val">{rating}</div>
                <div className="pc-rating-lbl">{grade.label}</div>
              </div>
            )}
            <button
              className="btn-outline btn-sm"
              onClick={() => { setEditing(e => !e); setEditMsg(null); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
            >
              <i className={`bi bi-${editing ? 'x' : 'pencil'}`} /> {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="surface mb-4" style={{ border: '2px solid rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.02)' }}>
            <div className="section-hd"><i className="bi bi-pencil-square" style={{ color: 'var(--accent)' }} /> Edit Athlete Info</div>
            <div className="row g-3 mb-3">
              <div className="col-md-6"><label className="form-label">Full Name</label><input className="form-control" value={editForm.name} onChange={e => setField('name', e.target.value)} /></div>
              <div className="col-md-6"><label className="form-label">Nickname</label><input className="form-control" value={editForm.nickname} onChange={e => setField('nickname', e.target.value)} /></div>
              <div className="col-md-4"><label className="form-label">Date of Birth</label><input type="date" className="form-control" value={editForm.dob} onChange={e => setField('dob', e.target.value)} /></div>
              <div className="col-md-4"><label className="form-label">Team</label>
                <select className="form-select" value={editForm.team} onChange={e => setField('team', e.target.value)}>
                  <option value="">—</option>{TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-md-4"><label className="form-label">Position</label>
                <select className="form-select" value={editForm.position} onChange={e => setField('position', e.target.value)}>
                  <option value="">—</option>{POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="col-md-4"><label className="form-label">Club</label><input className="form-control" value={editForm.club} onChange={e => setField('club', e.target.value)} /></div>
              <div className="col-md-4"><label className="form-label">Province</label><input className="form-control" value={editForm.province} onChange={e => setField('province', e.target.value)} /></div>
              <div className="col-md-2"><label className="form-label">Dom. Hand</label>
                <select className="form-select" value={editForm.domHand} onChange={e => setField('domHand', e.target.value)}>
                  <option value="R">R</option><option value="L">L</option><option value="A">Both</option>
                </select>
              </div>
              <div className="col-md-2"><label className="form-label">Dom. Foot</label>
                <select className="form-select" value={editForm.domFoot} onChange={e => setField('domFoot', e.target.value)}>
                  <option value="R">R</option><option value="L">L</option><option value="A">Both</option>
                </select>
              </div>
            </div>
            {editMsg && (
              <div className="mb-3" style={{ background: editMsg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${editMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: editMsg.type === 'success' ? '#166534' : '#991b1b' }}>
                <i className={`bi bi-${editMsg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />{editMsg.text}
              </div>
            )}
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> Saving…</> : <><i className="bi bi-check-lg" /> Save Changes</>}
            </button>
          </div>
        )}

        {/* Info boxes */}
        <div className="info-flex">
          {[
            { label: 'Club', value: a.Club || '—' },
            { label: 'Province', value: a.Province || '—' },
            { label: 'Dom. Hand', value: a.DomHand || '—' },
            { label: 'Dom. Foot', value: a.DomFoot || '—' },
            { label: 'Player ID', value: a.PlayerID },
          ].map(item => (
            <div key={item.label} className="info-box">
              <span className="info-label">{item.label}</span>
              <span className="info-value" style={{ fontSize: item.label === 'Player ID' ? '0.72rem' : undefined }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Latest test — body composition */}
        {a.Latest?.Height && (
          <>
            <div className="surface mb-4">
              <div className="section-hd"><i className="bi bi-activity" /> Latest Test</div>
              <div className="info-flex" style={{ marginBottom: 20 }}>
                {[
                  { label: 'Height', value: a.Latest.Height ? `${a.Latest.Height} cm` : '—' },
                  { label: 'Weight', value: a.Latest.Weight ? `${a.Latest.Weight} kg` : '—' },
                  { label: 'BMI', value: a.Latest.BMI || '—' },
                  { label: 'Muscle', value: a.Latest.Muscle ? `${a.Latest.Muscle}%` : '—' },
                  { label: 'Body Fat', value: a.Latest.Fat ? `${a.Latest.Fat}%` : '—' },
                  { label: 'Peak Power', value: a.Latest.PeakPower ? `${a.Latest.PeakPower} W` : '—' },
                  { label: 'VO₂Max', value: a.Latest.VO2Max ? `${a.Latest.VO2Max}` : '—' },
                ].map(item => (
                  <div key={item.label} className="info-box">
                    <span className="info-label">{item.label}</span>
                    <span className="info-value">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Per-metric scores */}
              {metricScores.map(m => {
                const pct = m.hi ? Math.min(100, (m.val / m.max) * 100) : Math.min(100, ((m.max - m.val) / m.max) * 100);
                const sc = m.score;
                const col = sc > 0 ? SCORE_COLORS[sc] : null;
                return (
                  <div key={m.metric} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 110, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{m.label}</div>
                    <div className="score-bar-wrap" style={{ flex: 1 }}>
                      <div className="score-bar" style={{ width: `${pct}%`, background: col ? col.bg.replace(')', ', 0.8)').replace('rgb', 'rgba') : undefined }} />
                    </div>
                    <div style={{ width: 54, fontSize: '0.85rem', fontWeight: 700, textAlign: 'right', flexShrink: 0, color: 'var(--text-muted)' }}>
                      {m.val}{m.unit && ` ${m.unit}`}
                    </div>
                    {col && sc > 0 && (
                      <div style={{ width: 76, flexShrink: 0, background: col.bg, color: col.color, borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700, textAlign: 'center' }}>
                        {sc}/5 {col.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Strengths / Weaknesses */}
            {(strengths.length > 0 || weaknesses.length > 0) && (
              <div className="perf-split mb-4">
                {strengths.length > 0 && (
                  <div>
                    <div className="sw-box">
                      <div className="sw-title str"><i className="bi bi-lightning-charge-fill" /> Strengths</div>
                      <div className="sw-tags">
                        {strengths.map(m => (
                          <span key={m.metric} style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-check2" /> {m.label} ({m.score}/5)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div>
                    <div className="sw-box">
                      <div className="sw-title weak"><i className="bi bi-arrow-up-circle" /> Areas to Improve</div>
                      <div className="sw-tags">
                        {weaknesses.map(m => (
                          <span key={m.metric} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '5px 12px', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <i className="bi bi-exclamation-circle" /> {m.label} ({m.score}/5)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Test history */}
        {a.History && a.History.length > 0 && (
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-clock-history" /> Test History ({a.History.length})</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-perf">
                <thead>
                  <tr>
                    <th>Date</th><th>Rating</th><th>Speed</th><th>CMJ</th><th>Agility</th><th>Yo-Yo</th><th>Pushup</th><th>Situp</th><th>Long Jump</th>
                  </tr>
                </thead>
                <tbody>
                  {a.History.map((h, i) => (
                    <tr key={i} style={{ opacity: i === 0 ? 1 : 0.72 }}>
                      <td style={{ fontWeight: i === 0 ? 700 : 400, fontSize: '0.82rem' }}>{h.Timestamp?.split(' ')[0] || '—'}</td>
                      <td><span className="score-pill" style={{ fontSize: '0.78rem', padding: '2px 10px' }}>{h.Rating || '—'}</span></td>
                      <td>{h.Speed30 || '—'}</td>
                      <td>{h.CMJ || '—'}</td>
                      <td>{h.Agility || '—'}</td>
                      <td>{h.YoYo || '—'}</td>
                      <td>{h.Pushup || '—'}</td>
                      <td>{h.Situp || '—'}</td>
                      <td>{h.LongJump || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {a.History?.length === 0 && !editing && (
          <div style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            <i className="bi bi-clipboard-x" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8 }} />
            No test data recorded yet
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>
            {user.role === 'admin' && (
              <button className="btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                {deleting
                  ? <><span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, margin: 0 }} /> Deleting…</>
                  : <><i className="bi bi-trash" /> Delete Athlete</>}
              </button>
            )}
          </div>
          <button className="btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
