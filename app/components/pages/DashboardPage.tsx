'use client';

import { useState, useMemo } from 'react';
import { Athlete, Page } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import { Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement,
} from 'chart.js';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface Props { athletes: Athlete[]; onNavigate: (p: Page, id?: string) => void; }

/* ── helpers ─────────────────────────────────────────────── */
function calcAge(dob: string) {
  if (!dob || dob === '-') return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 31557600000);
}
function ageGroup(age: number | null) {
  if (age === null) return 'ไม่ระบุ';
  if (age <= 12) return 'U-12'; if (age <= 15) return 'U-15';
  if (age <= 18) return 'U-18'; return 'Senior';
}
function daysSince(ts: string) {
  if (!ts) return 999;
  const d = new Date(ts); if (isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function getInitials(name: string) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
function ratingColor(r: number) {
  if (r >= 80) return '#10b981'; if (r >= 65) return '#38bdf8';
  if (r >= 50) return '#f59e0b'; if (r >= 35) return '#f97316';
  return '#ef4444';
}
function posColor(pos: string) {
  const p = (pos || '').toLowerCase();
  if (p.includes('forward') || p.includes('fwd') || p.includes('striker')) return { bg:'#fef9c3', color:'#ca8a04', border:'#fde047' };
  if (p.includes('def') || p.includes('cb') || p.includes('lb') || p.includes('rb')) return { bg:'#dbeafe', color:'#1d4ed8', border:'#93c5fd' };
  if (p.includes('goal') || p.includes('gk')) return { bg:'#fce7f3', color:'#be185d', border:'#f9a8d4' };
  return { bg:'#d1fae5', color:'#065f46', border:'#6ee7b7' };
}

/* ── metric definitions ──────────────────────────────────── */
const METRICS = [
  { key:'Speed30'    as keyof Athlete['Latest'], rk:'speed30',  label:'Speed 30m', unit:'s',    asc:true,  color:'#f59e0b' },
  { key:'CMJ'        as keyof Athlete['Latest'], rk:'cmj',      label:'CMJ',       unit:'cm',   asc:false, color:'#f472b6' },
  { key:'Agility'    as keyof Athlete['Latest'], rk:'agility',  label:'Agility',   unit:'s',    asc:true,  color:'#34d399' },
  { key:'Situp'      as keyof Athlete['Latest'], rk:'situp',    label:'Sit-up',    unit:'reps', asc:false, color:'#38bdf8' },
  { key:'LongJump'   as keyof Athlete['Latest'], rk:'longjump', label:'Long Jump', unit:'cm',   asc:false, color:'#a78bfa' },
  { key:'YoYo'       as keyof Athlete['Latest'], rk:'yoyo',     label:'Yo-Yo',     unit:'m',    asc:false, color:'#ef4444' },
  { key:'Pushup'     as keyof Athlete['Latest'], rk:'pushup',   label:'Push-up',   unit:'reps', asc:false, color:'#fb923c' },
  { key:'SitAndReach'as keyof Athlete['Latest'], rk:'sitreach', label:'Sit&Reach', unit:'cm',   asc:false, color:'#6ee7b7' },
];

/* ── Score band config ───────────────────────────────────── */
const BANDS = [
  { label:'81-100', min:81, max:100, color:'#10b981', bg:'#f0fdf4' },
  { label:'61-80',  min:61, max:80,  color:'#38bdf8', bg:'#eff6ff' },
  { label:'41-60',  min:41, max:60,  color:'#f59e0b', bg:'#fffbeb' },
  { label:'21-40',  min:21, max:40,  color:'#f97316', bg:'#fff7ed' },
  { label:'0-20',   min:0,  max:20,  color:'#ef4444', bg:'#fef2f2' },
];

/* ── Sub-components ──────────────────────────────────────── */
function KPICard({ label, val, unit, icon, color, sub }: { label:string; val:string|number; unit?:string; icon:string; color:string; sub?:string }) {
  return (
    <div style={{ flex:1, minWidth:130, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', borderLeft:`4px solid ${color}` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <i className={`bi ${icon}`} style={{ color, fontSize:'1rem' }}/>
        <span style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize:'1.7rem', fontWeight:900, lineHeight:1, color }}>
        {val}{unit&&<span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--text-muted)', marginLeft:3 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function RatingRing({ rating, size=40 }: { rating:number; size?:number }) {
  const r = rating || 0; const color = ratingColor(r);
  const pct = r / 100; const circ = 2 * Math.PI * (size/2 - 4);
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke="var(--border)" strokeWidth={3}/>
        <circle cx={size/2} cy={size/2} r={size/2-4} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size>40?'0.78rem':'0.6rem', fontWeight:900, color }}>{r||'—'}</div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function DashboardPage({ athletes, onNavigate }: Props) {
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [posFilter,  setPosFilter]  = useState('ALL');
  const [ageFilter,  setAgeFilter]  = useState('ALL');
  const [nameQ,      setNameQ]      = useState('');
  const [sortKey,    setSortKey]    = useState<keyof Athlete['Latest']>('Rating');
  const [sortDir,    setSortDir]    = useState<'asc'|'desc'>('desc');
  const [h2hA,       setH2hA]       = useState('');
  const [h2hB,       setH2hB]       = useState('');
  const [activeSection, setActiveSection] = useState<'overview'|'ranking'|'heatmap'|'h2h'>('overview');

  const teams     = useMemo(() => Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort(), [athletes]);
  const positions = useMemo(() => Array.from(new Set(athletes.map(a=>a.Position).filter(Boolean))).sort(), [athletes]);

  const filtered = useMemo(() => athletes.filter(a => {
    if (teamFilter !== 'ALL' && a.Team !== teamFilter) return false;
    if (posFilter  !== 'ALL' && a.Position !== posFilter) return false;
    if (ageFilter  !== 'ALL' && ageGroup(calcAge(a.DOB)) !== ageFilter) return false;
    if (nameQ) { const q=nameQ.toLowerCase(); return `${a.Name} ${a.Nickname} ${a.Club}`.toLowerCase().includes(q); }
    return true;
  }), [athletes, teamFilter, posFilter, ageFilter, nameQ]);

  const sorted = useMemo(() => [...filtered].sort((a,b) => {
    const va = Number(a.Latest?.[sortKey])||0;
    const vb = Number(b.Latest?.[sortKey])||0;
    return sortDir==='asc' ? va-vb : vb-va;
  }), [filtered, sortKey, sortDir]);

  /* ── KPI computation ── */
  const kpi = useMemo(() => {
    const rated  = filtered.filter(a => Number(a.Latest?.Rating)>0);
    const avgRating = rated.length ? Math.round(avg(rated.map(a=>Number(a.Latest?.Rating)||0))) : 0;
    const totalTests = filtered.reduce((s,a)=>(s + (a.History?.length||0)),0);
    const lastTest = filtered.map(a => {
      const ts = a.History?.length ? a.History[a.History.length-1]?.Timestamp||'' : '';
      return daysSince(ts);
    });
    const recentlyTested = lastTest.filter(d=>d<=30).length;
    const neverTested    = lastTest.filter(d=>d>=999).length;
    const overdue        = lastTest.filter(d=>d>30&&d<999).length;
    const avgSpeed  = avg(filtered.map(a=>Number(a.Latest?.Speed30)||0).filter(v=>v>0));
    const avgCMJ    = avg(filtered.map(a=>Number(a.Latest?.CMJ)||0).filter(v=>v>0));
    const avgYoYo   = avg(filtered.map(a=>Number(a.Latest?.YoYo)||0).filter(v=>v>0));
    const top = rated.reduce((best,a)=>(Number(a.Latest?.Rating)||0)>(Number(best?.Latest?.Rating)||0)?a:best, rated[0]);
    return { total:filtered.length, rated:rated.length, avgRating, totalTests, recentlyTested, neverTested, overdue, avgSpeed:avgSpeed?avgSpeed.toFixed(2):'—', avgCMJ:avgCMJ?avgCMJ.toFixed(1):'—', avgYoYo:avgYoYo?Math.round(avgYoYo):'—', topName:top?.Name||'—' };
  }, [filtered]);

  /* ── Score bands ── */
  const bands = useMemo(() => BANDS.map(b => ({
    ...b,
    count: filtered.filter(a => { const r=Number(a.Latest?.Rating)||0; return r>=b.min && r<=b.max; }).length,
  })), [filtered]);

  /* ── Age group stats ── */
  const ageGroups = useMemo(() => {
    const groups = ['U-12','U-15','U-18','Senior','ไม่ระบุ'];
    return groups.map(g => {
      const list = filtered.filter(a => ageGroup(calcAge(a.DOB)) === g);
      const avgR = avg(list.filter(a=>Number(a.Latest?.Rating)>0).map(a=>Number(a.Latest?.Rating)||0));
      return { label:g, count:list.length, avgRating:avgR?Math.round(avgR):0 };
    }).filter(g=>g.count>0);
  }, [filtered]);

  /* ── Position stats ── */
  const posStats = useMemo(() => {
    const groups = Array.from(new Set(filtered.map(a=>a.Position||'ไม่ระบุ')));
    return groups.map(pos => {
      const list = filtered.filter(a=>(a.Position||'ไม่ระบุ')===pos);
      const avgR = avg(list.filter(a=>Number(a.Latest?.Rating)>0).map(a=>Number(a.Latest?.Rating)||0));
      const avgSpd = avg(list.filter(a=>Number(a.Latest?.Speed30)>0).map(a=>Number(a.Latest?.Speed30)||0));
      const avgCmj = avg(list.filter(a=>Number(a.Latest?.CMJ)>0).map(a=>Number(a.Latest?.CMJ)||0));
      return { pos, count:list.length, avgRating:avgR?Math.round(avgR):0, avgSpeed:avgSpd?avgSpd.toFixed(2):'—', avgCMJ:avgCmj?avgCmj.toFixed(1):'—' };
    }).filter(g=>g.count>0).sort((a,b)=>b.avgRating-a.avgRating);
  }, [filtered]);

  /* ── Testing status ── */
  const testStatus = useMemo(() => {
    return filtered.map(a => {
      const ts = a.History?.length ? a.History[a.History.length-1]?.Timestamp||'' : '';
      const days = daysSince(ts);
      return { athlete:a, days, status: days>=999?'never' as const : days<=30?'recent' as const : 'overdue' as const };
    }).sort((a,b)=>b.days-a.days);
  }, [filtered]);

  /* ── H2H ── */
  const pA = athletes.find(a=>a.PlayerID===h2hA);
  const pB = athletes.find(a=>a.PlayerID===h2hB);

  const radarData = pA&&pB ? {
    labels: METRICS.map(m=>m.label),
    datasets: [
      { label:pA.Name, data:METRICS.map(m=>getScorePoint(m.rk,pA.Latest?.[m.key] as string||'',pA.DOB||'')), backgroundColor:'rgba(56,189,248,0.15)', borderColor:'#38bdf8', borderWidth:2.5, pointBackgroundColor:'#38bdf8', pointRadius:4 },
      { label:pB.Name, data:METRICS.map(m=>getScorePoint(m.rk,pB.Latest?.[m.key] as string||'',pB.DOB||'')), backgroundColor:'rgba(244,114,182,0.15)', borderColor:'#f472b6', borderWidth:2.5, pointBackgroundColor:'#f472b6', pointRadius:4 },
    ],
  } : null;

  const radarOpts = {
    responsive:true, maintainAspectRatio:false,
    scales:{ r:{ min:0, max:5, ticks:{ display:false }, angleLines:{ color:'rgba(0,0,0,0.08)' }, grid:{ color:'rgba(0,0,0,0.06)' }, pointLabels:{ font:{ size:11, weight:700 as const }, color:'#475569' } } },
    plugins:{ legend:{ labels:{ usePointStyle:true, boxWidth:8, font:{ size:11 } } } },
  };

  /* ── Bar chart for score distribution ── */
  const barData = {
    labels: bands.map(b=>b.label),
    datasets:[{ label:'นักกีฬา', data:bands.map(b=>b.count), backgroundColor:bands.map(b=>b.color+'cc'), borderColor:bands.map(b=>b.color), borderWidth:1.5, borderRadius:6 }],
  };
  const barOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{ x:{ grid:{ display:false }, ticks:{ font:{ size:10 } } }, y:{ grid:{ color:'rgba(0,0,0,0.04)' }, ticks:{ font:{ size:10 }, stepSize:1 } } },
  };

  const toggleSort = (key: keyof Athlete['Latest']) => {
    if (sortKey===key) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const SortIcon = ({ k }: { k: keyof Athlete['Latest'] }) => sortKey!==k
    ? <i className="bi bi-arrow-down-up ms-1" style={{ opacity:0.3, fontSize:'0.6rem' }}/>
    : <i className={`bi bi-arrow-${sortDir==='asc'?'up':'down'} ms-1`} style={{ color:'#38bdf8', fontSize:'0.6rem' }}/>;

  const scoreCell = (sc: number) => {
    const c = SCORE_COLORS[sc] || SCORE_COLORS[0];
    return <span style={{ background:c.bg, color:c.color, borderRadius:4, padding:'1px 6px', fontSize:'0.68rem', fontWeight:800 }}>{sc||'—'}</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Performance Overview</h2>
          <p className="page-subtitle">ภาพรวมสมรรถภาพ · การจัดอันดับ · วิเคราะห์ทีม · เปรียบเทียบ</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-outline btn-sm" onClick={()=>onNavigate('performance')}><i className="bi bi-clipboard-data me-1"/>Update</button>
          <button className="btn-primary btn-sm" onClick={()=>onNavigate('register')}><i className="bi bi-person-plus me-1"/>Add</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', marginBottom:18, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <select className="form-select" style={{ width:'auto' }} value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}>
          <option value="ALL">ทุกทีม</option>
          {teams.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className="form-select" style={{ width:'auto' }} value={posFilter} onChange={e=>setPosFilter(e.target.value)}>
          <option value="ALL">ทุกตำแหน่ง</option>
          {positions.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        <select className="form-select" style={{ width:'auto' }} value={ageFilter} onChange={e=>setAgeFilter(e.target.value)}>
          {['ALL','U-12','U-15','U-18','Senior'].map(g=><option key={g} value={g}>{g==='ALL'?'ทุกกลุ่มอายุ':g}</option>)}
        </select>
        <div className="search-wrap" style={{ flex:1, minWidth:160 }}>
          <i className="bi bi-search"/>
          <input className="form-control" placeholder="ชื่อ / สโมสร / ชื่อเล่น..." value={nameQ} onChange={e=>setNameQ(e.target.value)}/>
        </div>
        {(teamFilter!=='ALL'||posFilter!=='ALL'||ageFilter!=='ALL'||nameQ) && (
          <button className="btn-outline" onClick={()=>{setTeamFilter('ALL');setPosFilter('ALL');setAgeFilter('ALL');setNameQ('');}} style={{ whiteSpace:'nowrap', fontSize:'0.78rem' }}>
            <i className="bi bi-x-circle me-1"/>ล้าง
          </button>
        )}
        <span style={{ fontSize:'0.78rem', color:'var(--text-muted)', fontWeight:700, whiteSpace:'nowrap' }}>{filtered.length} คน</span>
      </div>

      {/* Section tabs */}
      <div className="tab-switch" style={{ marginBottom:18 }}>
        {([
          {id:'overview', icon:'bi-grid-1x2-fill', label:'Overview'},
          {id:'ranking',  icon:'bi-trophy-fill',    label:'Ranking'},
          {id:'heatmap',  icon:'bi-table',           label:'Heatmap'},
          {id:'h2h',      icon:'bi-intersect',       label:'Head to Head'},
        ] as {id:'overview'|'ranking'|'heatmap'|'h2h';icon:string;label:string}[]).map(t=>(
          <button key={t.id} className={`tab-btn${activeSection===t.id?' active':''}`} onClick={()=>setActiveSection(t.id)}>
            <i className={`bi ${t.icon} me-1`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeSection==='overview' && (
        <div>
          {/* KPI row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:18 }}>
            <KPICard label="นักกีฬา"       val={kpi.total}     icon="bi-people-fill"          color="#38bdf8" sub={`${kpi.rated} คนมีคะแนน`}/>
            <KPICard label="Rating เฉลี่ย" val={kpi.avgRating} icon="bi-star-fill"             color="#f59e0b" sub="คะแนนรวม / 100"/>
            <KPICard label="ทดสอบล่าสุด"   val={kpi.recentlyTested} icon="bi-check-circle-fill" color="#10b981" sub="≤ 30 วันที่แล้ว"/>
            <KPICard label="เกินกำหนด"     val={kpi.overdue}   icon="bi-clock-fill"            color="#f97316" sub="> 30 วัน"/>
            <KPICard label="ยังไม่ทดสอบ"   val={kpi.neverTested} icon="bi-exclamation-triangle-fill" color="#ef4444" sub="ไม่มีประวัติ"/>
            <KPICard label="Test Sessions" val={kpi.totalTests} icon="bi-clipboard2-data-fill" color="#6366f1" sub="รวมทุกครั้ง"/>
            <KPICard label="Avg Speed 30m" val={kpi.avgSpeed} unit="s" icon="bi-lightning-charge-fill" color="#f59e0b"/>
            <KPICard label="Avg CMJ"       val={kpi.avgCMJ}   unit="cm" icon="bi-arrow-up-circle-fill" color="#f472b6"/>
          </div>

          {/* Score distribution + Age group */}
          <div className="grid-2col" style={{ marginBottom:18 }}>
            {/* Score distribution */}
            <div className="surface">
              <div className="section-hd" style={{ marginBottom:12 }}>
                <i className="bi bi-bar-chart-fill me-2" style={{ color:'#38bdf8' }}/>Score Distribution
              </div>
              <div style={{ height:160, position:'relative' }}>
                <Bar data={barData} options={barOpts}/>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {bands.map(b=>(
                  <div key={b.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:b.color }}/>
                    <span style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)' }}>{b.label}: <strong style={{ color:b.color }}>{b.count}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Age group breakdown */}
            <div className="surface">
              <div className="section-hd" style={{ marginBottom:12 }}>
                <i className="bi bi-person-badge-fill me-2" style={{ color:'#a78bfa' }}/>กลุ่มอายุ
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ageGroups.map(g => {
                  const pct = kpi.total ? g.count/kpi.total*100 : 0;
                  const rc  = ratingColor(g.avgRating);
                  return (
                    <div key={g.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:'0.78rem', fontWeight:800, minWidth:50 }}>{g.label}</span>
                      <div style={{ flex:1, height:7, borderRadius:6, background:'var(--bg)', overflow:'hidden' }}>
                        <div style={{ height:'100%', borderRadius:6, background:'#a78bfa', width:`${pct}%`, transition:'width 0.5s' }}/>
                      </div>
                      <span style={{ fontSize:'0.72rem', fontWeight:700, minWidth:20, textAlign:'right' }}>{g.count}</span>
                      {g.avgRating>0 && <span style={{ fontSize:'0.68rem', fontWeight:900, color:rc, minWidth:28, textAlign:'right' }}>{g.avgRating}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Position analysis + Testing status */}
          <div className="grid-2col" style={{ marginBottom:18 }}>
            {/* Position analysis */}
            <div className="surface" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
                <i className="bi bi-person-fill me-1" style={{ color:'#34d399' }}/>วิเคราะห์ตามตำแหน่ง
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft:14 }}>ตำแหน่ง</th>
                      <th style={{ textAlign:'center' }}>จำนวน</th>
                      <th style={{ textAlign:'center' }}>Rating</th>
                      <th style={{ textAlign:'center' }}>Speed</th>
                      <th style={{ textAlign:'center' }}>CMJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posStats.map(p=>{
                      const pc=posColor(p.pos);
                      return (
                        <tr key={p.pos}>
                          <td style={{ paddingLeft:14 }}>
                            <span style={{ background:pc.bg, color:pc.color, border:`1px solid ${pc.border}`, borderRadius:5, padding:'2px 7px', fontSize:'0.7rem', fontWeight:800 }}>{p.pos||'—'}</span>
                          </td>
                          <td style={{ textAlign:'center', fontWeight:700 }}>{p.count}</td>
                          <td style={{ textAlign:'center' }}><span style={{ fontWeight:900, color:ratingColor(p.avgRating), fontSize:'0.85rem' }}>{p.avgRating||'—'}</span></td>
                          <td style={{ textAlign:'center', fontSize:'0.8rem' }}>{p.avgSpeed}</td>
                          <td style={{ textAlign:'center', fontSize:'0.8rem' }}>{p.avgCMJ}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Testing status */}
            <div className="surface" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
                <i className="bi bi-clipboard2-pulse-fill me-1" style={{ color:'#38bdf8' }}/>สถานะการทดสอบ
              </div>
              <div style={{ maxHeight:240, overflowY:'auto' }}>
                {testStatus.map(({ athlete:a, days, status:st }) => {
                  const cfg = st==='never' ? {color:'#ef4444',bg:'#fef2f2',label:'ยังไม่ทดสอบ',icon:'bi-x-circle-fill'} : st==='recent' ? {color:'#10b981',bg:'#f0fdf4',label:`${days} วัน`,icon:'bi-check-circle-fill'} : {color:'#f59e0b',bg:'#fffbeb',label:`${days} วัน`,icon:'bi-clock-fill'};
                  return (
                    <div key={a.PlayerID} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={()=>onNavigate('scout',a.PlayerID)}>
                      <div style={{ width:28, height:28, borderRadius:8, overflow:'hidden', background:'var(--bg)', flexShrink:0 }}>
                        {a.PhotoUrl?<img src={a.PhotoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top' }}/>
                          :<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'0.7rem',color:'var(--text-muted)' }}>{(a.Name||'?')[0]}</div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'0.78rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.Name}</div>
                        <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>{a.Team||'—'}</div>
                      </div>
                      <span style={{ background:cfg.bg, color:cfg.color, borderRadius:6, padding:'2px 7px', fontSize:'0.62rem', fontWeight:800, whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:3 }}>
                        <i className={`bi ${cfg.icon}`}/>{cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* League Leaders */}
          <div className="surface" style={{ marginBottom:18 }}>
            <div className="section-hd" style={{ marginBottom:14 }}>
              <i className="bi bi-stars me-2" style={{ color:'#fbbf24' }}/>League Leaders — อันดับสูงสุดแต่ละ Metric
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
              {METRICS.map(m => {
                const top = [...filtered].filter(a=>Number(a.Latest?.[m.key])>0)
                  .sort((a,b)=>m.asc?Number(a.Latest[m.key])-Number(b.Latest[m.key]):Number(b.Latest[m.key])-Number(a.Latest[m.key]))
                  .slice(0,3);
                return (
                  <div key={m.key} style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f)', borderRadius:12, padding:'12px 14px', border:`1px solid ${m.color}30` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <div style={{ width:6, height:20, borderRadius:3, background:m.color }}/>
                      <span style={{ fontWeight:800, fontSize:'0.78rem', color:m.color }}>{m.label}</span>
                      <span style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.3)' }}>{m.unit}</span>
                    </div>
                    {top.length===0
                      ? <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.3)' }}>ไม่มีข้อมูล</div>
                      : top.map((a,i)=>(
                        <div key={a.PlayerID} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:i<2?6:0, cursor:'pointer' }} onClick={()=>onNavigate('scout',a.PlayerID)}>
                          <span style={{ width:18, height:18, borderRadius:'50%', background:i===0?'#fbbf24':i===1?'#94a3b8':'#cd7c3a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:900, color:i===0?'#0f172a':'white', flexShrink:0 }}>{i+1}</span>
                          <span style={{ flex:1, fontSize:'0.75rem', fontWeight:700, color:'rgba(255,255,255,0.85)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.Name}</span>
                          <span style={{ fontWeight:900, color:m.color, fontSize:'0.85rem' }}>{a.Latest?.[m.key]}</span>
                        </div>
                      ))
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ RANKING ══ */}
      {activeSection==='ranking' && (
        <div className="surface" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
            <i className="bi bi-trophy-fill" style={{ color:'#fbbf24' }}/>
            <span style={{ fontWeight:800, fontSize:'0.9rem' }}>Full Ranking ({sorted.length} คน)</span>
            <span style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginLeft:'auto' }}>คลิก header เพื่อเรียงลำดับ</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="roster-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft:16, width:40 }}>#</th>
                  <th style={{ minWidth:160 }}>นักกีฬา</th>
                  <th>ทีม</th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('Rating')}>OVR <SortIcon k="Rating"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('Speed30')}>Speed <SortIcon k="Speed30"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('CMJ')}>CMJ <SortIcon k="CMJ"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('Agility')}>Agility <SortIcon k="Agility"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('Situp')}>Sit-up <SortIcon k="Situp"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('LongJump')}>L.Jump <SortIcon k="LongJump"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('YoYo')}>Yo-Yo <SortIcon k="YoYo"/></th>
                  <th style={{ textAlign:'center', cursor:'pointer' }} onClick={()=>toggleSort('Pushup')}>Push-up <SortIcon k="Pushup"/></th>
                  <th style={{ textAlign:'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((a,i)=>{
                  const rating = Number(a.Latest?.Rating)||0;
                  const days = daysSince(a.History?.length?a.History[a.History.length-1]?.Timestamp||'':'');
                  const pc = posColor(a.Position);
                  return (
                    <tr key={a.PlayerID}>
                      <td style={{ paddingLeft:16, fontWeight:800, fontSize:'0.78rem', color: i<3?['#fbbf24','#94a3b8','#cd7c3a'][i]:'var(--text-muted)' }}>{i+1}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={()=>onNavigate('scout',a.PlayerID)}>
                          <div className="avatar" style={{ width:32, height:32, fontSize:'0.72rem', flexShrink:0 }}>
                            {a.PhotoUrl?<img src={a.PhotoUrl} alt=""/>:getInitials(a.Name)}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:'0.82rem' }}>{a.Name}</div>
                            <div style={{ display:'flex', gap:4, marginTop:1 }}>
                              {a.Position && <span style={{ background:pc.bg, color:pc.color, border:`1px solid ${pc.border}`, borderRadius:4, padding:'0 4px', fontSize:'0.58rem', fontWeight:800 }}>{a.Position.toUpperCase()}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:'0.78rem', fontWeight:700 }}>{a.Team||'—'}</td>
                      <td style={{ textAlign:'center' }}><RatingRing rating={rating} size={34}/></td>
                      {(['Speed30','CMJ','Agility','Situp','LongJump','YoYo','Pushup'] as (keyof Athlete['Latest'])[]).map(k=>{
                        const mdef = METRICS.find(m=>m.key===k);
                        const sc = mdef ? getScorePoint(mdef.rk, a.Latest?.[k] as string||'', a.DOB||'') : 0;
                        return <td key={k} style={{ textAlign:'center' }}>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                            <span style={{ fontWeight:700, fontSize:'0.78rem', color:mdef?.color||'var(--text)' }}>{a.Latest?.[k]||'—'}</span>
                            {sc>0 && scoreCell(sc)}
                          </div>
                        </td>;
                      })}
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontSize:'0.62rem', fontWeight:700, color:days>=999?'#ef4444':days<=30?'#10b981':'#f59e0b' }}>
                          {days>=999?'ยังไม่ทดสอบ':days===0?'วันนี้':`${days}d`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {sorted.length===0 && <tr><td colSpan={12} style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>ไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ HEATMAP ══ */}
      {activeSection==='heatmap' && (
        <div>
          <div style={{ marginBottom:12, padding:'10px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)' }}>คะแนน 1-5 (สีแสดงระดับ)</span>
            {Object.entries({1:{label:'ต่ำมาก',color:'#dc2626'},2:{label:'พัฒนา',color:'#ea580c'},3:{label:'ปานกลาง',color:'#ca8a04'},4:{label:'ดี',color:'#16a34a'},5:{label:'ยอดเยี่ยม',color:'#0284c7'}}).map(([n,v])=>(
              <span key={n} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:12, height:12, borderRadius:3, background:v.color, display:'inline-block' }}/>
                <span style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)' }}>{n}: {v.label}</span>
              </span>
            ))}
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="data-table" style={{ minWidth:700, borderCollapse:'separate', borderSpacing:0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft:14, position:'sticky', left:0, background:'var(--surface)', zIndex:1 }}>นักกีฬา</th>
                  <th style={{ textAlign:'center' }}>OVR</th>
                  {METRICS.map(m=>(
                    <th key={m.key} style={{ textAlign:'center', minWidth:66 }}>
                      <div style={{ fontSize:'0.65rem', fontWeight:800, color:m.color }}>{m.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(a=>{
                  const rating=Number(a.Latest?.Rating)||0;
                  return (
                    <tr key={a.PlayerID} style={{ cursor:'pointer' }} onClick={()=>onNavigate('scout',a.PlayerID)}>
                      <td style={{ paddingLeft:14, position:'sticky', left:0, background:'var(--surface)', zIndex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:26, height:26, borderRadius:7, overflow:'hidden', background:'var(--bg)', flexShrink:0 }}>
                            {a.PhotoUrl?<img src={a.PhotoUrl} alt="" style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'top' }}/>
                              :<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'0.65rem',color:'var(--text-muted)' }}>{(a.Name||'?')[0]}</div>}
                          </div>
                          <span style={{ fontWeight:700, fontSize:'0.75rem', whiteSpace:'nowrap' }}>{a.Name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <span style={{ fontWeight:900, fontSize:'0.85rem', color:ratingColor(rating) }}>{rating||'—'}</span>
                      </td>
                      {METRICS.map(m=>{
                        const val = a.Latest?.[m.key] as string||'';
                        const sc  = getScorePoint(m.rk, val, a.DOB||'');
                        const cfg = SCORE_COLORS[sc]||SCORE_COLORS[0];
                        return (
                          <td key={m.key} style={{ textAlign:'center', padding:'4px 6px' }}>
                            <div style={{ background:sc>0?cfg.bg:'var(--bg)', borderRadius:6, padding:'4px 6px', border:`1px solid ${sc>0?cfg.color+'44':'var(--border)'}` }}>
                              <div style={{ fontWeight:900, fontSize:'0.7rem', color:sc>0?cfg.color:'var(--text-muted)' }}>{val||'—'}</div>
                              {sc>0 && <div style={{ fontSize:'0.55rem', fontWeight:700, color:cfg.color }}>{sc}/5</div>}
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
        </div>
      )}

      {/* ══ H2H ══ */}
      {activeSection==='h2h' && (
        <div>
          <div className="surface" style={{ marginBottom:16, padding:'16px 20px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
              <div>
                <label className="form-label" style={{ color:'#38bdf8', fontWeight:800 }}>Athlete A (Cyan)</label>
                <select className="form-select" value={h2hA} onChange={e=>setH2hA(e.target.value)} style={{ borderColor:h2hA?'#38bdf8':undefined }}>
                  <option value="">— เลือกนักกีฬา A —</option>
                  {athletes.map(a=><option key={a.PlayerID} value={a.PlayerID}>{a.Name} {a.Team?`(${a.Team})`:''}</option>)}
                </select>
              </div>
              <div style={{ textAlign:'center', fontWeight:900, fontSize:'1.3rem', color:'var(--text-muted)', padding:'0 8px' }}>VS</div>
              <div>
                <label className="form-label" style={{ color:'#f472b6', fontWeight:800 }}>Athlete B (Pink)</label>
                <select className="form-select" value={h2hB} onChange={e=>setH2hB(e.target.value)} style={{ borderColor:h2hB?'#f472b6':undefined }}>
                  <option value="">— เลือกนักกีฬา B —</option>
                  {athletes.map(a=><option key={a.PlayerID} value={a.PlayerID}>{a.Name} {a.Team?`(${a.Team})`:''}</option>)}
                </select>
              </div>
            </div>
          </div>

          {(!pA || !pB) && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
              <i className="bi bi-intersect" style={{ fontSize:'3.5rem', display:'block', marginBottom:12, color:'#cbd5e1' }}/>
              <p>เลือกนักกีฬา 2 คนเพื่อเปรียบเทียบ</p>
            </div>
          )}

          {pA && pB && radarData && (
            <div>
              {/* Profile cards — order: pA · VS · pB */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', gap:12, marginBottom:16, alignItems:'center' }}>
                {/* pA */}
                <div style={{ background:'var(--surface)', border:'2px solid #38bdf833', borderRadius:14, padding:'14px 16px', cursor:'pointer' }} onClick={()=>onNavigate('scout',pA.PlayerID)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar" style={{ width:44, height:44, flexShrink:0 }}>
                      {pA.PhotoUrl?<img src={pA.PhotoUrl} alt=""/>:getInitials(pA.Name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'0.9rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pA.Name}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{pA.Team||'—'} · {pA.Position||'—'}</div>
                    </div>
                    <RatingRing rating={Number(pA.Latest?.Rating)||0} size={40}/>
                  </div>
                </div>
                {/* VS */}
                <div style={{ textAlign:'center', fontWeight:900, fontSize:'1.1rem', color:'var(--text-muted)' }}>VS</div>
                {/* pB */}
                <div style={{ background:'var(--surface)', border:'2px solid #f472b633', borderRadius:14, padding:'14px 16px', cursor:'pointer' }} onClick={()=>onNavigate('scout',pB.PlayerID)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar" style={{ width:44, height:44, flexShrink:0 }}>
                      {pB.PhotoUrl?<img src={pB.PhotoUrl} alt=""/>:getInitials(pB.Name)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:'0.9rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{pB.Name}</div>
                      <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{pB.Team||'—'} · {pB.Position||'—'}</div>
                    </div>
                    <RatingRing rating={Number(pB.Latest?.Rating)||0} size={40}/>
                  </div>
                </div>
              </div>

              {/* Radar + bars */}
              <div className="grid-2col" style={{ marginBottom:16 }}>
                <div className="surface">
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>Radar Chart</div>
                  <div style={{ height:280, position:'relative' }}><Radar data={radarData} options={radarOpts}/></div>
                </div>
                <div className="surface">
                  <div style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>Metric Comparison</div>
                  {METRICS.map(m=>{
                    const vA=Number(pA.Latest?.[m.key])||0;
                    const vB=Number(pB.Latest?.[m.key])||0;
                    if(!vA&&!vB) return null;
                    const maxV=Math.max(vA,vB,0.001);
                    const pctA=vA/maxV*100; const pctB=vB/maxV*100;
                    const diff=vA-vB;
                    const aWins=m.asc?diff<0:diff>0; const bWins=m.asc?diff>0:diff<0;
                    return (
                      <div key={m.key} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontSize:'0.7rem', fontWeight:700 }}>{m.label}</span>
                          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{m.unit}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <span style={{ minWidth:36, textAlign:'right', fontWeight:800, fontSize:'0.78rem', color:aWins?'#38bdf8':'var(--text-muted)' }}>{vA||'—'}</span>
                          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
                            <div style={{ height:5, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:5, background:'#38bdf8', width:`${pctA}%`, transition:'width 0.5s' }}/>
                            </div>
                            <div style={{ height:5, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
                              <div style={{ height:'100%', borderRadius:5, background:'#f472b6', width:`${pctB}%`, transition:'width 0.5s' }}/>
                            </div>
                          </div>
                          <span style={{ minWidth:36, fontWeight:800, fontSize:'0.78rem', color:bWins?'#f472b6':'var(--text-muted)' }}>{vB||'—'}</span>
                        </div>
                        {diff!==0 && (
                          <div style={{ textAlign:'center', fontSize:'0.6rem', fontWeight:700, color:aWins?'#38bdf8':bWins?'#f472b6':'var(--text-muted)', marginTop:1 }}>
                            {aWins?`A +${Math.abs(diff)%1!==0?Math.abs(diff).toFixed(2):Math.abs(diff)}`:bWins?`B +${Math.abs(diff)%1!==0?Math.abs(diff).toFixed(2):Math.abs(diff)}`:'='}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Score comparison table */}
              <div className="surface" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.82rem' }}>คะแนนรายตัวชี้วัด</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft:16 }}>Metric</th>
                      <th style={{ textAlign:'center', color:'#38bdf8' }}>{pA.Name}</th>
                      <th style={{ textAlign:'center' }}>Score</th>
                      <th style={{ textAlign:'center', color:'#f472b6' }}>{pB.Name}</th>
                      <th style={{ textAlign:'center' }}>Score</th>
                      <th style={{ textAlign:'center' }}>ผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRICS.map(m=>{
                      const vA=Number(pA.Latest?.[m.key])||0;
                      const vB=Number(pB.Latest?.[m.key])||0;
                      const scA=getScorePoint(m.rk,pA.Latest?.[m.key] as string||'',pA.DOB||'');
                      const scB=getScorePoint(m.rk,pB.Latest?.[m.key] as string||'',pB.DOB||'');
                      const aWins=m.asc?(vA<vB&&vA>0):(vA>vB);
                      const bWins=m.asc?(vB<vA&&vB>0):(vB>vA);
                      return (
                        <tr key={m.key}>
                          <td style={{ paddingLeft:16, fontWeight:700, fontSize:'0.82rem' }}>{m.label}</td>
                          <td style={{ textAlign:'center', fontWeight:aWins?900:400, color:aWins?'#38bdf8':'var(--text)' }}>{vA||'—'} <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{m.unit}</span></td>
                          <td style={{ textAlign:'center' }}>{scoreCell(scA)}</td>
                          <td style={{ textAlign:'center', fontWeight:bWins?900:400, color:bWins?'#f472b6':'var(--text)' }}>{vB||'—'} <span style={{ fontSize:'0.6rem', color:'var(--text-muted)' }}>{m.unit}</span></td>
                          <td style={{ textAlign:'center' }}>{scoreCell(scB)}</td>
                          <td style={{ textAlign:'center' }}>
                            {aWins&&<span style={{ background:'#eff6ff', color:'#38bdf8', borderRadius:4, padding:'1px 6px', fontSize:'0.65rem', fontWeight:800 }}>A ชนะ</span>}
                            {bWins&&<span style={{ background:'#fdf2f8', color:'#f472b6', borderRadius:4, padding:'1px 6px', fontSize:'0.65rem', fontWeight:800 }}>B ชนะ</span>}
                            {!aWins&&!bWins&&<span style={{ color:'var(--text-muted)', fontSize:'0.65rem' }}>เท่ากัน</span>}
                          </td>
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
  );
}
