'use client';
import { useState, useEffect, useCallback } from 'react';
import { callGAS } from '@/lib/api';

interface Totals {
  athletes: number; tests: number; ir: number; self: number;
  attend: number; wellness: number; matches: number; users: number; skill: number;
}
interface ClubRow {
  username: string; displayName: string; clubId: string; role: string; createdAt: string;
  athletes: number; tests: number; lastTest: string | null; lastMatch: string | null; lastIR: string | null;
}
interface RecentTest    { playerName: string; timestamp: string; rating: number }
interface RecentIR      { playerName: string; timestamp: string; score: number }
interface RecentMatch   { opponent: string; date: string; result: 'W'|'D'|'L'; teamName: string; scoreFor: number; scoreAgainst: number }
interface RecentAthlete { name: string; team: string; clubId: string; createdAt: string }
interface MonitorData {
  totals: Totals;
  clubs: ClubRow[];
  recent: { tests: RecentTest[]; ir: RecentIR[]; matches: RecentMatch[]; athletes: RecentAthlete[] };
}

function fmtDate(s: string | null) {
  if (!s) return '—';
  try {
    const d = new Date(s);
    const now = Date.now();
    const diff = now - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'วันนี้';
    if (days === 1) return 'เมื่อวาน';
    if (days < 7)  return `${days} วันที่แล้ว`;
    if (days < 30) return `${Math.floor(days/7)} สัปดาห์ที่แล้ว`;
    return d.toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' });
  } catch { return s; }
}

function fmtTs(s: string) {
  try {
    return new Date(s).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return s; }
}

function activityScore(row: ClubRow): { score: number; label: string; color: string } {
  let s = 0;
  if (row.athletes > 0) s += 20;
  if (row.tests > 0) s += 20;
  if (row.lastTest) {
    const days = Math.floor((Date.now() - new Date(row.lastTest).getTime()) / 86400000);
    if (days < 7) s += 40; else if (days < 30) s += 25; else if (days < 90) s += 10;
  }
  if (row.lastMatch) s += 10;
  if (row.lastIR) s += 10;
  s = Math.min(100, s);
  const label = s >= 80 ? 'ใช้งานดี' : s >= 50 ? 'ปานกลาง' : s >= 20 ? 'ไม่ค่อยใช้' : 'ไม่ใช้งาน';
  const color = s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : s >= 20 ? '#f97316' : '#ef4444';
  return { score: s, label, color };
}

const STAT_CARDS = [
  { key: 'athletes', label: 'นักกีฬา', icon: 'bi-people-fill', color: '#38bdf8' },
  { key: 'tests',    label: 'ผลทดสอบ', icon: 'bi-clipboard-data-fill', color: '#818cf8' },
  { key: 'ir',       label: 'IDP โค้ช', icon: 'bi-clipboard2-check-fill', color: '#34d399' },
  { key: 'self',     label: 'Self Report', icon: 'bi-person-check-fill', color: '#a3e635' },
  { key: 'attend',   label: 'เช็คชื่อ', icon: 'bi-check2-square', color: '#f59e0b' },
  { key: 'wellness', label: 'Wellness', icon: 'bi-heart-pulse-fill', color: '#f87171' },
  { key: 'matches',  label: 'แมทช์', icon: 'bi-trophy-fill', color: '#fb923c' },
  { key: 'skill',    label: 'Skill Assess.', icon: 'bi-bullseye', color: '#c084fc' },
  { key: 'users',    label: 'Users', icon: 'bi-person-badge-fill', color: '#94a3b8' },
] as const;

export default function MonitorPage() {
  const [data, setData]     = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState<'overview'|'clubs'|'activity'>('overview');
  const [sortClub, setSortClub] = useState<'name'|'athletes'|'tests'|'activity'>('activity');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await callGAS('getMonitorStats') as MonitorData;
      setData(d); setLastRefresh(new Date());
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sortedClubs = data ? [...data.clubs].sort((a, b) => {
    if (sortClub === 'name')     return a.displayName.localeCompare(b.displayName);
    if (sortClub === 'athletes') return b.athletes - a.athletes;
    if (sortClub === 'tests')    return b.tests - a.tests;
    return activityScore(b).score - activityScore(a).score;
  }) : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">System Monitor</h2>
          <p className="page-subtitle">ภาพรวมระบบ · สถิติแยกสโมสร · กิจกรรมล่าสุด</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {lastRefresh && <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>อัพเดท {fmtTs(lastRefresh.toISOString())}</span>}
          <button className="btn-outline" onClick={load} disabled={loading} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <i className={`bi bi-arrow-clockwise${loading?' spin':''}`}/>{loading ? 'โหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:'0.85rem', color:'#991b1b' }}>
          <i className="bi bi-exclamation-circle me-2"/>Error: {error}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-switch" style={{ marginBottom:20 }}>
        {([
          { id:'overview', icon:'bi-grid-1x2-fill',   label:'ภาพรวมระบบ' },
          { id:'clubs',    icon:'bi-buildings-fill',   label:'แยกสโมสร' },
          { id:'activity', icon:'bi-activity',          label:'กิจกรรมล่าสุด' },
        ] as const).map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <i className={`bi ${t.icon} me-1`}/>{t.label}
          </button>
        ))}
      </div>

      {loading && !data && (
        <div style={{ textAlign:'center', padding:80 }}><div className="spinner-ring"/></div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && data && (
        <div>
          {/* Big stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
            {STAT_CARDS.map(c => (
              <div key={c.key} style={{ background:'var(--surface)', borderRadius:14, padding:'16px 18px', border:'1px solid var(--border)', borderTop:`4px solid ${c.color}`, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${c.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={`bi ${c.icon}`} style={{ color:c.color, fontSize:'1rem' }}/>
                  </div>
                </div>
                <div style={{ fontSize:'2rem', fontWeight:900, color:c.color, lineHeight:1 }}>{data.totals[c.key].toLocaleString()}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', fontWeight:700, marginTop:4, textTransform:'uppercase', letterSpacing:0.5 }}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Platform health bar */}
          <div className="surface" style={{ marginBottom:20, padding:'18px 22px' }}>
            <div style={{ fontWeight:800, fontSize:'0.9rem', marginBottom:16 }}><i className="bi bi-activity me-2" style={{ color:'#38bdf8' }}/>สุขภาพข้อมูลแพลตฟอร์ม</div>
            {(()=>{
              const t = data.totals;
              const metrics = [
                { label:'นักกีฬาในระบบ', val: Math.min(100, t.athletes), max: Math.max(t.athletes, 1), color:'#38bdf8', suffix: `${t.athletes} คน` },
                { label:'ผลทดสอบต่อนักกีฬา', val: t.athletes ? Math.min(100, Math.round(t.tests/t.athletes*20)) : 0, max:100, color:'#818cf8', suffix: t.athletes ? `${(t.tests/t.athletes).toFixed(1)} ครั้ง/คน` : '—' },
                { label:'IDP Coverage', val: t.athletes ? Math.min(100, Math.round(t.ir/t.athletes*100)) : 0, max:100, color:'#34d399', suffix: `${t.ir}/${t.athletes}` },
                { label:'Wellness Coverage', val: t.athletes ? Math.min(100, Math.round(t.wellness/t.athletes*20)) : 0, max:100, color:'#f87171', suffix: `${t.wellness} บันทึก` },
                { label:'Self Report', val: t.athletes ? Math.min(100, Math.round(t.self/t.athletes*100)) : 0, max:100, color:'#a3e635', suffix: `${t.self} ส่ง` },
                { label:'Match Records', val: Math.min(100, t.matches * 5), max:100, color:'#fb923c', suffix: `${t.matches} แมทช์` },
              ];
              return (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {metrics.map(m => (
                    <div key={m.label}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:'0.78rem', fontWeight:600, color:'var(--text)' }}>{m.label}</span>
                        <span style={{ fontSize:'0.75rem', color:m.color, fontWeight:700 }}>{m.suffix}</span>
                      </div>
                      <div style={{ height:8, borderRadius:8, background:'var(--bg)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:8, background:m.color, width:`${m.val}%`, transition:'width 0.8s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Quick club activity snapshot */}
          <div className="surface" style={{ padding:'16px 20px' }}>
            <div style={{ fontWeight:800, fontSize:'0.9rem', marginBottom:14 }}><i className="bi bi-buildings me-2" style={{ color:'#f59e0b' }}/>สถานะสโมสร ({data.clubs.length} สโมสร)</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10 }}>
              {data.clubs.map(club => {
                const ac = activityScore(club);
                return (
                  <div key={club.username} style={{ background:'var(--bg)', borderRadius:10, padding:'10px 14px', border:`1px solid var(--border)`, borderLeft:`3px solid ${ac.color}` }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:2 }}>{club.displayName}</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginBottom:8 }}>{club.role === 'club_pro' ? 'Club Pro' : 'Club'} · {club.clubId}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontSize:'0.7rem', color:'#38bdf8', fontWeight:700 }}>{club.athletes}</span>
                        <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}> นักกีฬา · </span>
                        <span style={{ fontSize:'0.7rem', color:'#818cf8', fontWeight:700 }}>{club.tests}</span>
                        <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}> test</span>
                      </div>
                      <span style={{ fontSize:'0.65rem', fontWeight:800, color:ac.color, background:`${ac.color}18`, borderRadius:6, padding:'2px 6px' }}>{ac.label}</span>
                    </div>
                    <div style={{ marginTop:6, fontSize:'0.62rem', color:'var(--text-muted)' }}>
                      Test: {fmtDate(club.lastTest)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CLUBS TAB ── */}
      {tab === 'clubs' && data && (
        <div>
          <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:600 }}>เรียงตาม:</span>
            {(['activity','athletes','tests','name'] as const).map(s => (
              <button key={s} onClick={()=>setSortClub(s)}
                style={{ padding:'4px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:700, cursor:'pointer',
                  background: sortClub===s ? '#38bdf8' : 'var(--surface)',
                  color: sortClub===s ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${sortClub===s ? 'transparent' : 'var(--border)'}`,
                }}>
                {s==='activity'?'Activity':s==='athletes'?'นักกีฬา':s==='tests'?'ผลทดสอบ':'ชื่อ'}
              </button>
            ))}
          </div>

          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                <thead>
                  <tr style={{ background:'var(--bg)' }}>
                    {['สโมสร','Role','Club ID','นักกีฬา','ผลทดสอบ','Test ล่าสุด','Match ล่าสุด','IDP ล่าสุด','Activity'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedClubs.map((club, i) => {
                    const ac = activityScore(club);
                    return (
                      <tr key={club.username} style={{ borderBottom:'1px solid var(--border)', background: i%2===0?'transparent':'var(--bg)' }}>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontWeight:700 }}>{club.displayName}</div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>@{club.username}</div>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ fontSize:'0.68rem', fontWeight:800, padding:'2px 8px', borderRadius:20,
                            background: club.role==='admin'?'#fef3c7':club.role==='club_pro'?'#ede9fe':'#eff6ff',
                            color: club.role==='admin'?'#92400e':club.role==='club_pro'?'#5b21b6':'#1d4ed8',
                          }}>{club.role}</span>
                        </td>
                        <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:'0.72rem', color:'var(--text-muted)' }}>{club.clubId||'—'}</td>
                        <td style={{ padding:'10px 14px', textAlign:'center', fontWeight:900, color:'#38bdf8', fontSize:'1rem' }}>{club.athletes}</td>
                        <td style={{ padding:'10px 14px', textAlign:'center', fontWeight:700, color:'#818cf8' }}>{club.tests}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.72rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtDate(club.lastTest)}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.72rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtDate(club.lastMatch)}</td>
                        <td style={{ padding:'10px 14px', fontSize:'0.72rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtDate(club.lastIR)}</td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:120 }}>
                            <div style={{ flex:1, height:6, borderRadius:6, background:'var(--border)', overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${ac.score}%`, background:ac.color, borderRadius:6, transition:'width 0.5s' }}/>
                            </div>
                            <span style={{ fontSize:'0.68rem', fontWeight:800, color:ac.color, minWidth:60 }}>{ac.score}% {ac.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inactive clubs alert */}
          {(()=>{
            const inactive = sortedClubs.filter(c => activityScore(c).score < 20);
            if (!inactive.length) return null;
            return (
              <div style={{ marginTop:16, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'14px 18px' }}>
                <div style={{ fontWeight:700, color:'#dc2626', marginBottom:8, fontSize:'0.85rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2"/>สโมสรไม่ใช้งาน ({inactive.length} สโมสร)
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {inactive.map(c => (
                    <span key={c.username} style={{ fontSize:'0.75rem', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'3px 10px', color:'#991b1b', fontWeight:700 }}>{c.displayName}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && data && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16 }}>

          {/* Recent Athletes */}
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-person-plus-fill" style={{ color:'#34d399' }}/>นักกีฬาใหม่ล่าสุด
            </div>
            {data.recent.athletes.map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#34d39918', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#34d399', fontSize:'0.8rem', flexShrink:0 }}>
                  {a.name[0]?.toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'0.82rem' }}>{a.name}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{a.team||'—'} · {a.clubId||'—'}</div>
                </div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(a.createdAt)}</div>
              </div>
            ))}
            {!data.recent.athletes.length && <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>ยังไม่มีข้อมูล</div>}
          </div>

          {/* Recent Tests */}
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-clipboard-data-fill" style={{ color:'#818cf8' }}/>ผลทดสอบล่าสุด
            </div>
            {data.recent.tests.map((t, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#818cf818', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#818cf8', fontSize:'0.9rem', flexShrink:0 }}>
                  {t.rating}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'0.82rem' }}>{t.playerName}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>Rating: {t.rating}/100</div>
                </div>
                <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(t.timestamp)}</div>
              </div>
            ))}
            {!data.recent.tests.length && <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>ยังไม่มีข้อมูล</div>}
          </div>

          {/* Recent Matches */}
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-trophy-fill" style={{ color:'#fb923c' }}/>แมทช์ล่าสุด
            </div>
            {data.recent.matches.map((m, i) => {
              const cfg = { W:{ bg:'#f0fdf4',color:'#166534',label:'ชนะ' }, D:{ bg:'#eff6ff',color:'#1e40af',label:'เสมอ' }, L:{ bg:'#fef2f2',color:'#dc2626',label:'แพ้' } };
              const c = cfg[m.result];
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ background:c.bg, color:c.color, borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:800, flexShrink:0 }}>{c.label}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem' }}>vs {m.opponent}</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{m.scoreFor}–{m.scoreAgainst} · {m.teamName||'—'}</div>
                  </div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(m.date)}</div>
                </div>
              );
            })}
            {!data.recent.matches.length && <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>ยังไม่มีข้อมูล</div>}
          </div>

          {/* Recent IDP */}
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-clipboard2-check-fill" style={{ color:'#34d399' }}/>IDP ล่าสุด
            </div>
            {data.recent.ir.map((r, i) => {
              const pct = Math.round(r.score);
              const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#38bdf8' : pct >= 40 ? '#f59e0b' : '#ef4444';
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color, fontSize:'0.75rem', flexShrink:0 }}>
                    {pct}%
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.82rem' }}>{r.playerName}</div>
                    <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>Overall IDP: {pct}%</div>
                  </div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', flexShrink:0 }}>{fmtDate(r.timestamp)}</div>
                </div>
              );
            })}
            {!data.recent.ir.length && <div style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem' }}>ยังไม่มีข้อมูล</div>}
          </div>
        </div>
      )}

      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
