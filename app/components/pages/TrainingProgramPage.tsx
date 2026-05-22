'use client';
import { useState, useMemo } from 'react';
import { Athlete, User } from '@/lib/types';

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
type WeekPlan = Session[];

const FOCUS_OPTIONS = [
  'Speed & Acceleration','Explosive Power (CMJ)','Agility & COD','Endurance (Aerobic)',
  'Strength Training','Flexibility','Ball Control','Passing & Receiving',
  'Shooting','Tactical','Recovery / Regeneration','Match Day Preparation',
  'Small-sided Games','Individual Skills','Rest / Off',
];

function calcWeekLoad(plan: WeekPlan): { total: number; avg: number; zone: string } {
  const loads = plan.filter(s=>s.intensity!=='rest').map(s=>{
    const rpe = s.intensity==='light'?3:s.intensity==='moderate'?6:8;
    return rpe * s.duration;
  });
  const total = loads.reduce((a,b)=>a+b,0);
  const avg = loads.length ? Math.round(total/loads.length) : 0;
  const zone = total < 1500 ? 'เบา' : total < 2500 ? 'ปานกลาง' : total < 3500 ? 'หนัก' : 'หนักมาก';
  return { total, avg, zone };
}

const defaultSession = (): Session => ({ focus: 'Ball Control', intensity: 'moderate', duration: 60, notes: '' });

export default function TrainingProgramPage({ athletes, user }: Props) {
  const [filterTeam, setFilterTeam] = useState('ALL');
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });
  const [plan, setPlan] = useState<WeekPlan>(() => DAYS_TH.map((_,i) => i < 5 ? defaultSession() : ({ focus:'Rest / Off', intensity:'rest', duration:0, notes:'' })));
  const [copied, setCopied] = useState(false);

  const teams = useMemo(() => ['ALL', ...Array.from(new Set(athletes.map(a=>a.Team).filter(Boolean))).sort()], [athletes]);
  const teamAthletes = useMemo(() => athletes.filter(a => filterTeam==='ALL' || a.Team===filterTeam), [athletes, filterTeam]);

  // Team fitness overview
  const teamStats = useMemo(() => {
    const rated = teamAthletes.filter(a=>Number(a.Latest?.Rating)>0);
    const avgRating = rated.length ? Math.round(rated.reduce((s,a)=>s+Number(a.Latest?.Rating||0),0)/rated.length) : 0;
    const avgSpeed = teamAthletes.filter(a=>a.Latest?.Speed30).length
      ? +(teamAthletes.filter(a=>a.Latest?.Speed30).reduce((s,a)=>s+Number(a.Latest?.Speed30||0),0)/teamAthletes.filter(a=>a.Latest?.Speed30).length).toFixed(2) : 0;
    return { avgRating, avgSpeed, total: teamAthletes.length };
  }, [teamAthletes]);

  const weekLoad = useMemo(() => calcWeekLoad(plan), [plan]);

  const setDay = (i: number, k: keyof Session, v: string|number) =>
    setPlan(p => p.map((s,j) => j===i ? { ...s, [k]: v } : s));

  const copyToClipboard = () => {
    const text = DAYS_TH.map((d,i) => {
      const s = plan[i];
      return `${d}: ${s.focus} (${INT_CFG[s.intensity].label}${s.duration>0?`, ${s.duration} นาที`:''})${s.notes?` — ${s.notes}`:''}`;
    }).join('\n');
    navigator.clipboard.writeText(`โปรแกรมฝึกสัปดาห์ ${weekStart}\nทีม: ${filterTeam==='ALL'?'ทุกทีม':filterTeam}\n\n${text}\n\nTotal Load: ${weekLoad.total} AU`);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const loadColor = weekLoad.total < 1500 ? '#10b981' : weekLoad.total < 2500 ? '#38bdf8' : weekLoad.total < 3500 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Training Program</h2>
          <p className="page-subtitle">วางโปรแกรมฝึกรายสัปดาห์ · อ้างอิงจากข้อมูล fitness ทีม</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select className="form-select" style={{ width:'auto' }} value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
            {teams.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกทีม':t}</option>)}
          </select>
          <button className="btn-outline" onClick={copyToClipboard}>
            <i className={`bi bi-${copied?'check-circle-fill':'clipboard'} me-1`}/>{copied?'Copied!':'Copy'}
          </button>
        </div>
      </div>

      {/* Week selector */}
      <div className="surface" style={{ marginBottom:16, padding:'12px 20px', display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <div>
          <label className="form-label" style={{ marginBottom:4 }}>สัปดาห์เริ่มต้น (วันจันทร์)</label>
          <input type="date" className="form-control" style={{ width:'auto' }} value={weekStart} onChange={e=>setWeekStart(e.target.value)}/>
        </div>
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
          {[
            { l:'ทีมที่เลือก', v:teamStats.total+' คน', c:'#38bdf8' },
            { l:'Avg Rating', v:teamStats.avgRating||'—', c:'#f59e0b' },
            { l:'Avg Speed', v:teamStats.avgSpeed?teamStats.avgSpeed+'s':'—', c:'#f97316' },
            { l:'Weekly Load', v:`${weekLoad.total} AU`, c:loadColor },
            { l:'Load Zone', v:weekLoad.zone, c:loadColor },
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
        {DAYS_TH.map((dayName, i) => {
          const s = plan[i];
          const tc = INT_CFG[s.intensity];
          const dateObj = new Date(weekStart);
          dateObj.setDate(dateObj.getDate() + i);
          const dateStr = dateObj.toLocaleDateString('th-TH',{day:'numeric',month:'short'});
          const rpe = s.intensity==='light'?3:s.intensity==='moderate'?6:s.intensity==='hard'?8:0;
          const load = rpe * s.duration;
          return (
            <div key={i} className="surface" style={{ padding:'14px 18px', borderLeft:`4px solid ${tc.color}` }}>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-start' }}>
                {/* Day label */}
                <div style={{ minWidth:80, flexShrink:0 }}>
                  <div style={{ fontWeight:900, fontSize:'0.95rem' }}>{dayName}</div>
                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{dateStr}</div>
                  {load > 0 && <div style={{ fontSize:'0.65rem', fontWeight:700, color:tc.color, marginTop:2 }}>{load} AU</div>}
                </div>
                {/* Intensity */}
                <div style={{ minWidth:120, flexShrink:0 }}>
                  <label className="form-label" style={{ fontSize:'0.62rem' }}>ความหนัก</label>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {(Object.keys(INT_CFG) as Intensity[]).map(k => (
                      <button key={k} onClick={()=>setDay(i,'intensity',k)} style={{
                        padding:'4px 8px', borderRadius:6, fontSize:'0.68rem', fontWeight:700, cursor:'pointer',
                        background: s.intensity===k ? INT_CFG[k].bg : 'var(--bg)',
                        color: s.intensity===k ? INT_CFG[k].color : 'var(--text-muted)',
                        border: `1.5px solid ${s.intensity===k ? INT_CFG[k].color : 'var(--border)'}`,
                      }}>{INT_CFG[k].label}</button>
                    ))}
                  </div>
                </div>
                {/* Focus */}
                <div style={{ flex:'1 1 200px' }}>
                  <label className="form-label" style={{ fontSize:'0.62rem' }}>เนื้อหาการฝึก</label>
                  <select className="form-select" style={{ fontSize:'0.82rem' }} value={s.focus} onChange={e=>setDay(i,'focus',e.target.value)}>
                    {FOCUS_OPTIONS.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                {/* Duration */}
                <div style={{ minWidth:80, flexShrink:0 }}>
                  <label className="form-label" style={{ fontSize:'0.62rem' }}>นาที</label>
                  <input type="number" min={0} max={300} className="form-control" style={{ fontSize:'0.82rem' }} value={s.duration} disabled={s.intensity==='rest'} onChange={e=>setDay(i,'duration',Number(e.target.value))}/>
                </div>
                {/* Notes */}
                <div style={{ flex:'2 1 200px' }}>
                  <label className="form-label" style={{ fontSize:'0.62rem' }}>หมายเหตุ / รายละเอียด</label>
                  <input className="form-control" style={{ fontSize:'0.82rem' }} value={s.notes} placeholder="ดรีล, เป้าหมาย..." onChange={e=>setDay(i,'notes',e.target.value)}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly summary */}
      <div className="surface" style={{ marginTop:16, padding:'16px 20px', background:'linear-gradient(135deg,#0f172a,#1e293b)', color:'white' }}>
        <div style={{ fontWeight:700, fontSize:'0.8rem', color:'#7dd3fc', marginBottom:10, textTransform:'uppercase', letterSpacing:1 }}>สรุปโปรแกรมสัปดาห์นี้</div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12 }}>
          {DAYS_TH.map((d,i) => {
            const s = plan[i];
            const tc = INT_CFG[s.intensity];
            return (
              <div key={d} style={{ textAlign:'center', minWidth:60 }}>
                <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:600 }}>{d}</div>
                <div style={{ width:36, height:36, borderRadius:10, background: tc.color+'30', border:`2px solid ${tc.color}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'4px auto', fontSize:'0.65rem', fontWeight:900, color:tc.color }}>
                  {tc.label[0]}
                </div>
                {s.duration > 0 && <div style={{ fontSize:'0.6rem', color:'#64748b' }}>{s.duration}'</div>}
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.78rem' }}>
          <span>📊 Total Load: <strong style={{ color:loadColor }}>{weekLoad.total} AU</strong></span>
          <span>🏋️ Zone: <strong style={{ color:loadColor }}>{weekLoad.zone}</strong></span>
          <span>⚽ Session: <strong style={{ color:'#38bdf8' }}>{plan.filter(s=>s.intensity!=='rest').length} วัน</strong></span>
          <span>😴 พัก: <strong style={{ color:'#94a3b8' }}>{plan.filter(s=>s.intensity==='rest').length} วัน</strong></span>
        </div>
      </div>
    </div>
  );
}
