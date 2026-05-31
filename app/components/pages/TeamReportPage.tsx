'use client';

import { useState } from 'react';
import { Athlete, Page, User } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import ReportBanner, { PrintHeader } from '../ReportBanner';

interface Props { athletes: Athlete[]; onNavigate: (p: Page, id?: string) => void; user: User; }

const METRICS = [
  { key: 'speed30',  field: 'Speed30'    as keyof Athlete['Latest'], label: 'Speed 30m',   unit: 's',    hi: false, color: '#f472b6' },
  { key: 'cmj',      field: 'CMJ'        as keyof Athlete['Latest'], label: 'CMJ',          unit: 'cm',   hi: true,  color: '#818cf8' },
  { key: 'agility',  field: 'Agility'    as keyof Athlete['Latest'], label: 'Agility',      unit: 's',    hi: false, color: '#fb923c' },
  { key: 'situp',    field: 'Situp'      as keyof Athlete['Latest'], label: 'Sit-up',       unit: 'reps', hi: true,  color: '#facc15' },
  { key: 'longjump', field: 'LongJump'   as keyof Athlete['Latest'], label: 'Long Jump',    unit: 'cm',   hi: true,  color: '#a3e635' },
  { key: 'yoyo',     field: 'YoYo'       as keyof Athlete['Latest'], label: 'Yo-Yo',        unit: 'm',    hi: true,  color: '#f87171' },
  { key: 'pushup',   field: 'Pushup'     as keyof Athlete['Latest'], label: 'Push-up',      unit: 'reps', hi: true,  color: '#4ade80' },
  { key: 'sitreach', field: 'SitAndReach'as keyof Athlete['Latest'], label: 'Sit & Reach',  unit: 'cm',   hi: true,  color: '#38bdf8' },
];

function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function daysSince(ts: string) {
  if (!ts) return 999;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export default function TeamReportPage({ athletes, onNavigate, user }: Props) {
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [hmSortKey, setHmSortKey] = useState<string>('rating');
  const [hmSortDir, setHmSortDir] = useState<1|-1>(1);

  const hmSort = (key: string) => {
    if (hmSortKey === key) setHmSortDir(d => d === 1 ? -1 : 1);
    else { setHmSortKey(key); setHmSortDir(1); }
  };

  const teams = Array.from(new Set(athletes.map(a => a.Team).filter(Boolean))).sort();
  const group = teamFilter === 'ALL' ? athletes : athletes.filter(a => a.Team === teamFilter);
  const tested = group.filter(a => (a.History?.length || 0) > 0);

  const ratings = tested.map(a => Number(a.Latest?.Rating) || 0).filter(v => v > 0);
  const avgRating = avg(ratings);
  const totalTests = group.reduce((s, a) => s + (a.History?.length || 0), 0);

  // Distribution buckets
  const dist = [
    { label: 'Elite (80+)',   min: 80, color: '#10b981' },
    { label: 'Good (60-79)',  min: 60, color: '#3b82f6' },
    { label: 'Avg (40-59)',   min: 40, color: '#f59e0b' },
    { label: 'Fair (<40)',    min: 0,  color: '#ef4444' },
  ].map(b => ({ ...b, count: ratings.filter(r => r >= b.min && (b.min === 80 || r < (b.min === 60 ? 80 : b.min === 40 ? 60 : 40))).length }));

  // Athletes needing attention: any metric score <= 2
  const needsAttention = group.filter(a => {
    return METRICS.some(m => {
      const sc = getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '');
      return sc > 0 && sc <= 2;
    });
  });

  // Overdue tests: no test in 30+ days or never tested
  const overdue = group.filter(a => {
    const last = a.History?.length ? a.History[a.History.length - 1]?.Timestamp : '';
    return daysSince(last) >= 30;
  });

  const handlePDF = () => window.print();

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          #teamReportArea > div:first-child {
            display: grid !important;
            grid-template-columns: repeat(5,1fr) !important;
            gap: 6px !important;
            margin-bottom: 4mm !important;
          }
          .kpi-card { padding: 8px 10px !important; border-radius: 8pt !important; }
          .kpi-val { font-size: 18pt !important; }
          .kpi-label { font-size: 7.5pt !important; }
          /* 2-col grid sections → stack on print */
          #teamReportArea > div:nth-child(2) {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          /* Tables */
          #teamReportArea table { font-size: 8pt !important; width: 100% !important; }
          #teamReportArea th { background: #f8fafc !important; font-size: 7.5pt !important; padding: 4px 6px !important; }
          #teamReportArea td { padding: 3px 6px !important; }
        }
      `}</style>
      <PrintHeader user={user} title="Team Report" subtitle="ภาพรวมสมรรถภาพทีม" />
      <div className="page-header">
        <div><h2 className="page-title">Team Report</h2><p className="page-subtitle">ภาพรวมสมรรถภาพทีม</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" style={{ width: 160 }} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
            <option value="ALL">ทุกรุ่น</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-primary" onClick={handlePDF}><i className="bi bi-printer me-1" />Print / PDF</button>
        </div>
      </div>

      <ReportBanner user={user} subtitle={`Team Report · ${teamFilter === 'ALL' ? 'ทุกรุ่น' : teamFilter}`} />
      <div id="teamReportArea">
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Athletes',     val: group.length,                icon: 'bi-people-fill',       color: '#38bdf8' },
            { label: 'Tested',       val: tested.length,               icon: 'bi-clipboard2-check',  color: '#34d399' },
            { label: 'Avg Rating',   val: Math.round(avgRating),       icon: 'bi-star-fill',         color: '#f472b6' },
            { label: 'Total Tests',  val: totalTests,                  icon: 'bi-activity',          color: '#818cf8' },
            { label: 'Overdue',      val: overdue.length,              icon: 'bi-exclamation-circle',color: overdue.length > 0 ? '#f87171' : '#94a3b8' },
          ].map(k => (
            <div key={k.label} className="kpi-card" style={{ '--kpi-color': k.color } as React.CSSProperties}>
              <div className="kpi-label"><i className={`bi ${k.icon} me-1`} />{k.label}</div>
              <div className="kpi-value">{k.val}</div>
            </div>
          ))}
        </div>

        <div className="grid-report">
          {/* Rating Distribution */}
          <div className="surface">
            <div className="section-hd"><i className="bi bi-bar-chart-fill" style={{ color: '#38bdf8' }} /> Rating Distribution</div>
            {dist.map(b => (
              <div key={b.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{b.label}</span>
                  <span style={{ fontWeight: 700, color: b.color }}>{b.count} คน</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 20, height: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: ratings.length ? `${(b.count / ratings.length) * 100}%` : '0%', background: b.color, borderRadius: 20, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))}
            {tested.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 16 }}>ไม่มีข้อมูล</p>}
          </div>

          {/* Overdue Tests */}
          <div className="surface">
            <div className="section-hd"><i className="bi bi-clock-history" style={{ color: '#f87171' }} /> Test Overdue (30+ วัน)</div>
            {overdue.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: '#22c55e', fontWeight: 700 }}><i className="bi bi-check-circle-fill me-2" />ทุกคน test แล้ว ✓</div>}
            {overdue.slice(0, 8).map(a => {
              const last = a.History?.length ? a.History[a.History.length - 1]?.Timestamp : '';
              const days = daysSince(last);
              return (
                <div key={a.PlayerID} onClick={() => onNavigate('scout', a.PlayerID)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: '#ef4444', flexShrink: 0 }}>
                    {(a.Name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.Name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.Team || '—'}</div>
                  </div>
                  <span style={{ background: days >= 999 ? '#fef2f2' : '#fff7ed', color: days >= 999 ? '#ef4444' : '#ea580c', borderRadius: 6, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {days >= 999 ? 'ไม่เคย test' : `${days} วันที่แล้ว`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Metric Leaders */}
        <div className="surface mb-4">
          <div className="section-hd"><i className="bi bi-trophy-fill" style={{ color: '#fbbf24' }} /> Top 3 Per Metric</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {METRICS.map(m => {
              const top = [...group]
                .filter(a => Number(a.Latest?.[m.field]) > 0)
                .sort((a, b) => m.hi ? Number(b.Latest[m.field]) - Number(a.Latest[m.field]) : Number(a.Latest[m.field]) - Number(b.Latest[m.field]))
                .slice(0, 3);
              return (
                <div key={m.key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderTop: `3px solid ${m.color}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: m.color, textTransform: 'uppercase', marginBottom: 10 }}>{m.label}</div>
                  {top.map((a, i) => (
                    <div key={a.PlayerID} onClick={() => onNavigate('scout', a.PlayerID)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, cursor: 'pointer' }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : '#b45309', color: 'white', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.Name}</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: m.color }}>{a.Latest[m.field]} {m.unit}</span>
                    </div>
                  ))}
                  {top.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>ไม่มีข้อมูล</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <div className="surface mb-4">
            <div className="section-hd"><i className="bi bi-exclamation-triangle-fill" style={{ color: '#f87171' }} /> ต้องการพัฒนาเร่งด่วน <span style={{ fontWeight: 400, fontSize: '0.78rem', color: '#94a3b8', marginLeft: 6 }}>score ≤ 2 ใน 1+ metric</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
              {needsAttention.map(a => {
                const weak = METRICS.filter(m => {
                  const sc = getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '');
                  return sc > 0 && sc <= 2;
                });
                return (
                  <div key={a.PlayerID} onClick={() => onNavigate('scout', a.PlayerID)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{a.Name}</span>
                      <span style={{ background: '#ef4444', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>Rating {a.Latest?.Rating || 0}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {weak.map(m => (
                        <span key={m.key} style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>
                          {m.label} {getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '')}/5
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Physical Heatmap ── */}
        {group.filter(a => a.Latest).length > 0 && (() => {
          const sorted = [...group].sort((a, b) => {
            let va: number, vb: number;
            if (hmSortKey === 'rating') {
              va = Number(a.Latest?.Rating) || 0;
              vb = Number(b.Latest?.Rating) || 0;
            } else if (hmSortKey === 'name') {
              return hmSortDir * (a.Name || '').localeCompare(b.Name || '');
            } else {
              const m = METRICS.find(x => x.key === hmSortKey);
              va = m ? getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '', a.Position || '') : 0;
              vb = m ? getScorePoint(m.key, String(b.Latest?.[m.field] || ''), b.DOB || '', b.Position || '') : 0;
            }
            return hmSortDir * (vb - va);
          });

          // column avg scores
          const metricAvgs = METRICS.map(m => {
            const vals = group.map(a => getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '', a.Position || '')).filter(s => s > 0);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          });

          const SortBtn = ({ k, label, style }: { k: string; label: string; style?: React.CSSProperties }) => (
            <th onClick={() => hmSort(k)} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, fontSize: '0.65rem', color: hmSortKey === k ? '#0f172a' : '#94a3b8', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', ...style }}>
              {label} {hmSortKey === k ? (hmSortDir === 1 ? '↑' : '↓') : ''}
            </th>
          );

          return (
            <div className="surface" style={{ marginBottom: 24 }}>
              <div className="section-hd">
                <i className="bi bi-grid-3x3-gap-fill" style={{ color: '#818cf8' }} /> Physical Heatmap
                <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>คลิกหัวคอลัมน์เพื่อจัดเรียง · คลิกผู้เล่นเพื่อดูรายละเอียด</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px 2px', fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <SortBtn k="name" label="ผู้เล่น" style={{ textAlign: 'left', minWidth: 130 }} />
                      <SortBtn k="rating" label="Rating" />
                      {METRICS.map(m => <SortBtn key={m.key} k={m.key} label={m.label.replace(' ','&')} />)}
                    </tr>
                    {/* Average row */}
                    <tr style={{ background: '#f1f5f9' }}>
                      <td style={{ padding: '5px 8px', fontWeight: 700, fontSize: '0.65rem', color: '#64748b' }}>ค่าเฉลี่ยทีม</td>
                      <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', color: '#64748b' }}>
                        {avgRating > 0 ? avgRating.toFixed(0) : '—'}
                      </td>
                      {metricAvgs.map((avg, i) => {
                        const sc = Math.round(avg) as 1|2|3|4|5;
                        const col = sc > 0 && SCORE_COLORS[sc] ? SCORE_COLORS[sc] : { bg: '#f1f5f9', color: '#94a3b8' };
                        return (
                          <td key={i} style={{ padding: '5px 6px', textAlign: 'center', background: avg > 0 ? col.bg : '#f1f5f9', borderRadius: 4 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: avg > 0 ? col.color : '#cbd5e1' }}>
                              {avg > 0 ? avg.toFixed(1) : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(a => {
                      const rating = Number(a.Latest?.Rating) || 0;
                      return (
                        <tr key={a.PlayerID} onClick={() => onNavigate('scout', a.PlayerID)}
                          style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.82')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                          <td style={{ padding: '7px 8px', fontWeight: 600 }}>
                            <div style={{ fontSize: '0.8rem' }}>{a.Name}</div>
                            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{a.Position || '—'} · {a.Team || '—'}</div>
                          </td>
                          <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: rating >= 70 ? '#16a34a' : rating >= 50 ? '#2563eb' : rating >= 30 ? '#d97706' : '#dc2626' }}>{rating || '—'}</span>
                          </td>
                          {METRICS.map(m => {
                            const sc = getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '', a.Position || '') as 0|1|2|3|4|5;
                            const col = sc > 0 ? SCORE_COLORS[sc] : null;
                            return (
                              <td key={m.key} style={{ padding: '4px 3px', textAlign: 'center' }}>
                                <div style={{ background: col?.bg || '#f1f5f9', color: col?.color || '#cbd5e1', borderRadius: 6, padding: '4px 0', fontWeight: 800, fontSize: '0.78rem', minWidth: 34 }}>
                                  {sc > 0 ? sc : '—'}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                {([5,4,3,2,1] as const).map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, background: SCORE_COLORS[s].bg, border: `1px solid ${SCORE_COLORS[s].color}40` }} />
                    <span style={{ fontSize: '0.68rem', color: SCORE_COLORS[s].color, fontWeight: 600 }}>{s} – {SCORE_COLORS[s].labelTH}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Full Roster Table */}
        <div className="surface">
          <div className="section-hd"><i className="bi bi-table" style={{ color: '#818cf8' }} /> รายชื่อนักกีฬาทั้งหมด ({group.length} คน)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>นักกีฬา</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rating</th>
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tests</th>
                  {METRICS.map(m => <th key={m.key} style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: m.color, textTransform: 'uppercase' }}>{m.label}</th>)}
                  <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Last Test</th>
                </tr>
              </thead>
              <tbody>
                {[...group].sort((a, b) => (Number(b.Latest?.Rating) || 0) - (Number(a.Latest?.Rating) || 0)).map((a, i) => {
                  const last = a.History?.length ? a.History[a.History.length - 1]?.Timestamp : '';
                  const days = daysSince(last);
                  return (
                    <tr key={a.PlayerID} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', cursor: 'pointer' }} onClick={() => onNavigate('scout', a.PlayerID)}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{a.Name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}><span className="score-pill" style={{ fontSize: '0.75rem', padding: '2px 10px' }}>{a.Latest?.Rating || 0}</span></td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{a.History?.length || 0}</td>
                      {METRICS.map(m => {
                        const sc = getScorePoint(m.key, String(a.Latest?.[m.field] || ''), a.DOB || '');
                        return (
                          <td key={m.key} style={{ padding: '10px 8px', textAlign: 'center' }}>
                            {sc > 0
                              ? <span style={{ background: sc >= 4 ? '#f0fdf4' : sc <= 2 ? '#fef2f2' : '#f8fafc', color: sc >= 4 ? '#16a34a' : sc <= 2 ? '#ef4444' : '#64748b', borderRadius: 4, padding: '2px 7px', fontWeight: 700, fontSize: '0.72rem' }}>{sc}/5</span>
                              : <span style={{ color: '#cbd5e1' }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', color: days >= 999 ? '#ef4444' : days >= 30 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>
                          {days >= 999 ? 'ไม่เคย' : days === 0 ? 'วันนี้' : `${days}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
