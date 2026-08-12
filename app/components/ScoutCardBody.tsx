'use client';

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { getScorePoint } from '@/lib/score';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ── ISP SCOUT CARD ──────────────────────────────────────────────────────────
   Football-Manager-style player card: roles pitch + attribute columns + radar
   + coach report + season tiles, across 4 tabs. Shared body — used standalone
   at /athlete/[playerId]/card and embedded in-app via the "Scout Card" menu.
   Same data source as the full report (/api/public/athlete/[playerId]). */

const PHYSICAL_ITEMS = [
  { key:'speed30',  field:'Speed30',  label:'Acceleration' },
  { key:'agility',  field:'Agility',  label:'Agility' },
  { key:'cmj',      field:'CMJ',      label:'Jumping Reach' },
  { key:'longjump', field:'LongJump', label:'Balance' },
  { key:'yoyo',     field:'YoYo',     label:'Stamina' },
  { key:'situp',    field:'Situp',    label:'Strength' },
  { key:'pushup',   field:'Pushup',   label:'Natural Fitness' },
  { key:'sitreach', field:'SitAndReach', label:'Flexibility' },
] as const;

const MENTAL_ITEMS = [
  { field:'B_Effort',        label:'Determination' },
  { field:'B_Teamwork',      label:'Teamwork' },
  { field:'B_Respect',       label:'Sportsmanship' },
  { field:'B_OnTime',        label:'Professionalism' },
  { field:'B_Attendance',    label:'Work Rate' },
  { field:'B_Participation', label:'Team Spirit' },
  { field:'B_Improvement',   label:'Ambition' },
  { field:'L_Sleep',         label:'Discipline (Sleep)' },
  { field:'L_Hydration',     label:'Discipline (Hydration)' },
  { field:'L_Diet',          label:'Discipline (Diet)' },
] as const;

const SKILL_ITEMS = [
  { field:'skBallControl', label:'Ball Control' },
  { field:'skFirstTouch',  label:'First Touch' },
  { field:'skReceiving',   label:'Receiving' },
  { field:'skDribbling',   label:'Dribbling' },
  { field:'skWeakFoot',    label:'Weak Foot' },
  { field:'skShooting',    label:'Finishing' },
  { field:'skLongPass',    label:'Long Passing' },
  { field:'skPositioning', label:'Positioning' },
  { field:'skDecision',    label:'Decisions' },
  { field:'skScanning',    label:'Vision' },
  { field:'skPressure',    label:'Composure' },
  { field:'skHeading',     label:'Heading' },
] as const;

const IR_TECH_FALLBACK = [
  { field:'T_Technical',  label:'Technique' },
  { field:'T_Tactic',     label:'Tactical IQ' },
  { field:'T_OffFundam',  label:'Attacking Fundamentals' },
  { field:'T_DefFundam',  label:'Defensive Fundamentals' },
  { field:'T_Motricity',  label:'Movement' },
  { field:'T_Fitness',    label:'Fitness' },
] as const;

const TABS = ['Panoramica','Dati personali','Prestazioni','Carriera'] as const;
type Tab = typeof TABS[number];

const BADGES = [
  {emoji:'🎯',label:'First Test',   check:(h:number)=>h>=1},
  {emoji:'📅',label:'Veteran (5+)', check:(h:number)=>h>=5},
  {emoji:'🏆',label:'Elite',        check:(_h:number,r:number)=>r>=80},
  {emoji:'💪',label:'All-Rounder',  check:(_h:number,_r:number,sc:Record<string,number>)=>{const v=Object.values(sc).filter(s=>s>0);return v.length>=6&&v.every(s=>s>=3);}},
  {emoji:'⚡',label:'Speed Demon',  check:(_h:number,_r:number,sc:Record<string,number>)=>sc['speed30']>=5},
  {emoji:'❤️',label:'Iron Lungs',  check:(_h:number,_r:number,sc:Record<string,number>)=>sc['yoyo']>=5},
];

/* ── helpers ── */
function calcAge(dob:string){if(!dob)return null;const d=new Date(dob);if(isNaN(d.getTime()))return null;return Math.floor((Date.now()-d.getTime())/31557600000);}
function calcBMI(h:string,w:string){const hn=parseFloat(h),wn=parseFloat(w);if(!hn||!wn)return null;return(wn/Math.pow(hn/100,2)).toFixed(1);}
function fmtDate(ts:string){try{const d=new Date(ts);return isNaN(d.getTime())?'—':d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});}catch{return'—';}}
function verdict(rating:number){
  if(rating>=80)return{label:'Star player at their level',emoji:'🌟',color:'#22c55e'};
  if(rating>=60)return{label:'Important player for the team',emoji:'✅',color:'#38bdf8'};
  if(rating>=40)return{label:'Squad player with upside',emoji:'📈',color:'#facc15'};
  return{label:'Needs significant development',emoji:'🔧',color:'#f87171'};
}
function moraleWord(m:number){
  if(m>=8)return{label:'Superb',color:'#22c55e'};
  if(m>=6)return{label:'Good',color:'#4ade80'};
  if(m>=4)return{label:'Okay',color:'#facc15'};
  return{label:'Low',color:'#f87171'};
}
/** rough zone classification from a freeform position string, for the mini pitch */
function classifyZone(pos:string):'GK'|'DEF'|'MID'|'FWD'|null{
  const p=(pos||'').toLowerCase();
  if(/gk|goalkeeper|ผู้รักษาประตู|โกล/.test(p))return'GK';
  if(/def|back|กองหลัง|แบ็ค/.test(p))return'DEF';
  if(/fwd|forward|striker|wing|ปีก|กองหน้า/.test(p))return'FWD';
  if(/mid|กองกลาง|มิดฟิลด์/.test(p))return'MID';
  return null;
}

/* ── types (mirrors /api/public/athlete response) ── */
type HistRecord={Timestamp:string;Rating:number;Speed30:string;CMJ:string;Agility:string;Situp:string;LongJump:string;YoYo:string;Pushup:string;SitAndReach:string;Height:string;Weight:string;Fat:string;Muscle:string};
type IRRecord=Record<string,number|string>;
type LatestSkill=Record<string,number|string>;
type AttendStats={total:number;present:number;late:number;absent:number;rate:number};
type WellnessSummary={count:number;avgWellness:number;avgFatigue:number;avgSleep:number;avgMood:number};
type RpeSummary={count:number;avgRpe:number;avgLoad:number;totalLoad:number};
type MatchRecent={matchDate:string;opponent:string;matchType:string;result:string;minutesPlayed:number;goals:number;assists:number;rating:number};
type MatchStats={apps:number;goals:number;assists:number;yellowCards:number;avgRating:number;recent:MatchRecent[]};
type AthleteData={Name:string;Nickname:string;DOB:string;Team:string;Position:string;Club:string;Province:string;DomFoot:string;DomHand:string;PhotoUrl:string;TestCount:number;History:HistRecord[];Latest:Record<string,string|number>|null;IRHistory:IRRecord[];LatestSkill?:LatestSkill|null;AttendStats?:AttendStats;WellnessSummary?:WellnessSummary|null;RpeSummary?:RpeSummary|null;MatchStats?:MatchStats|null};

interface Props {
  playerId: string;
  linkHref?: string;
  linkLabel?: string;
  linkExternal?: boolean;
  /** true when rendered inside the app shell (rounded card, no forced 100vh). */
  embedded?: boolean;
}

/* ── small building blocks ── */
function AttrRow({label,val}:{label:string;val:number}){
  const hi=val>=4;
  return(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',borderRadius:5,marginBottom:1,background:hi?'rgba(52,211,153,0.14)':'transparent'}}>
      <span style={{fontSize:'0.72rem',color:hi?'#d1fae5':'#cbd5e1'}}>{label}</span>
      <span style={{fontSize:'0.78rem',fontWeight:800,color:hi?'#34d399':val>0?'white':'#475569'}}>{val||'—'}</span>
    </div>
  );
}
function ColHeading({color,children}:{color:string;children:React.ReactNode}){
  return <div style={{fontSize:'0.66rem',fontWeight:800,letterSpacing:0.5,color,marginBottom:6,textTransform:'uppercase'}}>{children}</div>;
}

/* ── component ── */
export default function ScoutCardBody({playerId,linkHref,linkLabel='รายงานฉบับเต็ม',linkExternal=false,embedded=false}:Props){
  const [data,setData]=useState<AthleteData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [tab,setTab]=useState<Tab>('Panoramica');

  useEffect(()=>{
    setLoading(true); setError(''); setData(null); setTab('Panoramica');
    fetch(`/api/public/athlete/${playerId}`)
      .then(r=>r.json())
      .then(d=>{if(d.error)setError(d.error);else setData(d);})
      .catch(()=>setError('ไม่สามารถโหลดข้อมูลได้'))
      .finally(()=>setLoading(false));
  },[playerId]);

  const outerStyle:React.CSSProperties=embedded
    ?{background:'#0a1122',borderRadius:20,overflow:'hidden',fontFamily:"'Prompt','Segoe UI',sans-serif",color:'white'}
    :{minHeight:'100vh',background:'#0a1122',fontFamily:"'Prompt','Segoe UI',sans-serif",color:'white',paddingBottom:40};

  if(loading)return(
    <div style={{...outerStyle,display:'flex',alignItems:'center',justifyContent:'center',minHeight:embedded?320:'100vh'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{width:44,height:44,border:'4px solid rgba(56,189,248,0.3)',borderTop:'4px solid #38bdf8',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 14px'}}/>
        <p style={{fontSize:'0.85rem',color:'#94a3b8'}}>กำลังโหลดการ์ด...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if(error||!data)return(
    <div style={{...outerStyle,display:'flex',alignItems:'center',justifyContent:'center',minHeight:embedded?320:'100vh',textAlign:'center'}}>
      <div><div style={{fontSize:'3.5rem',marginBottom:14}}>❌</div><h2 style={{fontSize:'1.1rem'}}>{error||'ไม่พบข้อมูล'}</h2></div>
    </div>
  );

  const latest=data.Latest;
  const HIST=data.History||[];
  const irHistory=data.IRHistory||[];
  const latestIR=irHistory.length?irHistory[0]:null;
  const skill=data.LatestSkill;
  const rating=Number(latest?.Rating||0);
  const dob=data.DOB;
  const age=calcAge(dob);
  const bmi=calcBMI(String(latest?.Height||''),String(latest?.Weight||''));
  const initials=(data.Name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const zone=classifyZone(data.Position);
  const match=data.MatchStats;
  const w=data.WellnessSummary;
  const rpe=data.RpeSummary;
  const att=data.AttendStats;

  /* physical scores 0-5 via existing scoring engine */
  const physScores=PHYSICAL_ITEMS.reduce<Record<string,number>>((acc,m)=>{
    acc[m.key]=latest?getScorePoint(m.key,String(latest[m.field]||''),dob,data.Position):0;
    return acc;
  },{});

  const mentalVals=MENTAL_ITEMS.map(m=>({...m,val:latestIR?Number(latestIR[m.field])||0:0}));
  const techVals=skill
    ?SKILL_ITEMS.map(m=>({label:m.label,val:Number(skill[m.field])||0}))
    :IR_TECH_FALLBACK.map(m=>({label:m.label,val:latestIR?Number(latestIR[m.field])||0:0}));

  const avg=(arr:number[])=>{const v=arr.filter(x=>x>0);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  const techAvg=avg(techVals.map(t=>t.val));
  const mentalAvg=avg(mentalVals.map(t=>t.val));
  const physAvg=avg(Object.values(physScores));
  const attackVal=skill?avg([Number(skill.skShooting)||0,Number(skill.skDribbling)||0]):(latestIR?Number(latestIR.T_OffFundam)||0:0);
  const defenseVal=latestIR?Number(latestIR.T_DefFundam)||0:0;
  const aerialVal=skill?Number(skill.skHeading)||0:physScores.cmj||0;
  const paceVal=physScores.speed30||0;

  const radarLabels=['Defence','Aerial','Mental','Physical','Pace','Technical','Attack'];
  const radarValues=[defenseVal,aerialVal,mentalAvg,physAvg,paceVal,techAvg,attackVal];
  const radarData={
    labels:radarLabels,
    datasets:[{
      data:radarValues,
      backgroundColor:'rgba(52,211,153,0.18)',borderColor:'#34d399',borderWidth:2,
      pointBackgroundColor:'#34d399',pointRadius:3,
    }],
  };
  const radarOpts={
    responsive:true,
    plugins:{legend:{display:false}},
    scales:{r:{min:0,max:5,ticks:{stepSize:1,display:false},
      pointLabels:{
        font:{size:9,weight:700 as const},color:'#cbd5e1',
        callback:(lbl:string,idx:number)=>`${Math.round(radarValues[idx]*10)/10}  ${lbl}`,
      },
      grid:{color:'rgba(255,255,255,0.08)'},angleLines:{color:'rgba(255,255,255,0.08)'}}},
  };

  const overallV=verdict(rating);
  const strengths=[...techVals.map(t=>({label:t.label,val:t.val})),...mentalVals.map(t=>({label:t.label,val:t.val})),
    ...PHYSICAL_ITEMS.map(m=>({label:m.label,val:physScores[m.key]}))]
    .filter(x=>x.val>=4).slice(0,8);
  const weaknesses=[...techVals.map(t=>({label:t.label,val:t.val})),...mentalVals.map(t=>({label:t.label,val:t.val})),
    ...PHYSICAL_ITEMS.map(m=>({label:m.label,val:physScores[m.key]}))]
    .filter(x=>x.val>0&&x.val<=2).slice(0,6);

  const recentForm=HIST.slice(-5);
  const currentStars=Math.max(0,Math.min(5,Math.round(rating/20)));
  const potentialStars=age!=null&&age<16?Math.min(5,currentStars+1):currentStars;

  const allScores={...physScores}; // for badge checks (speed30/yoyo keys match)
  const earnedBadges=BADGES.filter(b=>b.check(HIST.length,rating,allScores));

  const zones:{id:'GK'|'DEF'|'MID'|'FWD';x:number;label:string}[]=[
    {id:'GK',x:10,label:'GK'},{id:'DEF',x:36,label:'DEF'},{id:'MID',x:63,label:'MID'},{id:'FWD',x:90,label:'FWD'},
  ];

  return(
    <div style={outerStyle}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sc-card{background:#111a2e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px}
        .sc-hd{font-size:0.66rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#7dd3fc;margin-bottom:12px;display:flex;align-items:center;gap:8px}
        .sc-tab{background:transparent;border:none;color:#7d8aa3;font-family:inherit;font-size:0.78rem;font-weight:700;padding:10px 4px;cursor:pointer;border-bottom:2px solid transparent}
        .sc-tab.active{color:#5eead4;border-bottom-color:#5eead4}
        @media(max-width:1040px){.sc-body{grid-template-columns:1fr!important}}
        @media(max-width:900px){.sc-attrs{grid-template-columns:1fr 1fr!important}}
        @media(max-width:600px){.sc-attrs{grid-template-columns:1fr!important}.sc-tiles{grid-template-columns:repeat(2,1fr)!important}.sc-tiles>div{grid-column:auto!important}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 20px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'linear-gradient(90deg,#0c2b2b,#0c1526 60%)'}}>
        {linkHref?(
          <a href={linkHref} target={linkExternal?'_blank':undefined} rel={linkExternal?'noreferrer':undefined} style={{color:'#94a3b8',textDecoration:'none',fontSize:'0.78rem',display:'flex',alignItems:'center',gap:6}}>
            <i className={`bi ${linkExternal?'bi-box-arrow-up-right':'bi-arrow-left'}`}/> {linkLabel}
          </a>
        ):<span/>}
        <div style={{fontSize:'0.72rem',color:'#5b6b85'}}><i className="bi bi-chevron-right mx-1"/></div>
        <div style={{fontSize:'0.78rem',color:'#cbd5e1',fontWeight:600}}>รายงานนักเตะ</div>
        <div style={{marginLeft:'auto',fontSize:'0.62rem',fontWeight:800,letterSpacing:3,color:'#5eead4',textTransform:'uppercase'}}>ISP SCOUT CARD</div>
      </div>

      <div style={{maxWidth:1220,margin:'0 auto',padding:'18px 16px'}}>

        {/* ── IDENTITY HEADER ── */}
        <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
          <div style={{width:92,height:92,minWidth:92,borderRadius:16,border:'3px solid rgba(52,211,153,0.5)',background:'rgba(52,211,153,0.08)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {data.PhotoUrl?<img src={data.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>
              :<span style={{fontSize:'1.8rem',fontWeight:800,color:'#34d399'}}>{initials}</span>}
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{fontSize:'1.4rem',fontWeight:800,lineHeight:1.1}}>{data.Name}</div>
              {data.Team&&<span style={{fontSize:'0.66rem',fontWeight:800,background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'2px 7px'}}>{data.Team}</span>}
            </div>
            <div style={{fontSize:'0.8rem',color:'#94a3b8',marginTop:3}}>
              {data.Position||'—'}{age!=null?` · ${age} ปี`:''}{data.DomFoot?` · เท้า ${data.DomFoot}`:''}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:9}}>
              {[data.Club,data.Province].filter(Boolean).map(v=>(
                <span key={v} style={{fontSize:'0.68rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'3px 10px',color:'#cbd5e1'}}>{v}</span>
              ))}
              {match&&match.apps>0&&<span style={{fontSize:'0.68rem',color:'#7dd3fc'}}>{match.apps} นัด · {match.goals} ประตู</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:20,alignItems:'center'}}>
            <div style={{display:'flex',gap:16}}>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'0.58rem',color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Current</div>
                <div style={{display:'flex',gap:1}}>
                  {[1,2,3,4,5].map(n=><i key={n} className={`bi ${n<=currentStars?'bi-star-fill':'bi-star'}`} style={{color:'#facc15',fontSize:'0.85rem'}}/>)}
                </div>
              </div>
              <div style={{textAlign:'center'}} title="ประเมินจากอายุและผลการทดสอบปัจจุบัน">
                <div style={{fontSize:'0.58rem',color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Potential</div>
                <div style={{display:'flex',gap:1}}>
                  {[1,2,3,4,5].map(n=><i key={n} className={`bi ${n<=potentialStars?'bi-star-fill':'bi-star'}`} style={{color:'#a78bfa',fontSize:'0.85rem'}}/>)}
                </div>
              </div>
            </div>
            <div style={{textAlign:'center',background:'linear-gradient(135deg,#0f766e,#0c4a44)',border:'1px solid #34d399',borderRadius:14,padding:'10px 20px'}}>
              <div style={{fontSize:'0.56rem',color:'rgba(255,255,255,0.7)',letterSpacing:1.5,textTransform:'uppercase'}}>Rating</div>
              <div style={{fontSize:'2rem',fontWeight:900,lineHeight:1}}>{rating}</div>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{display:'flex',gap:22,borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:18}}>
          {TABS.map(t=>(
            <button key={t} className={`sc-tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>

        {/* ══════════ PANORAMICA ══════════ */}
        {tab==='Panoramica'&&(<>
        <div className="sc-body" style={{display:'grid',gridTemplateColumns:'1.7fr 1fr 1fr',gap:14,marginBottom:14,alignItems:'start'}}>

          {/* attribute columns (incl. roles pitch) */}
          <div className="sc-card">
            <div className="sc-hd"><i className="bi bi-list-columns-reverse"/> Attributes</div>
            <div className="sc-attrs" style={{display:'grid',gridTemplateColumns:'0.9fr 1fr 1fr 1fr',gap:14}}>

              {/* roles mini pitch */}
              <div>
                <ColHeading color="#94a3b8">Roles</ColHeading>
                <svg viewBox="0 0 100 62" style={{width:'100%',background:'linear-gradient(180deg,#0f3d2e,#0a2e22)',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)'}}>
                  <line x1="50" y1="2" x2="50" y2="60" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6"/>
                  <circle cx="50" cy="31" r="8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6"/>
                  <rect x="1" y="16" width="10" height="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6"/>
                  <rect x="89" y="16" width="10" height="30" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6"/>
                  {zones.map(z=>(
                    <circle key={z.id} cx={z.x} cy={31} r={z.id===zone?4.2:2.4}
                      fill={z.id===zone?'#5eead4':'rgba(255,255,255,0.35)'}
                      stroke={z.id===zone?'#0a2e22':'none'} strokeWidth="1"/>
                  ))}
                </svg>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                  {zones.map(z=>(
                    <span key={z.id} style={{fontSize:'0.56rem',fontWeight:800,color:z.id===zone?'#5eead4':'#475569'}}>{z.label}</span>
                  ))}
                </div>
                <div style={{marginTop:10,fontSize:'0.7rem',color:'#cbd5e1'}}>{data.Position||'—'}</div>
                {data.DomFoot&&<div style={{fontSize:'0.66rem',color:'#64748b',marginTop:2}}>เท้าถนัด: {data.DomFoot}</div>}
              </div>

              <div>
                <ColHeading color="#f472b6">Technical</ColHeading>
                {techVals.map(t=><AttrRow key={t.label} label={t.label} val={t.val}/>)}
              </div>
              <div>
                <ColHeading color="#a78bfa">Mental</ColHeading>
                {mentalVals.map(t=><AttrRow key={t.field} label={t.label} val={t.val}/>)}
              </div>
              <div>
                <ColHeading color="#38bdf8">Physical</ColHeading>
                {PHYSICAL_ITEMS.map(m=><AttrRow key={m.key} label={m.label} val={physScores[m.key]}/>)}
              </div>
            </div>
          </div>

          {/* radar + info */}
          <div className="sc-card" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div className="sc-hd" style={{alignSelf:'flex-start'}}><i className="bi bi-broadcast"/> Info</div>
            <div style={{width:'100%',maxWidth:250}}><Radar data={radarData} options={radarOpts}/></div>
            <div style={{width:'100%',marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {label:'Height',val:latest?.Height?`${latest.Height} cm`:'—'},
                {label:'Weight',val:latest?.Weight?`${latest.Weight} kg`:'—'},
                {label:'BMI',val:bmi||'—'},
                {label:'Body Fat',val:latest?.Fat?`${latest.Fat}%`:'—'},
              ].map(x=>(
                <div key={x.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'7px 10px'}}>
                  <div style={{fontSize:'0.6rem',color:'#94a3b8'}}>{x.label}</div>
                  <div style={{fontSize:'0.8rem',fontWeight:700}}>{x.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right stack: coach report + player info */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="sc-card">
              <div className="sc-hd"><i className="bi bi-clipboard2-check-fill"/> รายงานโค้ช</div>
              <div style={{fontSize:'1rem',marginBottom:4}}>{overallV.emoji}</div>
              <div style={{fontWeight:700,fontSize:'0.84rem',color:overallV.color,marginBottom:8}}>{overallV.label}</div>
              {latestIR?.GoodLevel&&<p style={{fontSize:'0.72rem',color:'#cbd5e1',marginBottom:8,lineHeight:1.5}}>{String(latestIR.GoodLevel)}</p>}
              <div style={{fontSize:'0.66rem',fontWeight:700,color:'#4ade80',marginBottom:5}}>👍 PROS ({strengths.length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:10}}>
                {strengths.length===0?<span style={{fontSize:'0.7rem',color:'#64748b'}}>ยังไม่มีจุดเด่นชัดเจน</span>
                  :strengths.map(s=><span key={s.label} style={{fontSize:'0.64rem',background:'rgba(74,222,128,0.12)',color:'#4ade80',borderRadius:6,padding:'2px 7px'}}>{s.label}</span>)}
              </div>
              <div style={{fontSize:'0.66rem',fontWeight:700,color:'#f87171',marginBottom:5}}>👎 CONS ({weaknesses.length})</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {weaknesses.length===0?<span style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีจุดอ่อนวิกฤต</span>
                  :weaknesses.map(s=><span key={s.label} style={{fontSize:'0.64rem',background:'rgba(248,113,113,0.12)',color:'#f87171',borderRadius:6,padding:'2px 7px'}}>{s.label}</span>)}
              </div>
            </div>

            <div className="sc-card">
              <div className="sc-hd"><i className="bi bi-person-lines-fill"/> ข้อมูลนักกีฬา</div>
              <div style={{fontSize:'0.72rem',color:'#94a3b8',marginBottom:6}}>ระยะเวลาติดตาม</div>
              <div style={{background:'rgba(255,255,255,0.08)',borderRadius:20,height:8,overflow:'hidden',marginBottom:4}}>
                <div style={{height:'100%',width:HIST.length?'100%':'0%',background:'linear-gradient(90deg,#0f766e,#34d399)',borderRadius:20}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.64rem',color:'#64748b',marginBottom:12}}>
                <span>{HIST.length?fmtDate(HIST[0].Timestamp):'—'}</span>
                <span>{HIST.length?fmtDate(HIST[HIST.length-1].Timestamp):'—'}</span>
              </div>
              {[
                {label:'จำนวนครั้งที่ทดสอบ',val:data.TestCount},
                {label:'เท้าถนัด',val:data.DomFoot||'—'},
                {label:'มือถนัด',val:data.DomHand||'—'},
                {label:'จังหวัด',val:data.Province||'—'},
              ].map(x=>(
                <div key={x.label} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',fontSize:'0.74rem'}}>
                  <span style={{color:'#94a3b8'}}>{x.label}</span><span style={{fontWeight:700}}>{x.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM TILE STRIP ── */}
        <div className="sc-tiles" style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:12}}>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-lightning-charge-fill"/> Training</div>
            {rpe?(<><div style={{fontSize:'1.2rem',fontWeight:900}}>{rpe.avgRpe}<span style={{fontSize:'0.62rem',color:'#94a3b8'}}>/10</span></div>
              <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>avg RPE · {rpe.count} sessions</div></>):<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-heart-pulse-fill"/> Fitness</div>
            {w?(<><div style={{fontSize:'1.2rem',fontWeight:900}}>{w.avgWellness}</div>
              <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>{w.avgWellness>=70?'Good condition':w.avgWellness>=40?'Managing load':'Fatigued'}</div></>):<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-graph-up"/> Recent Form</div>
            {recentForm.length?(<div style={{display:'flex',gap:4}}>
              {recentForm.map((r,i)=>{const rt=Number(r.Rating)||0;const c=rt>=70?'#22c55e':rt>=50?'#facc15':'#f87171';return(
                <div key={i} title={`${rt}`} style={{width:15,height:15,borderRadius:4,background:c}}/>
              );})}
            </div>):<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14,gridColumn:'span 2'}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-trophy-fill"/> Stat. stagionali</div>
            {match&&match.apps>0?(
              <table style={{width:'100%',fontSize:'0.68rem',borderCollapse:'collapse'}}>
                <thead><tr style={{color:'#64748b',textAlign:'center'}}>
                  <th style={{textAlign:'left',fontWeight:600}}>Overall</th><th>Pres.</th><th>Gol</th><th>Ast</th><th>Rating</th>
                </tr></thead>
                <tbody><tr style={{fontWeight:700,textAlign:'center'}}>
                  <td style={{textAlign:'left',color:'#94a3b8',fontWeight:400}}>รวม</td>
                  <td>{match.apps}</td><td style={{color:'#4ade80'}}>{match.goals}</td><td style={{color:'#38bdf8'}}>{match.assists}</td>
                  <td style={{color:'#facc15'}}>{match.avgRating||'—'}</td>
                </tr></tbody>
              </table>
            ):<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-calendar-check-fill"/> Discipline</div>
            {att&&att.total>0?(<><div style={{fontSize:'1.2rem',fontWeight:900}}>{att.rate}%</div>
              <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>{att.present}P · {att.late}L · {att.absent}A</div></>):<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-emoji-smile-fill"/> Morale</div>
            {w?(()=>{const mv=moraleWord(w.avgMood);return(<><div style={{fontSize:'1rem',fontWeight:800,color:mv.color}}>{mv.label}</div>
              <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>mood {w.avgMood}/10</div></>);})():<div style={{fontSize:'0.7rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-award-fill"/> Career</div>
            <div style={{fontSize:'1.2rem',fontWeight:900}}>{data.TestCount}</div>
            <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>tests · last {HIST.length?fmtDate(HIST[HIST.length-1].Timestamp):'—'}</div>
          </div>
        </div>
        </>)}

        {/* ══════════ DATI PERSONALI ══════════ */}
        {tab==='Dati personali'&&(
          <div className="sc-card">
            <div className="sc-hd"><i className="bi bi-person-vcard-fill"/> Dati personali</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12}}>
              {[
                {label:'ชื่อ-นามสกุล',val:data.Name},
                {label:'ชื่อเล่น',val:data.Nickname||'—'},
                {label:'วันเกิด',val:data.DOB?fmtDate(data.DOB):'—'},
                {label:'อายุ',val:age!=null?`${age} ปี`:'—'},
                {label:'รุ่น',val:data.Team||'—'},
                {label:'ตำแหน่ง',val:data.Position||'—'},
                {label:'สโมสร',val:data.Club||'—'},
                {label:'จังหวัด',val:data.Province||'—'},
                {label:'เท้าถนัด',val:data.DomFoot||'—'},
                {label:'มือถนัด',val:data.DomHand||'—'},
                {label:'ส่วนสูงล่าสุด',val:latest?.Height?`${latest.Height} cm`:'—'},
                {label:'น้ำหนักล่าสุด',val:latest?.Weight?`${latest.Weight} kg`:'—'},
                {label:'BMI',val:bmi||'—'},
                {label:'ไขมันในร่างกาย',val:latest?.Fat?`${latest.Fat}%`:'—'},
                {label:'มวลกล้ามเนื้อ',val:latest?.Muscle?`${latest.Muscle}%`:'—'},
              ].map(x=>(
                <div key={x.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'9px 12px'}}>
                  <div style={{fontSize:'0.62rem',color:'#94a3b8'}}>{x.label}</div>
                  <div style={{fontSize:'0.84rem',fontWeight:700,marginTop:2}}>{x.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ PRESTAZIONI ══════════ */}
        {tab==='Prestazioni'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="sc-card">
              <div className="sc-hd"><i className="bi bi-trophy-fill"/> ผลงานการแข่งขันล่าสุด</div>
              {match&&match.recent?.length?(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.74rem'}}>
                    <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8'}}>
                      {['วันที่','คู่แข่ง','ประเภท','ผล','นาที','ประตู','แอสซิสต์','เรตติ้ง'].map(h=><th key={h} style={{padding:'6px 8px',textAlign:'center',fontWeight:700}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {match.recent.map((m,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>{m.matchDate?fmtDate(m.matchDate):'-'}</td>
                          <td style={{padding:'6px 8px',fontWeight:600}}>{m.opponent||'-'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center',color:'#94a3b8'}}>{m.matchType||'-'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700}}>{m.result||'-'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>{m.minutesPlayed||0}&apos;</td>
                          <td style={{padding:'6px 8px',textAlign:'center',color:'#4ade80',fontWeight:700}}>{m.goals||0}</td>
                          <td style={{padding:'6px 8px',textAlign:'center',color:'#38bdf8',fontWeight:700}}>{m.assists||0}</td>
                          <td style={{padding:'6px 8px',textAlign:'center',color:'#facc15',fontWeight:700}}>{m.rating||'-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<div style={{fontSize:'0.78rem',color:'#64748b'}}>ยังไม่มีข้อมูลการแข่งขัน</div>}
            </div>

            <div className="sc-card">
              <div className="sc-hd"><i className="bi bi-clipboard-data-fill"/> ประวัติผลทดสอบล่าสุด</div>
              {HIST.length?(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.74rem'}}>
                    <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.1)',color:'#94a3b8'}}>
                      <th style={{padding:'6px 8px',textAlign:'left'}}>วันที่</th><th style={{padding:'6px 8px'}}>Rating</th>
                      <th style={{padding:'6px 8px'}}>Speed30</th><th style={{padding:'6px 8px'}}>CMJ</th><th style={{padding:'6px 8px'}}>Yo-Yo</th>
                    </tr></thead>
                    <tbody>
                      {[...HIST].reverse().slice(0,8).map((r,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                          <td style={{padding:'6px 8px'}}>{fmtDate(r.Timestamp)}</td>
                          <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#5eead4'}}>{r.Rating||'—'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>{r.Speed30||'—'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>{r.CMJ||'—'}</td>
                          <td style={{padding:'6px 8px',textAlign:'center'}}>{r.YoYo||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<div style={{fontSize:'0.78rem',color:'#64748b'}}>ยังไม่มีข้อมูลทดสอบ</div>}
            </div>
          </div>
        )}

        {/* ══════════ CARRIERA ══════════ */}
        {tab==='Carriera'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div className="sc-tiles" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                {label:'จำนวนครั้งที่ทดสอบ',val:String(data.TestCount)},
                {label:'นัดที่ลงเล่น',val:String(match?.apps||0)},
                {label:'ประตูรวม',val:String(match?.goals||0)},
                {label:'แอสซิสต์รวม',val:String(match?.assists||0)},
              ].map(x=>(
                <div key={x.label} className="sc-card" style={{padding:14,textAlign:'center'}}>
                  <div style={{fontSize:'1.4rem',fontWeight:900,color:'#5eead4'}}>{x.val}</div>
                  <div style={{fontSize:'0.66rem',color:'#94a3b8',marginTop:4}}>{x.label}</div>
                </div>
              ))}
            </div>
            <div className="sc-card">
              <div className="sc-hd"><i className="bi bi-award-fill"/> Achievements</div>
              {earnedBadges.length?(
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {earnedBadges.map(b=>(
                    <span key={b.label} style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'6px 14px',fontSize:'0.78rem',fontWeight:600}}>
                      <span style={{fontSize:'1rem'}}>{b.emoji}</span>{b.label}
                    </span>
                  ))}
                </div>
              ):<div style={{fontSize:'0.78rem',color:'#64748b'}}>ยังไม่ปลดล็อกความสำเร็จ</div>}
            </div>
          </div>
        )}

        <div style={{textAlign:'center',padding:'22px 0 4px',fontSize:'0.68rem',color:'#475569'}}>
          <i className="bi bi-shield-check me-2"/>ISP Scout Card · Powered by <strong style={{color:'#38bdf8'}}>ISP Improve Sports Performance</strong>
        </div>
      </div>
    </div>
  );
}
