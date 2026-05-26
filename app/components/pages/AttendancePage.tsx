'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Athlete, AttendanceRecord, AttendanceStatus, SessionType, User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface Props { athletes: Athlete[]; user: User; }

/* ── Constants ─────────────────────────────────────────── */
const STATUS_CFG: Record<AttendanceStatus, { label: string; labelEN: string; icon: string; bg: string; color: string; border: string }> = {
  present: { label:'มา',   labelEN:'Present', icon:'bi-check-circle-fill', bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0' },
  absent:  { label:'ขาด',  labelEN:'Absent',  icon:'bi-x-circle-fill',     bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
  late:    { label:'สาย',  labelEN:'Late',    icon:'bi-clock-fill',         bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  excuse:  { label:'ลา',   labelEN:'Excuse',  icon:'bi-file-text-fill',     bg:'#eff6ff', color:'#2563eb', border:'#bfdbfe' },
};

const SESSION_TYPES: { id: SessionType; label: string; icon: string; color: string }[] = [
  { id:'training', label:'ฝึกซ้อม',   icon:'bi-activity',         color:'#38bdf8' },
  { id:'match',    label:'แข่งขัน',   icon:'bi-trophy-fill',       color:'#f59e0b' },
  { id:'fitness',  label:'กายภาพ',    icon:'bi-lightning-charge-fill', color:'#34d399' },
  { id:'other',    label:'อื่นๆ',      icon:'bi-three-dots',        color:'#94a3b8' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }); }
  catch { return d; }
}

/* ── Main component ────────────────────────────────────── */
export default function AttendancePage({ athletes, user }: Props) {
  // Session form
  const [sessionDate, setSessionDate] = useState(todayStr());
  const [sessionName, setSessionName] = useState('ซ้อมเช้า');
  const [sessionType, setSessionType] = useState<SessionType>('training');

  // Attendance state: playerId → status
  const [statuses, setStatuses]       = useState<Record<string, AttendanceStatus>>({});
  const [notes,    setNotes]          = useState<Record<string, string>>({});
  const [saving, setSaving]           = useState(false);

  // History
  const [sessions, setSessions]       = useState<{ session_date:string; session_name:string; session_type:string }[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string|null>(null); // "date|name"
  const [histRecords, setHistRecords] = useState<AttendanceRecord[]>([]);
  const [view, setView]               = useState<'check'|'history'|'stats'>('check');

  // Filter
  const [filterTeam, setFilterTeam]   = useState('ALL');
  const [filterPos,  setFilterPos]    = useState('ALL');
  const [search,     setSearch]       = useState('');
  const [showQR, setShowQR]           = useState(false);
  const [qrUrl, setQrUrl]             = useState('');

  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean)))], [athletes]);

  const filteredAthletes = useMemo(() => athletes.filter(a => {
    if (filterTeam !== 'ALL' && a.Team !== filterTeam) return false;
    if (search) { const q = search.toLowerCase(); return (a.Name||'').toLowerCase().includes(q) || (a.Nickname||'').toLowerCase().includes(q); }
    return true;
  }), [athletes, filterTeam, search]);

  /* ── Load sessions list ── */
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const d = await callGAS('getAttendanceSessions') as typeof sessions;
      setSessions(Array.isArray(d) ? d : []);
    } finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { if (view === 'history' || view === 'stats') loadSessions(); }, [view, loadSessions]);

  /* ── Load session records when selected ── */
  const loadSessionRecords = useCallback(async (key: string) => {
    const [date, name] = key.split('|');
    const d = await callGAS('getAttendanceBySession', { sessionDate: date, sessionName: name }) as AttendanceRecord[];
    setHistRecords(Array.isArray(d) ? d : []);
    setSelectedSession(key);
  }, []);

  const handleShowQR = () => {
    if (!sessionDate || !sessionName) { showToast('กรุณากรอกวันที่และชื่อ session ก่อน', 'error'); return; }
    const clubId = user.clubId || '';
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${base}/checkin?date=${encodeURIComponent(sessionDate)}&session=${encodeURIComponent(sessionName)}&type=${encodeURIComponent(sessionType)}&club=${encodeURIComponent(clubId)}`;
    setQrUrl(link);
    setShowQR(true);
  };

  /* ── Mark all present ── */
  const markAll = (status: AttendanceStatus) => {
    const label = STATUS_CFG[status].label;
    if (!confirm(`Mark "${label}" ให้กับนักกีฬา ${filteredAthletes.length} คนทั้งหมด?`)) return;
    setStatuses(filteredAthletes.reduce((acc, a) => ({ ...acc, [a.PlayerID]: status }), {}));
  };

  /* ── Save attendance ── */
  const handleSave = async () => {
    if (!sessionDate || !sessionName) { showToast('กรุณากรอกวันที่และชื่อ session', 'error'); return; }
    setSaving(true);
    try {
      const records = athletes.map(a => ({
        sessionDate, sessionName, sessionType,
        playerId: a.PlayerID,
        status: statuses[a.PlayerID] || 'absent',
        notes: notes[a.PlayerID] || '',
        createdBy: user.displayName || user.username,
      }));
      const res = await callGAS('saveAttendance', { records }) as { status:string; message:string };
      if (res.status === 'success') {
        showToast(`✅ ${res.message}`, 'success');
        loadSessions();
      } else {
        showToast(res.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      showToast(`❌ ${errMsg}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Stats computation ── */
  const statsData = useMemo(() => {
    if (!sessions.length) return [];
    return athletes.map(a => {
      const total = sessions.length;
      // We'd need all records for stats — show placeholder until loaded
      return { athlete: a, total };
    });
  }, [athletes, sessions]);

  /* ── Summary of current check-in ── */
  const summary = useMemo(() => {
    const vals = Object.values(statuses);
    return {
      present: vals.filter(s=>s==='present').length,
      absent:  vals.filter(s=>s==='absent').length,
      late:    vals.filter(s=>s==='late').length,
      excuse:  vals.filter(s=>s==='excuse').length,
      total:   filteredAthletes.length,
      marked:  vals.length,
    };
  }, [statuses, filteredAthletes]);

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">เช็คชื่อฝึกซ้อม</h2>
          <p className="page-subtitle">บันทึกการมาฝึกซ้อม · ติดตามสถิติ · Attendance Tracking</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {view === 'check' && (
            <button className="btn-outline" onClick={handleShowQR} style={{ borderColor:'#38bdf8', color:'#38bdf8' }}>
              <i className="bi bi-qr-code me-1"/>QR Check-in
            </button>
          )}
          <button className="btn-primary" onClick={handleSave} disabled={saving || view !== 'check'}>
            {saving ? <><span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,margin:0 }}/> บันทึก...</> : <><i className="bi bi-floppy me-1"/>บันทึก</>}
          </button>
        </div>
      </div>

      {/* Tab switch */}
      <div className="tab-switch" style={{ marginBottom:20 }}>
        {[
          { id:'check',   icon:'bi-check2-square', label:'เช็คชื่อ' },
          { id:'history', icon:'bi-clock-history',  label:'ประวัติ' },
          { id:'stats',   icon:'bi-bar-chart-fill', label:'สถิติ' },
        ].map(t => (
          <button key={t.id} className={`tab-btn${view===t.id?' active':''}`} onClick={() => setView(t.id as typeof view)}>
            <i className={`bi ${t.icon} me-1`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: CHECK-IN ══════════ */}
      {view === 'check' && (
        <div>
          {/* Session form */}
          <div className="surface" style={{ marginBottom:16 }}>
            <div className="section-hd" style={{ marginBottom:14 }}>
              <i className="bi bi-calendar-event me-2" style={{ color:'#38bdf8' }}/>ข้อมูล Session
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ minWidth:160 }}>
                <label className="form-label">วันที่</label>
                <input type="date" className="form-control" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/>
              </div>
              <div style={{ flex:1, minWidth:160 }}>
                <label className="form-label">ชื่อ Session</label>
                <input className="form-control" value={sessionName} onChange={e=>setSessionName(e.target.value)} placeholder="เช่น ซ้อมเช้า, ซ้อมเย็น, เตรียม Match"/>
              </div>
              <div>
                <label className="form-label">ประเภท</label>
                <div style={{ display:'flex', gap:6 }}>
                  {SESSION_TYPES.map(t => (
                    <button key={t.id} onClick={() => setSessionType(t.id)} style={{
                      padding:'8px 12px', borderRadius:9, fontWeight:700, fontSize:'0.75rem', cursor:'pointer', transition:'all 0.15s',
                      background: sessionType===t.id ? t.color : 'var(--bg)',
                      color: sessionType===t.id ? 'white' : 'var(--text-muted)',
                      border: `1.5px solid ${sessionType===t.id ? t.color : 'var(--border)'}`,
                    }}>
                      <i className={`bi ${t.icon} me-1`}/>{t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions + filter */}
          <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)' }}>เลือกทั้งหมด:</span>
            {(Object.keys(STATUS_CFG) as AttendanceStatus[]).map(s => {
              const c = STATUS_CFG[s];
              return (
                <button key={s} onClick={() => markAll(s)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:700, cursor:'pointer', background:c.bg, color:c.color, border:`1px solid ${c.border}` }}>
                  <i className={`bi ${c.icon}`}/>{c.label}
                </button>
              );
            })}
            <div style={{ flex:1 }}/>
            <select className="form-select" value={filterTeam} onChange={e=>setFilterTeam(e.target.value)} style={{ width:'auto' }}>
              {teams.map(t => <option key={t} value={t}>{t === 'ALL' ? 'ทุกทีม' : t}</option>)}
            </select>
            <div className="search-wrap" style={{ minWidth:160 }}>
              <i className="bi bi-search"/>
              <input className="form-control" placeholder="ชื่อ..." value={search} onChange={e=>setSearch(e.target.value)} style={{ fontSize:'0.8rem' }}/>
            </div>
          </div>

          {/* Summary bar */}
          {summary.marked > 0 && (
            <div style={{ display:'flex', gap:10, marginBottom:14, padding:'10px 14px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, flexWrap:'wrap' }}>
              {(Object.keys(STATUS_CFG) as AttendanceStatus[]).map(s => {
                const c = STATUS_CFG[s];
                const n = summary[s as keyof typeof summary] as number;
                return (
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <i className={`bi ${c.icon}`} style={{ color:c.color }}/>
                    <span style={{ fontWeight:800, fontSize:'0.9rem', color:c.color }}>{n}</span>
                    <span style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{c.label}</span>
                  </div>
                );
              })}
              <span style={{ marginLeft:'auto', fontSize:'0.72rem', color:'var(--text-muted)' }}>
                มาร์กแล้ว {summary.marked}/{summary.total}
              </span>
            </div>
          )}

          {/* Athlete roster */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filteredAthletes.map((a, idx) => {
              const st = statuses[a.PlayerID];
              const cfg = st ? STATUS_CFG[st] : null;
              const rating = Number(a.Latest?.Rating)||0;
              return (
                <div key={a.PlayerID} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                  background: cfg ? cfg.bg : 'var(--surface)',
                  border: `1.5px solid ${cfg ? cfg.border : 'var(--border)'}`,
                  borderRadius:12, transition:'all 0.15s',
                }}>
                  {/* Number */}
                  <div style={{ width:24, height:24, borderRadius:6, background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', flexShrink:0 }}>
                    {idx+1}
                  </div>
                  {/* Photo */}
                  <div style={{ width:36, height:36, borderRadius:10, overflow:'hidden', flexShrink:0, background:'var(--bg)', border:'1px solid var(--border)' }}>
                    {a.PhotoUrl
                      ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.8rem', color:'var(--text-muted)' }}>
                          {(a.Name||'?')[0].toUpperCase()}
                        </div>}
                  </div>
                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:'0.88rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.Name}</div>
                    <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:1 }}>
                      {a.Nickname && <span style={{ fontWeight:600, marginRight:6 }}>{a.Nickname}</span>}
                      {a.Position && <span style={{ background:'rgba(56,189,248,0.1)', color:'#38bdf8', borderRadius:4, padding:'1px 5px', fontWeight:700 }}>{a.Position}</span>}
                      {a.Team && <span style={{ marginLeft:5, color:'var(--text-muted)' }}>{a.Team}</span>}
                    </div>
                  </div>
                  {/* Rating */}
                  {rating > 0 && (
                    <div style={{ fontSize:'0.8rem', fontWeight:900, color:'var(--text-muted)', flexShrink:0 }}>{rating}</div>
                  )}
                  {/* Status buttons */}
                  <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                    {(Object.keys(STATUS_CFG) as AttendanceStatus[]).map(s => {
                      const c = STATUS_CFG[s];
                      const active = st === s;
                      return (
                        <button key={s} onClick={() => setStatuses(prev => ({ ...prev, [a.PlayerID]: s }))} title={c.labelEN} style={{
                          width:34, height:34, borderRadius:9, border: `1.5px solid ${active ? c.color : '#e2e8f0'}`,
                          background: active ? c.bg : 'white', color: active ? c.color : '#94a3b8',
                          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'1rem', transition:'all 0.12s',
                          transform: active ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: active ? `0 2px 8px ${c.color}44` : 'none',
                        }}>
                          <i className={`bi ${c.icon}`}/>
                        </button>
                      );
                    })}
                  </div>
                  {/* Notes input (shown when absent/late) */}
                  {(st === 'absent' || st === 'excuse') && (
                    <input className="form-control" value={notes[a.PlayerID]||''} onChange={e=>setNotes(prev=>({...prev,[a.PlayerID]:e.target.value}))}
                      placeholder="หมายเหตุ..." style={{ width:130, fontSize:'0.75rem', padding:'5px 10px' }}/>
                  )}
                </div>
              );
            })}
            {filteredAthletes.length === 0 && (
              <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>ไม่พบนักกีฬา</div>
            )}
          </div>

        </div>
      )}

      {/* ══════════ TAB: HISTORY ══════════ */}
      {view === 'history' && (
        <div className="grid-attend-hist">
          {/* Session list */}
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span><i className="bi bi-calendar3 me-2" style={{ color:'#38bdf8' }}/>Sessions ({sessions.length})</span>
              {loadingSessions && <span className="spinner-ring" style={{ width:14,height:14,borderWidth:2 }}/>}
            </div>
            <div style={{ maxHeight:500, overflowY:'auto' }}>
              {sessions.length === 0 && !loadingSessions && (
                <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:'0.82rem' }}>ยังไม่มีประวัติ</div>
              )}
              {sessions.map((s, i) => {
                const key = `${s.session_date}|${s.session_name}`;
                const tc = SESSION_TYPES.find(t=>t.id===s.session_type)||SESSION_TYPES[0];
                const active = selectedSession === key;
                return (
                  <div key={i} onClick={() => loadSessionRecords(key)} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'11px 16px', cursor:'pointer',
                    background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
                    borderLeft: active ? '3px solid #38bdf8' : '3px solid transparent',
                    borderBottom:'1px solid var(--border)',
                  }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${tc.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className={`bi ${tc.icon}`} style={{ color:tc.color, fontSize:'0.85rem' }}/>
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.82rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.session_name}</div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:1 }}>{fmtDate(s.session_date)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session detail */}
          <div>
            {!selectedSession ? (
              <div className="surface" style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
                <i className="bi bi-calendar-event" style={{ fontSize:'2.5rem', display:'block', marginBottom:10, color:'#cbd5e1' }}/>
                <p style={{ margin:0 }}>เลือก Session ด้านซ้ายเพื่อดูรายละเอียด</p>
              </div>
            ) : (() => {
              const [sDate, sName] = selectedSession.split('|');
              const present = histRecords.filter(r=>r.status==='present').length;
              const absent  = histRecords.filter(r=>r.status==='absent').length;
              const late    = histRecords.filter(r=>r.status==='late').length;
              const excuse  = histRecords.filter(r=>r.status==='excuse').length;
              const total   = histRecords.length;
              const rate    = total ? Math.round((present+late)/total*100) : 0;

              return (
                <div>
                  {/* Summary */}
                  <div className="surface" style={{ marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'1rem' }}>{sName}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:2 }}>{fmtDate(sDate)} · {total} คน</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontSize:'2rem', fontWeight:900, color: rate>=90?'#10b981':rate>=75?'#38bdf8':'#f59e0b' }}>{rate}%</div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:700 }}>ATTENDANCE RATE</div>
                        </div>
                        <div style={{ display:'flex', gap:10 }}>
                          {[{l:'มา',c:'#16a34a',n:present},{l:'สาย',c:'#d97706',n:late},{l:'ลา',c:'#2563eb',n:excuse},{l:'ขาด',c:'#dc2626',n:absent}].map(x=>(
                            <div key={x.l} style={{ textAlign:'center' }}>
                              <div style={{ fontWeight:900, fontSize:'1.2rem', color:x.c }}>{x.n}</div>
                              <div style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{x.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance list */}
                  <div className="surface" style={{ padding:0, overflow:'hidden' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft:16 }}>นักกีฬา</th>
                          <th>ทีม</th>
                          <th style={{ textAlign:'center' }}>สถานะ</th>
                          <th>หมายเหตุ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histRecords.map(r => {
                          const a = athletes.find(x=>x.PlayerID===r.playerId);
                          const cfg = STATUS_CFG[r.status as AttendanceStatus] || STATUS_CFG.absent;
                          return (
                            <tr key={r.id}>
                              <td style={{ paddingLeft:16, fontWeight:600 }}>{a?.Name || r.playerId}</td>
                              <td style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>{a?.Team||'—'}</td>
                              <td style={{ textAlign:'center' }}>
                                <span style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`, borderRadius:20, padding:'3px 10px', fontSize:'0.72rem', fontWeight:800, display:'inline-flex', alignItems:'center', gap:4 }}>
                                  <i className={`bi ${cfg.icon}`}/>{cfg.label}
                                </span>
                              </td>
                              <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>{r.notes||'—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══════════ TAB: STATS ══════════ */}
      {view === 'stats' && (
        <div>
          <div className="surface" style={{ marginBottom:16, padding:'14px 18px' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-info-circle" style={{ color:'#38bdf8' }}/>
              สถิติคำนวณจาก {sessions.length} session ที่บันทึกไว้
            </div>
          </div>
          {loadingSessions ? (
            <div style={{ textAlign:'center', padding:40 }}><div className="spinner-ring"/></div>
          ) : (
            <AttendanceStats athletes={athletes} sessions={sessions}/>
          )}
        </div>
      )}

      {/* ── QR CHECK-IN MODAL ── */}
      {showQR && (
        <div onClick={() => setShowQR(false)} style={{ position:'fixed', inset:0, background:'rgba(10,18,40,0.82)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center', padding:16, backdropFilter:'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius:20, width:'100%', maxWidth:400, padding:'28px 24px', textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,0.5)', position:'relative' }}>
            <button onClick={() => setShowQR(false)} style={{ position:'absolute', top:14, right:16, background:'none', border:'none', cursor:'pointer', fontSize:'1.3rem', color:'#94a3b8', lineHeight:1, padding:0 }}>×</button>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#38bdf8,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', margin:'0 auto 12px' }}>
              <i className="bi bi-qr-code" style={{ color:'white', fontSize:'1.2rem' }}/>
            </div>
            <div style={{ fontWeight:800, fontSize:'1rem', marginBottom:4 }}>QR Check-in</div>
            <div style={{ fontSize:'0.8rem', color:'#94a3b8', marginBottom:16 }}>
              {sessionName} · {fmtDate(sessionDate)}
            </div>
            <div style={{ background:'white', borderRadius:12, padding:12, display:'inline-block', marginBottom:16 }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}&color=0f172a&bgcolor=ffffff&margin=6`}
                alt="QR Code"
                style={{ width:220, height:220, display:'block' }}
              />
            </div>
            <div style={{ fontSize:'0.72rem', color:'#94a3b8', marginBottom:16 }}>ให้นักกีฬาสแกน QR Code นี้เพื่อเช็คชื่อตัวเอง</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button className="btn-outline btn-sm" onClick={() => navigator.clipboard?.writeText(qrUrl).then(() => showToast('คัดลอก link แล้ว','success'))}>
                <i className="bi bi-clipboard me-1"/>คัดลอก Link
              </button>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="btn-outline btn-sm" style={{ textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4 }}>
                <i className="bi bi-box-arrow-up-right me-1"/>เปิดหน้าเช็คอิน
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stats sub-component ───────────────────────────────── */
function AttendanceStats({ athletes, sessions }: { athletes: Athlete[]; sessions: { session_date:string; session_name:string; session_type:string }[] }) {
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessions.length) return;
    setLoading(true);
    // Fetch all records for all sessions in parallel (limited)
    const uniq = sessions.slice(0, 30); // last 30 sessions
    Promise.all(
      uniq.map(s => callGAS('getAttendanceBySession', { sessionDate: s.session_date, sessionName: s.session_name })
        .then(d => (Array.isArray(d) ? d : []) as AttendanceRecord[])
        .catch(() => [] as AttendanceRecord[]))
    ).then(arrays => {
      setAllRecords(arrays.flat());
    }).finally(() => setLoading(false));
  }, [sessions]);

  if (loading) return <div style={{ textAlign:'center', padding:40 }}><div className="spinner-ring"/></div>;

  // Compute per-athlete stats
  const perAthlete = athletes.map(a => {
    const recs = allRecords.filter(r => r.playerId === a.PlayerID);
    const total   = recs.length;
    const present = recs.filter(r=>r.status==='present').length;
    const late    = recs.filter(r=>r.status==='late').length;
    const absence = recs.filter(r=>r.status==='absent').length;
    const excuse  = recs.filter(r=>r.status==='excuse').length;
    const rate    = total ? Math.round((present+late)/total*100) : null;
    return { athlete:a, total, present, late, absence, excuse, rate };
  }).filter(x => x.total > 0).sort((a,b) => (b.rate||0) - (a.rate||0));

  if (!perAthlete.length) {
    return <div style={{ textAlign:'center', padding:48, color:'var(--text-muted)' }}>
      <i className="bi bi-bar-chart" style={{ fontSize:'2.5rem', display:'block', marginBottom:10, color:'#cbd5e1' }}/>
      ยังไม่มีข้อมูลเพียงพอ กรุณาบันทึกการเช็คชื่อก่อน
    </div>;
  }

  return (
    <div>
      {/* Top summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Sessions รวม', val: sessions.length, color:'#38bdf8', icon:'bi-calendar-check' },
          { label:'นักกีฬามีข้อมูล', val: perAthlete.length, color:'#34d399', icon:'bi-people-fill' },
          { label:'Rate เฉลี่ย', val: perAthlete.length ? Math.round(perAthlete.reduce((s,x)=>s+(x.rate||0),0)/perAthlete.length)+'%' : '—', color:'#f59e0b', icon:'bi-percent' },
          { label:'มาน้อยสุด', val: perAthlete[perAthlete.length-1]?.rate != null ? perAthlete[perAthlete.length-1].rate+'%' : '—', color:'#f472b6', icon:'bi-exclamation-triangle-fill' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
            <i className={`bi ${k.icon}`} style={{ color:k.color, fontSize:'1.2rem', display:'block', marginBottom:6 }}/>
            <div style={{ fontSize:'1.4rem', fontWeight:900 }}>{k.val}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2, fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Attendance Rate Bar Chart */}
      {perAthlete.length > 0 && (
        <div className="surface" style={{ marginBottom:16, padding:'14px 16px' }}>
          <div style={{ fontWeight:700, fontSize:'0.82rem', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
            <i className="bi bi-bar-chart-fill" style={{ color:'#38bdf8' }}/>Attendance Rate รายนักกีฬา
          </div>
          <div style={{ height: Math.max(160, perAthlete.length * 22) }}>
            <Bar
              data={{
                labels: perAthlete.map(x => x.athlete.Nickname || x.athlete.Name.split(' ')[0]),
                datasets: [
                  { label:'มา + สาย (%)', data: perAthlete.map(x=>x.rate||0),
                    backgroundColor: perAthlete.map(x=>(x.rate||0)>=90?'rgba(16,185,129,0.75)':(x.rate||0)>=75?'rgba(56,189,248,0.75)':(x.rate||0)>=60?'rgba(245,158,11,0.75)':'rgba(239,68,68,0.75)'),
                    borderRadius:4 },
                ],
              }}
              options={{
                indexAxis:'y' as const,
                responsive:true, maintainAspectRatio:false,
                plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:(c)=>`${c.raw}% (${perAthlete[c.dataIndex]?.present+perAthlete[c.dataIndex]?.late}/${perAthlete[c.dataIndex]?.total} sessions)` } } },
                scales:{ x:{ min:0, max:100, ticks:{font:{size:10}}, grid:{color:'rgba(0,0,0,0.05)'} }, y:{ ticks:{font:{size:10}} } },
              }}
            />
          </div>
        </div>
      )}

      {/* Per-athlete table */}
      <div className="surface" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem' }}>
          <i className="bi bi-person-lines-fill me-2" style={{ color:'#38bdf8' }}/>สถิติรายนักกีฬา
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft:18 }}>นักกีฬา</th>
                <th>ทีม</th>
                <th style={{ textAlign:'center' }}>มา</th>
                <th style={{ textAlign:'center' }}>สาย</th>
                <th style={{ textAlign:'center' }}>ลา</th>
                <th style={{ textAlign:'center' }}>ขาด</th>
                <th style={{ textAlign:'center' }}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {perAthlete.map(({ athlete:a, total, present, late, absence, excuse, rate }) => {
                const rateColor = (rate||0) >= 90 ? '#10b981' : (rate||0) >= 75 ? '#38bdf8' : (rate||0) >= 60 ? '#f59e0b' : '#ef4444';
                return (
                  <tr key={a.PlayerID}>
                    <td style={{ paddingLeft:18, fontWeight:700 }}>
                      {a.Name}
                      {a.Nickname && <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginLeft:6 }}>({a.Nickname})</span>}
                    </td>
                    <td style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>{a.Team||'—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#16a34a' }}>{present}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#d97706' }}>{late}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#2563eb' }}>{excuse}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#dc2626' }}>{absence}</td>
                    <td style={{ textAlign:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                        <div style={{ width:60, height:6, borderRadius:6, background:'#f1f5f9', overflow:'hidden' }}>
                          <div style={{ height:'100%', background:rateColor, width:`${rate||0}%`, borderRadius:6, transition:'width 0.6s' }}/>
                        </div>
                        <span style={{ fontWeight:900, fontSize:'0.85rem', color:rateColor, minWidth:36 }}>{rate != null ? rate+'%' : '—'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
