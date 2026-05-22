'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Athlete, User, WellnessRecord, RPERecord } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

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

/* ── dot colors per value ───────────────────────────────── */
function dotColor(v: number) {
  if (v === 1) return '#ef4444';
  if (v === 2) return '#fb923c';
  if (v === 3) return '#facc15';
  if (v === 4) return '#4ade80';
  return '#22d3ee';
}

/* ── Wellness table header ───────────────────────────────── */
export function WellnessTableHeader() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'160px repeat(5,1fr) 56px', gap:0, padding:'6px 14px', background:'var(--surface)', borderRadius:'10px 10px 0 0', border:'1px solid var(--border)', borderBottom:'none' }}>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>นักกีฬา</div>
      {WELLNESS_FIELDS.map(f => (
        <div key={f.key} style={{ textAlign:'center' }}>
          <div style={{ fontSize:'1.1rem', lineHeight:1 }}>{f.icon}</div>
          <div style={{ fontSize:'0.58rem', fontWeight:700, color:'var(--text-muted)', marginTop:2, lineHeight:1.2 }}>{f.label}</div>
        </div>
      ))}
      <div style={{ textAlign:'center', fontSize:'0.58rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>SCORE</div>
    </div>
  );
}

/* ── Wellness score row ──────────────────────────────────── */
function WellnessRow({ a, vals, onChange, isLast }: {
  a: Athlete;
  vals: Partial<Record<WellnessKey, number>>;
  onChange: (key: WellnessKey, v: number) => void;
  isLast?: boolean;
}) {
  const scores = WELLNESS_FIELDS.map(f => vals[f.key] || 0);
  const filled = scores.filter(v => v > 0).length;
  const avg    = filled ? Math.round(scores.filter(v=>v>0).reduce((a,b)=>a+b,0)/filled/5*100) : 0;
  const wc     = avg > 0 ? wellnessColor(avg) : '#cbd5e1';

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'160px repeat(5,1fr) 56px', gap:0,
      padding:'10px 14px', alignItems:'center',
      background:'white',
      border:'1px solid var(--border)',
      borderTop:'none',
      borderRadius: isLast ? '0 0 10px 10px' : 0,
      transition:'background 0.12s',
    }}
      onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
      onMouseLeave={e=>(e.currentTarget.style.background='white')}
    >
      {/* Avatar + name */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:34, height:34, borderRadius:9, overflow:'hidden', background:'#e2e8f0', flexShrink:0 }}>
          {a.PhotoUrl
            ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.85rem', color:'#94a3b8' }}>{(a.Name||'?')[0]}</div>
          }
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:'0.8rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{a.Name}</div>
          {a.Nickname && <div style={{ fontSize:'0.6rem', color:'#94a3b8' }}>{a.Nickname}</div>}
        </div>
      </div>

      {/* 5 metric columns */}
      {WELLNESS_FIELDS.map(f => {
        const v = vals[f.key] || 0;
        return (
          <div key={f.key} style={{ display:'flex', justifyContent:'center', gap:3 }}>
            {[1,2,3,4,5].map(n => {
              const active = v >= n;
              const col = active ? dotColor(v) : '#e2e8f0';
              return (
                <button
                  key={n}
                  onClick={() => onChange(f.key, v === n ? 0 : n)}
                  title={`${f.label} = ${n}`}
                  style={{
                    width:28, height:28, borderRadius:7, border:'none', cursor:'pointer',
                    background: active ? col : '#f1f5f9',
                    color: active ? 'white' : '#94a3b8',
                    fontWeight:900, fontSize:'0.72rem',
                    boxShadow: active ? `0 2px 6px ${col}60` : 'none',
                    transform: v === n ? 'scale(1.15)' : 'scale(1)',
                    transition:'all 0.12s',
                  }}
                >{n}</button>
              );
            })}
          </div>
        );
      })}

      {/* Score */}
      <div style={{ textAlign:'center' }}>
        {avg > 0 ? (
          <>
            <div style={{ fontSize:'1.15rem', fontWeight:900, color:wc, lineHeight:1 }}>{avg}</div>
            <div style={{ fontSize:'0.52rem', color:'#94a3b8', fontWeight:700, letterSpacing:0.5 }}>%</div>
          </>
        ) : (
          <div style={{ fontSize:'0.75rem', color:'#cbd5e1', fontWeight:700 }}>—</div>
        )}
      </div>
    </div>
  );
}

/* ── RPE table header ────────────────────────────────────── */
export function RPETableHeader() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'160px 1fr 100px', gap:0, padding:'8px 14px', background:'var(--surface)', borderRadius:'10px 10px 0 0', border:'1px solid var(--border)', borderBottom:'none' }}>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, display:'flex', alignItems:'center' }}>นักกีฬา</div>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, display:'flex', alignItems:'center' }}>RPE (1 = พักผ่อน → 10 = สุดแรง)</div>
      <div style={{ fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center' }}>Training Load</div>
    </div>
  );
}

/* ── RPE row ──────────────────────────────────────────────── */
function RPERow({ a, rpe, duration, onChange, isLast }: {
  a: Athlete; rpe: number; duration: number;
  onChange: (v: number) => void;
  isLast?: boolean;
}) {
  const load = rpe > 0 && duration > 0 ? rpe * duration : 0;
  const zone = load > 0 ? loadZone(load) : null;
  const rc   = rpe > 0 ? rpeColor(rpe) : '#cbd5e1';
  const rpeInfo = RPE_SCALE.find(r => r.val === rpe);

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'160px 1fr 100px', gap:0, alignItems:'center',
      padding:'10px 14px', background:'white',
      border:'1px solid var(--border)', borderTop:'none',
      borderRadius: isLast ? '0 0 10px 10px' : 0,
      transition:'background 0.12s',
    }}
      onMouseEnter={e=>(e.currentTarget.style.background='#f8fafc')}
      onMouseLeave={e=>(e.currentTarget.style.background='white')}
    >
      {/* Avatar + name */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:34, height:34, borderRadius:9, overflow:'hidden', background:'#e2e8f0', flexShrink:0 }}>
          {a.PhotoUrl
            ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.85rem', color:'#94a3b8' }}>{(a.Name||'?')[0]}</div>
          }
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.8rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{a.Name}</div>
          {a.Nickname && <div style={{ fontSize:'0.6rem', color:'#94a3b8' }}>{a.Nickname}</div>}
        </div>
      </div>

      {/* RPE buttons 1–10 */}
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        {RPE_SCALE.map(r => {
          const active = rpe === r.val;
          return (
            <button
              key={r.val}
              onClick={() => onChange(active ? 0 : r.val)}
              title={r.desc}
              style={{
                width:34, height:34, borderRadius:8, border:'none',
                fontWeight:900, fontSize:'0.8rem', cursor:'pointer',
                background: active ? r.color : rpe > 0 && r.val < rpe ? r.color + '30' : '#f1f5f9',
                color: active ? 'white' : rpe > 0 && r.val < rpe ? r.color : '#94a3b8',
                transform: active ? 'scale(1.2)' : 'scale(1)',
                boxShadow: active ? `0 4px 12px ${r.color}60` : 'none',
                transition:'all 0.12s',
                zIndex: active ? 1 : 0,
                position:'relative',
              }}
            >{r.val}</button>
          );
        })}
        {rpeInfo && (
          <span style={{ marginLeft:6, fontSize:'0.72rem', fontWeight:700, color:rc, whiteSpace:'nowrap' }}>
            {rpeInfo.desc}
          </span>
        )}
      </div>

      {/* Load */}
      <div style={{ textAlign:'center' }}>
        {zone ? (
          <>
            <div style={{ fontSize:'1.1rem', fontWeight:900, color:zone.color, lineHeight:1 }}>{load}</div>
            <div style={{ fontSize:'0.56rem', fontWeight:700, color:zone.color, marginTop:1 }}>AU · {zone.label}</div>
          </>
        ) : (
          <div style={{ fontSize:'0.75rem', color:'#cbd5e1', fontWeight:700 }}>—</div>
        )}
      </div>
    </div>
  );
}

/* ── Team Trend helpers ─────────────────────────────────── */
type DayWellness = { date:string; count:number; avgScore:number; avgFatigue:number; avgSleep:number; avgSoreness:number; avgStress:number; avgMood:number };
type DayRPE      = { date:string; session:string; sessionType:string; count:number; avgRPE:number; avgLoad:number };

function groupTeamWellness(rows: {checkDate:string;fatigue:number;sleepQuality:number;soreness:number;stress:number;mood:number;wellnessScore:number}[]): DayWellness[] {
  const map = new Map<string, typeof rows>();
  rows.forEach(r => { if (!map.has(r.checkDate)) map.set(r.checkDate,[]); map.get(r.checkDate)!.push(r); });
  return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([date, rs]) => ({
    date, count: rs.length,
    avgScore:    Math.round(rs.reduce((s,r)=>s+r.wellnessScore,0)/rs.length),
    avgFatigue:  +(rs.reduce((s,r)=>s+r.fatigue,0)/rs.length).toFixed(2),
    avgSleep:    +(rs.reduce((s,r)=>s+r.sleepQuality,0)/rs.length).toFixed(2),
    avgSoreness: +(rs.reduce((s,r)=>s+r.soreness,0)/rs.length).toFixed(2),
    avgStress:   +(rs.reduce((s,r)=>s+r.stress,0)/rs.length).toFixed(2),
    avgMood:     +(rs.reduce((s,r)=>s+r.mood,0)/rs.length).toFixed(2),
  }));
}

function groupTeamRPE(rows: {sessionDate:string;sessionName:string;sessionType:string;rpe:number;trainingLoad:number}[]): DayRPE[] {
  const map = new Map<string, typeof rows>();
  rows.forEach(r => { const k=`${r.sessionDate}||${r.sessionName}`; if(!map.has(k))map.set(k,[]); map.get(k)!.push(r); });
  return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0])).map(([key, rs]) => {
    const [date, session] = key.split('||');
    return { date, session, sessionType:rs[0].sessionType, count:rs.length,
      avgRPE:  +(rs.reduce((s,r)=>s+r.rpe,0)/rs.length).toFixed(1),
      avgLoad: Math.round(rs.reduce((s,r)=>s+r.trainingLoad,0)/rs.length) };
  });
}

/* ── Main ─────────────────────────────────────────────────── */
export default function WellnessPage({ athletes, user }: Props) {
  const [view, setView] = useState<'wellness'|'rpe'|'history'|'team'>('wellness');

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
    if (!records.length) { showToast('ยังไม่มีข้อมูลที่จะบันทึก', 'error'); return; }
    setWSaving(true);
    try {
      const res = await callGAS('saveWellness', { records }) as {status:string;message:string};
      showToast(res.message||'เสร็จแล้ว', res.status==='success'?'success':'error');
    } catch(e:unknown) { showToast(e instanceof Error ? e.message : 'Error', 'error'); }
    finally { setWSaving(false); }
  };

  /* ── RPE state ─── */
  const [rDate,     setRDate]     = useState(todayStr());
  const [rName,     setRName]     = useState('ซ้อมเช้า');
  const [rType,     setRType]     = useState('training');
  const [rDuration, setRDuration] = useState(60);
  const [rVals,     setRVals]     = useState<Record<string, number>>({});
  const [rSaving,   setRSaving]   = useState(false);

  const saveRPE = async () => {
    const records = filtered.map(a => {
      const rpe = rVals[a.PlayerID] || 0;
      if (!rpe) return null;
      return { playerId:a.PlayerID, sessionDate:rDate, sessionName:rName, sessionType:rType, rpe, durationMin:rDuration, createdBy: user.displayName||user.username };
    }).filter(Boolean);
    if (!records.length) { showToast('ยังไม่มีข้อมูลที่จะบันทึก', 'error'); return; }
    setRSaving(true);
    try {
      const res = await callGAS('saveRPE', { records }) as {status:string;message:string};
      showToast(res.message||'เสร็จแล้ว', res.status==='success'?'success':'error');
    } catch(e:unknown) { showToast(e instanceof Error ? e.message : 'Error', 'error'); }
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

  /* ── TEAM TREND state ─── */
  const [tTeam,       setTTeam]       = useState('ALL');
  const [tDays,       setTDays]       = useState<30|60|90|0>(30);
  const [tLoading,    setTLoading]    = useState(false);
  const [tWellness,   setTWellness]   = useState<DayWellness[]>([]);
  const [tRPE,        setTRPE]        = useState<DayRPE[]>([]);

  const teamNames = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort()], [athletes]);

  const loadTeamTrend = useCallback(async (team: string, days: number) => {
    setTLoading(true);
    try {
      const ids = athletes.filter(a => team==='ALL' || a.Team===team).map(a=>a.PlayerID);
      if (!ids.length) { setTWellness([]); setTRPE([]); return; }
      const [wRaw, rRaw] = await Promise.all([
        callGAS('getTeamWellnessSummary', { playerIds: ids, days: days||undefined }) as Promise<{checkDate:string;fatigue:number;sleepQuality:number;soreness:number;stress:number;mood:number;wellnessScore:number}[]>,
        callGAS('getTeamRPESummary',     { playerIds: ids, days: days||undefined }) as Promise<{sessionDate:string;sessionName:string;sessionType:string;rpe:number;trainingLoad:number}[]>,
      ]);
      setTWellness(groupTeamWellness(Array.isArray(wRaw)?wRaw:[]));
      setTRPE(groupTeamRPE(Array.isArray(rRaw)?rRaw:[]));
    } catch { /* silent */ } finally { setTLoading(false); }
  }, [athletes]);

  useEffect(() => {
    if (view==='team') loadTeamTrend(tTeam, tDays);
  }, [view, tTeam, tDays, loadTeamTrend]);

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
          disabled={view==='history'||view==='team' || (view==='wellness' ? wSaving : rSaving)}>
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
          {id:'history',  icon:'bi-person-lines-fill',label:'ประวัติรายบุคคล'},
          {id:'team',     icon:'bi-people-fill',      label:'Trend ทีม'},
        ] as {id:'wellness'|'rpe'|'history'|'team';icon:string;label:string}[]).map(t=>(
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

          {/* Athlete table */}
          <div className="table-scroll-wrap" style={{ borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ minWidth:600 }}>
              <WellnessTableHeader />
              {filtered.map((a, i) => (
                <WellnessRow
                  key={a.PlayerID}
                  a={a}
                  vals={wVals[a.PlayerID]||{}}
                  onChange={(k,v) => setW(a.PlayerID,k,v)}
                  isLast={i === filtered.length - 1}
                />
              ))}
            </div>
          </div>

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
                <div className="wellness-session-types" style={{display:'flex',gap:6}}>
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

          {/* RPE scale legend — compact strip */}
          <div style={{padding:'8px 14px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,marginBottom:12,display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:'0.62rem',fontWeight:700,color:'var(--text-muted)',marginRight:6,whiteSpace:'nowrap'}}>RPE SCALE:</span>
            {RPE_SCALE.map(r=>(
              <div key={r.val} style={{display:'flex',flexDirection:'column',alignItems:'center',minWidth:38}}>
                <div style={{width:26,height:26,borderRadius:6,background:r.color,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'0.75rem',color:'white'}}>{r.val}</div>
                <div style={{fontSize:'0.52rem',color:'var(--text-muted)',fontWeight:600,marginTop:1,whiteSpace:'nowrap'}}>{r.desc}</div>
              </div>
            ))}
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

          {/* Athlete table */}
          <div className="table-scroll-wrap" style={{ borderRadius:10, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ minWidth:580 }}>
              <RPETableHeader />
              {filtered.map((a, i) => (
                <RPERow
                  key={a.PlayerID}
                  a={a}
                  rpe={rVals[a.PlayerID]||0}
                  duration={rDuration}
                  onChange={v => setRVals(p => ({...p,[a.PlayerID]:v}))}
                  isLast={i === filtered.length - 1}
                />
              ))}
            </div>
          </div>

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
            <div>

            {/* ── CHARTS ── */}
            {(wellnessHist.length > 0 || rpeHist.length > 0) && (
              <div className="grid-2col" style={{marginBottom:16,alignItems:'start'}}>

                {/* Wellness Trend */}
                {wellnessHist.length > 0 && (() => {
                  const rows = [...wellnessHist].reverse().slice(-20);
                  const labels = rows.map(r => { try { return new Date(r.checkDate).toLocaleDateString('th-TH',{day:'numeric',month:'short'}); } catch { return r.checkDate; } });
                  const data = {
                    labels,
                    datasets: [
                      { label:'Overall %', data: rows.map(r=>r.wellnessScore), borderColor:'#38bdf8', backgroundColor:'rgba(56,189,248,0.1)', borderWidth:2.5, pointRadius:4, tension:0.4, fill:true, yAxisID:'y' },
                      { label:'⚡ Freshness', data: rows.map(r=>r.fatigue*20), borderColor:'#fbbf24', borderWidth:1.5, pointRadius:2, tension:0.3, fill:false, borderDash:[4,3] as number[], yAxisID:'y' },
                      { label:'😴 Sleep',    data: rows.map(r=>r.sleepQuality*20), borderColor:'#a78bfa', borderWidth:1.5, pointRadius:2, tension:0.3, fill:false, borderDash:[4,3] as number[], yAxisID:'y' },
                      { label:'💪 Soreness', data: rows.map(r=>r.soreness*20), borderColor:'#34d399', borderWidth:1.5, pointRadius:2, tension:0.3, fill:false, borderDash:[4,3] as number[], yAxisID:'y' },
                      { label:'🧠 Stress',   data: rows.map(r=>r.stress*20), borderColor:'#f472b6', borderWidth:1.5, pointRadius:2, tension:0.3, fill:false, borderDash:[4,3] as number[], yAxisID:'y' },
                      { label:'😊 Mood',     data: rows.map(r=>r.mood*20), borderColor:'#fb923c', borderWidth:1.5, pointRadius:2, tension:0.3, fill:false, borderDash:[4,3] as number[], yAxisID:'y' },
                    ],
                  };
                  const opts = {
                    responsive:true, maintainAspectRatio:false,
                    plugins:{ legend:{ display:true, position:'bottom' as const, labels:{ boxWidth:10, font:{ size:10 } } }, tooltip:{ mode:'index' as const, intersect:false } },
                    scales:{ y:{ min:0, max:100, ticks:{ stepSize:20, font:{ size:10 } }, grid:{ color:'rgba(0,0,0,0.05)' } }, x:{ ticks:{ font:{ size:10 } }, grid:{ display:false } } },
                  };
                  return (
                    <div className="surface" style={{padding:'14px 16px'}}>
                      <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <i className="bi bi-heart-pulse-fill" style={{color:'#10b981'}}/>Wellness Trend
                        <span style={{marginLeft:'auto',fontSize:'0.68rem',color:'var(--text-muted)'}}>{rows.length} sessions</span>
                      </div>
                      <div style={{height:200}}><Line data={data} options={opts}/></div>
                    </div>
                  );
                })()}

                {/* Training Load */}
                {rpeHist.length > 0 && (() => {
                  const rows = [...rpeHist].reverse().slice(-20);
                  const labels = rows.map(r => { try { return new Date(r.sessionDate).toLocaleDateString('th-TH',{day:'numeric',month:'short'}); } catch { return r.sessionDate; } });
                  const zoneColor = (load:number) => load<=150?'rgba(16,185,129,0.7)':load<=300?'rgba(56,189,248,0.7)':load<=450?'rgba(245,158,11,0.7)':'rgba(239,68,68,0.7)';
                  const data = {
                    labels,
                    datasets: [
                      {
                        type:'bar' as const,
                        label:'Training Load (AU)',
                        data: rows.map(r=>r.trainingLoad),
                        backgroundColor: rows.map(r=>zoneColor(r.trainingLoad)),
                        borderRadius:5, yAxisID:'y',
                      },
                      {
                        type:'line' as const,
                        label:'RPE',
                        data: rows.map(r=>r.rpe),
                        borderColor:'#f59e0b', borderWidth:2, pointRadius:4,
                        tension:0.3, fill:false, yAxisID:'y2',
                      },
                    ],
                  };
                  const opts = {
                    responsive:true, maintainAspectRatio:false,
                    plugins:{ legend:{ display:true, position:'bottom' as const, labels:{ boxWidth:10, font:{ size:10 } } }, tooltip:{ mode:'index' as const, intersect:false } },
                    scales:{
                      y:{ position:'left' as const, ticks:{ font:{ size:10 } }, grid:{ color:'rgba(0,0,0,0.05)' }, title:{ display:true, text:'Load (AU)', font:{ size:9 } } },
                      y2:{ position:'right' as const, min:0, max:10, ticks:{ font:{ size:10 } }, grid:{ display:false }, title:{ display:true, text:'RPE', font:{ size:9 } } },
                      x:{ ticks:{ font:{ size:10 } }, grid:{ display:false } },
                    },
                  };
                  return (
                    <div className="surface" style={{padding:'14px 16px'}}>
                      <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                        <i className="bi bi-speedometer2" style={{color:'#f59e0b'}}/>Training Load
                        <span style={{marginLeft:'auto',fontSize:'0.68rem',color:'var(--text-muted)'}}>{rows.length} sessions</span>
                      </div>
                      <div style={{height:200}}><Bar data={data as never} options={opts}/></div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── HISTORY TABLES ── */}
            <div className="grid-2col" style={{alignItems:'start'}}>
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
            </div>
          )}
        </div>
      )}

      {/* ══ TEAM TREND TAB ══ */}
      {view==='team' && (
        <div>
          {/* Controls */}
          <div className="surface" style={{marginBottom:16,padding:'14px 18px'}}>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:1,minWidth:160}}>
                <label className="form-label">ทีม / รุ่นอายุ</label>
                <select className="form-select" value={tTeam} onChange={e=>setTTeam(e.target.value)}>
                  {teamNames.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกทีม':t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">ช่วงเวลา</label>
                <div style={{display:'flex',gap:4}}>
                  {([{v:30,l:'30 วัน'},{v:60,l:'60 วัน'},{v:90,l:'90 วัน'},{v:0,l:'ทั้งหมด'}] as {v:30|60|90|0;l:string}[]).map(o=>(
                    <button key={o.v} onClick={()=>setTDays(o.v)} style={{padding:'8px 12px',borderRadius:8,border:`1.5px solid ${tDays===o.v?'#38bdf8':'var(--border)'}`,background:tDays===o.v?'#38bdf8':'var(--surface)',color:tDays===o.v?'white':'var(--text-muted)',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-outline btn-sm" onClick={()=>loadTeamTrend(tTeam,tDays)} disabled={tLoading}>
                <i className="bi bi-arrow-clockwise me-1"/>{tLoading ? 'กำลังโหลด...' : 'โหลดข้อมูล'}
              </button>
            </div>
          </div>

          {tLoading && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}

          {!tLoading && tWellness.length===0 && tRPE.length===0 && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-bar-chart-line" style={{fontSize:'3rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>
              <p>ยังไม่มีข้อมูลในช่วงเวลาที่เลือก</p>
            </div>
          )}

          {!tLoading && (tWellness.length>0 || tRPE.length>0) && (
            <div>
              {/* ── Summary KPI ── */}
              {(() => {
                const lastW = tWellness[tWellness.length-1];
                const lastR = tRPE[tRPE.length-1];
                const avgW = tWellness.length ? Math.round(tWellness.reduce((s,d)=>s+d.avgScore,0)/tWellness.length) : 0;
                const avgR = tRPE.length ? +(tRPE.reduce((s,d)=>s+d.avgRPE,0)/tRPE.length).toFixed(1) : 0;
                const avgL = tRPE.length ? Math.round(tRPE.reduce((s,d)=>s+d.avgLoad,0)/tRPE.length) : 0;
                return (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:10,marginBottom:16}}>
                    {[
                      {label:'Wellness เฉลี่ย',val:`${avgW}%`,icon:'bi-heart-pulse-fill',color:'#10b981',sub:`${tWellness.length} วัน`},
                      {label:'Wellness ล่าสุด',val:lastW?`${lastW.avgScore}%`:'—',icon:'bi-calendar-check',color:'#38bdf8',sub:lastW?fmtDate(lastW.date):''},
                      {label:'RPE เฉลี่ย',val:avgR?String(avgR):'—',icon:'bi-speedometer2',color:'#f59e0b',sub:`${tRPE.length} sessions`},
                      {label:'Load เฉลี่ย',val:avgL?`${avgL} AU`:'—',icon:'bi-lightning-charge-fill',color:'#f97316',sub:lastR?`ล่าสุด: ${fmtDate(lastR.date)}`:''},
                    ].map(k=>(
                      <div key={k.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',borderLeft:`3px solid ${k.color}`}}>
                        <i className={`bi ${k.icon}`} style={{color:k.color,fontSize:'0.85rem',marginBottom:4,display:'block'}}/>
                        <div style={{fontWeight:900,fontSize:'1.2rem'}}>{k.val}</div>
                        <div style={{fontSize:'0.62rem',color:'var(--text-muted)',fontWeight:600,marginTop:2}}>{k.label}</div>
                        {k.sub && <div style={{fontSize:'0.58rem',color:'#94a3b8',marginTop:1}}>{k.sub}</div>}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ── Charts ── */}
              <div className="grid-2col" style={{marginBottom:16,alignItems:'start'}}>
                {/* Wellness Trend */}
                {tWellness.length>0 && (()=>{
                  const labels = tWellness.map(d=>{ try{return new Date(d.date).toLocaleDateString('th-TH',{day:'numeric',month:'short'});}catch{return d.date;} });
                  const data = {
                    labels,
                    datasets:[
                      {label:'Overall %',data:tWellness.map(d=>d.avgScore),borderColor:'#38bdf8',backgroundColor:'rgba(56,189,248,0.12)',borderWidth:2.5,pointRadius:4,tension:0.4,fill:true},
                      {label:'⚡ Freshness',data:tWellness.map(d=>+(d.avgFatigue*20).toFixed(1)),borderColor:'#fbbf24',borderWidth:1.5,pointRadius:2,tension:0.3,fill:false,borderDash:[4,3] as number[]},
                      {label:'😴 Sleep',    data:tWellness.map(d=>+(d.avgSleep*20).toFixed(1)),borderColor:'#a78bfa',borderWidth:1.5,pointRadius:2,tension:0.3,fill:false,borderDash:[4,3] as number[]},
                      {label:'💪 Soreness', data:tWellness.map(d=>+(d.avgSoreness*20).toFixed(1)),borderColor:'#34d399',borderWidth:1.5,pointRadius:2,tension:0.3,fill:false,borderDash:[4,3] as number[]},
                      {label:'🧠 Stress',   data:tWellness.map(d=>+(d.avgStress*20).toFixed(1)),borderColor:'#f472b6',borderWidth:1.5,pointRadius:2,tension:0.3,fill:false,borderDash:[4,3] as number[]},
                      {label:'😊 Mood',     data:tWellness.map(d=>+(d.avgMood*20).toFixed(1)),borderColor:'#fb923c',borderWidth:1.5,pointRadius:2,tension:0.3,fill:false,borderDash:[4,3] as number[]},
                    ],
                  };
                  const opts={responsive:true,maintainAspectRatio:false,
                    plugins:{legend:{display:true,position:'bottom' as const,labels:{boxWidth:10,font:{size:10}}},tooltip:{mode:'index' as const,intersect:false,callbacks:{label:(ctx:never)=>{const c=ctx as {dataset:{label:string};raw:number};return ` ${c.dataset.label}: ${c.raw}%`;}}}},
                    scales:{y:{min:0,max:100,ticks:{stepSize:20,font:{size:10}},grid:{color:'rgba(0,0,0,0.05)'}},x:{ticks:{font:{size:10}},grid:{display:false}}}};
                  return (
                    <div className="surface" style={{padding:'14px 16px'}}>
                      <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
                        <i className="bi bi-heart-pulse-fill" style={{color:'#10b981'}}/>Wellness Trend
                        <span style={{marginLeft:'auto',fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:400}}>ค่าเฉลี่ยทีม · {tWellness.length} วัน</span>
                      </div>
                      <div style={{height:220}}><Line data={data} options={opts}/></div>
                    </div>
                  );
                })()}

                {/* Training Load Trend */}
                {tRPE.length>0 && (()=>{
                  const labels = tRPE.map(d=>{ try{return `${new Date(d.date).toLocaleDateString('th-TH',{day:'numeric',month:'short'})}${d.session?' ('+d.session+')':''}`;}catch{return d.date;} });
                  const zoneColor=(load:number)=>load<=150?'rgba(16,185,129,0.75)':load<=300?'rgba(56,189,248,0.75)':load<=450?'rgba(245,158,11,0.75)':'rgba(239,68,68,0.75)';
                  const data={labels,datasets:[
                    {type:'bar' as const,label:'Avg Load (AU)',data:tRPE.map(d=>d.avgLoad),backgroundColor:tRPE.map(d=>zoneColor(d.avgLoad)),borderRadius:5,yAxisID:'y'},
                    {type:'line' as const,label:'Avg RPE',data:tRPE.map(d=>d.avgRPE),borderColor:'#f59e0b',borderWidth:2.5,pointRadius:4,tension:0.3,fill:false,yAxisID:'y2'},
                  ]};
                  const opts={responsive:true,maintainAspectRatio:false,
                    plugins:{legend:{display:true,position:'bottom' as const,labels:{boxWidth:10,font:{size:10}}},tooltip:{mode:'index' as const,intersect:false}},
                    scales:{y:{position:'left' as const,ticks:{font:{size:10}},grid:{color:'rgba(0,0,0,0.05)'},title:{display:true,text:'Avg Load (AU)',font:{size:9}}},y2:{position:'right' as const,min:0,max:10,ticks:{font:{size:10}},grid:{display:false},title:{display:true,text:'Avg RPE',font:{size:9}}},x:{ticks:{font:{size:9},maxRotation:40},grid:{display:false}}}};
                  return (
                    <div className="surface" style={{padding:'14px 16px'}}>
                      <div style={{fontWeight:700,fontSize:'0.82rem',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
                        <i className="bi bi-speedometer2" style={{color:'#f59e0b'}}/>Training Load Trend
                        <span style={{marginLeft:'auto',fontSize:'0.68rem',color:'var(--text-muted)',fontWeight:400}}>ค่าเฉลี่ยทีม · {tRPE.length} sessions</span>
                      </div>
                      <div style={{height:220}}><Bar data={data as never} options={opts}/></div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Daily Summary Table ── */}
              {(tWellness.length>0 || tRPE.length>0) && (
                <div className="grid-2col" style={{alignItems:'start'}}>
                  {tWellness.length>0 && (
                    <div className="surface" style={{padding:0,overflow:'hidden'}}>
                      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.82rem',display:'flex',gap:6,alignItems:'center'}}>
                        <i className="bi bi-heart-pulse-fill" style={{color:'#10b981'}}/>สรุป Wellness รายวัน
                      </div>
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                          <thead><tr style={{background:'var(--bg)'}}>
                            {['วันที่','จำนวน','Overall','⚡','😴','💪','🧠','😊'].map(h=>(
                              <th key={h} style={{padding:'7px 10px',textAlign:'center',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {[...tWellness].reverse().slice(0,20).map((d,i)=>{
                              const wc=wellnessColor(d.avgScore);
                              const m=(v:number)=>{
                                const c=v>=4?'#10b981':v>=3?'#38bdf8':v>=2?'#f59e0b':'#ef4444';
                                return <span style={{fontWeight:700,color:c}}>{v.toFixed(1)}</span>;
                              };
                              return (
                                <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'white':'var(--bg)'}}>
                                  <td style={{padding:'7px 10px',fontWeight:600,whiteSpace:'nowrap'}}>{fmtDate(d.date)}</td>
                                  <td style={{textAlign:'center',color:'var(--text-muted)'}}>{d.count}</td>
                                  <td style={{textAlign:'center'}}><span style={{fontWeight:900,color:wc}}>{d.avgScore}%</span></td>
                                  <td style={{textAlign:'center'}}>{m(d.avgFatigue)}</td>
                                  <td style={{textAlign:'center'}}>{m(d.avgSleep)}</td>
                                  <td style={{textAlign:'center'}}>{m(d.avgSoreness)}</td>
                                  <td style={{textAlign:'center'}}>{m(d.avgStress)}</td>
                                  <td style={{textAlign:'center'}}>{m(d.avgMood)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {tRPE.length>0 && (
                    <div className="surface" style={{padding:0,overflow:'hidden'}}>
                      <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.82rem',display:'flex',gap:6,alignItems:'center'}}>
                        <i className="bi bi-speedometer2" style={{color:'#f59e0b'}}/>สรุป Training Load รายวัน
                      </div>
                      <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                          <thead><tr style={{background:'var(--bg)'}}>
                            {['วันที่','Session','จำนวน','Avg RPE','Avg Load','Zone'].map(h=>(
                              <th key={h} style={{padding:'7px 10px',textAlign:'center',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap'}}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {[...tRPE].reverse().slice(0,20).map((d,i)=>{
                              const lz=loadZone(d.avgLoad);
                              return (
                                <tr key={i} style={{borderBottom:'1px solid var(--border)',background:i%2===0?'white':'var(--bg)'}}>
                                  <td style={{padding:'7px 10px',fontWeight:600,whiteSpace:'nowrap'}}>{fmtDate(d.date)}</td>
                                  <td style={{padding:'7px 10px',color:'var(--text-muted)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.session}</td>
                                  <td style={{textAlign:'center',color:'var(--text-muted)'}}>{d.count}</td>
                                  <td style={{textAlign:'center'}}><span style={{fontWeight:900,color:rpeColor(Math.round(d.avgRPE))}}>{d.avgRPE}</span></td>
                                  <td style={{textAlign:'center'}}><span style={{fontWeight:900,color:lz.color}}>{d.avgLoad}</span></td>
                                  <td style={{textAlign:'center'}}><span style={{fontSize:'0.68rem',fontWeight:700,color:lz.color}}>{lz.label}</span></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
