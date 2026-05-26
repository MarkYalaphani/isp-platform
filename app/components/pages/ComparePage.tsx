'use client';

import { useState, useMemo } from 'react';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { Athlete, TestRecord, Page } from '@/lib/types';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import AthleteSearchSelect from '../AthleteSearchSelect';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

interface Props { athletes: Athlete[]; onNavigate: (p: Page, id?: string) => void; }

const PHYS_METRICS = [
  { key:'speed30',  field:'Speed30'    as keyof Athlete['Latest'], label:'Speed 30m',  unit:'s',    hi:false, color:'#f59e0b', icon:'bi-lightning-charge-fill' },
  { key:'cmj',      field:'CMJ'        as keyof Athlete['Latest'], label:'CMJ',         unit:'cm',   hi:true,  color:'#f472b6', icon:'bi-arrow-up-circle-fill' },
  { key:'agility',  field:'Agility'    as keyof Athlete['Latest'], label:'Agility',     unit:'s',    hi:false, color:'#34d399', icon:'bi-shuffle' },
  { key:'situp',    field:'Situp'      as keyof Athlete['Latest'], label:'Sit-up',      unit:'reps', hi:true,  color:'#38bdf8', icon:'bi-person-arms-up' },
  { key:'longjump', field:'LongJump'   as keyof Athlete['Latest'], label:'Long Jump',   unit:'cm',   hi:true,  color:'#a78bfa', icon:'bi-box-arrow-right' },
  { key:'yoyo',     field:'YoYo'       as keyof Athlete['Latest'], label:'Yo-Yo IR1',   unit:'m',    hi:true,  color:'#ef4444', icon:'bi-heart-pulse-fill' },
  { key:'pushup',   field:'Pushup'     as keyof Athlete['Latest'], label:'Push-up',     unit:'reps', hi:true,  color:'#fb923c', icon:'bi-bar-chart-fill' },
  { key:'sitreach', field:'SitAndReach'as keyof Athlete['Latest'], label:'Sit & Reach', unit:'cm',   hi:true,  color:'#6ee7b7', icon:'bi-activity' },
];

const BODY_METRICS = [
  { field:'Height'  as keyof Athlete['Latest'], label:'ส่วนสูง',       unit:'cm',  hi:false, color:'#38bdf8' },
  { field:'Weight'  as keyof Athlete['Latest'], label:'น้ำหนัก',       unit:'kg',  hi:false, color:'#a78bfa' },
  { field:'BMI'     as keyof Athlete['Latest'], label:'BMI',            unit:'',    hi:false, color:'#f59e0b' },
  { field:'Muscle'  as keyof Athlete['Latest'], label:'มวลกล้ามเนื้อ', unit:'%',   hi:true,  color:'#34d399' },
  { field:'Fat'     as keyof Athlete['Latest'], label:'ไขมัน',          unit:'%',   hi:false, color:'#ef4444' },
  { field:'PeakPower' as keyof Athlete['Latest'], label:'Peak Power',  unit:'W',   hi:true,  color:'#f472b6' },
];

const HISTORY_CHARTS = [
  { field:'Rating'    as keyof TestRecord, label:'Overall Rating',  color1:'#38bdf8', color2:'#f472b6' },
  { field:'Speed30'   as keyof TestRecord, label:'Speed 30m',       color1:'#f59e0b', color2:'#fbbf24' },
  { field:'CMJ'       as keyof TestRecord, label:'CMJ',             color1:'#f472b6', color2:'#e879f9' },
  { field:'YoYo'      as keyof TestRecord, label:'Yo-Yo',           color1:'#ef4444', color2:'#f97316' },
  { field:'Situp'     as keyof TestRecord, label:'Sit-up',          color1:'#38bdf8', color2:'#818cf8' },
  { field:'Agility'   as keyof TestRecord, label:'Agility',         color1:'#34d399', color2:'#6ee7b7' },
];

function calcAge(dob: string) {
  if (!dob || dob === '-') return null;
  const d = new Date(dob); if (isNaN(d.getTime())) return null;
  const age = Math.floor((Date.now() - d.getTime()) / 31557600000);
  return age >= 0 && age <= 120 ? age : null;
}
function getInitials(name: string) { return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
function fmtDate(ts: string, i: number) {
  try { const d = new Date(ts); if (isNaN(d.getTime())) return `#${i+1}`; return `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}`; }
  catch { return `#${i+1}`; }
}
function ratingColor(r: number) {
  if (r >= 80) return '#10b981'; if (r >= 65) return '#38bdf8';
  if (r >= 50) return '#f59e0b'; if (r >= 35) return '#f97316'; return '#ef4444';
}

/* ── Score badge ─────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number }) {
  if (!score) return <span style={{ color:'#cbd5e1', fontSize:'0.68rem' }}>—</span>;
  const c = SCORE_COLORS[score] || SCORE_COLORS[0];
  return <span style={{ background:c.bg, color:c.color, borderRadius:5, padding:'1px 6px', fontSize:'0.68rem', fontWeight:800 }}>{score}/5</span>;
}

/* ── Athlete profile card ────────────────────────────────── */
function ProfileCard({ athlete:a, color, onScout }: { athlete:Athlete; color:string; onScout:()=>void }) {
  const age = calcAge(a.DOB);
  const rating = Number(a.Latest?.Rating)||0;
  const rc = ratingColor(rating);

  return (
    <div style={{ background:`${color}08`, border:`2px solid ${color}30`, borderRadius:18, padding:'20px 20px 16px', textAlign:'center', position:'relative' }}>
      {/* Photo */}
      <div style={{ width:72, height:72, borderRadius:18, border:`2.5px solid ${color}`, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', overflow:'hidden' }}>
        {a.PhotoUrl
          ? <img src={a.PhotoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
          : <span style={{ fontSize:'1.5rem', fontWeight:900, color }}>{getInitials(a.Name)}</span>
        }
      </div>
      {/* Name */}
      <div style={{ fontWeight:900, fontSize:'1.05rem', marginBottom:2 }}>{a.Name}</div>
      {a.Nickname && <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:6 }}>"{a.Nickname}"</div>}
      {/* Info row */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
        {a.Team && <span style={{ background:'var(--bg)', borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:700 }}><i className="bi bi-shield-fill me-1" style={{ color }}/>{a.Team}</span>}
        {a.Position && <span style={{ background:`${color}18`, color, borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:800 }}>{a.Position}</span>}
        {age !== null && <span style={{ background:'var(--bg)', borderRadius:6, padding:'2px 8px', fontSize:'0.68rem', fontWeight:700 }}>{age} ปี</span>}
      </div>
      {/* Rating */}
      <div style={{ fontSize:'3.2rem', fontWeight:900, color:rc, lineHeight:1 }}>{rating||'—'}</div>
      <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontWeight:700, letterSpacing:1.5, marginTop:3, marginBottom:12 }}>OVERALL RATING</div>
      {/* Extra info */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 }}>
        {[
          { label:'สโมสร', val:a.Club||'—' },
          { label:'จังหวัด', val:a.Province||'—' },
          { label:'เท้าถนัด', val:a.DomFoot||'—' },
          { label:'มือถนัด', val:a.DomHand||'—' },
        ].map(x=>(
          <div key={x.label} style={{ background:'var(--bg)', borderRadius:8, padding:'5px 8px', textAlign:'center' }}>
            <div style={{ fontSize:'0.55rem', color:'var(--text-muted)', fontWeight:700, marginBottom:1 }}>{x.label}</div>
            <div style={{ fontSize:'0.72rem', fontWeight:700 }}>{x.val}</div>
          </div>
        ))}
      </div>
      <button className="btn-outline btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={onScout}>
        <i className="bi bi-person-vcard me-1"/>Scout Report
      </button>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
export default function ComparePage({ athletes, onNavigate }: Props) {
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  const pA = athletes.find(a => a.PlayerID === idA);
  const pB = athletes.find(a => a.PlayerID === idB);

  const scoresA = useMemo(() => PHYS_METRICS.reduce<Record<string,number>>((acc,m) => {
    acc[m.key] = pA ? getScorePoint(m.key, String(pA.Latest?.[m.field]||''), pA.DOB||'') : 0; return acc;
  }, {}), [pA]);

  const scoresB = useMemo(() => PHYS_METRICS.reduce<Record<string,number>>((acc,m) => {
    acc[m.key] = pB ? getScorePoint(m.key, String(pB.Latest?.[m.field]||''), pB.DOB||'') : 0; return acc;
  }, {}), [pB]);

  const radarData = pA && pB ? {
    labels: PHYS_METRICS.map(m=>m.label),
    datasets: [
      { label:pA.Name, data:PHYS_METRICS.map(m=>scoresA[m.key]||0), backgroundColor:'rgba(56,189,248,0.15)', borderColor:'#38bdf8', borderWidth:2.5, pointBackgroundColor:'#38bdf8', pointRadius:4 },
      { label:pB.Name, data:PHYS_METRICS.map(m=>scoresB[m.key]||0), backgroundColor:'rgba(244,114,182,0.15)', borderColor:'#f472b6', borderWidth:2.5, pointBackgroundColor:'#f472b6', pointRadius:4 },
    ],
  } : null;

  const radarOpts = {
    responsive:true, maintainAspectRatio:false,
    scales:{ r:{ min:0, max:5, ticks:{ display:false }, pointLabels:{ font:{ size:11, weight:600 as const } } } },
    plugins:{ legend:{ labels:{ usePointStyle:true, font:{ size:11 } } } },
  };

  /* history chart helper */
  function buildHistoryChart(field: keyof TestRecord) {
    const datesA = (pA?.History||[]).map((r,i)=>fmtDate(r.Timestamp,i));
    const datesB = (pB?.History||[]).map((r,i)=>fmtDate(r.Timestamp,i));
    const allDates = Array.from(new Set([...datesA,...datesB])).slice(-10);
    const toData = (hist: Athlete['History']|undefined, dates: string[]) =>
      allDates.map(l => {
        const idx = dates.indexOf(l);
        if (idx<0) return null;
        const v = hist?.[idx]?.[field]; if (!v) return null;
        const n = parseFloat(String(v)); return isNaN(n) ? null : n;
      });
    return {
      labels: allDates,
      datasets:[
        { label:pA?.Name||'A', data:toData(pA?.History||[], datesA), borderColor:'#38bdf8', backgroundColor:'#38bdf815', tension:0.3, fill:false, pointRadius:4, borderWidth:2.5, spanGaps:true },
        { label:pB?.Name||'B', data:toData(pB?.History||[], datesB), borderColor:'#f472b6', backgroundColor:'#f472b615', tension:0.3, fill:false, pointRadius:4, borderWidth:2.5, spanGaps:true },
      ],
    };
  }

  const lineOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ usePointStyle:true, font:{ size:9 }, boxWidth:8 } } },
    scales:{ y:{ beginAtZero:false, ticks:{ font:{ size:9 } } }, x:{ ticks:{ font:{ size:8 }, maxRotation:30 }, grid:{ display:false } } },
  };

  /* win counts */
  const wins = useMemo(() => {
    if (!pA||!pB) return { a:0, b:0, draw:0 };
    let a=0, b=0, draw=0;
    PHYS_METRICS.forEach(m=>{
      const vA=Number(pA.Latest?.[m.field])||0;
      const vB=Number(pB.Latest?.[m.field])||0;
      if(!vA&&!vB) return;
      const aW = m.hi ? vA>vB : vA<vB&&vA>0;
      const bW = m.hi ? vB>vA : vB<vA&&vB>0;
      if(aW) a++; else if(bW) b++; else draw++;
    });
    return { a, b, draw };
  }, [pA, pB]);

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Compare Athletes</h2><p className="page-subtitle">เปรียบเทียบสมรรถภาพ · สุขภาพ · ประวัติพัฒนาการ</p></div>
      </div>

      {/* Selector — pA · VS · pB in correct grid order */}
      <div className="surface" style={{ marginBottom:20, padding:'16px 20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 1fr', gap:14, alignItems:'center' }}>
          <div>
            <label className="form-label" style={{ color:'#38bdf8', fontWeight:800 }}>Athlete A (Blue)</label>
            <AthleteSearchSelect athletes={athletes} value={idA} onChange={setIdA} placeholder="— เลือกนักกีฬา A —" accentColor="#38bdf8" />
          </div>
          <div style={{ textAlign:'center', fontWeight:900, fontSize:'1.3rem', color:'var(--text-muted)' }}>VS</div>
          <div>
            <label className="form-label" style={{ color:'#f472b6', fontWeight:800 }}>Athlete B (Pink)</label>
            <AthleteSearchSelect athletes={athletes} value={idB} onChange={setIdB} placeholder="— เลือกนักกีฬา B —" accentColor="#f472b6" />
          </div>
        </div>
      </div>

      {(!pA||!pB) && (
        <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
          <i className="bi bi-intersect" style={{ fontSize:'5rem', color:'#e2e8f0', display:'block', marginBottom:16 }}/>
          <h4 style={{ color:'#94a3b8' }}>เลือกนักกีฬา 2 คนเพื่อเปรียบเทียบ</h4>
        </div>
      )}

      {pA && pB && (
        <>
          {/* No-data warning */}
          {(!pA.Latest || !pB.Latest) && (
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 16px', marginBottom:16, display:'flex', gap:10, alignItems:'center' }}>
              <i className="bi bi-exclamation-triangle-fill" style={{ color:'#f59e0b' }}/>
              <span style={{ fontSize:'0.82rem', fontWeight:600, color:'#92400e' }}>
                {!pA.Latest && !pB.Latest ? 'ทั้งสองคนยังไม่เคยทดสอบ' : !pA.Latest ? `${pA.Name} ยังไม่มีข้อมูลการทดสอบ` : `${pB.Name} ยังไม่มีข้อมูลการทดสอบ`}
                {' — กราฟจะแสดงเมื่อมีข้อมูล'}
              </span>
            </div>
          )}
          {/* ── Hero cards — pA · VS · pB (correct order) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 50px 1fr', gap:16, marginBottom:20, alignItems:'center' }}>
            <ProfileCard athlete={pA} color="#38bdf8" onScout={()=>onNavigate('scout',pA.PlayerID)}/>
            <div style={{ textAlign:'center' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--surface)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', fontWeight:900, color:'var(--text-muted)', fontSize:'0.8rem' }}>VS</div>
            </div>
            <ProfileCard athlete={pB} color="#f472b6" onScout={()=>onNavigate('scout',pB.PlayerID)}/>
          </div>

          {/* ── Win summary ── */}
          <div style={{ display:'flex', gap:10, marginBottom:20, padding:'12px 18px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, justifyContent:'center', alignItems:'center' }}>
            <div style={{ textAlign:'center', minWidth:80 }}>
              <div style={{ fontSize:'2rem', fontWeight:900, color:'#38bdf8', lineHeight:1 }}>{wins.a}</div>
              <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#38bdf8' }}>{pA.Name.split(' ')[0]} ชนะ</div>
            </div>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', padding:'0 16px' }}>Metric</div>
            <div style={{ textAlign:'center', minWidth:50 }}>
              <div style={{ fontSize:'1.4rem', fontWeight:900, color:'var(--text-muted)', lineHeight:1 }}>{wins.draw}</div>
              <div style={{ fontSize:'0.65rem', fontWeight:700, color:'var(--text-muted)' }}>เสมอ</div>
            </div>
            <div style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--text-muted)', padding:'0 16px' }}>Metric</div>
            <div style={{ textAlign:'center', minWidth:80 }}>
              <div style={{ fontSize:'2rem', fontWeight:900, color:'#f472b6', lineHeight:1 }}>{wins.b}</div>
              <div style={{ fontSize:'0.65rem', fontWeight:800, color:'#f472b6' }}>{pB.Name.split(' ')[0]} ชนะ</div>
            </div>
          </div>

          {/* ── Radar + Physical metric bars ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            {/* Radar */}
            <div className="surface">
              <div className="section-hd" style={{ marginBottom:12 }}><i className="bi bi-broadcast me-2" style={{ color:'#38bdf8' }}/>Skill Radar</div>
              <div style={{ height:300, position:'relative' }}>
                {radarData && <Radar data={radarData} options={radarOpts}/>}
              </div>
            </div>
            {/* Physical bars */}
            <div className="surface">
              <div className="section-hd" style={{ marginBottom:14 }}><i className="bi bi-bar-chart-steps me-2"/>Physical Metrics</div>
              {PHYS_METRICS.map(m=>{
                const vA=Number(pA.Latest?.[m.field])||0;
                const vB=Number(pB.Latest?.[m.field])||0;
                if(!vA&&!vB) return null;
                const maxV=Math.max(vA,vB,0.001);
                const pctA=vA/maxV*100; const pctB=vB/maxV*100;
                const aW=m.hi?vA>vB:(vA<vB&&vA>0); const bW=m.hi?vB>vA:(vB<vA&&vB>0);
                const diff=Math.abs(vA-vB);
                return (
                  <div key={m.key} style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:'0.7rem', fontWeight:800, color:m.color }}><i className={`bi ${m.icon} me-1`}/>{m.label}</span>
                      <span style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{m.unit}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ minWidth:36, textAlign:'right', fontWeight:aW?900:600, fontSize:'0.78rem', color:aW?'#38bdf8':'var(--text-muted)' }}>{vA||'—'}</span>
                      <div style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
                        <div style={{ height:5, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:5, background: aW?'#38bdf8':'#bfdbfe', width:`${pctA}%`, transition:'width 0.5s' }}/>
                        </div>
                        <div style={{ height:5, borderRadius:5, background:'#f1f5f9', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:5, background: bW?'#f472b6':'#fbcfe8', width:`${pctB}%`, transition:'width 0.5s' }}/>
                        </div>
                      </div>
                      <span style={{ minWidth:36, fontWeight:bW?900:600, fontSize:'0.78rem', color:bW?'#f472b6':'var(--text-muted)' }}>{vB||'—'}</span>
                      {diff>0 && <span style={{ fontSize:'0.62rem', color:'var(--text-muted)', minWidth:30 }}>Δ{diff%1!==0?diff.toFixed(2):diff}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Body Composition ── */}
          <div className="surface" style={{ marginBottom:16 }}>
            <div className="section-hd" style={{ marginBottom:14 }}><i className="bi bi-person-fill me-2" style={{ color:'#a78bfa' }}/>Body Composition & Physical Stats</div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft:16, width:140 }}>ตัวชี้วัด</th>
                    <th style={{ textAlign:'center', color:'#38bdf8', fontWeight:800 }}>{pA.Name}</th>
                    <th style={{ textAlign:'center', color:'#f472b6', fontWeight:800 }}>{pB.Name}</th>
                    <th style={{ textAlign:'center' }}>ผลต่าง</th>
                  </tr>
                </thead>
                <tbody>
                  {BODY_METRICS.map((m,i)=>{
                    const vA=Number(pA.Latest?.[m.field])||0;
                    const vB=Number(pB.Latest?.[m.field])||0;
                    const aW=m.hi?vA>vB:(vA<vB&&vA>0); const bW=m.hi?vB>vA:(vB<vA&&vB>0);
                    const diff=vA&&vB ? (vA-vB) : null;
                    return (
                      <tr key={m.field} style={{ background:i%2===0?'transparent':'var(--bg)' }}>
                        <td style={{ paddingLeft:16, fontWeight:700, fontSize:'0.82rem', color:m.color }}>{m.label}</td>
                        <td style={{ textAlign:'center', fontWeight:aW?900:500, color:aW?'#38bdf8':'var(--text)' }}>{vA?`${vA} ${m.unit}`:'—'}</td>
                        <td style={{ textAlign:'center', fontWeight:bW?900:500, color:bW?'#f472b6':'var(--text)' }}>{vB?`${vB} ${m.unit}`:'—'}</td>
                        <td style={{ textAlign:'center', fontSize:'0.75rem' }}>
                          {diff!==null && <span style={{ fontWeight:700, color:Math.abs(diff)<0.01?'var(--text-muted)':diff>0?'#38bdf8':'#f472b6' }}>
                            {diff>0.01?`A +${Math.abs(diff)%1!==0?Math.abs(diff).toFixed(1):Math.abs(diff)}`:diff<-0.01?`B +${Math.abs(diff)%1!==0?Math.abs(diff).toFixed(1):Math.abs(diff)}`:'='}
                          </span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Full Score Table ── */}
          <div className="surface" style={{ marginBottom:16 }}>
            <div className="section-hd" style={{ marginBottom:14 }}><i className="bi bi-table me-2" style={{ color:'#f59e0b' }}/>Score Comparison (คะแนน 1-5)</div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft:16 }}>Metric</th>
                    <th style={{ textAlign:'center', color:'#38bdf8', fontWeight:800 }}>{pA.Name}</th>
                    <th style={{ textAlign:'center' }}>Score A</th>
                    <th style={{ textAlign:'center', color:'#f472b6', fontWeight:800 }}>{pB.Name}</th>
                    <th style={{ textAlign:'center' }}>Score B</th>
                    <th style={{ textAlign:'center' }}>ผล</th>
                  </tr>
                </thead>
                <tbody>
                  {PHYS_METRICS.map((m,i)=>{
                    const vA=Number(pA.Latest?.[m.field])||0;
                    const vB=Number(pB.Latest?.[m.field])||0;
                    const sA=scoresA[m.key]; const sB=scoresB[m.key];
                    const aW=sA>0&&sB>0&&(m.hi?sA>sB:sA<sB); const bW=sA>0&&sB>0&&(m.hi?sB>sA:sB<sA);
                    return (
                      <tr key={m.key} style={{ background:i%2===0?'transparent':'var(--bg)' }}>
                        <td style={{ paddingLeft:16, fontWeight:700, fontSize:'0.82rem' }}>
                          <i className={`bi ${m.icon} me-1`} style={{ color:m.color }}/>{m.label}
                        </td>
                        <td style={{ textAlign:'center', fontWeight:aW?900:500, color:aW?'#38bdf8':'var(--text)' }}>{vA?`${vA} ${m.unit}`:'—'}</td>
                        <td style={{ textAlign:'center' }}><ScoreBadge score={sA}/></td>
                        <td style={{ textAlign:'center', fontWeight:bW?900:500, color:bW?'#f472b6':'var(--text)' }}>{vB?`${vB} ${m.unit}`:'—'}</td>
                        <td style={{ textAlign:'center' }}><ScoreBadge score={sB}/></td>
                        <td style={{ textAlign:'center' }}>
                          {aW&&<span style={{ background:'#eff6ff', color:'#38bdf8', borderRadius:5, padding:'2px 7px', fontSize:'0.65rem', fontWeight:800 }}>A ชนะ</span>}
                          {bW&&<span style={{ background:'#fdf2f8', color:'#f472b6', borderRadius:5, padding:'2px 7px', fontSize:'0.65rem', fontWeight:800 }}>B ชนะ</span>}
                          {!aW&&!bW&&<span style={{ color:'var(--text-muted)', fontSize:'0.65rem' }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Overall */}
                  <tr style={{ background:'#0f172a' }}>
                    <td style={{ paddingLeft:16, fontWeight:800, color:'rgba(255,255,255,0.7)', fontSize:'0.82rem' }}>Overall Rating</td>
                    <td style={{ textAlign:'center', fontWeight:900, fontSize:'1.3rem', color:'#38bdf8' }} colSpan={2}>{pA.Latest?.Rating||0}</td>
                    <td style={{ textAlign:'center', fontWeight:900, fontSize:'1.3rem', color:'#f472b6' }} colSpan={2}>{pB.Latest?.Rating||0}</td>
                    <td style={{ textAlign:'center', fontWeight:800, color:'white', fontSize:'0.85rem' }}>
                      {Number(pA.Latest?.Rating||0)>Number(pB.Latest?.Rating||0) ? `🏆 ${pA.Name.split(' ')[0]}` : Number(pB.Latest?.Rating||0)>Number(pA.Latest?.Rating||0) ? `🏆 ${pB.Name.split(' ')[0]}` : '🤝 Draw'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── History Charts ── */}
          {(pA.History?.length >= 2 || pB.History?.length >= 2) && (
            <div className="surface" style={{ marginBottom:16 }}>
              <div className="section-hd" style={{ marginBottom:14 }}><i className="bi bi-graph-up me-2" style={{ color:'#34d399' }}/>ประวัติพัฒนาการ</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {HISTORY_CHARTS.map(hc=>{
                  const hasDataA = pA.History?.some(r=>Number(r[hc.field])>0);
                  const hasDataB = pB.History?.some(r=>Number(r[hc.field])>0);
                  if(!hasDataA&&!hasDataB) return null;
                  return (
                    <div key={hc.field}>
                      <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>{hc.label}</div>
                      <div style={{ height:150, position:'relative' }}>
                        <Line data={buildHistoryChart(hc.field)} options={lineOpts}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
