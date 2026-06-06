'use client';

import { useEffect, useState, use } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement,
  Filler, Tooltip, CategoryScale, LinearScale,
} from 'chart.js';
import { Radar, Line } from 'react-chartjs-2';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import { DEV_DATA, VIDEO_DB } from '@/lib/devData';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, CategoryScale, LinearScale);

/* ── constants ── */
const METRICS = [
  { key:'speed30',  field:'Speed30',     label:'Speed 30m',   unit:'s',    color:'#f472b6', icon:'bi-lightning-charge-fill' },
  { key:'cmj',      field:'CMJ',         label:'CMJ',         unit:'cm',   color:'#818cf8', icon:'bi-arrow-up-circle-fill'  },
  { key:'agility',  field:'Agility',     label:'Agility',     unit:'s',    color:'#fb923c', icon:'bi-arrow-repeat'          },
  { key:'situp',    field:'Situp',       label:'Sit-up',      unit:'reps', color:'#facc15', icon:'bi-person-fill'           },
  { key:'longjump', field:'LongJump',    label:'Long Jump',   unit:'cm',   color:'#a3e635', icon:'bi-dash-lg'               },
  { key:'yoyo',     field:'YoYo',        label:'Yo-Yo',       unit:'m',    color:'#f87171', icon:'bi-heart-pulse-fill'      },
  { key:'pushup',   field:'Pushup',      label:'Push-up',     unit:'reps', color:'#4ade80', icon:'bi-activity'              },
  { key:'sitreach', field:'SitAndReach', label:'Sit & Reach', unit:'cm',   color:'#38bdf8', icon:'bi-arrows-expand'         },
];

const HISTORY_FIELDS = [
  { field:'Rating',      label:'Overall Rating', color:'#38bdf8' },
  { field:'Speed30',     label:'Speed 30m',      color:'#f472b6' },
  { field:'Agility',     label:'Agility',        color:'#fb923c' },
  { field:'CMJ',         label:'CMJ',            color:'#818cf8' },
  { field:'LongJump',    label:'Long Jump',      color:'#a3e635' },
  { field:'YoYo',        label:'Yo-Yo',          color:'#f87171' },
  { field:'Pushup',      label:'Push-up',        color:'#4ade80' },
  { field:'Situp',       label:'Sit-up',         color:'#facc15' },
  { field:'SitAndReach', label:'Sit & Reach',    color:'#c084fc' },
];

const IR_SECTIONS = [
  { key:'behaviour', label:'Behaviour', labelTH:'พฤติกรรม', color:'#818cf8', icon:'bi-emoji-smile-fill',
    items:[
      {field:'B_OnTime',label:'Be on Time',labelTH:'การตรงต่อเวลา'},{field:'B_Effort',label:'Effort',labelTH:'ความมุ่งมั่นพยายาม'},
      {field:'B_Teamwork',label:'Teamwork',labelTH:'การทำงานเป็นทีม'},{field:'B_Respect',label:'Respect',labelTH:'การให้เกียรติผู้อื่น'},
      {field:'B_Attendance',label:'Attendance',labelTH:'การเข้าร่วมฝึกซ้อม'},{field:'B_Participation',label:'Participation',labelTH:'การมีส่วนร่วม'},
      {field:'B_Improvement',label:'Improvement',labelTH:'พัฒนาการที่เห็นได้ชัด'},
    ], scoreField:'BehaviourScore' },
  { key:'lifestyle', label:'Lifestyle', labelTH:'วิถีชีวิต', color:'#34d399', icon:'bi-heart-fill',
    items:[
      {field:'L_Sleep',label:'Sleep',labelTH:'การนอนหลับพักผ่อน'},{field:'L_Hydration',label:'Hydration',labelTH:'การดื่มน้ำเพียงพอ'},
      {field:'L_Diet',label:'Diet',labelTH:'การรับประทานอาหาร'},{field:'L_ScreenTime',label:'Screen Time',labelTH:'การใช้โทรศัพท์/เกม'},
    ], scoreField:'LifestyleScore' },
  { key:'technical', label:'Technical', labelTH:'ทักษะฟุตบอล', color:'#f472b6', icon:'bi-trophy-fill',
    items:[
      {field:'T_Motricity',label:'Motricity',labelTH:'การเคลื่อนไหวร่างกาย'},{field:'T_Technical',label:'Technical',labelTH:'ทักษะเทคนิคลูกบอล'},
      {field:'T_Tactic',label:'Tactic',labelTH:'การอ่านเกมและยุทธวิธี'},{field:'T_OffFundam',label:'Off. Fundamental',labelTH:'พื้นฐานเกมรุก'},
      {field:'T_DefFundam',label:'Def. Fundamental',labelTH:'พื้นฐานเกมรับ'},{field:'T_Fitness',label:'Fitness',labelTH:'สมรรถภาพทางกาย'},
    ], scoreField:'TechnicalScore' },
];

const BADGES = [
  {emoji:'🎯',label:'First Test',   check:(h:number)=>h>=1},
  {emoji:'📅',label:'Veteran (5+)', check:(h:number)=>h>=5},
  {emoji:'🏆',label:'Elite',        check:(_h:number,r:number)=>r>=80},
  {emoji:'⭐',label:'Perfect Score',check:(_h:number,_r:number,sc:Record<string,number>)=>Object.values(sc).some(s=>s>=5)},
  {emoji:'💪',label:'All-Rounder',  check:(_h:number,_r:number,sc:Record<string,number>)=>{const v=Object.values(sc).filter(s=>s>0);return v.length>=6&&v.every(s=>s>=3);}},
  {emoji:'📈',label:'Most Improved',check:(h:number,_r:number,_sc:Record<string,number>,hist:HistRecord[])=>h>=2&&Number(hist[hist.length-1]?.Rating)>Number(hist[0]?.Rating)},
  {emoji:'⚡',label:'Speed Demon',  check:(_h:number,_r:number,sc:Record<string,number>)=>sc['speed30']>=5},
  {emoji:'❤️',label:'Iron Lungs',  check:(_h:number,_r:number,sc:Record<string,number>)=>sc['yoyo']>=5},
];

/* ── helpers ── */
function calcAge(dob:string){if(!dob)return null;const d=new Date(dob);if(isNaN(d.getTime()))return null;return Math.floor((Date.now()-d.getTime())/31557600000);}
function calcBMI(h:string,w:string){const hn=parseFloat(h),wn=parseFloat(w);if(!hn||!wn)return'—';return(wn/Math.pow(hn/100,2)).toFixed(1);}
function fmtDate(ts:string){try{const d=new Date(ts);return isNaN(d.getTime())?'':d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});}catch{return'';}}
function fmtShort(ts:string,i:number){try{const d=new Date(ts);return isNaN(d.getTime())?`#${i+1}`:`${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(2)}`;}catch{return`#${i+1}`;}}
function getGrade(r:number){
  if(r>=80)return{label:'Elite',   emoji:'🏆',color:'#10b981',bg:'linear-gradient(135deg,#10b981,#047857)',border:'#34d399',shadow:'rgba(16,185,129,0.35)'};
  if(r>=60)return{label:'Good',    emoji:'⭐',color:'#3b82f6',bg:'linear-gradient(135deg,#3b82f6,#1d4ed8)',border:'#60a5fa',shadow:'rgba(59,130,246,0.35)'};
  if(r>=40)return{label:'Average', emoji:'📈',color:'#f59e0b',bg:'linear-gradient(135deg,#f59e0b,#b45309)',border:'#fbbf24',shadow:'rgba(239,68,68,0.3)'};
  return          {label:'Fair',   emoji:'📊',color:'#ef4444',bg:'linear-gradient(135deg,#ef4444,#b91c1c)',border:'#f87171',shadow:'rgba(239,68,68,0.3)'};
}
function irScoreColor(s:number){if(s>=5)return'#16a34a';if(s>=4)return'#22c55e';if(s>=3)return'#f59e0b';if(s>=2)return'#f97316';return'#ef4444';}
function irGrade(pct:number){
  if(pct>=90)return{label:'ยอดเยี่ยม',emoji:'🌟',color:'#15803d',bg:'#f0fdf4',border:'#bbf7d0'};
  if(pct>=75)return{label:'ดี',        emoji:'✅',color:'#1d4ed8',bg:'#eff6ff',border:'#bfdbfe'};
  if(pct>=50)return{label:'ปานกลาง',  emoji:'👍',color:'#b45309',bg:'#fffbeb',border:'#fde68a'};
  if(pct>=30)return{label:'ต้องพัฒนา',emoji:'⚠️',color:'#c2410c',bg:'#fff7ed',border:'#fed7aa'};
  return       {label:'ต่ำมาก',      emoji:'🔴',color:'#dc2626',bg:'#fef2f2',border:'#fecaca'};
}
function irItemGrade(v:number):{emoji:string;label:string;color:string}{
  if(v>=5)return{emoji:'🌟',label:'ยอดเยี่ยม',color:'#15803d'};
  if(v>=4)return{emoji:'✅',label:'ดี',         color:'#1d4ed8'};
  if(v>=3)return{emoji:'👍',label:'ปานกลาง',  color:'#b45309'};
  if(v>=2)return{emoji:'⚠️',label:'พัฒนาได้', color:'#c2410c'};
  if(v>=1)return{emoji:'🔴',label:'ต้องปรับ', color:'#dc2626'};
  return   {emoji:'—', label:'ยังไม่ประเมิน',color:'#94a3b8'};
}
function getTrend(data:(number|null)[]){const v=data.filter(x=>x!==null)as number[];if(v.length<2)return null;const first=v[0],last=v[v.length-1];if(!first)return null;const pct=Math.round(((last-first)/first)*100);return{pct:Math.abs(pct),up:last>=first};}

/* ── types ── */
type HistRecord={Timestamp:string;Rating:number;Speed30:string;CMJ:string;PeakPower:string;Agility:string;AgiL:string;AgiR:string;Situp:string;LongJump:string;YoYo:string;YoyoLevel:string;YoyoShuttle:string;Pushup:string;SitAndReach:string;Height:string;Weight:string;BMI:string;Fat:string;Muscle:string;VO2Max:string};
type IRRecord=Record<string,number|string>;
type LatestSkill={assessedAt:string;assessedBy:string;season:string;scoreBallControl:number;scorePassing:number;scoreDribbling:number;scoreShooting:number;scoreTactical:number;skFirstTouch:number;skBallControl:number;skReceiving:number;skWeakFoot:number;skDribbling:number;skShooting:number;skLongPass:number;skPositioning:number;skDecision:number;skScanning:number;skPressure:number;skHeading:number};
type AttendStats={total:number;present:number;late:number;absent:number;excuse:number;rate:number};
type WellnessSummary={count:number;avgWellness:number;avgFatigue:number;avgSleep:number;avgMood:number;recent:{date:string;wellness:number;fatigue:number;sleep:number;mood:number}[]};
type RpeSummary={count:number;avgRpe:number;avgLoad:number;totalLoad:number};
type MatchStats={apps:number;totalMins:number;goals:number;assists:number;yellowCards:number;redCards:number;avgRating:number;recent:{matchDate:string;opponent:string;matchType:string;result:string;minutesPlayed:number;goals:number;assists:number;rating:number}[]};
type AthleteData={Name:string;Nickname:string;DOB:string;Team:string;Position:string;Club:string;Province:string;DomFoot:string;DomHand:string;PhotoUrl:string;TestCount:number;PlayerID:string;History:HistRecord[];Latest:Record<string,string|number>|null;IRHistory:IRRecord[];LatestSkill?:LatestSkill|null;AttendStats?:AttendStats;WellnessSummary?:WellnessSummary|null;RpeSummary?:RpeSummary|null;MatchStats?:MatchStats|null};

const RADAR_OPTS={responsive:true,plugins:{legend:{display:false}},scales:{r:{min:0,max:5,ticks:{stepSize:1,font:{size:9},backdropColor:'transparent'},pointLabels:{font:{size:10,weight:600 as const},color:'#475569'},grid:{color:'rgba(0,0,0,0.06)'},angleLines:{color:'rgba(0,0,0,0.06)'}}}};
const LINE_OPTS={responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,ticks:{font:{size:9}},grid:{color:'rgba(0,0,0,0.05)'}},x:{ticks:{font:{size:8},maxRotation:30},grid:{display:false}}}};

/* ── component ── */
export default function PublicAthletePage({params}:{params:Promise<{playerId:string}>}){
  const {playerId}=use(params);
  const [data,setData]=useState<AthleteData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    fetch(`/api/public/athlete/${playerId}`)
      .then(r=>r.json())
      .then(d=>{if(d.error)setError(d.error);else setData(d);})
      .catch(()=>setError('ไม่สามารถโหลดข้อมูลได้'))
      .finally(()=>setLoading(false));
  },[playerId]);

  if(loading)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{width:48,height:48,border:'4px solid rgba(56,189,248,0.3)',borderTop:'4px solid #38bdf8',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <p>กำลังโหลด...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if(error||!data)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0f172a',color:'white',textAlign:'center'}}>
      <div><div style={{fontSize:'4rem',marginBottom:16}}>❌</div><h2>{error||'ไม่พบข้อมูล'}</h2></div>
    </div>
  );

  const latest  =data.Latest;
  const HIST    =data.History||[];
  const irHistory=data.IRHistory||[];
  const rating  =Number(latest?.Rating||0);
  const grade   =getGrade(rating);
  const dob     =data.DOB;
  const age     =calcAge(dob);
  const bmi     =calcBMI(String(latest?.Height||''),String(latest?.Weight||''));
  const initials=(data.Name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
  const lastTest=HIST.length?fmtDate(HIST[HIST.length-1].Timestamp):'—';

  const athletePos=data.Position||'';
  const scores=METRICS.reduce<Record<string,number>>((acc,m)=>{
    acc[m.key]=latest?getScorePoint(m.key,String(latest[m.field]||''),dob,athletePos):0;
    return acc;
  },{});

  const physicalAge=(()=>{
    const valid=Object.values(scores).filter(s=>s>0);
    if(!valid.length||!age)return null;
    const avg=valid.reduce((a,b)=>a+b,0)/valid.length;
    return Math.max(8,age+Math.round((avg-3)*1.5));
  })();

  const earnedBadges=BADGES.filter(b=>b.check(HIST.length,rating,scores,HIST));
  const strengths  =METRICS.filter(m=>scores[m.key]>=4);
  const weaknesses =METRICS.filter(m=>scores[m.key]>0&&scores[m.key]<=2);

  const histLabels=HIST.map((r,i)=>fmtShort(r.Timestamp,i));

  function lineData(field:string,color:string){
    return{
      labels:histLabels,
      datasets:[{
        data:HIST.map(r=>{const v=r[field as keyof HistRecord];if(v===undefined||v==='')return null;const n=typeof v==='number'?v:parseFloat(String(v));return isNaN(n)?null:n;}),
        borderColor:color,backgroundColor:color+'18',tension:0.35,pointRadius:4,pointHoverRadius:6,
        pointBackgroundColor:color,fill:true,borderWidth:2,
      }],
    };
  }

  const radarData={
    labels:METRICS.map(m=>m.label),
    datasets:[{label:data.Name,data:METRICS.map(m=>scores[m.key]||0),backgroundColor:'rgba(56,189,248,0.12)',borderColor:'#38bdf8',borderWidth:2.5,pointBackgroundColor:'#38bdf8',pointRadius:4}],
  };

  const INFO_ITEMS=[
    {key:'height',  label:'Height',   icon:'bi-arrows-vertical',  color:'#38bdf8',val:latest?.Height  ?`${latest.Height} cm` :'—'},
    {key:'weight',  label:'Weight',   icon:'bi-bag-fill',          color:'#818cf8',val:latest?.Weight  ?`${latest.Weight} kg` :'—'},
    {key:'bmi',     label:'BMI',      icon:'bi-calculator-fill',   color:'#fb923c',val:bmi!=='—'?bmi:'—'},
    {key:'fat',     label:'Body Fat', icon:'bi-droplet-fill',      color:'#f472b6',val:latest?.Fat     ?`${latest.Fat} %`    :'—'},
    {key:'muscle',  label:'Muscle',   icon:'bi-lightning-fill',    color:'#4ade80',val:latest?.Muscle  ?`${latest.Muscle} %` :'—'},
    {key:'vo2max',    label:'VO₂ Max',    icon:'bi-heart-pulse-fill',  color:'#f87171',val:latest?.VO2Max    ?`${latest.VO2Max}`      :'—'},
    {key:'peakpower', label:'Peak Power', icon:'bi-lightning-charge-fill', color:'#fbbf24',val:latest?.PeakPower?`${latest.PeakPower} W`:'—'},
    {key:'domfoot', label:'Dom. Foot',icon:'bi-geo-fill',          color:'#a3e635',val:data.DomFoot||'—'},
    {key:'domhand', label:'Dom. Hand',icon:'bi-hand-index-fill',   color:'#facc15',val:data.DomHand||'—'},
    {key:'age',     label:'Age',      icon:'bi-calendar3',         color:'#c084fc',val:age!=null?`${age} yrs`:'—'},
    {key:'province',label:'Province', icon:'bi-geo-alt-fill',      color:'#38bdf8',val:data.Province||'—'},
  ];

  const latestIR=irHistory.length?irHistory[0]:null;

  return(
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:"'Prompt','Segoe UI',sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .pub-surface{background:white;border:1px solid #e2e8f0;border-radius:14px;padding:20px;margin-bottom:16px}
        .pub-hd{display:flex;align-items:center;gap:8px;font-weight:700;font-size:0.875rem;color:#334155;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f1f5f9}
        @media(max-width:600px){.pub-grid3{grid-template-columns:1fr!important}.pub-grid4{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {/* ── HERO ── */}
      <div style={{position:'relative',overflow:'hidden',background:'linear-gradient(135deg,#0c1628 0%,#0f2040 60%,#0c1628 100%)'}}>
        {data.PhotoUrl&&(
          <div style={{position:'absolute',inset:0,zIndex:0,overflow:'hidden'}}>
            <img src={data.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top',filter:'blur(28px) brightness(0.22) saturate(1.4)',transform:'scale(1.1)'}}/>
          </div>
        )}
        <div style={{position:'absolute',inset:0,zIndex:1,background:'radial-gradient(ellipse at 75% 50%,rgba(56,189,248,0.1) 0%,transparent 65%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:2,maxWidth:800,margin:'0 auto',padding:'32px 20px'}}>
          <div style={{fontSize:'0.58rem',fontWeight:700,letterSpacing:3,color:'#38bdf8',textTransform:'uppercase',marginBottom:20}}>ISP — ATHLETE PROFILE</div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:28,flexWrap:'wrap'}}>
            {/* Left */}
            <div style={{display:'flex',alignItems:'center',gap:24,flex:1,minWidth:240}}>
              <div style={{width:120,height:120,minWidth:120,borderRadius:20,border:'3px solid rgba(56,189,248,0.6)',background:'rgba(56,189,248,0.08)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,boxShadow:'0 8px 32px rgba(0,0,0,0.5)'}}>
                {data.PhotoUrl?<img src={data.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>
                  :<span style={{fontSize:'2.4rem',fontWeight:800,color:'#38bdf8',lineHeight:1}}>{initials}</span>}
              </div>
              <div>
                <div style={{fontSize:'1.75rem',fontWeight:800,color:'#ffffff',lineHeight:1.1,textTransform:'uppercase',letterSpacing:0.5}}>{data.Name}</div>
                {data.Nickname&&<div style={{fontSize:'0.875rem',color:'#7dd3fc',fontStyle:'italic',marginTop:4}}>"{data.Nickname}"</div>}
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:12}}>
                  {[{icon:'bi-people-fill',val:data.Team},{icon:'bi-person-badge',val:data.Position},{icon:'bi-building',val:data.Club},{icon:'bi-geo-alt-fill',val:data.Province}]
                    .filter(x=>x.val).map(x=>(
                    <span key={x.icon} style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'0.78rem',color:'rgba(255,255,255,0.85)',background:'rgba(255,255,255,0.1)',borderRadius:20,padding:'5px 12px',border:'1px solid rgba(255,255,255,0.1)'}}>
                      <i className={`bi ${x.icon}`} style={{color:'#38bdf8',fontSize:'0.75rem'}}/>{x.val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {/* Right */}
            <div style={{display:'flex',alignItems:'center',gap:20,flexShrink:0}}>
              <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
                <div style={{display:'flex',gap:10}}>
                  {[
                    {label:'TESTS',   val:String(HIST.length)},
                    {label:'AGE',     val:age!=null?`${age}`:'—'},
                    {label:'PHYS AGE',val:physicalAge!=null?`~${physicalAge}`:'—',hl:physicalAge!=null&&age!=null&&physicalAge>age},
                    {label:'TEAM',    val:data.Team||'—'},
                  ].map(s=>(
                    <div key={s.label} style={{textAlign:'center',background:(s as {hl?:boolean}).hl?'rgba(52,211,153,0.12)':'rgba(255,255,255,0.07)',border:`1px solid ${(s as {hl?:boolean}).hl?'rgba(52,211,153,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:10,padding:'10px 16px',minWidth:64}}>
                      <div style={{fontSize:'1.25rem',fontWeight:800,color:(s as {hl?:boolean}).hl?'#34d399':'white',lineHeight:1}}>{s.val}</div>
                      <div style={{fontSize:'0.58rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:1.5,marginTop:4}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {HIST.length>0&&<div style={{fontSize:'0.72rem',color:'#64748b'}}><i className="bi bi-clock me-1"/>Last test: {lastTest}</div>}
              </div>
              <div style={{textAlign:'center',borderRadius:16,padding:'18px 26px',background:grade.bg,border:`2px solid ${grade.border}`,boxShadow:`0 8px 24px ${grade.shadow}`}}>
                <div style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:2,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',marginBottom:4}}>RATING</div>
                <div style={{fontSize:'3rem',fontWeight:900,color:'white',lineHeight:1}}>{rating}</div>
                <div style={{fontSize:'0.78rem',fontWeight:700,color:'rgba(255,255,255,0.95)',marginTop:6}}>{grade.emoji} {grade.label}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:800,margin:'0 auto',padding:'20px 16px'}}>

        {/* ── STRENGTHS / WEAKNESSES ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}} className="pub-grid2">
          <div style={{background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1px solid #bbf7d0',borderRadius:14,padding:18}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:28,height:28,background:'#16a34a',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-star-fill" style={{color:'white',fontSize:'0.75rem'}}/>
              </div>
              <span style={{fontWeight:700,fontSize:'0.875rem',color:'#166534'}}>Strengths</span>
              <span style={{marginLeft:'auto',background:'#16a34a',color:'white',borderRadius:20,padding:'1px 8px',fontSize:'0.7rem',fontWeight:700}}>{strengths.length}</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {strengths.length===0?<span style={{color:'#6b7280',fontSize:'0.82rem'}}>ยังไม่มีจุดแข็งที่โดดเด่น</span>
                :strengths.map(m=>(
                <span key={m.key} style={{background:'#16a34a',color:'white',borderRadius:6,padding:'4px 10px',fontSize:'0.75rem',fontWeight:700}}>
                  <i className={`bi ${m.icon} me-1`}/>{m.label} {scores[m.key]}/5
                </span>
              ))}
            </div>
          </div>
          <div style={{background:'linear-gradient(135deg,#fff7ed,#ffedd5)',border:'1px solid #fed7aa',borderRadius:14,padding:18}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:28,height:28,background:'#ea580c',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-exclamation-triangle-fill" style={{color:'white',fontSize:'0.7rem'}}/>
              </div>
              <span style={{fontWeight:700,fontSize:'0.875rem',color:'#9a3412'}}>Needs Work</span>
              <span style={{marginLeft:'auto',background:'#ea580c',color:'white',borderRadius:20,padding:'1px 8px',fontSize:'0.7rem',fontWeight:700}}>{weaknesses.length}</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {weaknesses.length===0?<span style={{color:'#6b7280',fontSize:'0.82rem'}}>ไม่มีจุดอ่อนวิกฤต</span>
                :weaknesses.map(m=>(
                <span key={m.key} style={{background:'#ea580c',color:'white',borderRadius:6,padding:'4px 10px',fontSize:'0.75rem',fontWeight:700}}>
                  <i className={`bi ${m.icon} me-1`}/>{m.label} {scores[m.key]}/5
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── BADGES ── */}
        {earnedBadges.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16,padding:'12px 16px',background:'white',border:'1px solid #e2e8f0',borderRadius:12}}>
            <span style={{fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,alignSelf:'center',marginRight:4}}>Achievements</span>
            {earnedBadges.map(b=>(
              <span key={b.label} style={{display:'inline-flex',alignItems:'center',gap:5,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:20,padding:'5px 12px',fontSize:'0.78rem',fontWeight:600,color:'#334155'}}>
                <span style={{fontSize:'1rem'}}>{b.emoji}</span>{b.label}
              </span>
            ))}
          </div>
        )}

        {/* ── PHYSICAL INFO ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:16}}>
          {INFO_ITEMS.map(item=>{
            const isEmpty=item.val==='—';
            return(
              <div key={item.key} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:10,padding:'12px 10px',textAlign:'center',borderTop:`3px solid ${item.color}`}}>
                <div style={{width:32,height:32,background:item.color+'18',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                  <i className={`bi ${item.icon}`} style={{color:item.color,fontSize:'0.95rem'}}/>
                </div>
                <div style={{fontSize:'0.65rem',color:'#94a3b8',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{item.label}</div>
                <div style={{fontSize:'0.95rem',fontWeight:800,color:isEmpty?'#cbd5e1':'#0f172a'}}>{item.val}</div>
              </div>
            );
          })}
        </div>

        {/* ── PHYSICAL AGE ── */}
        {physicalAge!==null&&age!==null&&(
          <div style={{marginBottom:16,background:physicalAge>age?'linear-gradient(135deg,#f0fdf4,#dcfce7)':physicalAge<age?'linear-gradient(135deg,#fff7ed,#ffedd5)':'linear-gradient(135deg,#eff6ff,#dbeafe)',border:`1px solid ${physicalAge>age?'#bbf7d0':physicalAge<age?'#fed7aa':'#bfdbfe'}`,borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:44,height:44,borderRadius:12,background:physicalAge>age?'#16a34a':physicalAge<age?'#ea580c':'#2563eb',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="bi bi-person-fill" style={{color:'white',fontSize:'1.2rem'}}/>
              </div>
              <div>
                <div style={{fontSize:'0.65rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#64748b'}}>Physical Age</div>
                <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
                  <span style={{fontSize:'2rem',fontWeight:900,color:physicalAge>age?'#16a34a':physicalAge<age?'#ea580c':'#2563eb',lineHeight:1}}>~{physicalAge}</span>
                  <span style={{fontSize:'0.85rem',color:'#64748b'}}>ปี</span>
                </div>
              </div>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <div style={{fontWeight:700,fontSize:'0.9rem',color:'#0f172a',marginBottom:4}}>
                {physicalAge>age?`🚀 ร่างกายเทียบเท่าคนอายุ ${physicalAge} ปี — เกินกว่าอายุจริง ${physicalAge-age} ปี`
                  :physicalAge<age?`⚠️ ร่างกายเทียบเท่าคนอายุ ${physicalAge} ปี — ต่ำกว่าอายุจริง ${age-physicalAge} ปี`
                  :`✓ ร่างกายสมกับอายุ ${age} ปี — พัฒนาการปกติ`}
              </div>
              <div style={{fontSize:'0.78rem',color:'#64748b'}}>อายุจริง {age} ปี · คำนวณจากคะแนนสมรรถภาพ {Object.values(scores).filter(s=>s>0).length} รายการ</div>
            </div>
          </div>
        )}

        {/* ── PERFORMANCE METRICS + RADAR ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:16,marginBottom:16,alignItems:'start'}}>
          <div className="pub-surface" style={{margin:0}}>
            <div className="pub-hd"><i className="bi bi-bar-chart-fill" style={{color:'#38bdf8'}}/> Performance Metrics</div>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{borderBottom:'2px solid #f1f5f9'}}>
                  <th style={{textAlign:'left',padding:'8px 10px',fontSize:'0.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>Metric</th>
                  <th style={{textAlign:'center',padding:'8px 10px',fontSize:'0.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>Value</th>
                  <th style={{textAlign:'center',padding:'8px 10px',fontSize:'0.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>Score</th>
                  <th style={{width:100,padding:'8px 10px',fontSize:'0.72rem',color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>Bar</th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map(m=>{
                  const rawVal=latest?.[m.field];
                  const strVal=rawVal!==undefined&&rawVal!==''?String(rawVal):'';
                  const display=strVal?`${strVal} ${m.unit}`:'—';
                  const sc=scores[m.key];
                  const col=sc>0?SCORE_COLORS[sc]:null;
                  const rowBg=sc>=4?'rgba(16,185,129,0.04)':sc>0&&sc<=2?'rgba(239,68,68,0.04)':'transparent';
                  return(
                    <tr key={m.key} style={{background:rowBg,borderBottom:'1px solid #f8fafc'}}>
                      <td style={{padding:'9px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <div style={{width:26,height:26,background:m.color+'18',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <i className={`bi ${m.icon}`} style={{color:m.color,fontSize:'0.8rem'}}/>
                          </div>
                          <span style={{fontWeight:600,fontSize:'0.875rem'}}>{m.label}</span>
                        </div>
                      </td>
                      <td style={{textAlign:'center',fontWeight:700,fontSize:'0.875rem',padding:'9px 10px'}}>{display}</td>
                      <td style={{textAlign:'center',padding:'9px 10px'}}>
                        {col?<span style={{background:col.bg,color:col.color,borderRadius:20,padding:'3px 10px',fontSize:'0.75rem',fontWeight:700,whiteSpace:'nowrap'}}>{sc}/5 · {col.label}</span>
                          :<span style={{color:'#cbd5e1',fontSize:'0.8rem'}}>—</span>}
                      </td>
                      <td style={{padding:'9px 10px'}}>
                        <div style={{background:'#f1f5f9',borderRadius:20,height:8,overflow:'hidden'}}>
                          <div style={{height:'100%',width:sc>0?`${(sc/5)*100}%`:'0%',background:col?`linear-gradient(90deg,${col.color},${col.color}99)`:'#e2e8f0',borderRadius:20,transition:'width 0.6s ease'}}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pub-surface" style={{margin:0,minWidth:260,display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div className="pub-hd" style={{width:'100%'}}><i className="bi bi-broadcast" style={{color:'#38bdf8'}}/> Skill Radar</div>
            <div style={{width:'100%',maxWidth:280}}>
              <Radar data={radarData} options={RADAR_OPTS}/>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8,justifyContent:'center'}}>
              {METRICS.map(m=>(
                <div key={m.key} style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.7rem',color:'#64748b'}}>
                  <div style={{width:8,height:8,borderRadius:2,background:scores[m.key]>=4?'#10b981':scores[m.key]>0&&scores[m.key]<=2?'#ef4444':'#94a3b8'}}/>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── DEVELOPMENT PLAN ── */}
        {METRICS.some(m=>scores[m.key]>0)&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-graph-up-arrow" style={{color:'#818cf8'}}/> Development Plan</div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                <thead>
                  <tr style={{borderBottom:'2px solid #f1f5f9'}}>
                    <th style={{textAlign:'left',padding:'8px 10px',color:'#94a3b8',fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase',width:140}}>ทักษะ</th>
                    <th style={{textAlign:'center',padding:'8px 10px',color:'#94a3b8',fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase',width:80}}>คะแนน</th>
                    <th style={{padding:'8px 10px',color:'#94a3b8',fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase'}}>ผลกระทบ</th>
                    <th style={{padding:'8px 10px',color:'#94a3b8',fontWeight:700,fontSize:'0.72rem',textTransform:'uppercase'}}>โปรแกรมแนะนำ</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.filter(m=>scores[m.key]>0).sort((a,b)=>scores[a.key]-scores[b.key]).map((m,i)=>{
                    const sc=scores[m.key];
                    const dev=DEV_DATA[m.key];
                    const col=SCORE_COLORS[sc];
                    const isWeak=sc<=2;
                    return(
                      <tr key={m.key} style={{background:i%2===0?'white':'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'9px 10px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <i className={`bi ${m.icon}`} style={{color:m.color,fontSize:'0.9rem'}}/>
                            <span style={{fontWeight:600}}>{dev?.label||m.label}</span>
                          </div>
                        </td>
                        <td style={{textAlign:'center',padding:'9px 10px'}}>
                          <span style={{background:col.bg,color:col.color,borderRadius:20,padding:'3px 12px',fontWeight:700,fontSize:'0.75rem'}}>{sc}/5</span>
                        </td>
                        <td style={{color:isWeak?'#dc2626':'#166534',fontSize:'0.8rem',padding:'9px 10px',maxWidth:200}}>
                          {isWeak?dev?.badImpact:dev?.goodImpact}
                        </td>
                        <td style={{padding:'9px 10px'}}>
                          <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                            {(isWeak?dev?.badRec:dev?.goodRec)?.map((r,ri)=>(
                              <span key={ri} style={{background:isWeak?'#fef2f2':'#f0fdf4',color:isWeak?'#991b1b':'#166534',border:`1px solid ${isWeak?'#fecaca':'#bbf7d0'}`,borderRadius:4,padding:'2px 8px',fontSize:'0.72rem'}}>{r}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── HISTORY CHARTS ── */}
        {HIST.length>=2&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-graph-up" style={{color:'#34d399'}}/> Historical Progress <span style={{fontSize:'0.75rem',fontWeight:400,color:'#94a3b8',marginLeft:8}}>{HIST.length} sessions</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}} className="pub-grid3">
              {HISTORY_FIELDS.map(hc=>{
                const chartVals=HIST.map(r=>{const v=r[hc.field as keyof HistRecord];if(v===undefined||v==='')return null;const n=typeof v==='number'?v:parseFloat(String(v));return isNaN(n)?null:n;});
                const trend=getTrend(chartVals);
                return(
                  <div key={hc.field} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:12,padding:'14px 14px 10px',borderTop:`3px solid ${hc.color}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                      <span style={{fontSize:'0.75rem',fontWeight:700,color:'#334155'}}>{hc.label}</span>
                      {trend&&<span style={{fontSize:'0.68rem',fontWeight:700,color:trend.up?'#16a34a':'#dc2626',background:trend.up?'#f0fdf4':'#fef2f2',borderRadius:4,padding:'2px 6px'}}>{trend.up?'▲':'▼'} {trend.pct}%</span>}
                    </div>
                    <Line data={lineData(hc.field,hc.color)} options={LINE_OPTS}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SKILL ASSESSMENT ── */}
        {data.LatestSkill&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-star-fill" style={{color:'#f59e0b'}}/> ทักษะฟุตบอล <span style={{fontSize:'0.7rem',fontWeight:400,color:'#94a3b8',marginLeft:6}}>Skill Assessment · {data.LatestSkill.season||''}</span></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
              {[
                {label:'🎯 ควบคุมบอล',       val:data.LatestSkill.skBallControl,  color:'#38bdf8'},
                {label:'👆 รับบอลครั้งแรก', val:data.LatestSkill.skFirstTouch,   color:'#34d399'},
                {label:'🔄 เลี้ยงบอล',       val:data.LatestSkill.skDribbling,    color:'#f59e0b'},
                {label:'⚽ ยิงประตู',         val:data.LatestSkill.skShooting,     color:'#f87171'},
                {label:'🦶 เท้าอ่อน',         val:data.LatestSkill.skWeakFoot,     color:'#a78bfa'},
                {label:'📍 ยืนตำแหน่ง',      val:data.LatestSkill.skPositioning,  color:'#818cf8'},
                {label:'🧠 ตัดสินใจ',         val:data.LatestSkill.skDecision,     color:'#fb923c'},
                {label:'👁 มองสนาม',          val:data.LatestSkill.skScanning,     color:'#4ade80'},
              ].filter(x=>x.val>0).map(x=>(
                <div key={x.label} style={{background:'white',border:'1px solid #f1f5f9',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontWeight:600,fontSize:'0.82rem',color:'#334155'}}>{x.label}</span>
                    <span style={{fontWeight:900,fontSize:'0.95rem',color:x.color}}>{x.val}/5</span>
                  </div>
                  <div style={{display:'flex',gap:3}}>{[1,2,3,4,5].map(n=><div key={n} style={{flex:1,height:6,borderRadius:10,background:x.val>=n?x.color:'#e2e8f0'}}/>)}</div>
                </div>
              ))}
            </div>
            {data.LatestSkill.assessedBy&&<div style={{fontSize:'0.7rem',color:'#94a3b8',marginTop:10}}>ประเมินโดย: {data.LatestSkill.assessedBy}</div>}
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {data.AttendStats&&data.AttendStats.total>0&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-calendar-check-fill" style={{color:'#10b981'}}/> สถิติการเข้าซ้อม</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10}}>
              {[
                {label:'เซสชันทั้งหมด',val:String(data.AttendStats.total),    color:'#334155',bg:'#f8fafc'},
                {label:'มาซ้อม',        val:String(data.AttendStats.present),  color:'#16a34a',bg:'#f0fdf4'},
                {label:'สาย',           val:String(data.AttendStats.late),     color:'#d97706',bg:'#fffbeb'},
                {label:'ขาด',           val:String(data.AttendStats.absent),   color:'#dc2626',bg:'#fef2f2'},
                {label:'อัตราเข้าซ้อม', val:`${data.AttendStats.rate}%`,       color:'#7c3aed',bg:'#faf5ff'},
              ].map(x=>(
                <div key={x.label} style={{background:x.bg,border:`1px solid ${x.color}20`,borderRadius:10,padding:'10px 12px',textAlign:'center'}}>
                  <div style={{fontSize:'1.5rem',fontWeight:900,color:x.color,lineHeight:1}}>{x.val}</div>
                  <div style={{fontSize:'0.68rem',color:'#64748b',fontWeight:600,marginTop:4}}>{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WELLNESS & TRAINING LOAD ── */}
        {(data.WellnessSummary||data.RpeSummary)&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-heart-pulse-fill" style={{color:'#f472b6'}}/> สุขภาพและภาระการฝึก</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
              {data.WellnessSummary&&(
                <div style={{background:'#fff0fb',border:'1px solid #fbcfe8',borderRadius:12,padding:14}}>
                  <div style={{fontWeight:700,fontSize:'0.85rem',color:'#9d174d',marginBottom:10}}>💆 Wellness ({data.WellnessSummary.count} ครั้ง)</div>
                  {[
                    {label:'ความเป็นอยู่โดยรวม',val:data.WellnessSummary.avgWellness,color:'#ec4899'},
                    {label:'ความเหนื่อยล้า',     val:data.WellnessSummary.avgFatigue, color:'#f97316'},
                    {label:'คุณภาพการนอน',       val:data.WellnessSummary.avgSleep,   color:'#8b5cf6'},
                    {label:'อารมณ์',              val:data.WellnessSummary.avgMood,    color:'#06b6d4'},
                  ].map(x=>(
                    <div key={x.label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span style={{flex:1,fontSize:'0.75rem',color:'#475569'}}>{x.label}</span>
                      <div style={{flex:2,background:'#f1f5f9',borderRadius:20,height:6,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${x.val*10}%`,background:x.color,borderRadius:20}}/>
                      </div>
                      <span style={{fontSize:'0.75rem',fontWeight:700,color:x.color,minWidth:30,textAlign:'right'}}>{x.val}/10</span>
                    </div>
                  ))}
                </div>
              )}
              {data.RpeSummary&&(
                <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:14}}>
                  <div style={{fontWeight:700,fontSize:'0.85rem',color:'#166534',marginBottom:10}}>💪 ภาระการฝึก ({data.RpeSummary.count} เซสชัน)</div>
                  {[
                    {label:'RPE เฉลี่ย',    val:String(data.RpeSummary.avgRpe),           sub:'/ 10', color:'#16a34a'},
                    {label:'Load เฉลี่ย',   val:String(data.RpeSummary.avgLoad),          sub:'AU',   color:'#2563eb'},
                    {label:'Total Load',   val:String(data.RpeSummary.totalLoad),         sub:'AU',   color:'#7c3aed'},
                  ].map(x=>(
                    <div key={x.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,padding:'6px 10px',background:'white',borderRadius:8}}>
                      <span style={{fontSize:'0.78rem',color:'#334155'}}>{x.label}</span>
                      <span style={{fontWeight:800,color:x.color,fontSize:'0.9rem'}}>{x.val} <span style={{fontSize:'0.65rem',fontWeight:500,color:'#94a3b8'}}>{x.sub}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MATCH PERFORMANCE ── */}
        {data.MatchStats&&data.MatchStats.apps>0&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-trophy-fill" style={{color:'#f59e0b'}}/> ผลงานในการแข่งขัน</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8,marginBottom:14}}>
              {[
                {label:'นัดที่ลงเล่น',    val:String(data.MatchStats.apps),          color:'#334155'},
                {label:'นาทีที่ลงเล่น',  val:String(data.MatchStats.totalMins),      color:'#2563eb'},
                {label:'ประตู',           val:String(data.MatchStats.goals),          color:'#16a34a'},
                {label:'แอสซิสต์',        val:String(data.MatchStats.assists),        color:'#0891b2'},
                {label:'ใบเหลือง',        val:String(data.MatchStats.yellowCards),    color:'#d97706'},
                {label:'เรตติ้งเฉลี่ย',   val:String(data.MatchStats.avgRating)||'—', color:'#7c3aed'},
              ].map(x=>(
                <div key={x.label} style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:'1.4rem',fontWeight:900,color:x.color,lineHeight:1}}>{x.val}</div>
                  <div style={{fontSize:'0.62rem',color:'#64748b',marginTop:3}}>{x.label}</div>
                </div>
              ))}
            </div>
            {data.MatchStats.recent.length>0&&(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                  <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                    {['วันที่','คู่แข่ง','ประเภท','ผล','นาที','ประตู','แอสซิสต์','เรตติ้ง'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#64748b',fontSize:'0.65rem',textTransform:'uppercase'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.MatchStats.recent.map((m,i)=>(
                      <tr key={i} style={{background:i%2===0?'white':'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'6px 8px',textAlign:'center'}}>{m.matchDate?new Date(m.matchDate).toLocaleDateString('th-TH',{day:'numeric',month:'short'}):'-'}</td>
                        <td style={{padding:'6px 8px',fontWeight:600}}>{m.opponent||'-'}</td>
                        <td style={{padding:'6px 8px',textAlign:'center',color:'#64748b'}}>{m.matchType||'-'}</td>
                        <td style={{padding:'6px 8px',textAlign:'center'}}><span style={{fontWeight:700,color:m.result==='ชนะ'||m.result==='W'?'#16a34a':m.result==='แพ้'||m.result==='L'?'#dc2626':'#d97706'}}>{m.result||'-'}</span></td>
                        <td style={{padding:'6px 8px',textAlign:'center'}}>{m.minutesPlayed||0}&apos;</td>
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#16a34a'}}>{m.goals||0}</td>
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#2563eb'}}>{m.assists||0}</td>
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#7c3aed'}}>{m.rating||'-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TEST HISTORY TABLE ── */}
        {HIST.length>0&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-table" style={{color:'#f59e0b'}}/> ประวัติการทดสอบทั้งหมด <span style={{fontSize:'0.72rem',fontWeight:400,color:'#94a3b8',marginLeft:6}}>{HIST.length} ครั้ง</span></div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.75rem'}}>
                <thead>
                  <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                    <th style={{padding:'8px 10px',textAlign:'left',fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>วันที่</th>
                    <th style={{padding:'8px 6px',textAlign:'center',fontWeight:700,color:'#38bdf8'}}>Rating</th>
                    {METRICS.map(m=><th key={m.key} style={{padding:'8px 6px',textAlign:'center',fontWeight:700,color:m.color,whiteSpace:'nowrap'}}>{m.label}</th>)}
                    <th style={{padding:'8px 6px',textAlign:'center',fontWeight:700,color:'#94a3b8'}}>Ht</th>
                    <th style={{padding:'8px 6px',textAlign:'center',fontWeight:700,color:'#94a3b8'}}>Wt</th>
                    <th style={{padding:'8px 6px',textAlign:'center',fontWeight:700,color:'#fbbf24'}}>Power</th>
                  </tr>
                </thead>
                <tbody>
                  {[...HIST].reverse().map((r,i)=>{
                    const rowScores=METRICS.reduce<Record<string,number>>((acc,m)=>{acc[m.key]=r[m.field as keyof HistRecord]?getScorePoint(m.key,String(r[m.field as keyof HistRecord]),dob,athletePos):0;return acc;},{});
                    return(
                      <tr key={i} style={{background:i%2===0?'white':'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'7px 10px',fontWeight:600,whiteSpace:'nowrap',color:'#334155'}}>{r.Timestamp?String(r.Timestamp).split('T')[0]:'—'}</td>
                        <td style={{padding:'7px 6px',textAlign:'center'}}>
                          <span style={{fontWeight:800,color:Number(r.Rating)>=70?'#16a34a':Number(r.Rating)>=50?'#2563eb':Number(r.Rating)>=30?'#d97706':'#dc2626'}}>{r.Rating||'—'}</span>
                        </td>
                        {METRICS.map(m=>{
                          const val=r[m.field as keyof HistRecord];
                          const sc=rowScores[m.key];
                          const col=sc>0?SCORE_COLORS[sc]:null;
                          return(
                            <td key={m.key} style={{padding:'7px 6px',textAlign:'center'}}>
                              {val?(
                                <div>
                                  <div style={{fontWeight:700,color:'#0f172a'}}>{String(val)}</div>
                                  {col&&<div style={{fontSize:'0.6rem',fontWeight:700,color:col.color}}>{sc}/5</div>}
                                </div>
                              ):<span style={{color:'#cbd5e1'}}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{padding:'7px 6px',textAlign:'center',color:'#64748b'}}>{r.Height||'—'}</td>
                        <td style={{padding:'7px 6px',textAlign:'center',color:'#64748b'}}>{r.Weight||'—'}</td>
                        <td style={{padding:'7px 6px',textAlign:'center',color:'#d97706',fontWeight:600}}>{r.PeakPower||'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── INDIVIDUAL REPORT ── */}
        {irHistory.length>0&&latestIR&&(()=>{
          const overall=Number(latestIR.OverallIRScore)||0;
          const og=irGrade(overall);
          const fmtTs=(ts:string)=>{try{return new Date(ts).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'});}catch{return ts.split('T')[0];}};
          return(
            <div className="pub-surface">
              <div className="pub-hd">
                <i className="bi bi-clipboard2-check-fill" style={{color:'#818cf8'}}/>
                รายงานพัฒนาการรายบุคคล <span style={{fontSize:'0.7rem',color:'#94a3b8',fontWeight:400,marginLeft:6}}>Individual Development Plan</span>
                <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'#94a3b8'}}>{irHistory.length} ครั้ง</span>
              </div>
              {/* Session info */}
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16,padding:'10px 14px',background:'#f8fafc',borderRadius:10,fontSize:'0.8rem',color:'#475569',alignItems:'center'}}>
                {latestIR.Season&&<span style={{fontWeight:700,color:'#334155'}}><i className="bi bi-calendar3 me-1"/>{String(latestIR.Season)}</span>}
                {latestIR.Period&&<span><i className="bi bi-clock me-1"/>{String(latestIR.Period)}</span>}
                {latestIR.Coach&&<span><i className="bi bi-person-fill me-1"/>โค้ช: {String(latestIR.Coach)}</span>}
                {latestIR.Timestamp&&<span style={{marginLeft:'auto',color:'#94a3b8',fontSize:'0.72rem'}}>📅 {fmtTs(String(latestIR.Timestamp))}</span>}
              </div>

              {/* Overall banner */}
              <div style={{background:og.bg,border:`2px solid ${og.border}`,borderRadius:14,padding:'14px 18px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
                <div style={{fontSize:'2.4rem',lineHeight:1}}>{og.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'1rem',fontWeight:800,color:og.color}}>{data.Name?.split(' ')[0]||'นักกีฬา'} อยู่ในระดับ &ldquo;{og.label}&rdquo;</div>
                  <div style={{fontSize:'0.78rem',color:'#475569',marginTop:3}}>คะแนนรวมทุกด้าน {overall}% · {irHistory.length} ครั้งที่ประเมิน</div>
                </div>
                <div style={{textAlign:'center',background:'white',borderRadius:10,padding:'8px 12px',border:`1px solid ${og.border}`}}>
                  <div style={{fontSize:'1.6rem',fontWeight:900,color:og.color,lineHeight:1}}>{overall}</div>
                  <div style={{fontSize:'0.58rem',color:'#94a3b8',fontWeight:700}}>/ 100</div>
                </div>
              </div>

              {/* 3 area cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}} className="pub-grid3">
                {[
                  {key:'b',label:'🧠 พฤติกรรม',desc:'วินัย ความพยายาม ทัศนคติ',pct:Number(latestIR.BehaviourScore)||0,color:'#818cf8'},
                  {key:'l',label:'🌿 วิถีชีวิต', desc:'การนอน อาหาร สุขภาพ',     pct:Number(latestIR.LifestyleScore)||0, color:'#34d399'},
                  {key:'t',label:'⚽ ทักษะ',    desc:'เทคนิค กลยุทธ์ สมรรถภาพ', pct:Number(latestIR.TechnicalScore)||0,color:'#f472b6'},
                ].map(c=>{
                  const g=irGrade(c.pct);
                  return(
                    <div key={c.key} style={{background:'white',border:`2px solid ${g.border}`,borderRadius:12,padding:'12px',textAlign:'center'}}>
                      <div style={{fontSize:'1.5rem',marginBottom:3}}>{g.emoji}</div>
                      <div style={{fontWeight:800,fontSize:'0.85rem',color:'#0f172a',marginBottom:2}}>{c.label}</div>
                      <div style={{fontSize:'0.62rem',color:'#94a3b8',marginBottom:6}}>{c.desc}</div>
                      <div style={{fontSize:'1.4rem',fontWeight:900,color:g.color,lineHeight:1}}>{c.pct}%</div>
                      <div style={{fontSize:'0.75rem',fontWeight:700,color:g.color,marginTop:2}}>{g.label}</div>
                      <div style={{marginTop:6,background:'#f1f5f9',borderRadius:20,height:5,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${c.pct}%`,background:c.color,borderRadius:20}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3 sections detail */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}} className="pub-grid3">
                {IR_SECTIONS.map(sec=>{
                  const secDesc:Record<string,string>={behaviour:'ด้านจิตใจ วินัย และการอยู่ร่วมกับผู้อื่น',lifestyle:'พฤติกรรมดูแลตัวเองนอกสนาม',technical:'ความสามารถในการเล่นฟุตบอล'};
                  return(
                    <div key={sec.key} style={{background:'#f8fafc',border:`1px solid ${sec.color}40`,borderRadius:12,padding:12,borderTop:`3px solid ${sec.color}`}}>
                      <div style={{marginBottom:10,paddingBottom:8,borderBottom:'1px solid #f1f5f9'}}>
                        <div style={{fontWeight:800,fontSize:'0.85rem',color:'#0f172a'}}><i className={`bi ${sec.icon} me-2`} style={{color:sec.color}}/>{sec.labelTH}</div>
                        <div style={{fontSize:'0.62rem',color:'#94a3b8',marginTop:2}}>{secDesc[sec.key]||''}</div>
                      </div>
                      {sec.items.map(item=>{
                        const val=Number(latestIR[item.field])||0;
                        const ig=irItemGrade(val);
                        return(
                          <div key={String(item.field)} style={{marginBottom:7,padding:'7px 9px',borderRadius:8,background:val>0?'white':'transparent',border:'1px solid #f1f5f9'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:val>0?4:0}}>
                              <span style={{fontWeight:600,fontSize:'0.78rem',color:'#334155'}}>{item.labelTH}</span>
                              <div style={{display:'flex',alignItems:'center',gap:3}}>
                                <span style={{fontSize:'0.9rem'}}>{ig.emoji}</span>
                                <span style={{fontSize:'0.68rem',fontWeight:700,color:ig.color}}>{val>0?ig.label:'—'}</span>
                              </div>
                            </div>
                            {val>0&&<div style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(n=><div key={n} style={{flex:1,height:4,borderRadius:10,background:val>=n?irScoreColor(val):'#e2e8f0'}}/>)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {/* Overall comments */}
              {(latestIR.GoodLevel||latestIR.ToImprove||latestIR.Comments)&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12,marginBottom:12}}>
                  {latestIR.GoodLevel&&(
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:14}}>
                      <div style={{fontSize:'0.68rem',fontWeight:700,color:'#16a34a',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}><i className="bi bi-check-circle-fill me-1"/>สิ่งที่ดี</div>
                      <p style={{margin:0,fontSize:'0.82rem',color:'#166534'}}>{String(latestIR.GoodLevel)}</p>
                    </div>
                  )}
                  {latestIR.ToImprove&&(
                    <div style={{background:'#fef3c7',border:'1px solid #fde68a',borderRadius:10,padding:14}}>
                      <div style={{fontSize:'0.68rem',fontWeight:700,color:'#b45309',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}><i className="bi bi-arrow-up-circle-fill me-1"/>สิ่งที่ต้องพัฒนา</div>
                      <p style={{margin:0,fontSize:'0.82rem',color:'#92400e'}}>{String(latestIR.ToImprove)}</p>
                    </div>
                  )}
                  {latestIR.Comments&&(
                    <div style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:10,padding:14}}>
                      <div style={{fontSize:'0.68rem',fontWeight:700,color:'#1d4ed8',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}><i className="bi bi-chat-text-fill me-1"/>หมายเหตุโค้ช</div>
                      <p style={{margin:0,fontSize:'0.82rem',color:'#1e40af'}}>{String(latestIR.Comments)}</p>
                    </div>
                  )}
                </div>
              )}
              {/* Section-specific comments */}
              {(latestIR.BehaviourComment||latestIR.LifestyleComment||latestIR.TechnicalComment)&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10,marginBottom:12}}>
                  {[
                    {key:'BehaviourComment',label:'💬 พฤติกรรม',    bg:'#faf5ff',border:'#c4b5fd',color:'#6d28d9'},
                    {key:'LifestyleComment', label:'💬 วิถีชีวิต',   bg:'#f0fdf4',border:'#6ee7b7',color:'#065f46'},
                    {key:'TechnicalComment', label:'💬 เทคนิค',      bg:'#f0f9ff',border:'#7dd3fc',color:'#0369a1'},
                  ].filter(x=>latestIR[x.key]).map(x=>(
                    <div key={x.key} style={{background:x.bg,border:`1px solid ${x.border}`,borderRadius:10,padding:12}}>
                      <div style={{fontSize:'0.68rem',fontWeight:700,color:x.color,marginBottom:5}}>{x.label}</div>
                      <p style={{margin:0,fontSize:'0.8rem',color:x.color,whiteSpace:'pre-wrap'}}>{String(latestIR[x.key])}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* IDP Goals */}
              {(latestIR.IdpGoalShort||latestIR.IdpGoalLong||latestIR.IdpAction||latestIR.IdpDream)&&(
                <div style={{background:'#0f172a',borderRadius:12,padding:16,marginBottom:12}}>
                  <div style={{fontSize:'0.72rem',fontWeight:700,color:'#38bdf8',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}><i className="bi bi-bullseye me-2"/>เป้าหมายพัฒนาการ (IDP Goals)</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                    {[
                      {label:'เป้าหมายระยะสั้น', val:latestIR.IdpGoalShort, color:'#38bdf8'},
                      {label:'เป้าหมายระยะยาว', val:latestIR.IdpGoalLong,  color:'#818cf8'},
                      {label:'แผนปฏิบัติ',       val:latestIR.IdpAction,    color:'#34d399'},
                      {label:'ความฝัน',           val:latestIR.IdpDream,     color:'#f472b6'},
                    ].filter(x=>x.val).map(x=>(
                      <div key={x.label} style={{background:'rgba(255,255,255,0.05)',borderRadius:8,padding:12,border:`1px solid ${x.color}30`}}>
                        <div style={{fontSize:'0.62rem',fontWeight:700,color:x.color,marginBottom:5,textTransform:'uppercase'}}>{x.label}</div>
                        <p style={{margin:0,fontSize:'0.82rem',color:'rgba(255,255,255,0.85)',lineHeight:1.5}}>{String(x.val)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Overall badge */}
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'#0f172a',borderRadius:10}}>
                <div style={{fontSize:'2rem',fontWeight:900,color:'white',lineHeight:1}}>{overall}%</div>
                <div>
                  <div style={{fontSize:'0.75rem',fontWeight:700,color:og.color}}>{og.label}</div>
                  <div style={{fontSize:'0.68rem',color:'#64748b'}}>Overall Individual Report Score</div>
                </div>
                <div style={{marginLeft:'auto',flex:1,background:'rgba(255,255,255,0.08)',borderRadius:20,height:8,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${overall}%`,background:'linear-gradient(90deg,#38bdf8,#818cf8)',borderRadius:20}}/>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TRAINING VIDEOS ── */}
        {weaknesses.length>0&&(
          <div className="pub-surface">
            <div className="pub-hd"><i className="bi bi-youtube" style={{color:'#ef4444'}}/> Recommended Training Videos</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
              {weaknesses.map(m=>{
                const vid=VIDEO_DB.find(v=>v.category===m.key);
                if(!vid)return null;
                return(
                  <div key={m.key} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:12,overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                    <div style={{position:'relative',paddingBottom:'56.25%',height:0,overflow:'hidden'}}>
                      <iframe src={`https://www.youtube.com/embed/${vid.id}`} title={vid.title} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',border:'none'}} allowFullScreen/>
                    </div>
                    <div style={{padding:'12px 14px'}}>
                      <div style={{display:'inline-flex',alignItems:'center',gap:5,background:m.color+'18',borderRadius:6,padding:'3px 8px',marginBottom:8}}>
                        <i className={`bi ${m.icon}`} style={{color:m.color,fontSize:'0.75rem'}}/>
                        <span style={{fontSize:'0.7rem',fontWeight:700,color:m.color}}>{m.label}</span>
                      </div>
                      <div style={{fontWeight:700,fontSize:'0.85rem',color:'#0f172a',lineHeight:1.3}}>{vid.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:'center',padding:'16px 0',borderTop:'1px solid #e2e8f0',fontSize:'0.72rem',color:'#94a3b8',marginTop:8}}>
          <i className="bi bi-shield-check me-2"/>Powered by <strong style={{color:'#38bdf8'}}>ISP Improve Sports Performance</strong>
        </div>
      </div>
    </div>
  );
}
