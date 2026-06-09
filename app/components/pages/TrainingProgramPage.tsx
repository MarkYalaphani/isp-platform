'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Athlete, User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface SavedEvent {
  id: string; eventDate: string; title: string;
  eventType: string; teamName: string; notes: string;
}

interface Props { athletes: Athlete[]; user: User; }

const DAYS_TH = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];

type Intensity = 'light'|'moderate'|'hard'|'rest';
const INT_CFG: Record<Intensity,{label:string;color:string;bg:string}> = {
  light:    { label:'เบา',      color:'#10b981', bg:'#f0fdf4' },
  moderate: { label:'ปานกลาง', color:'#38bdf8', bg:'#eff6ff' },
  hard:     { label:'หนัก',    color:'#f59e0b', bg:'#fffbeb' },
  rest:     { label:'พัก',     color:'#94a3b8', bg:'#f8fafc' },
};

type Session = { focus: string; intensity: Intensity; duration: number; notes: string };
type WeekPlan = Session[][];   // array of sessions per day

const FOCUS_OPTIONS = [
  'Speed & Acceleration','Explosive Power (CMJ)','Agility & COD','Endurance (Aerobic)',
  'Strength Training','Flexibility','Ball Control','Passing & Receiving',
  'Shooting','Tactical','Recovery / Regeneration','Match Day Preparation',
  'Small-sided Games','Individual Skills','Rest / Off',
];

function dayDate(weekStart: string, offset: number): string {
  const d = new Date(weekStart + 'T12:00:00');
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function calcWeekLoad(plan: WeekPlan) {
  const all = plan.flat().filter(s => s.intensity !== 'rest');
  const loads = all.map(s => {
    const rpe = s.intensity === 'light' ? 3 : s.intensity === 'moderate' ? 6 : 8;
    return rpe * s.duration;
  });
  const total = loads.reduce((a,b) => a+b, 0);
  const zone = total < 1500 ? 'เบา' : total < 2500 ? 'ปานกลาง' : total < 3500 ? 'หนัก' : 'หนักมาก';
  return { total, zone, sessionDays: plan.filter(day => day.some(s => s.intensity !== 'rest')).length };
}

const defaultSession = (): Session => ({ focus: 'Ball Control', intensity: 'moderate', duration: 60, notes: '' });
const restSession = (): Session => ({ focus: 'Rest / Off', intensity: 'rest', duration: 0, notes: '' });

const dayMaxIntensity = (sessions: Session[]): Intensity => {
  const ORDER: Intensity[] = ['rest','light','moderate','hard'];
  return sessions.reduce((max, s) => ORDER.indexOf(s.intensity) > ORDER.indexOf(max) ? s.intensity : max, 'rest' as Intensity);
};

export default function TrainingProgramPage({ athletes, user }: Props) {
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return d.toISOString().split('T')[0];
  });
  const [plan, setPlan] = useState<WeekPlan>(() =>
    DAYS_TH.map((_, i) => [i < 5 ? defaultSession() : restSession()])
  );
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort()], [athletes]);
  const teamAthletes = useMemo(() => athletes.filter(a => filterTeam==='ALL' || a.Team===filterTeam), [athletes, filterTeam]);

  const teamStats = useMemo(() => {
    const rated = teamAthletes.filter(a => Number(a.Latest?.Rating) > 0);
    const avgRating = rated.length ? Math.round(rated.reduce((s,a)=>s+Number(a.Latest?.Rating||0),0)/rated.length) : 0;
    const speedList = teamAthletes.filter(a => a.Latest?.Speed30);
    const avgSpeed = speedList.length ? +(speedList.reduce((s,a)=>s+Number(a.Latest?.Speed30||0),0)/speedList.length).toFixed(2) : 0;
    return { avgRating, avgSpeed, total: teamAthletes.length };
  }, [teamAthletes]);

  const weekLoad = useMemo(() => calcWeekLoad(plan), [plan]);
  const loadColor = weekLoad.total < 1500 ? '#10b981' : weekLoad.total < 2500 ? '#38bdf8' : weekLoad.total < 3500 ? '#f59e0b' : '#ef4444';

  /* ── Load saved events ── */
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const ym = new Date().toISOString().slice(0, 7);
      const thisMonth = await callGAS('getCalendarEvents', { yearMonth: ym, clubId: user.clubId||'' }) as SavedEvent[];
      const prevYm = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
      const prevMonth = await callGAS('getCalendarEvents', { yearMonth: prevYm, clubId: user.clubId||'' }) as SavedEvent[];
      const all = [...(Array.isArray(prevMonth)?prevMonth:[]), ...(Array.isArray(thisMonth)?thisMonth:[])]
        .filter(e => e.eventType === 'training')
        .sort((a,b) => b.eventDate.localeCompare(a.eventDate));
      setSavedEvents(all);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [user.clubId]);

  useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('ลบ session นี้ออกจากปฏิทิน?')) return;
    try {
      await callGAS('deleteCalendarEvent', { id });
      showToast('ลบสำเร็จ', 'success');
      setSavedEvents(prev => prev.filter(e => e.id !== id));
    } catch { showToast('ลบไม่สำเร็จ', 'error'); }
  };

  const handleDeleteWeek = async (weekStartDate: string) => {
    const d = new Date(weekStartDate + 'T12:00:00');
    const dates: string[] = Array.from({length:7}, (_, i) => {
      const dd = new Date(d); dd.setDate(dd.getDate()+i); return dd.toISOString().split('T')[0];
    });
    const toDelete = savedEvents.filter(e => dates.includes(e.eventDate) && (!filterTeam || filterTeam==='ALL' || !e.teamName || e.teamName===filterTeam));
    if (!toDelete.length) { showToast('ไม่มี session ในสัปดาห์นี้', 'error'); return; }
    if (!confirm(`ลบ ${toDelete.length} session ของสัปดาห์ ${weekStartDate}?`)) return;
    try {
      await Promise.all(toDelete.map(e => callGAS('deleteCalendarEvent', { id: e.id })));
      showToast(`ลบ ${toDelete.length} session สำเร็จ`, 'success');
      setSavedEvents(prev => prev.filter(e => !toDelete.find(d => d.id === e.id)));
    } catch { showToast('ลบไม่สำเร็จ', 'error'); }
  };

  /* ── Session helpers ── */
  const addSession = (dayIdx: number) =>
    setPlan(p => p.map((day, j) => j === dayIdx ? [...day, defaultSession()] : day));

  const removeSession = (dayIdx: number, si: number) =>
    setPlan(p => p.map((day, j) => j === dayIdx ? day.filter((_, k) => k !== si) : day));

  const setSession = (dayIdx: number, si: number, k: keyof Session, v: string|number) =>
    setPlan(p => p.map((day, j) => j === dayIdx ? day.map((s, k2) => k2 === si ? { ...s, [k]: v } : s) : day));

  /* ── Save to calendar ── */
  const handleSaveToCalendar = async () => {
    setSaving(true);
    try {
      const weekPlan = DAYS_TH.map((_, i) => ({
        date: dayDate(weekStart, i),
        sessions: plan[i].filter(s => s.intensity !== 'rest'),
      })).filter(d => d.sessions.length > 0);

      const res = await callGAS('saveTrainingProgram', {
        weekPlan,
        clubId: user.clubId || '',
        teamName: filterTeam === 'ALL' ? '' : filterTeam,
        createdBy: user.displayName || user.username,
      }) as { status: string; message: string };

      if (res.status === 'success') showToast(res.message, 'success');
      else showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
    } catch { showToast('Connection error','error'); }
    finally { setSaving(false); }
  };

  /* ── Copy to clipboard ── */
  const copyToClipboard = () => {
    const text = DAYS_TH.map((d, i) => {
      const sessions = plan[i];
      const lines = sessions.map(s =>
        `  • ${s.focus} (${INT_CFG[s.intensity].label}${s.duration > 0 ? `, ${s.duration} นาที` : ''})${s.notes ? ` — ${s.notes}` : ''}`
      ).join('\n');
      return `${d} [${dayDate(weekStart, i)}]:\n${lines}`;
    }).join('\n');
    navigator.clipboard.writeText(`โปรแกรมฝึกสัปดาห์ ${weekStart}\nทีม: ${filterTeam === 'ALL' ? 'ทุกทีม' : filterTeam}\n\n${text}\n\nTotal Load: ${weekLoad.total} AU`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Training Program</h2>
          <p className="page-subtitle">วางโปรแกรมฝึกรายสัปดาห์ · บันทึกลงตาราง · เพิ่มหลาย session ต่อวัน</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <select className="form-select" style={{ width:'auto' }} value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
            {teams.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกทีม':t}</option>)}
          </select>
          <button className="btn-outline" onClick={copyToClipboard}>
            <i className={`bi bi-${copied?'check-circle-fill':'clipboard'} me-1`}/>{copied?'Copied!':'Copy'}
          </button>
          <button className="btn-outline" onClick={()=>setShowHistory(h=>!h)} style={{ borderColor:'#f59e0b', color:'#f59e0b' }}>
            <i className={`bi bi-${showHistory?'x-lg':'clock-history'} me-1`}/>{showHistory?'ซ่อน':'ประวัติโปรแกรม'}
          </button>
          <button className="btn-primary" onClick={handleSaveToCalendar} disabled={saving}>
            {saving
              ? <><span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/> บันทึก...</>
              : <><i className="bi bi-calendar-check me-1"/>บันทึกลงปฏิทิน</>}
          </button>
        </div>
      </div>

      {/* Week selector + KPIs */}
      <div className="surface" style={{ marginBottom:16, padding:'12px 20px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <label className="form-label" style={{ marginBottom:4 }}>สัปดาห์เริ่มต้น (วันจันทร์)</label>
          <input type="date" className="form-control" style={{ width:'auto' }} value={weekStart} onChange={e=>setWeekStart(e.target.value)}/>
        </div>
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
          {[
            { l:'ทีมที่เลือก',  v:`${teamStats.total} คน`,                    c:'#38bdf8' },
            { l:'Avg Rating',   v:teamStats.avgRating||'—',                    c:'#f59e0b' },
            { l:'Avg Speed',    v:teamStats.avgSpeed ? `${teamStats.avgSpeed}s` : '—', c:'#f97316' },
            { l:'Weekly Load',  v:`${weekLoad.total} AU`,                      c:loadColor },
            { l:'Load Zone',    v:weekLoad.zone,                               c:loadColor },
          ].map(k=>(
            <div key={k.l} style={{ background:'var(--bg)', borderRadius:8, padding:'8px 12px', borderLeft:`3px solid ${k.c}` }}>
              <div style={{ fontWeight:900, fontSize:'1rem', color:k.c }}>{k.v}</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontWeight:600 }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly plan */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {DAYS_TH.map((dayName, dayIdx) => {
          const sessions = plan[dayIdx];
          const maxInt = dayMaxIntensity(sessions);
          const tc = INT_CFG[maxInt];
          const date = dayDate(weekStart, dayIdx);
          const dateDisplay = new Date(date + 'T12:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short'});
          const dayLoad = sessions.reduce((sum, s) => {
            if (s.intensity === 'rest') return sum;
            const rpe = s.intensity === 'light' ? 3 : s.intensity === 'moderate' ? 6 : 8;
            return sum + rpe * s.duration;
          }, 0);

          return (
            <div key={dayIdx} className="surface" style={{ padding:0, borderLeft:`4px solid ${tc.color}`, overflow:'hidden' }}>
              {/* Day header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px', background:`${tc.color}0a`, borderBottom:`1px solid ${tc.color}20` }}>
                <div style={{ minWidth:90, flexShrink:0 }}>
                  <div style={{ fontWeight:900, fontSize:'0.95rem' }}>{dayName}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{dateDisplay}</div>
                  {dayLoad > 0 && <div style={{ fontSize:'0.62rem', fontWeight:700, color:tc.color, marginTop:1 }}>{dayLoad} AU</div>}
                </div>
                <div style={{ flex:1, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {sessions.map((s, si) => (
                    s.intensity !== 'rest' && (
                      <span key={si} style={{ fontSize:'0.68rem', fontWeight:700, background: INT_CFG[s.intensity].bg, color: INT_CFG[s.intensity].color, borderRadius:6, padding:'2px 8px', border:`1px solid ${INT_CFG[s.intensity].color}44` }}>
                        {s.focus}{s.duration > 0 ? ` ${s.duration}'` : ''}
                      </span>
                    )
                  ))}
                  {sessions.every(s => s.intensity === 'rest') && (
                    <span style={{ fontSize:'0.72rem', color:'#94a3b8', fontStyle:'italic' }}>วันพัก</span>
                  )}
                </div>
                <button onClick={() => addSession(dayIdx)} style={{ flexShrink:0, padding:'4px 10px', borderRadius:6, border:`1.5px dashed ${tc.color}`, background:'transparent', color:tc.color, fontSize:'0.72rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                  <i className="bi bi-plus me-1"/>เพิ่ม Session
                </button>
              </div>

              {/* Sessions */}
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                {sessions.map((s, si) => (
                  <div key={si} style={{ display:'flex', gap:10, padding:'10px 16px', alignItems:'flex-start', borderBottom: si < sessions.length-1 ? '1px solid var(--border)' : 'none', background: si % 2 === 1 ? 'var(--bg)' : 'transparent' }}>
                    {/* Session index */}
                    <div style={{ width:22, height:22, borderRadius:6, background: INT_CFG[s.intensity].bg, border:`1.5px solid ${INT_CFG[s.intensity].color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:900, color: INT_CFG[s.intensity].color, flexShrink:0, marginTop:2 }}>
                      {si + 1}
                    </div>

                    {/* Intensity buttons */}
                    <div style={{ flexShrink:0 }}>
                      <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>ความหนัก</div>
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                        {(Object.keys(INT_CFG) as Intensity[]).map(k => (
                          <button key={k} onClick={() => setSession(dayIdx, si, 'intensity', k)} style={{
                            padding:'3px 7px', borderRadius:5, fontSize:'0.65rem', fontWeight:700, cursor:'pointer',
                            background: s.intensity === k ? INT_CFG[k].bg : 'var(--bg)',
                            color: s.intensity === k ? INT_CFG[k].color : 'var(--text-muted)',
                            border: `1.5px solid ${s.intensity === k ? INT_CFG[k].color : 'var(--border)'}`,
                          }}>{INT_CFG[k].label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Focus */}
                    <div style={{ flex:'1 1 180px' }}>
                      <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>เนื้อหาการฝึก</div>
                      <input
                        className="form-control"
                        style={{ fontSize:'0.82rem' }}
                        list={`focus-list-${dayIdx}-${si}`}
                        value={s.focus}
                        placeholder="เลือกหรือพิมพ์เนื้อหา..."
                        disabled={s.intensity === 'rest'}
                        onChange={e => setSession(dayIdx, si, 'focus', e.target.value)}
                      />
                      <datalist id={`focus-list-${dayIdx}-${si}`}>
                        {FOCUS_OPTIONS.map(f => <option key={f} value={f}/>)}
                      </datalist>
                    </div>

                    {/* Duration */}
                    <div style={{ minWidth:72, flexShrink:0 }}>
                      <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>นาที</div>
                      <input type="number" min={0} max={300} className="form-control" style={{ fontSize:'0.82rem' }}
                        value={s.duration} disabled={s.intensity === 'rest'}
                        onChange={e => setSession(dayIdx, si, 'duration', Number(e.target.value))}/>
                    </div>

                    {/* Notes */}
                    <div style={{ flex:'2 1 160px' }}>
                      <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:600, marginBottom:4 }}>หมายเหตุ / รายละเอียด</div>
                      <input className="form-control" style={{ fontSize:'0.82rem' }} value={s.notes}
                        placeholder="ดรีล, เป้าหมาย..." disabled={s.intensity === 'rest'}
                        onChange={e => setSession(dayIdx, si, 'notes', e.target.value)}/>
                    </div>

                    {/* Remove */}
                    {sessions.length > 1 && (
                      <button onClick={() => removeSession(dayIdx, si)} title="ลบ session นี้" style={{ marginTop:20, padding:'4px 7px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'0.72rem', flexShrink:0 }}>
                        <i className="bi bi-trash"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly summary */}
      <div className="surface" style={{ marginTop:16, padding:'16px 20px', background:'linear-gradient(135deg,#0f172a,#1e293b)', color:'white' }}>
        <div style={{ fontWeight:700, fontSize:'0.8rem', color:'#7dd3fc', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>สรุปโปรแกรมสัปดาห์นี้</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
          {DAYS_TH.map((d, i) => {
            const maxInt = dayMaxIntensity(plan[i]);
            const tc = INT_CFG[maxInt];
            const totalDur = plan[i].reduce((sum, s) => sum + (s.intensity !== 'rest' ? s.duration : 0), 0);
            const count = plan[i].filter(s => s.intensity !== 'rest').length;
            return (
              <div key={d} style={{ textAlign:'center', minWidth:60 }}>
                <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:600 }}>{d}</div>
                <div style={{ width:36, height:36, borderRadius:10, background: tc.color+'30', border:`2px solid ${tc.color}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto', fontSize:'0.65rem', fontWeight:900, color:tc.color }}>
                  {count > 1 ? `${count}x` : tc.label[0]}
                </div>
                {totalDur > 0 && <div style={{ fontSize:'0.6rem', color:'#64748b' }}>{totalDur}'</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.78rem', alignItems:'center' }}>
          <span>📊 Total Load: <strong style={{ color:loadColor }}>{weekLoad.total} AU</strong></span>
          <span>🏋️ Zone: <strong style={{ color:loadColor }}>{weekLoad.zone}</strong></span>
          <span>⚽ วันซ้อม: <strong style={{ color:'#38bdf8' }}>{weekLoad.sessionDays} วัน</strong></span>
          <span>😴 พัก: <strong style={{ color:'#94a3b8' }}>{plan.filter(day => day.every(s => s.intensity === 'rest')).length} วัน</strong></span>
          <button className="btn-primary" onClick={handleSaveToCalendar} disabled={saving} style={{ marginLeft:'auto', fontSize:'0.78rem', padding:'6px 14px' }}>
            {saving
              ? <span className="spinner-ring" style={{width:14,height:14,borderWidth:2,margin:0}}/>
              : <><i className="bi bi-calendar-check me-1"/>บันทึกลงปฏิทิน</>}
          </button>
        </div>
      </div>

      {/* ── ประวัติโปรแกรมที่บันทึกไว้ ── */}
      {showHistory && (
        <div className="surface" style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:8 }}>
            <div style={{ fontWeight:800, fontSize:'0.9rem' }}>
              <i className="bi bi-clock-history me-2" style={{ color:'#f59e0b' }}/>ประวัติโปรแกรมที่บันทึกลงปฏิทิน
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button className="btn-outline btn-sm" onClick={()=>handleDeleteWeek(weekStart)} style={{ borderColor:'#ef4444', color:'#ef4444' }}>
                <i className="bi bi-trash me-1"/>ลบสัปดาห์ที่เลือก ({weekStart})
              </button>
              <button className="btn-outline btn-sm" onClick={loadHistory} disabled={loadingHistory}>
                <i className="bi bi-arrow-clockwise me-1"/>รีเฟรช
              </button>
            </div>
          </div>

          {loadingHistory && <div style={{ textAlign:'center', padding:32 }}><div className="spinner-ring"/></div>}

          {!loadingHistory && savedEvents.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:'0.85rem' }}>
              <i className="bi bi-calendar-x" style={{ fontSize:'2rem', display:'block', marginBottom:8, opacity:0.3 }}/>
              ยังไม่มีโปรแกรมที่บันทึกไว้
            </div>
          )}

          {!loadingHistory && savedEvents.length > 0 && (()=>{
            const byWeek: Record<string, SavedEvent[]> = {};
            savedEvents
              .filter(e => filterTeam === 'ALL' || !e.teamName || e.teamName === filterTeam)
              .forEach(e => {
                const d = new Date(e.eventDate + 'T12:00:00');
                const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
                const wk = mon.toISOString().split('T')[0];
                if (!byWeek[wk]) byWeek[wk] = [];
                byWeek[wk].push(e);
              });
            const INT_LABEL: Record<string,{color:string;label:string}> = {
              'เบา':{ color:'#10b981', label:'เบา' }, 'ปานกลาง':{ color:'#38bdf8', label:'ปานกลาง' }, 'หนัก':{ color:'#f59e0b', label:'หนัก' },
            };
            const fmtD = (s: string) => { try { return new Date(s+'T12:00:00').toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'}); } catch { return s; } };
            return Object.keys(byWeek).sort((a,b)=>b.localeCompare(a)).map(wk => (
              <div key={wk} style={{ marginBottom:16, border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg)', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:8 }}>
                  <div style={{ fontWeight:700, fontSize:'0.85rem' }}>
                    <i className="bi bi-calendar-week me-2" style={{ color:'#38bdf8' }}/>สัปดาห์ {wk}
                    {byWeek[wk][0]?.teamName && <span style={{ marginLeft:8, fontSize:'0.72rem', background:'#38bdf820', color:'#38bdf8', borderRadius:6, padding:'2px 8px', fontWeight:700 }}>{byWeek[wk][0].teamName}</span>}
                    <span style={{ marginLeft:8, fontSize:'0.7rem', color:'var(--text-muted)' }}>{byWeek[wk].length} session</span>
                  </div>
                  <button onClick={() => handleDeleteWeek(wk)} title="ลบทั้งสัปดาห์"
                    style={{ padding:'4px 10px', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'0.75rem', fontWeight:700 }}>
                    <i className="bi bi-trash me-1"/>ลบทั้งสัปดาห์
                  </button>
                </div>
                <div style={{ padding:'8px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  {byWeek[wk].map(ev => {
                    const intensityKey = ev.notes?.split(' · ')[0] || '';
                    const ic = INT_LABEL[intensityKey] || { color:'#94a3b8', label:intensityKey };
                    return (
                      <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                        <span style={{ fontSize:'0.7rem', fontWeight:700, color:ic.color, background:`${ic.color}18`, borderRadius:5, padding:'2px 7px', flexShrink:0 }}>{ic.label||'—'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:'0.8rem' }}>{ev.title}</div>
                          <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{fmtD(ev.eventDate)} {ev.notes && `· ${ev.notes}`}</div>
                        </div>
                        <button onClick={() => handleDeleteEvent(ev.id)} title="ลบ session นี้"
                          style={{ padding:'3px 7px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'0.72rem', flexShrink:0 }}>
                          <i className="bi bi-trash"/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
