'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, Legend, CategoryScale, LinearScale,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { Athlete, IRReport, User } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { callGAS } from '@/lib/api';
import ReportBanner, { PrintHeader } from '../ReportBanner';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale);

interface Props { athletes: Athlete[]; user: User; }

/* ── Constants ───────────────────────────────────────────── */
const IR_B = [
  { key:'b_ontime',        label:'Be On Time',       labelTH:'การตรงต่อเวลา'           },
  { key:'b_effort',        label:'Effort',            labelTH:'ความมุ่งมั่นพยายาม'       },
  { key:'b_teamwork',      label:'Teamwork',          labelTH:'การทำงานเป็นทีม'          },
  { key:'b_respect',       label:'Respect',           labelTH:'การให้เกียรติผู้อื่น'     },
  { key:'b_attendance',    label:'Attendance',        labelTH:'การเข้าร่วมฝึกซ้อม'      },
  { key:'b_participation', label:'Participation',     labelTH:'การมีส่วนร่วม'            },
  { key:'b_improvement',   label:'Improvement',       labelTH:'พัฒนาการที่เห็นได้ชัด'   },
];
const IR_L = [
  { key:'l_sleep',         label:'Sleep',             labelTH:'การนอนหลับพักผ่อน'       },
  { key:'l_hydration',     label:'Hydration',         labelTH:'การดื่มน้ำเพียงพอ'       },
  { key:'l_diet',          label:'Diet',              labelTH:'การรับประทานอาหาร'        },
  { key:'l_screentime',    label:'Screen Time',       labelTH:'การใช้อุปกรณ์อิเล็กทรอนิกส์' },
];
const IR_T = [
  { key:'t_motricity',     label:'Motricity',         labelTH:'กลไกและการเคลื่อนไหวร่างกาย' },
  { key:'t_technical',     label:'Technical',         labelTH:'ทักษะเทคนิคลูกบอล'       },
  { key:'t_tactic',        label:'Tactical Awareness',labelTH:'การอ่านเกมและยุทธวิธี'    },
  { key:'t_offfundam',     label:'Offensive Fundamentals', labelTH:'พื้นฐานเกมรุก'      },
  { key:'t_deffundam',     label:'Defensive Fundamentals', labelTH:'พื้นฐานเกมรับ'      },
  { key:'t_fitness',       label:'Physical Fitness',  labelTH:'สมรรถภาพทางกาย'          },
];

const SCORE_CFG: Record<number,{label:string;color:string;bg:string}> = {
  0:{label:'—',       color:'#94a3b8',bg:'#f1f5f9'},
  1:{label:'ต่ำมาก', color:'#dc2626',bg:'#fef2f2'},
  2:{label:'พัฒนา',  color:'#ea580c',bg:'#fff7ed'},
  3:{label:'ปานกลาง',color:'#ca8a04',bg:'#fefce8'},
  4:{label:'ดี',     color:'#16a34a',bg:'#f0fdf4'},
  5:{label:'ดีมาก',  color:'#0284c7',bg:'#eff6ff'},
};

function grade(pct:number){
  if(pct>=90) return {text:'ยอดเยี่ยม',   color:'#10b981'};
  if(pct>=75) return {text:'ดี',           color:'#3b82f6'};
  if(pct>=50) return {text:'ปานกลาง',      color:'#f59e0b'};
  if(pct>=30) return {text:'ต้องพัฒนา',   color:'#ef4444'};
  return             {text:'ต่ำมาก',       color:'#991b1b'};
}

/* ── Rating row ──────────────────────────────────────────── */
function RatingRow({ item, val, onChange, color }:{
  item:{key:string;label:string;labelTH:string}; val:number; onChange:(v:number)=>void; color:string;
}) {
  const sc = SCORE_CFG[val] || SCORE_CFG[0];
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
      borderRadius:10, background:'var(--bg)',
      border:`1.5px solid ${val>0 ? color+'55' : 'var(--border)'}`,
      transition:'border-color 0.15s',
    }}>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700, fontSize:'0.82rem'}}>{item.label}</div>
        <div style={{fontSize:'0.67rem', color:'var(--text-muted)', marginTop:1}}>{item.labelTH}</div>
      </div>
      <div style={{display:'flex', gap:4, flexShrink:0}}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>onChange(val===n?0:n)} style={{
            width:30, height:30, borderRadius:7, border:'1.5px solid',
            fontWeight:800, fontSize:'0.75rem', cursor:'pointer', transition:'all 0.1s',
            background: val===n ? SCORE_CFG[n].bg : 'white',
            borderColor: val===n ? SCORE_CFG[n].color : '#e2e8f0',
            color: val===n ? SCORE_CFG[n].color : '#94a3b8',
            transform: val===n ? 'scale(1.15)' : 'scale(1)',
          }}>{n}</button>
        ))}
      </div>
      <span style={{
        fontSize:'0.62rem', fontWeight:800, color:sc.color, background:sc.bg,
        borderRadius:5, padding:'2px 7px', minWidth:50, textAlign:'center', flexShrink:0,
      }}>{sc.label}</span>
    </div>
  );
}

/* ── Section block ───────────────────────────────────────── */
function Section({num,icon,title,titleTH,color,children}:{
  num:number;icon:string;title:string;titleTH:string;color:string;children:React.ReactNode;
}){
  return (
    <div style={{
      background:'var(--surface)', borderRadius:14, overflow:'hidden',
      border:'1px solid var(--border)', borderLeft:`4px solid ${color}`, marginBottom:16,
    }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'12px 18px',
        background:`${color}08`, borderBottom:`1px solid ${color}20`,
      }}>
        <div style={{
          width:30, height:30, borderRadius:8, background:`${color}22`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'0.85rem', fontWeight:900, color, flexShrink:0,
        }}>{num}</div>
        <span style={{fontSize:'1rem'}}>{icon}</span>
        <div>
          <div style={{fontWeight:800, fontSize:'0.92rem', color}}>{title}</div>
          <div style={{fontSize:'0.68rem', color:'var(--text-muted)'}}>{titleTH}</div>
        </div>
      </div>
      <div style={{padding:'14px 18px'}}>{children}</div>
    </div>
  );
}

/* ── Score summary card ──────────────────────────────────── */
function ScoreCard({label:lbl,labelTH,pct,color,dark=false}:{label:string;labelTH:string;pct:number;color:string;dark?:boolean}){
  const g = pct>0 ? grade(pct) : null;
  return (
    <div style={{
      flex:1, minWidth:100, borderRadius:12, padding:'14px 16px', textAlign:'center',
      background:dark?'#0f172a':'var(--surface)', border:`2px solid ${dark?'#38bdf8':color+'55'}`,
    }}>
      <div style={{fontSize:'0.6rem',fontWeight:700,color:dark?'rgba(255,255,255,0.45)':'var(--text-muted)',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{lbl}</div>
      <div style={{fontSize:'0.68rem',color:dark?'rgba(255,255,255,0.5)':'var(--text-muted)',marginBottom:6}}>{labelTH}</div>
      <div style={{fontSize:'2.2rem',fontWeight:900,lineHeight:1,color:dark?'white':color}}>{pct>0?`${pct}%`:'—'}</div>
      {g&&<div style={{fontSize:'0.65rem',fontWeight:700,color:g.color,marginTop:4}}>{g.text}</div>}
      <div style={{height:4,borderRadius:4,background:dark?'rgba(255,255,255,0.12)':'#f1f5f9',marginTop:8,overflow:'hidden'}}>
        <div style={{height:'100%',borderRadius:4,background:dark?'#38bdf8':color,width:`${pct}%`,transition:'width 0.6s'}}/>
      </div>
    </div>
  );
}

/* ── QR Tab ──────────────────────────────────────────────── */
function QRTab(){
  const [qrUrl,setQrUrl]=useState('');
  const [baseUrl,setBaseUrl]=useState('');
  useEffect(()=>{
    const saved=typeof window!=='undefined'?localStorage.getItem('pj_qr_base'):'';
    const detected=typeof window!=='undefined'?window.location.origin:'';
    const base=saved||detected; setBaseUrl(base); gen(base);
  },[]);
  const gen=async(base:string)=>{
    if(!base) return;
    const url=await QRCode.toDataURL(`${base}/athlete-self`,{width:360,margin:2,color:{dark:'#0f172a',light:'#ffffff'}});
    setQrUrl(url);
  };
  return (
    <div className="surface" style={{padding:'24px 28px'}}>
      <div className="section-hd" style={{marginBottom:8}}><i className="bi bi-qr-code me-2"/>QR Code สำหรับนักกีฬากรอก IDP ด้วยตัวเอง</div>
      <p style={{fontSize:'0.85rem',color:'var(--text-muted)',marginBottom:20}}>QR เดียวสำหรับทุกคน — นักกีฬาสแกนแล้วเลือกชื่อตัวเองกรอกฟอร์ม ไม่ต้องล็อกอิน</p>
      <div style={{display:'flex',gap:10,alignItems:'flex-end',marginBottom:24,flexWrap:'wrap'}}>
        <div style={{flex:'1 1 320px'}}>
          <label className="form-label">URL ของเว็บ</label>
          <input className="form-control" value={baseUrl} onChange={e=>{setBaseUrl(e.target.value);localStorage.setItem('pj_qr_base',e.target.value);}} placeholder="https://yourdomain.com"/>
        </div>
        <button className="btn-primary" onClick={()=>gen(baseUrl)}><i className="bi bi-arrow-clockwise me-1"/>สร้าง QR</button>
      </div>
      {qrUrl&&(
        <div style={{display:'flex',gap:32,flexWrap:'wrap',alignItems:'flex-start'}}>
          <div style={{textAlign:'center'}}>
            <div style={{background:'white',display:'inline-block',padding:12,borderRadius:16,boxShadow:'0 4px 20px rgba(0,0,0,0.12)',border:'1px solid var(--border)'}}>
              <img src={qrUrl} alt="QR" style={{width:240,height:240,display:'block'}}/>
            </div>
            <button className="btn-primary btn-sm" style={{marginTop:12}} onClick={()=>{const a=document.createElement('a');a.href=qrUrl;a.download='IDP_QR.png';a.click();}}>
              <i className="bi bi-download me-1"/>ดาวน์โหลด QR
            </button>
          </div>
          <div style={{flex:1,minWidth:240}}>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:14,marginBottom:12}}>
              <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>ลิงก์ฟอร์ม</div>
              <div style={{fontSize:'0.82rem',wordBreak:'break-all',color:'#38bdf8',fontWeight:700}}>{baseUrl}/athlete-self</div>
            </div>
            <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:14,fontSize:'0.82rem',color:'#166534'}}>
              <div style={{fontWeight:700,marginBottom:6}}>📋 ขั้นตอนสำหรับโค้ช</div>
              <ol style={{margin:0,paddingLeft:18,lineHeight:1.9}}>
                <li>ดาวน์โหลด QR แล้วปริ้นหรือฉายบนหน้าจอ</li>
                <li>ให้นักกีฬาสแกน QR ด้วยมือถือ</li>
                <li>นักกีฬาเลือกชื่อตัวเองแล้วกรอกข้อมูล</li>
                <li>ข้อมูลบันทึกเข้าระบบอัตโนมัติ</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────── */
export default function IRPage({ athletes, user }: Props) {
  const [tab, setTab] = useState<'form'|'history'|'qr'>('form');

  /* form state */
  const [playerId,  setPlayerId]  = useState('');
  const [coach,     setCoach]     = useState('');
  const [period,    setPeriod]    = useState('');
  const [season,    setSeason]    = useState('Pre-Season');
  const [vals,      setVals]      = useState<Record<string,number>>({});
  const [med,       setMed]       = useState({period1:'',injury1:'',absence1:'',period2:'',injury2:'',absence2:''});
  const [goodLevel, setGoodLevel] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [comments,  setComments]  = useState('');
  /* IDP goals */
  const [goalShort,  setGoalShort]  = useState('');
  const [goalLong,   setGoalLong]   = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [coachPlan,  setCoachPlan]  = useState('');
  const [dream,      setDream]      = useState('');
  const [saving, setSaving] = useState(false);

  /* history state */
  const [histId,      setHistId]      = useState('');
  const [history,     setHistory]     = useState<IRReport[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  /* live scores */
  const avg=(keys:string[])=>{const v=keys.map(k=>vals[k]||0).filter(x=>x>0);return v.length?v.reduce((a,b)=>a+b)/v.length:0;};
  const bAvg=avg(IR_B.map(x=>x.key)); const lAvg=avg(IR_L.map(x=>x.key)); const tAvg=avg(IR_T.map(x=>x.key));
  const bPct=Math.round(bAvg/5*100); const lPct=Math.round(lAvg/5*100); const tPct=Math.round(tAvg/5*100);
  const oPct=Math.round(((bAvg+lAvg+tAvg)/15)*100);

  /* completion progress */
  const allKeys=[...IR_B,...IR_L,...IR_T].map(x=>x.key);
  const filled=allKeys.filter(k=>(vals[k]||0)>0).length;
  const progress=Math.round(filled/allKeys.length*100);

  const setScore=(key:string,v:number)=>setVals(p=>({...p,[key]:p[key]===v?0:v}));

  const resetForm=()=>{
    setVals({}); setPlayerId(''); setCoach(''); setPeriod(''); setSeason('Pre-Season');
    setMed({period1:'',injury1:'',absence1:'',period2:'',injury2:'',absence2:''});
    setGoodLevel(''); setToImprove(''); setComments('');
    setGoalShort(''); setGoalLong(''); setActionPlan(''); setCoachPlan(''); setDream('');
  };

  const handleSubmit=async()=>{
    if(!playerId) { showToast('กรุณาเลือกนักกีฬาก่อนบันทึก', 'error'); return; }
    if(!allKeys.some(k=>vals[k])) { showToast('กรุณากรอกอย่างน้อย 1 รายการ', 'error'); return; }
    setSaving(true);
    try {
      const res=await callGAS('saveIR',{
        playerId,coach,period,season,
        ...Object.fromEntries(allKeys.map(k=>[k,vals[k]||0])),
        med_period1:med.period1,med_injury1:med.injury1,med_absence1:med.absence1,
        med_period2:med.period2,med_injury2:med.injury2,med_absence2:med.absence2,
        goodLevel,toImprove,comments,
        idpGoalShort:goalShort,idpGoalLong:goalLong,idpAction:actionPlan,idpDream:dream,
      }) as {status:string;message:string};
      if(res.status==='success'){showToast(res.message, 'success');setTimeout(resetForm,1400);}
      else showToast(res.message, 'error');
    } catch { showToast('Connection error', 'error'); }
    finally { setSaving(false); }
  };

  const loadHistory=async(pid:string)=>{
    setHistId(pid); if(!pid){setHistory([]);return;}
    setLoadingHist(true);
    try{const d=await callGAS('getIRHistory',{playerId:pid}) as IRReport[];setHistory(Array.isArray(d)?d:[]);}
    finally{setLoadingHist(false);}
  };

  const athlete = athletes.find(a=>a.PlayerID===playerId);
  const histRev=[...history].reverse();
  const histLabels=histRev.map((_r,i)=>String(history[history.length-1-i]?.Timestamp||'').split(' ')[0]||`#${i+1}`);
  const latestIR=history[0]||null;

  const lineOpts={
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{grid:{display:false},ticks:{font:{size:9}}},
      y:{min:0,max:100,ticks:{font:{size:9},callback:(v:number|string)=>`${v}%`}},
    },
  };
  const mkLine=(field:keyof IRReport,color:string)=>({
    labels:histLabels,
    datasets:[{data:histRev.map(r=>Number(r[field])||0),borderColor:color,backgroundColor:color+'15',fill:true,tension:0.4,borderWidth:2.5,pointRadius:4}],
  });

  const radarData=latestIR?{
    labels:['On Time','Effort','Teamwork','Respect','Motricity','Technical','Tactic','Fitness','Sleep','Diet'],
    datasets:[{
      data:[
        Number(latestIR.B_OnTime)||0,Number(latestIR.B_Effort)||0,
        Number(latestIR.B_Teamwork)||0,Number(latestIR.B_Respect)||0,
        Number(latestIR.T_Motricity)||0,Number(latestIR.T_Technical)||0,
        Number(latestIR.T_Tactic)||0,Number(latestIR.T_Fitness)||0,
        Number(latestIR.L_Sleep)||0,Number(latestIR.L_Diet)||0,
      ],
      backgroundColor:'rgba(56,189,248,0.15)',borderColor:'#38bdf8',
      pointBackgroundColor:'#0f172a',borderWidth:2,pointRadius:4,
    }],
  }:null;

  const athleteOpts=(
    <>{athletes.map(a=><option key={a.PlayerID} value={a.PlayerID}>{a.Name}{a.Nickname?` (${a.Nickname})`:''} · {a.Team||'—'}</option>)}</>
  );

  return (
    <div>
      <PrintHeader user={user} title="IDP" subtitle="Individual Development Plan · ประเมินและวางแผนพัฒนานักกีฬา"/>
      <div className="page-header">
        <div>
          <h2 className="page-title">IDP</h2>
          <p className="page-subtitle">Individual Development Plan · ประเมินพฤติกรรม วิถีชีวิต เทคนิค และวางแผนพัฒนา</p>
        </div>
        {tab==='form' && filled>0 && (
          <button className="btn-primary" onClick={()=>window.print()} style={{whiteSpace:'nowrap'}}>
            <i className="bi bi-printer me-1"/>พิมพ์ IDP
          </button>
        )}
      </div>
      <ReportBanner user={user} subtitle="IDP · Individual Development Plan"/>

      {/* Tabs */}
      <div className="tab-switch" style={{marginBottom:20}}>
        {([
          {id:'form',    icon:'bi-pencil-square', label:'กรอก IDP'},
          {id:'history', icon:'bi-clock-history',  label:'ประวัติ IDP'},
          {id:'qr',      icon:'bi-qr-code',        label:'QR Self-Report'},
        ] as {id:'form'|'history'|'qr';icon:string;label:string}[]).map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <i className={`bi ${t.icon} me-1`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══ FORM TAB ══ */}
      {tab==='form' && (
        <div>
          {/* ① ข้อมูลทั่วไป */}
          <Section num={1} icon="👤" title="ข้อมูลทั่วไป" titleTH="Athlete Information" color="#0284c7">
            <div style={{display:'flex',flexWrap:'wrap',gap:12,marginBottom:16}}>
              <div style={{flex:'2 1 220px'}}>
                <label className="form-label">นักกีฬา *</label>
                <select className="form-select" style={{fontWeight:600}} value={playerId} onChange={e=>setPlayerId(e.target.value)}>
                  <option value="">— เลือกนักกีฬา —</option>
                  {athleteOpts}
                </select>
              </div>
              <div style={{flex:'1 1 160px'}}>
                <label className="form-label">โค้ช / ผู้ประเมิน</label>
                <input className="form-control" value={coach} onChange={e=>setCoach(e.target.value)} placeholder={user.displayName||user.username}/>
              </div>
              <div style={{flex:'1 1 140px'}}>
                <label className="form-label">Season</label>
                <select className="form-select" value={season} onChange={e=>setSeason(e.target.value)}>
                  {['Pre-Season','Mid-Season','Post-Season','Off-Season'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{flex:'2 1 220px'}}>
                <label className="form-label">ช่วงเวลา / Period</label>
                <input className="form-control" value={period} onChange={e=>setPeriod(e.target.value)} placeholder="เช่น Apr–Jun 2026, Week 1–4"/>
              </div>
            </div>

            {/* athlete card preview */}
            {athlete && (
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'var(--bg)',borderRadius:10,border:'1px solid var(--border)'}}>
                {athlete.PhotoUrl
                  ? <img src={athlete.PhotoUrl} alt="" style={{width:48,height:48,borderRadius:12,objectFit:'cover',objectPosition:'top'}}/>
                  : <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#1e3a5f,#0f172a)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'rgba(255,255,255,0.3)',fontSize:'1.2rem'}}>{(athlete.Name||'?')[0]}</div>
                }
                <div>
                  <div style={{fontWeight:800,fontSize:'1rem'}}>{athlete.Name}{athlete.Nickname&&<span style={{fontWeight:400,color:'var(--text-muted)',fontSize:'0.85rem'}}> ({athlete.Nickname})</span>}</div>
                  <div style={{fontSize:'0.75rem',color:'var(--text-muted)',marginTop:2}}>
                    {athlete.Team&&<span style={{marginRight:10}}><i className="bi bi-shield-fill me-1"/>{athlete.Team}</span>}
                    {athlete.Position&&<span style={{marginRight:10}}><i className="bi bi-person me-1"/>{athlete.Position}</span>}
                  </div>
                </div>
                <div style={{marginLeft:'auto',textAlign:'center'}}>
                  <div style={{fontSize:'2rem',fontWeight:900,color:'#38bdf8',lineHeight:1}}>{athlete.Latest?.Rating||'—'}</div>
                  <div style={{fontSize:'0.6rem',color:'var(--text-muted)',fontWeight:700}}>RATING</div>
                </div>
              </div>
            )}
          </Section>

          {/* ② สรุปคะแนน live */}
          {filled>0 && (
            <Section num={2} icon="📊" title="สรุปคะแนน IDP" titleTH="Assessment Score Summary" color="#6366f1">
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
                <ScoreCard label="Behaviour"  labelTH="พฤติกรรม"       pct={bPct} color="#818cf8"/>
                <ScoreCard label="Lifestyle"  labelTH="วิถีชีวิต"       pct={lPct} color="#34d399"/>
                <ScoreCard label="Technical"  labelTH="เทคนิค"          pct={tPct} color="#38bdf8"/>
                <ScoreCard label="Overall IDP" labelTH="คะแนนรวม IDP"   pct={oPct} color="#0f172a" dark/>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)'}}>ความคืบหน้าการกรอก</span>
                  <span style={{fontSize:'0.72rem',fontWeight:900,color:progress===100?'#10b981':'#38bdf8'}}>{filled}/{allKeys.length} ({progress}%)</span>
                </div>
                <div style={{height:6,borderRadius:6,background:'var(--bg)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:6,background:progress===100?'#10b981':'#38bdf8',width:`${progress}%`,transition:'width 0.4s'}}/>
                </div>
              </div>
            </Section>
          )}

          {/* ③ พฤติกรรม */}
          <Section num={3} icon="🧠" title="การประเมินพฤติกรรม" titleTH="Behaviour Assessment  (คะแนน 1 = ต่ำมาก · 5 = ดีมาก)" color="#818cf8">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:8}}>
              {IR_B.map(item=>(
                <RatingRow key={item.key} item={item} val={vals[item.key]||0} onChange={v=>setScore(item.key,v)} color="#818cf8"/>
              ))}
            </div>
          </Section>

          {/* ④ วิถีชีวิต */}
          <Section num={4} icon="🌿" title="การประเมินวิถีชีวิต" titleTH="Lifestyle Assessment" color="#34d399">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:8}}>
              {IR_L.map(item=>(
                <RatingRow key={item.key} item={item} val={vals[item.key]||0} onChange={v=>setScore(item.key,v)} color="#34d399"/>
              ))}
            </div>
          </Section>

          {/* ⑤ เทคนิค */}
          <Section num={5} icon="⚽" title="การประเมินเทคนิคและสมรรถภาพ" titleTH="Technical & Physical Assessment" color="#38bdf8">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:8}}>
              {IR_T.map(item=>(
                <RatingRow key={item.key} item={item} val={vals[item.key]||0} onChange={v=>setScore(item.key,v)} color="#38bdf8"/>
              ))}
            </div>
          </Section>

          {/* ⑥ ประวัติการบาดเจ็บ */}
          <Section num={6} icon="🩺" title="ประวัติการบาดเจ็บ" titleTH="Medical / Injury Record" color="#ef4444">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10,marginBottom:4}}>
              {([
                {label:'ช่วงเวลา (1)',     key:'period1',  placeholder:'เช่น Jan 2026'},
                {label:'อาการบาดเจ็บ (1)', key:'injury1',  placeholder:'เช่น ข้อเท้า, hamstring...'},
                {label:'ระยะเวลาพัก (1)',  key:'absence1', placeholder:'เช่น 2 สัปดาห์'},
                {label:'ช่วงเวลา (2)',     key:'period2',  placeholder:''},
                {label:'อาการบาดเจ็บ (2)', key:'injury2',  placeholder:''},
                {label:'ระยะเวลาพัก (2)',  key:'absence2', placeholder:''},
              ] as {label:string;key:keyof typeof med;placeholder:string}[]).map(f=>(
                <div key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-control" value={med[f.key]} onChange={e=>setMed(m=>({...m,[f.key]:e.target.value}))} placeholder={f.placeholder}/>
                </div>
              ))}
            </div>
          </Section>

          {/* ⑦ จุดเด่น จุดพัฒนา ความเห็นโค้ช */}
          <Section num={7} icon="💬" title="สรุปผลและความเห็นโค้ช" titleTH="Observations & Coach Feedback" color="#f59e0b">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              <div>
                <label className="form-label"><i className="bi bi-check-circle-fill" style={{color:'#22c55e'}}/> จุดเด่น / Good Level</label>
                <textarea className="form-control" rows={4} value={goodLevel} onChange={e=>setGoodLevel(e.target.value)} placeholder="จุดแข็งและสิ่งที่นักกีฬาทำได้ดี..."/>
              </div>
              <div>
                <label className="form-label"><i className="bi bi-arrow-up-circle-fill" style={{color:'#f59e0b'}}/> จุดพัฒนา / To Improve</label>
                <textarea className="form-control" rows={4} value={toImprove} onChange={e=>setToImprove(e.target.value)} placeholder="สิ่งที่ต้องพัฒนาและปรับปรุง..."/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="form-label"><i className="bi bi-chat-square-text me-1"/>ความเห็นเพิ่มเติมจากโค้ช / Comments</label>
                <textarea className="form-control" rows={3} value={comments} onChange={e=>setComments(e.target.value)} placeholder="ความเห็น คำแนะนำ และข้อสังเกตจากโค้ช..."/>
              </div>
            </div>
          </Section>

          {/* ⑧ แผนพัฒนา IDP */}
          <Section num={8} icon="🎯" title="แผนพัฒนาตัวนักกีฬา" titleTH="Individual Development Plan (IDP)" color="#a855f7">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {[
                {label:'เป้าหมายระยะสั้น (3 เดือน)',       icon:'bi-calendar2-check-fill', color:'#0284c7', state:goalShort,   set:setGoalShort,   ph:'สิ่งที่อยากทำให้ได้ภายใน 3 เดือน เช่น ฝึก first touch ทุกวัน, เพิ่มความเร็ว 5%...'},
                {label:'เป้าหมายระยะยาว (6–12 เดือน)',     icon:'bi-trophy-fill',          color:'#f59e0b', state:goalLong,    set:setGoalLong,    ph:'สิ่งที่อยากทำให้ได้ภายใน 1 ปี เช่น ติดทีมชุดหลัก, เพิ่ม Rating ถึง 75...'},
                {label:'แผนการฝึกซ้อมของนักกีฬา',           icon:'bi-list-task',            color:'#4f46e5', state:actionPlan,  set:setActionPlan,  ph:'สิ่งที่นักกีฬาจะทำด้วยตัวเองนอกเวลาฝึก เช่น วิ่ง 20 นาที/วัน...'},
                {label:'แผนการพัฒนาของโค้ช',                icon:'bi-person-badge-fill',    color:'#0284c7', state:coachPlan,   set:setCoachPlan,   ph:'โปรแกรมและแนวทางที่โค้ชจะใช้พัฒนานักกีฬาคนนี้...'},
                {label:'ความฝันและเป้าหมายอาชีพ',            icon:'bi-stars',               color:'#a855f7', state:dream,       set:setDream,       ph:'อยากเป็นนักกีฬาระดับไหน ทีมไหน หรืออยากทำอะไรในวงการกีฬา...'},
              ].map(f=>(
                <div key={f.label} style={{...(f.label.includes('โค้ช')||f.label.includes('ความฝัน')?{gridColumn:'span 1'}:{})}}>
                  <label className="form-label">
                    <i className={`bi ${f.icon} me-1`} style={{color:f.color}}/>{f.label}
                  </label>
                  <textarea className="form-control" rows={4} value={f.state} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{resize:'vertical'}}/>
                </div>
              ))}
            </div>
          </Section>

          {/* Actions */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:32}}>
            <button className="btn-outline" onClick={resetForm}><i className="bi bi-arrow-counterclockwise me-1"/>ล้างข้อมูล</button>
            <button className="btn-primary" style={{padding:'13px 40px',fontSize:'1rem',background:'#0f172a'}} onClick={handleSubmit} disabled={saving}>
              {saving?<><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> บันทึก…</>:<><i className="bi bi-floppy me-1"/>บันทึก IDP</>}
            </button>
          </div>
        </div>
      )}

      {/* ══ QR TAB ══ */}
      {tab==='qr' && <QRTab/>}

      {/* ══ HISTORY TAB ══ */}
      {tab==='history' && (
        <div>
          <div className="surface" style={{marginBottom:16,padding:'14px 18px'}}>
            <label className="form-label">เลือกนักกีฬาเพื่อดูประวัติ IDP</label>
            <select className="form-select" style={{fontWeight:600}} value={histId} onChange={e=>loadHistory(e.target.value)}>
              <option value="">— เลือกนักกีฬา —</option>
              {athleteOpts}
            </select>
          </div>

          {!histId && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-clipboard2-check" style={{fontSize:'5rem',color:'#e2e8f0',display:'block',marginBottom:16}}/>
              <p>เลือกนักกีฬาเพื่อดูประวัติ IDP</p>
            </div>
          )}
          {loadingHist && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}
          {histId && !loadingHist && history.length===0 && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-clipboard2-x" style={{fontSize:'5rem',color:'#e2e8f0',display:'block',marginBottom:16}}/>
              <p>นักกีฬาคนนี้ยังไม่เคยถูกบันทึก IDP</p>
            </div>
          )}

          {history.length>0 && (
            <>
              {/* Radar + Scores */}
              {radarData && latestIR && (
                <div className="surface" style={{marginBottom:16}}>
                  <div className="section-hd"><i className="bi bi-pentagon me-2"/>ผลล่าสุด — {String(latestIR.Timestamp||'').split(' ')[0]}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:20,alignItems:'flex-start'}}>
                    <div style={{flex:'0 0 280px',height:280}}>
                      <Radar data={radarData} options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{r:{min:0,max:5,ticks:{display:false},pointLabels:{font:{size:9,weight:'bold'},color:'#475569'}}}}}/>
                    </div>
                    <div style={{flex:1,minWidth:220}}>
                      <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}>
                        <ScoreCard label="Behaviour" labelTH="พฤติกรรม"  pct={Number(latestIR.BehaviourScore)||0} color="#818cf8"/>
                        <ScoreCard label="Lifestyle"  labelTH="วิถีชีวิต" pct={Number(latestIR.LifestyleScore)||0}  color="#34d399"/>
                        <ScoreCard label="Technical" labelTH="เทคนิค"    pct={Number(latestIR.TechnicalScore)||0}  color="#38bdf8"/>
                        <ScoreCard label="Overall"   labelTH="คะแนนรวม"  pct={Number(latestIR.OverallIRScore)||0}  color="#0f172a" dark/>
                      </div>
                      {[
                        {label:'จุดเด่น',val:latestIR.GoodLevel,bg:'#f0fdf4',border:'#bbf7d0',color:'#166534'},
                        {label:'จุดพัฒนา',val:latestIR.ToImprove,bg:'#fef3c7',border:'#fde68a',color:'#92400e'},
                        {label:'ความเห็นโค้ช',val:latestIR.Comments,bg:'var(--bg)',border:'var(--border)',color:'var(--text)'},
                      ].filter(x=>x.val).map(x=>(
                        <div key={x.label} style={{background:x.bg,border:`1px solid ${x.border}`,borderRadius:8,padding:'10px 12px',marginBottom:8}}>
                          <div style={{fontSize:'0.62rem',fontWeight:700,color:x.color,marginBottom:3,textTransform:'uppercase'}}>{x.label}</div>
                          <div style={{fontSize:'0.82rem',color:x.color}}>{String(x.val)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Line charts */}
              <div className="surface" style={{marginBottom:16}}>
                <div className="section-hd"><i className="bi bi-graph-up-arrow me-2"/>แนวโน้มพัฒนาการ</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:16}}>
                  {([
                    {field:'BehaviourScore' as keyof IRReport,label:'Behaviour (%)',color:'#818cf8'},
                    {field:'LifestyleScore'  as keyof IRReport,label:'Lifestyle (%)',color:'#34d399'},
                    {field:'TechnicalScore'  as keyof IRReport,label:'Technical (%)',color:'#38bdf8'},
                    {field:'OverallIRScore'  as keyof IRReport,label:'Overall IDP (%)',color:'#0f172a'},
                  ]).map(({field,label,color})=>(
                    <div key={String(field)}>
                      <div style={{fontSize:'0.7rem',fontWeight:700,color,marginBottom:6,textTransform:'uppercase'}}>{label}</div>
                      <div style={{height:160,position:'relative'}}>
                        <Line data={mkLine(field,color)} options={lineOpts}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* History list */}
              <div className="surface">
                <div className="section-hd"><i className="bi bi-list-ul me-2"/>ประวัติ IDP ทั้งหมด ({history.length} รายการ)</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {history.map((ir,i)=>{
                    const oG=grade(Number(ir.OverallIRScore)||0);
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,flexWrap:'wrap'}}>
                        <div style={{minWidth:100}}>
                          <div style={{fontWeight:700,fontSize:'0.82rem'}}>{String(ir.Timestamp||'').split(' ')[0]}</div>
                          <div style={{fontSize:'0.68rem',color:'var(--text-muted)'}}>{ir.Season||''}{ir.Period?' · '+ir.Period:''}</div>
                          {ir.Coach&&<div style={{fontSize:'0.68rem',color:'var(--text-muted)'}}>โค้ช: {ir.Coach}</div>}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          {[
                            {l:'B',v:Number(ir.BehaviourScore)||0,c:'#818cf8',bg:'#ede9fe'},
                            {l:'L',v:Number(ir.LifestyleScore)||0, c:'#059669',bg:'#d1fae5'},
                            {l:'T',v:Number(ir.TechnicalScore)||0, c:'#0284c7',bg:'#dbeafe'},
                          ].map(x=>(
                            <span key={x.l} style={{fontSize:'0.72rem',fontWeight:700,background:x.bg,color:x.c,padding:'3px 8px',borderRadius:6}}>{x.l}: {x.v}%</span>
                          ))}
                        </div>
                        <div style={{flex:1,minWidth:120}}>
                          <div style={{height:5,borderRadius:5,background:'#f1f5f9',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:5,background:oG.color,width:`${Number(ir.OverallIRScore)||0}%`}}/>
                          </div>
                        </div>
                        <div style={{textAlign:'center',minWidth:60}}>
                          <div style={{fontWeight:900,fontSize:'1.1rem',color:oG.color}}>{Number(ir.OverallIRScore)||0}%</div>
                          <div style={{fontSize:'0.6rem',fontWeight:700,color:oG.color}}>{oG.text}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
