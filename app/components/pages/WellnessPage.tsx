'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Athlete, User, WellnessRecord, RPERecord } from '@/lib/types';
import { callGAS } from '@/lib/api';

interface Props { athletes: Athlete[]; user: User; }

/* ── Constants ───────────────────────────────────────────── */
const WELLNESS_FIELDS = [
  { key:'fatigue',      label:'ความสดชื่น',     en:'Freshness',      icon:'⚡', desc:'รู้สึกสดชื่นแค่ไหน (1=เหนื่อยมาก 5=สดชื่นมาก)' },
  { key:'sleepQuality', label:'คุณภาพการนอน',   en:'Sleep Quality',  icon:'😴', desc:'นอนหลับได้ดีแค่ไหนคืนที่แล้ว'                   },
  { key:'soreness',     label:'ความปวดเมื่อย',   en:'Muscle Soreness',icon:'💪', desc:'กล้ามเนื้อปวดเมื่อยแค่ไหน (1=ปวดมาก 5=ไม่ปวด)' },
  { key:'stress',       label:'ระดับความเครียด', en:'Stress Level',   icon:'🧠', desc:'ความเครียดวันนี้ (1=เครียดมาก 5=ผ่อนคลาย)'      },
  { key:'mood',         label:'อารมณ์/กำลังใจ',  en:'Mood',           icon:'😊', desc:'อารมณ์และความพร้อม (1=แย่มาก 5=ดีมาก)'          },
] as const;
type WellnessKey = typeof WELLNESS_FIELDS[number]['key'];

const RPE_SCALE = [
  { val:1,  label:'1',  desc:'พักผ่อน', color:'#10b981' },
  { val:2,  label:'2',  desc:'ง่ายมาก', color:'#34d399' },
  { val:3,  label:'3',  desc:'ง่าย',    color:'#6ee7b7' },
  { val:4,  label:'4',  desc:'ปานกลาง', color:'#a3e635' },
  { val:5,  label:'5',  desc:'ค่อนข้างหนัก', color:'#fbbf24' },
  { val:6,  label:'6',  desc:'หนัก',    color:'#fb923c' },
  { val:7,  label:'7',  desc:'หนักมาก', color:'#f97316' },
  { val:8,  label:'8',  desc:'หนักมาก', color:'#ef4444' },
  { val:9,  label:'9',  desc:'แทบสุดแรง',color:'#dc2626' },
  { val:10, label:'10', desc:'สุดแรง',  color:'#991b1b' },
];

const SESSION_TYPES = [
  { id:'training', label:'ฝึกซ้อม',   color:'#38bdf8' },
  { id:'match',    label:'แข่งขัน',   color:'#f59e0b' },
  { id:'fitness',  label:'กายภาพ',    color:'#34d399' },
  { id:'recovery', label:'ฟื้นฟู',    color:'#a78bfa' },
  { id:'other',    label:'อื่นๆ',     color:'#94a3b8' },
];

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d:string) {
  try { return new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); }
  catch { return d; }
}
function wellnessColor(score:number) {
  if(score>=80) return '#10b981';
  if(score>=60) return '#38bdf8';
  if(score>=40) return '#f59e0b';
  return '#ef4444';
}
function rpeColor(rpe:number) { return RPE_SCALE.find(r=>r.val===rpe)?.color || '#94a3b8'; }
function loadZone(load:number) {
  if(load<=150) return { label:'ต่ำ',    color:'#10b981' };
  if(load<=300) return { label:'ปานกลาง',color:'#38bdf8' };
  if(load<=450) return { label:'สูง',    color:'#f59e0b' };
  return             { label:'สูงมาก', color:'#ef4444' };
}

/* ── Wellness score row (compact) ───────────────────────── */
function WellnessRow({ a, vals, onChange }: {
  a: Athlete;
  vals: Partial<Record<WellnessKey, number>>;
  onChange: (key: WellnessKey, v: number) => void;
}) {
  const scores = WELLNESS_FIELDS.map(f => vals[f.key] || 0);
  const filled = scores.filter(v => v > 0).length;
  const avg    = filled ? Math.round(scores.filter(v=>v>0).reduce((a,b)=>a+b,0)/filled/5*100) : 0;
  const wc     = avg > 0 ? wellnessColor(avg) : 'var(--text-muted)';

  return (
    <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px', background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap' }}>
      {/* Photo + name */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:130, flex:'0 0 auto' }}>
        <div style={{ width:32, height:32, borderRadius:9, overflow:'hidden', background:'var(--surface)', flexShrink:0 }}>
          {a.PhotoUrl
            ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.8rem', color:'var(--text-muted)' }}>{(a.Name||'?')[0]}</div>
          }
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:'0.78rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:90 }}>{a.Name}</div>
          {a.Nickname && <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{a.Nickname}</div>}
        </div>
      </div>
      {/* 5 metrics */}
      <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
        {WELLNESS_FIELDS.map(f => {
          const v = vals[f.key] || 0;
          return (
            <div key={f.key} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:700, marginBottom:3 }}>{f.icon}</div>
              <div style={{ display:'flex', gap:2 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => onChange(f.key, v===n ? 0 : n)} style={{
                    width:22, height:22, borderRadius:5, border:'1.5px solid',
                    fontWeight:800, fontSize:'0.6rem', cursor:'pointer',
                    background: v>=n ? (v<=2?'#ef4444':v===3?'#f59e0b':v===4?'#22c55e':'#0284c7') : 'white',
                    borderColor: v>=n ? (v<=2?'#ef4444':v===3?'#f59e0b':v===4?'#22c55e':'#0284c7') : '#e2e8f0',
                    color: v>=n ? 'white' : '#d1d5db',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Score */}
      <div style={{ textAlign:'center', minWidth:44 }}>
        <div style={{ fontSize:'1.2rem', fontWeight:900, color:wc, lineHeight:1 }}>{avg>0?avg:'—'}</div>
        <div style={{ fontSize:'0.55rem', color:'var(--text-muted)', fontWeight:700 }}>WELLNESS</div>
      </div>
    </div>
  );
}

/* ── RPE row ──────────────────────────────────────────────── */
function RPERow({ a, rpe, duration, onChange, onDuration }: {
  a: Athlete; rpe: number; duration: number;
  onChange: (v: number) => void; onDuration: (v: number) => void;
}) {
  const load = rpe > 0 && duration > 0 ? rpe * duration : 0;
  const zone = load > 0 ? loadZone(load) : null;
  const rc   = rpe > 0 ? rpeColor(rpe) : 'var(--text-muted)';

  return (
    <div style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 14px', background:'var(--bg)', borderRadius:12, border:'1px solid var(--border)', flexWrap:'wrap' }}>
      {/* Name */}
      <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:130, flex:'0 0 auto' }}>
        <div style={{ width:32, height:32, borderRadius:9, overflow:'hidden', background:'var(--surface)', flexShrink:0 }}>
          {a.PhotoUrl
            ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.8rem', color:'var(--text-muted)' }}>{(a.Name||'?')[0]}</div>
          }
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.78rem' }}>{a.Name}</div>
          {a.Nickname && <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{a.Nickname}</div>}
        </div>
      </div>
      {/* RPE buttons 1-10 */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
        {RPE_SCALE.map(r => (
          <button key={r.val} onClick={() => onChange(rpe===r.val ? 0 : r.val)} title={r.desc} style={{
            width:30, height:30, borderRadius:7, border:'2px solid',
            fontWeight:900, fontSize:'0.75rem', cursor:'pointer', transition:'all 0.1s',
            background: rpe===r.val ? r.color : 'white',
            borderColor: rpe===r.val ? r.color : '#e2e8f0',
            color: rpe===r.val ? 'white' : '#94a3b8',
            transform: rpe===r.val ? 'scale(1.15)' : 'scale(1)',
          }}>{r.val}</button>
        ))}
      </div>
      {/* RPE label + Load */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginLeft:'auto' }}>
        {rpe > 0 && <span style={{ fontSize:'0.7rem', color:rc, fontWeight:700 }}>{RPE_SCALE.find(r=>r.val===rpe)?.desc}</span>}
        {zone && (
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:900, color:zone.color }}>{load}</div>
            <div style={{ fontSize:'0.55rem', color:zone.color, fontWeight:700 }}>AU · {zone.label}</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function WellnessPage({ athletes, user }: Props) {
  const [view, setView] = useState<'wellness'|'rpe'|'history'>('wellness');

  /* filters */
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [search, setSearch]         = useState('');
  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort()], [athletes]);
  const filtered = useMemo(() => athletes.filter(a => {
    if (filterTeam!=='ALL' && a.Team!==filterTeam) return false;
    if (search) { const q=search.toLowerCase(); return `${a.Name} ${a.Nickname}`.toLowerCase().includes(q); }
    return true;
  }), [athletes, filterTeam, search]);

  /* ── WELLNESS state ─── */
  const [wDate,    setWDate]    = useState(todayStr());
  const [wVals,    setWVals]    = useState<Record<string, Partial<Record<WellnessKey, number>>>>({});
  const [wNotes,   setWNotes]   = useState<Record<string, string>>({});
  const [wSaving,  setWSaving]  = useState(false);
  const [wMsg,     setWMsg]     = useState<{type:'success'|'error';text:string}|null>(null);

  const setW = (pid: string, key: WellnessKey, v: number) =>
    setWVals(p => ({ ...p, [pid]: { ...(p[pid]||{}), [key]: v } }));

  const markAllWellness = (key: WellnessKey, v: number) =>
    setWVals(p => filtered.reduce((acc,a) => ({ ...acc, [a.PlayerID]: { ...(p[a.PlayerID]||{}), [key]: v } }), p));

  const saveWellness = async () => {
    const records = filtered.map(a => {
      const v = wVals[a.PlayerID] || {};
      if (!Object.values(v).some(x => x && x>0)) return null;
      return {
        playerId: a.PlayerID, checkDate: wDate,
        fatigue:      v.fatigue      || 0,
        sleepQuality: v.sleepQuality || 0,
        soreness:     v.soreness     || 0,
        stress:       v.stress       || 0,
        mood:         v.mood         || 0,
        notes: wNotes[a.PlayerID] || '',
        createdBy: user.displayName || user.username,
      };
    }).filter(Boolean);
    if (!records.length) return setWMsg({type:'error', text:'ยังไม่มีข้อมูลที่จะบันทึก'});
    setWSaving(true); setWMsg(null);
    try {
      const res = await callGAS('saveWellness', { records }) as {status:string;message:string};
      setWMsg({type: res.status==='success'?'success':'error', text: res.message||'เสร็จแล้ว'});
    } catch(e:unknown) { setWMsg({type:'error', text: e instanceof Error ? e.message : 'Error'}); }
    finally { setWSaving(false); }
  };

  /* ── RPE state ─── */
  const [rDate,     setRDate]     = useState(todayStr());
  const [rName,     setRName]     = useState('ซ้อมเช้า');
  const [rType,     setRType]     = useState('training');
  const [rDuration, setRDuration] = useState(60);
  const [rVals,     setRVals]     = useState<Record<string, number>>({});
  const [rSaving,   setRSaving]   = useState(false);
  const [rMsg,      setRMsg]      = useState<{type:'success'|'error';text:string}|null>(null);

  const saveRPE = async () => {
    const records = filtered.map(a => {
      const rpe = rVals[a.PlayerID] || 0;
      if (!rpe) return null;
      return { playerId:a.PlayerID, sessionDate:rDate, sessionName:rName, sessionType:rType, rpe, durationMin:rDuration, createdBy: user.displayName||user.username };
    }).filter(Boolean);
    if (!records.length) return setRMsg({type:'error', text:'ยังไม่มีข้อมูลที่จะบันทึก'});
    setRSaving(true); setRMsg(null);
    try {
      const res = await callGAS('saveRPE', { records }) as {status:string;message:string};
      setRMsg({type: res.status==='success'?'success':'error', text: res.message||'เสร็จแล้ว'});
    } catch(e:unknown) { setRMsg({type:'error', text: e instanceof Error ? e.message : 'Error'}); }
    finally { setRSaving(false); }
  };

  /* ── HISTORY state ─── */
  const [histId,      setHistId]      = useState('');
  const [wellnessHist,setWellnessHist]= useState<WellnessRecord[]>([]);
  const [rpeHist,     setRpeHist]     = useState<RPERecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = useCallback(async (pid: string) => {
    setHistId(pid); if(!pid) { setWellnessHist([]); setRpeHist([]); return; }
    setHistLoading(true);
    try {
      const [w, r] = await Promise.all([
        callGAS('getWellnessByPlayer', { playerId:pid }) as Promise<WellnessRecord[]>,
        callGAS('getRPEByPlayer',      { playerId:pid }) as Promise<RPERecord[]>,
      ]);
      setWellnessHist(Array.isArray(w)?w:[]);
      setRpeHist(Array.isArray(r)?r:[]);
    } finally { setHistLoading(false); }
  }, []);

  /* ── Wellness summary stats ─── */
  const wSummary = useMemo(() => {
    const marked = filtered.filter(a => Object.values(wVals[a.PlayerID]||{}).some(v=>v&&v>0));
    const avgScores = marked.map(a => {
      const v = wVals[a.PlayerID] || {};
      const vals = [v.fatigue,v.sleepQuality,v.soreness,v.stress,v.mood].filter(x=>x&&x>0) as number[];
      return vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length/5*100 : 0;
    });
    const teamAvg = avgScores.length ? Math.round(avgScores.reduce((a,b)=>a+b,0)/avgScores.length) : 0;
    const risky = marked.filter(a => {
      const v = wVals[a.PlayerID] || {};
      const avg = [v.fatigue,v.sleepQuality,v.soreness,v.stress,v.mood].filter(x=>x&&x>0).reduce((a:number,b)=>a+(b||0),0);
      const cnt = [v.fatigue,v.sleepQuality,v.soreness,v.stress,v.mood].filter(x=>x&&x>0).length;
      return cnt > 0 && avg/cnt <= 2;
    });
    return { marked:marked.length, total:filtered.length, teamAvg, risky };
  }, [wVals, filtered]);

  /* ── RPE summary stats ─── */
  const rSummary = useMemo(() => {
    const withRPE = filtered.filter(a => (rVals[a.PlayerID]||0)>0);
    const loads = withRPE.map(a => (rVals[a.PlayerID]||0)*rDuration);
    const avgRPE = withRPE.length ? (withRPE.map(a=>rVals[a.PlayerID]||0).reduce((a,b)=>a+b,0)/withRPE.length).toFixed(1) : '—';
    const avgLoad = loads.length ? Math.round(loads.reduce((a,b)=>a+b,0)/loads.length) : 0;
    return { marked:withRPE.length, total:filtered.length, avgRPE, avgLoad };
  }, [rVals, filtered, rDuration]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Wellness & Training Load</h2>
          <p className="page-subtitle">เช็คสภาพก่อนซ้อม · ความหนักประจำวัน · ติดตามสุขภาพนักกีฬา</p>
        </div>
        <button className="btn-primary"
          onClick={view==='wellness' ? saveWellness : saveRPE}
          disabled={view==='history' || (view==='wellness' ? wSaving : rSaving)}>
          {(view==='wellness' ? wSaving : rSaving)
            ? <><span className="spinner-ring" style={{width:14,height:14,borderWidth:2,margin:0}}/> บันทึก...</>
            : <><i className="bi bi-floppy me-1"/>บันทึก</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-switch" style={{marginBottom:16}}>
        {([
          {id:'wellness', icon:'bi-heart-pulse-fill', label:'Wellness ก่อนซ้อม'},
          {id:'rpe',      icon:'bi-speedometer2',     label:'Training Load'},
          {id:'history',  icon:'bi-graph-up',         label:'ประวัติรายบุคคล'},
        ] as {id:'wellness'|'rpe'|'history';icon:string;label:string}[]).map(t=>(
          <button key={t.id} className={`tab-btn${view===t.id?' active':''}`} onClick={()=>setView(t.id)}>
            <i className={`bi ${t.icon} me-1`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══ WELLNESS TAB ══ */}
      {view==='wellness' && (
        <div>
          {/* Session form */}
          <div className="surface" style={{marginBottom:14,padding:'14px 18px'}}>
            <div className="section-hd" style={{marginBottom:12}}><i className="bi bi-calendar-heart me-2" style={{color:'#10b981'}}/>ข้อมูล Session</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div>
                <label className="form-label">วันที่</label>
                <input type="date" className="form-control" value={wDate} onChange={e=>setWDate(e.target.value)}/>
              </div>
              <div style={{flex:1,minWidth:160}}>
                <label className="form-label">กรองทีม</label>
                <select className="form-select" value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
                  {teams.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกทีม':t}</option>)}
                </select>
              </div>
              <div className="search-wrap" style={{minWidth:160}}>
                <i className="bi bi-search"/>
                <input className="form-control" placeholder="ค้นหา..." value={search} onChange={e=>setSearch(e.target.value)} style={{fontSize:'0.8rem'}}/>
              </div>
            </div>
          </div>

          {/* Legend + quick-fill */}
          <div style={{marginBottom:12,display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)'}}>Mark ทั้งทีม:</span>
              {WELLNESS_FIELDS.map(f=>(
                <div key={f.key} style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{fontSize:'0.8rem'}}>{f.icon}</span>
                  <div style={{display:'flex',gap:2}}>
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>markAllWellness(f.key,n)} title={`${f.label} = ${n}`} style={{
                        width:20,height:20,borderRadius:4,border:'1px solid #e2e8f0',fontSize:'0.58rem',fontWeight:800,cursor:'pointer',
                        background: n<=2?'#fef2f2':n===3?'#fefce8':n===4?'#f0fdf4':'#eff6ff',
                        color: n<=2?'#ef4444':n===3?'#ca8a04':n===4?'#16a34a':'#0284c7',
                      }}>{n}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary bar */}
          {wSummary.marked > 0 && (
            <div style={{display:'flex',gap:12,marginBottom:12,padding:'10px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <i className="bi bi-people-fill" style={{color:'#38bdf8',fontSize:'0.85rem'}}/>
                <span style={{fontSize:'0.78rem',fontWeight:700}}>มาร์กแล้ว {wSummary.marked}/{wSummary.total}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <i className="bi bi-heart-pulse-fill" style={{color:wellnessColor(wSummary.teamAvg),fontSize:'0.85rem'}}/>
                <span style={{fontSize:'0.78rem',fontWeight:700}}>Team Wellness: <strong style={{color:wellnessColor(wSummary.teamAvg)}}>{wSummary.teamAvg}%</strong></span>
              </div>
              {wSummary.risky.length > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:'auto'}}>
                  <i className="bi bi-exclamation-triangle-fill" style={{color:'#ef4444'}}/>
                  <span style={{fontSize:'0.78rem',fontWeight:700,color:'#ef4444'}}>⚠ ต้องระวัง: {wSummary.risky.map(a=>a.Name).join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Legend icons */}
          <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
            {WELLNESS_FIELDS.map(f=>(
              <div key={f.key} style={{display:'flex',alignItems:'center',gap:5}}>
                <span style={{fontSize:'0.9rem'}}>{f.icon}</span>
                <span style={{fontSize:'0.68rem',fontWeight:700,color:'var(--text-muted)'}}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Athlete rows */}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {filtered.map(a=>(
              <WellnessRow key={a.PlayerID} a={a} vals={wVals[a.PlayerID]||{}} onChange={(k,v)=>setW(a.PlayerID,k,v)}/>
            ))}
          </div>

          {wMsg && <div style={{marginTop:12,padding:'10px 14px',borderRadius:10,fontSize:'0.875rem',fontWeight:600,background:wMsg.type==='success'?'#f0fdf4':'#fef2f2',border:`1px solid ${wMsg.type==='success'?'#bbf7d0':'#fecaca'}`,color:wMsg.type==='success'?'#166534':'#991b1b'}}>{wMsg.text}</div>}
        </div>
      )}

      {/* ══ RPE TAB ══ */}
      {view==='rpe' && (
        <div>
          {/* Session setup */}
          <div className="surface" style={{marginBottom:14,padding:'14px 18px'}}>
            <div className="section-hd" style={{marginBottom:12}}><i className="bi bi-lightning-charge-fill me-2" style={{color:'#f59e0b'}}/>ข้อมูลการซ้อม</div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div>
                <label className="form-label">วันที่</label>
                <input type="date" className="form-control" value={rDate} onChange={e=>setRDate(e.target.value)}/>
              </div>
              <div style={{flex:1,minWidth:160}}>
                <label className="form-label">ชื่อ Session</label>
                <input className="form-control" value={rName} onChange={e=>setRName(e.target.value)} placeholder="ซ้อมเช้า, ซ้อมเย็น..."/>
              </div>
              <div>
                <label className="form-label">ประเภท</label>
                <div style={{display:'flex',gap:6}}>
                  {SESSION_TYPES.map(t=>(
                    <button key={t.id} onClick={()=>setRType(t.id)} style={{
                      padding:'8px 10px',borderRadius:8,fontWeight:700,fontSize:'0.72rem',cursor:'pointer',
                      background:rType===t.id?t.color:'var(--bg)',
                      color:rType===t.id?'white':'var(--text-muted)',
                      border:`1.5px solid ${rType===t.id?t.color:'var(--border)'}`,
                    }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div style={{minWidth:110}}>
                <label className="form-label">ระยะเวลา (นาที)</label>
                <input type="number" className="form-control" value={rDuration} min={1} max={300} onChange={e=>setRDuration(Number(e.target.value))}/>
              </div>
              <div style={{flex:1,minWidth:120}}>
                <label className="form-label">กรองทีม</label>
                <select className="form-select" value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
                  {teams.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกทีม':t}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* RPE scale legend */}
          <div style={{padding:'10px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,marginBottom:12}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'var(--text-muted)',marginBottom:8}}>RPE SCALE — Rate of Perceived Exertion (ความหนักที่รู้สึก)</div>
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {RPE_SCALE.map(r=>(
                <div key={r.val} style={{textAlign:'center',minWidth:44}}>
                  <div style={{width:28,height:28,borderRadius:7,background:r.color,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 2px',fontWeight:900,fontSize:'0.8rem',color:'white'}}>{r.val}</div>
                  <div style={{fontSize:'0.55rem',color:'var(--text-muted)',fontWeight:600}}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          {rSummary.marked > 0 && (
            <div style={{display:'flex',gap:12,marginBottom:12,padding:'10px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:'0.78rem',fontWeight:700}}>มาร์กแล้ว {rSummary.marked}/{rSummary.total}</span>
              <span style={{fontSize:'0.78rem',fontWeight:700}}>RPE เฉลี่ย: <strong style={{color:rpeColor(Math.round(Number(rSummary.avgRPE)))}}>{rSummary.avgRPE}</strong></span>
              {rSummary.avgLoad > 0 && (
                <span style={{fontSize:'0.78rem',fontWeight:700}}>
                  Training Load เฉลี่ย: <strong style={{color:loadZone(rSummary.avgLoad).color}}>{rSummary.avgLoad} AU ({loadZone(rSummary.avgLoad).label})</strong>
                </span>
              )}
              <span style={{fontSize:'0.7rem',color:'var(--text-muted)',marginLeft:'auto'}}>Duration: {rDuration} นาที</span>
            </div>
          )}

          {/* Athlete rows */}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {filtered.map(a=>(
              <RPERow key={a.PlayerID} a={a} rpe={rVals[a.PlayerID]||0} duration={rDuration}
                onChange={v=>setRVals(p=>({...p,[a.PlayerID]:v}))}
                onDuration={_=>{}/* shared duration */}
              />
            ))}
          </div>

          {rMsg && <div style={{marginTop:12,padding:'10px 14px',borderRadius:10,fontSize:'0.875rem',fontWeight:600,background:rMsg.type==='success'?'#f0fdf4':'#fef2f2',border:`1px solid ${rMsg.type==='success'?'#bbf7d0':'#fecaca'}`,color:rMsg.type==='success'?'#166534':'#991b1b'}}>{rMsg.text}</div>}
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {view==='history' && (
        <div>
          <div className="surface" style={{marginBottom:16,padding:'14px 18px'}}>
            <label className="form-label">เลือกนักกีฬา</label>
            <select className="form-select" style={{fontWeight:600}} value={histId} onChange={e=>loadHistory(e.target.value)}>
              <option value="">— เลือกนักกีฬา —</option>
              {athletes.map(a=><option key={a.PlayerID} value={a.PlayerID}>{a.Name}{a.Nickname?` (${a.Nickname})`:''}{a.Team?` · ${a.Team}`:''}</option>)}
            </select>
          </div>

          {!histId && <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
            <i className="bi bi-graph-up" style={{fontSize:'3rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>เลือกนักกีฬาเพื่อดูประวัติ</div>}

          {histLoading && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}

          {histId && !histLoading && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'start'}}>
              {/* Wellness history */}
              <div className="surface" style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem',display:'flex',alignItems:'center',gap:8}}>
                  <i className="bi bi-heart-pulse-fill" style={{color:'#10b981'}}/>Wellness ({wellnessHist.length})
                </div>
                <div style={{maxHeight:400,overflowY:'auto'}}>
                  {wellnessHist.length===0
                    ? <div style={{padding:24,textAlign:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>ยังไม่มีข้อมูล</div>
                    : wellnessHist.map(r=>{
                        const wc=wellnessColor(r.wellnessScore);
                        return (
                          <div key={r.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                            <div>
                              <div style={{fontWeight:700,fontSize:'0.78rem'}}>{fmtDate(r.checkDate)}</div>
                            </div>
                            <div style={{display:'flex',gap:8,flex:1,fontSize:'0.7rem'}}>
                              {WELLNESS_FIELDS.map(f=>(
                                <div key={f.key} style={{textAlign:'center'}}>
                                  <div>{f.icon}</div>
                                  <div style={{fontWeight:800,color:r[f.key as keyof WellnessRecord]as number<=2?'#ef4444':r[f.key as keyof WellnessRecord]as number<=3?'#f59e0b':'#10b981'}}>{r[f.key as keyof WellnessRecord]||'—'}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{textAlign:'center'}}>
                              <div style={{fontWeight:900,fontSize:'1rem',color:wc}}>{r.wellnessScore}%</div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>

              {/* RPE history */}
              <div className="surface" style={{padding:0,overflow:'hidden'}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem',display:'flex',alignItems:'center',gap:8}}>
                  <i className="bi bi-speedometer2" style={{color:'#f59e0b'}}/>Training Load ({rpeHist.length})
                </div>
                <div style={{maxHeight:400,overflowY:'auto'}}>
                  {rpeHist.length===0
                    ? <div style={{padding:24,textAlign:'center',color:'var(--text-muted)',fontSize:'0.82rem'}}>ยังไม่มีข้อมูล</div>
                    : rpeHist.map(r=>{
                        const lz=loadZone(r.trainingLoad);
                        const rc=rpeColor(r.rpe);
                        return (
                          <div key={r.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                            <div style={{flex:1}}>
                              <div style={{fontWeight:700,fontSize:'0.78rem'}}>{fmtDate(r.sessionDate)}</div>
                              <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{r.sessionName} · {r.durationMin} นาที</div>
                            </div>
                            <div style={{textAlign:'center',minWidth:36}}>
                              <div style={{width:28,height:28,borderRadius:7,background:rc,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',fontWeight:900,fontSize:'0.8rem',color:'white'}}>{r.rpe}</div>
                              <div style={{fontSize:'0.55rem',color:'var(--text-muted)',fontWeight:700,marginTop:2}}>RPE</div>
                            </div>
                            <div style={{textAlign:'center',minWidth:52}}>
                              <div style={{fontWeight:900,color:lz.color,fontSize:'0.9rem'}}>{r.trainingLoad}</div>
                              <div style={{fontSize:'0.55rem',color:lz.color,fontWeight:700}}>{lz.label}</div>
                            </div>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
