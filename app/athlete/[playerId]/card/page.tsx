'use client';

import { useEffect, useState, use } from 'react';
import {
  Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { getScorePoint } from '@/lib/score';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ── ISP SCOUT CARD ──────────────────────────────────────────────────────────
   FM-style single-screen player card: attribute columns + radar + verdict.
   Standalone from the full report at /athlete/[playerId] — same data source. */

/* ── physical metrics (Physical column) ── */
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

/* ── mental column: IR behaviour + lifestyle items ── */
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

/* ── technical column: skill assessment, falls back to IR technical items ── */
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

/* ── helpers ── */
function calcAge(dob:string){if(!dob)return null;const d=new Date(dob);if(isNaN(d.getTime()))return null;return Math.floor((Date.now()-d.getTime())/31557600000);}
function calcBMI(h:string,w:string){const hn=parseFloat(h),wn=parseFloat(w);if(!hn||!wn)return null;return(wn/Math.pow(hn/100,2)).toFixed(1);}
function fmtDate(ts:string){try{const d=new Date(ts);return isNaN(d.getTime())?'—':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});}catch{return'—';}}
function attrColor(v:number){
  if(v>=5)return{color:'#22c55e',bg:'rgba(34,197,94,0.14)'};
  if(v>=4)return{color:'#4ade80',bg:'rgba(74,222,128,0.12)'};
  if(v>=3)return{color:'#facc15',bg:'rgba(250,204,21,0.12)'};
  if(v>=2)return{color:'#fb923c',bg:'rgba(251,146,60,0.12)'};
  if(v>=1)return{color:'#f87171',bg:'rgba(248,113,113,0.12)'};
  return{color:'#64748b',bg:'rgba(100,116,139,0.08)'};
}
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

/* ── types (mirrors /api/public/athlete response) ── */
type HistRecord={Timestamp:string;Rating:number;Speed30:string;CMJ:string;Agility:string;Situp:string;LongJump:string;YoYo:string;Pushup:string;SitAndReach:string;Height:string;Weight:string;Fat:string;Muscle:string};
type IRRecord=Record<string,number|string>;
type LatestSkill=Record<string,number|string>;
type AttendStats={total:number;present:number;late:number;absent:number;rate:number};
type WellnessSummary={count:number;avgWellness:number;avgFatigue:number;avgSleep:number;avgMood:number};
type RpeSummary={count:number;avgRpe:number;avgLoad:number;totalLoad:number};
type MatchStats={apps:number;goals:number;assists:number;yellowCards:number;avgRating:number};
type AthleteData={Name:string;Nickname:string;DOB:string;Team:string;Position:string;Club:string;Province:string;DomFoot:string;DomHand:string;PhotoUrl:string;TestCount:number;History:HistRecord[];Latest:Record<string,string|number>|null;IRHistory:IRRecord[];LatestSkill?:LatestSkill|null;AttendStats?:AttendStats;WellnessSummary?:WellnessSummary|null;RpeSummary?:RpeSummary|null;MatchStats?:MatchStats|null};

const RADAR_OPTS={
  responsive:true,
  plugins:{legend:{display:false}},
  scales:{r:{min:0,max:5,ticks:{stepSize:1,display:false},pointLabels:{font:{size:10,weight:700 as const},color:'#cbd5e1'},grid:{color:'rgba(255,255,255,0.08)'},angleLines:{color:'rgba(255,255,255,0.08)'}}},
};

/* ── component ── */
export default function ScoutCardPage({params}:{params:Promise<{playerId:string}>}){
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
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0b1220'}}>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{width:44,height:44,border:'4px solid rgba(56,189,248,0.3)',borderTop:'4px solid #38bdf8',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 14px'}}/>
        <p style={{fontSize:'0.85rem',color:'#94a3b8'}}>กำลังโหลดการ์ด...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if(error||!data)return(
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0b1220',color:'white',textAlign:'center'}}>
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

  /* physical scores 0-5 via existing scoring engine */
  const physScores=PHYSICAL_ITEMS.reduce<Record<string,number>>((acc,m)=>{
    acc[m.key]=latest?getScorePoint(m.key,String(latest[m.field]||''),dob,data.Position):0;
    return acc;
  },{});

  /* mental column values (Behaviour + Lifestyle, 0-5) */
  const mentalVals=MENTAL_ITEMS.map(m=>({...m,val:latestIR?Number(latestIR[m.field])||0:0}));

  /* technical column: skill assessment preferred, else IR technical items */
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

  const radarData={
    labels:['Defence','Aerial','Mental','Physical','Pace','Technical','Attack'],
    datasets:[{
      data:[defenseVal,aerialVal,mentalAvg,physAvg,paceVal,techAvg,attackVal],
      backgroundColor:'rgba(52,211,153,0.18)',borderColor:'#34d399',borderWidth:2,
      pointBackgroundColor:'#34d399',pointRadius:3,
    }],
  };

  const overallV=verdict(rating);
  const strengths=[...techVals.map(t=>({label:t.label,val:t.val})),...mentalVals.map(t=>({label:t.label,val:t.val})),
    ...PHYSICAL_ITEMS.map(m=>({label:m.label,val:physScores[m.key]}))]
    .filter(x=>x.val>=4).slice(0,8);
  const weaknesses=[...techVals.map(t=>({label:t.label,val:t.val})),...mentalVals.map(t=>({label:t.label,val:t.val})),
    ...PHYSICAL_ITEMS.map(m=>({label:m.label,val:physScores[m.key]}))]
    .filter(x=>x.val>0&&x.val<=2).slice(0,6);

  const recentForm=HIST.slice(-5);
  const w=data.WellnessSummary;
  const rpe=data.RpeSummary;
  const att=data.AttendStats;
  const match=data.MatchStats;

  return(
    <div style={{minHeight:'100vh',background:'#0b1220',fontFamily:"'Prompt','Segoe UI',sans-serif",color:'white',paddingBottom:40}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .sc-card{background:#111a2e;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:18px}
        .sc-hd{font-size:0.68rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#7dd3fc;margin-bottom:14px;display:flex;align-items:center;gap:8px}
        .sc-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
        .sc-row:last-child{border-bottom:none}
        .sc-num{min-width:26px;text-align:center;font-weight:800;font-size:0.78rem;border-radius:5px;padding:2px 0}
        @media(max-width:980px){.sc-body{grid-template-columns:1fr!important}.sc-attrs{grid-template-columns:1fr 1fr!important}}
        @media(max-width:600px){.sc-attrs{grid-template-columns:1fr!important}.sc-tiles{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,0.08)',background:'#0c1526'}}>
        <a href={`/athlete/${playerId}`} style={{color:'#94a3b8',textDecoration:'none',fontSize:'0.8rem',display:'flex',alignItems:'center',gap:6}}>
          <i className="bi bi-arrow-left"/> Full Report
        </a>
        <div style={{marginLeft:'auto',fontSize:'0.62rem',fontWeight:800,letterSpacing:3,color:'#38bdf8',textTransform:'uppercase'}}>ISP SCOUT CARD</div>
      </div>

      <div style={{maxWidth:1180,margin:'0 auto',padding:'20px 16px'}}>

        {/* ── IDENTITY HEADER ── */}
        <div style={{display:'flex',gap:20,flexWrap:'wrap',alignItems:'center',marginBottom:18}}>
          <div style={{width:96,height:96,minWidth:96,borderRadius:16,border:'3px solid rgba(52,211,153,0.5)',background:'rgba(52,211,153,0.08)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            {data.PhotoUrl?<img src={data.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'top'}}/>
              :<span style={{fontSize:'1.9rem',fontWeight:800,color:'#34d399'}}>{initials}</span>}
          </div>
          <div style={{flex:1,minWidth:220}}>
            <div style={{fontSize:'1.5rem',fontWeight:800,lineHeight:1.1}}>{data.Name}</div>
            <div style={{fontSize:'0.82rem',color:'#94a3b8',marginTop:3}}>
              {data.Position||'—'}{age!=null?` · ${age} yrs`:''}{data.DomFoot?` · ${data.DomFoot} foot`:''}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
              {[data.Team,data.Club,data.Province].filter(Boolean).map(v=>(
                <span key={v} style={{fontSize:'0.7rem',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:'3px 10px',color:'#cbd5e1'}}>{v}</span>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'0.6rem',color:'#94a3b8',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Current Ability</div>
              <div style={{display:'flex',gap:2}}>
                {[1,2,3,4,5].map(n=><i key={n} className={`bi ${n<=Math.round(rating/20)?'bi-star-fill':'bi-star'}`} style={{color:'#facc15',fontSize:'1rem'}}/>)}
              </div>
            </div>
            <div style={{textAlign:'center',background:'linear-gradient(135deg,#0f766e,#0c4a44)',border:'1px solid #34d399',borderRadius:14,padding:'12px 22px'}}>
              <div style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.7)',letterSpacing:1.5,textTransform:'uppercase'}}>Rating</div>
              <div style={{fontSize:'2.2rem',fontWeight:900,lineHeight:1}}>{rating}</div>
            </div>
          </div>
        </div>

        {/* ── BODY: attributes | radar | verdict ── */}
        <div className="sc-body" style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr',gap:16,marginBottom:16,alignItems:'start'}}>

          {/* attribute columns */}
          <div className="sc-card">
            <div className="sc-hd"><i className="bi bi-list-columns-reverse"/> Attributes</div>
            <div className="sc-attrs" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              <div>
                <div style={{fontSize:'0.68rem',fontWeight:700,color:'#f472b6',marginBottom:6}}>TECHNICAL</div>
                {techVals.map(t=>{const c=attrColor(t.val);return(
                  <div key={t.label} className="sc-row">
                    <span style={{fontSize:'0.72rem',color:'#cbd5e1'}}>{t.label}</span>
                    <span className="sc-num" style={{color:c.color,background:c.bg}}>{t.val||'—'}</span>
                  </div>
                );})}
              </div>
              <div>
                <div style={{fontSize:'0.68rem',fontWeight:700,color:'#a78bfa',marginBottom:6}}>MENTAL</div>
                {mentalVals.map(t=>{const c=attrColor(t.val);return(
                  <div key={t.field} className="sc-row">
                    <span style={{fontSize:'0.72rem',color:'#cbd5e1'}}>{t.label}</span>
                    <span className="sc-num" style={{color:c.color,background:c.bg}}>{t.val||'—'}</span>
                  </div>
                );})}
              </div>
              <div>
                <div style={{fontSize:'0.68rem',fontWeight:700,color:'#38bdf8',marginBottom:6}}>PHYSICAL</div>
                {PHYSICAL_ITEMS.map(m=>{const v=physScores[m.key];const c=attrColor(v);return(
                  <div key={m.key} className="sc-row">
                    <span style={{fontSize:'0.72rem',color:'#cbd5e1'}}>{m.label}</span>
                    <span className="sc-num" style={{color:c.color,background:c.bg}}>{v||'—'}</span>
                  </div>
                );})}
              </div>
            </div>
          </div>

          {/* radar + info */}
          <div className="sc-card" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div className="sc-hd" style={{alignSelf:'flex-start'}}><i className="bi bi-broadcast"/> Overview</div>
            <div style={{width:'100%',maxWidth:240}}><Radar data={radarData} options={RADAR_OPTS}/></div>
            <div style={{width:'100%',marginTop:14,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {label:'Height',val:latest?.Height?`${latest.Height} cm`:'—'},
                {label:'Weight',val:latest?.Weight?`${latest.Weight} kg`:'—'},
                {label:'BMI',val:bmi||'—'},
                {label:'Foot',val:data.DomFoot||'—'},
              ].map(x=>(
                <div key={x.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'7px 10px'}}>
                  <div style={{fontSize:'0.6rem',color:'#94a3b8'}}>{x.label}</div>
                  <div style={{fontSize:'0.82rem',fontWeight:700}}>{x.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* verdict / recommendation */}
          <div className="sc-card">
            <div className="sc-hd"><i className="bi bi-clipboard2-check-fill"/> Scout Verdict</div>
            <div style={{fontSize:'1.1rem',marginBottom:4}}>{overallV.emoji}</div>
            <div style={{fontWeight:700,fontSize:'0.88rem',color:overallV.color,marginBottom:10}}>{overallV.label}</div>
            {latestIR?.GoodLevel&&<p style={{fontSize:'0.76rem',color:'#cbd5e1',marginBottom:10,lineHeight:1.5}}>{String(latestIR.GoodLevel)}</p>}

            <div style={{fontSize:'0.68rem',fontWeight:700,color:'#4ade80',marginBottom:6}}>👍 PROS ({strengths.length})</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:12}}>
              {strengths.length===0?<span style={{fontSize:'0.72rem',color:'#64748b'}}>ยังไม่มีจุดเด่นชัดเจน</span>
                :strengths.map(s=><span key={s.label} style={{fontSize:'0.68rem',background:'rgba(74,222,128,0.12)',color:'#4ade80',borderRadius:6,padding:'2px 8px'}}>{s.label}</span>)}
            </div>

            <div style={{fontSize:'0.68rem',fontWeight:700,color:'#f87171',marginBottom:6}}>👎 CONS ({weaknesses.length})</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {weaknesses.length===0?<span style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีจุดอ่อนวิกฤต</span>
                :weaknesses.map(s=><span key={s.label} style={{fontSize:'0.68rem',background:'rgba(248,113,113,0.12)',color:'#f87171',borderRadius:6,padding:'2px 8px'}}>{s.label}</span>)}
            </div>
          </div>
        </div>

        {/* ── BOTTOM TILE STRIP ── */}
        <div className="sc-tiles" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:12}}>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-lightning-charge-fill"/> Training</div>
            {rpe?(<>
              <div style={{fontSize:'1.3rem',fontWeight:900}}>{rpe.avgRpe}<span style={{fontSize:'0.65rem',color:'#94a3b8'}}>/10</span></div>
              <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>avg RPE · {rpe.count} sessions</div>
            </>):<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-heart-pulse-fill"/> Fitness</div>
            {w?(<>
              <div style={{fontSize:'1.3rem',fontWeight:900}}>{w.avgWellness}</div>
              <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>{w.avgWellness>=70?'Good condition':w.avgWellness>=40?'Managing load':'Fatigued'}</div>
            </>):<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-graph-up"/> Recent Form</div>
            {recentForm.length?(
              <div style={{display:'flex',gap:4}}>
                {recentForm.map((r,i)=>{const rt=Number(r.Rating)||0;const c=rt>=70?'#22c55e':rt>=50?'#facc15':'#f87171';return(
                  <div key={i} title={`${rt}`} style={{width:16,height:16,borderRadius:4,background:c}}/>
                );})}
              </div>
            ):<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-trophy-fill"/> Season Stats</div>
            {match?(<>
              <div style={{fontSize:'1.3rem',fontWeight:900}}>{match.apps}<span style={{fontSize:'0.65rem',color:'#94a3b8'}}> apps</span></div>
              <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>{match.goals}G · {match.assists}A · {match.avgRating||'—'} avg</div>
            </>):<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-calendar-check-fill"/> Discipline</div>
            {att&&att.total>0?(<>
              <div style={{fontSize:'1.3rem',fontWeight:900}}>{att.rate}%</div>
              <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>{att.present} present · {att.late} late · {att.absent} absent</div>
            </>):<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-emoji-smile-fill"/> Morale</div>
            {w?(()=>{const mv=moraleWord(w.avgMood);return(<>
              <div style={{fontSize:'1.05rem',fontWeight:800,color:mv.color}}>{mv.label}</div>
              <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>mood {w.avgMood}/10</div>
            </>);})():<div style={{fontSize:'0.72rem',color:'#64748b'}}>ไม่มีข้อมูล</div>}
          </div>

          <div className="sc-card" style={{padding:14}}>
            <div className="sc-hd" style={{marginBottom:8}}><i className="bi bi-award-fill"/> Career</div>
            <div style={{fontSize:'1.3rem',fontWeight:900}}>{data.TestCount}</div>
            <div style={{fontSize:'0.65rem',color:'#94a3b8'}}>tests · last {HIST.length?fmtDate(HIST[HIST.length-1].Timestamp):'—'}</div>
          </div>
        </div>

        <div style={{textAlign:'center',padding:'22px 0 4px',fontSize:'0.68rem',color:'#475569'}}>
          <i className="bi bi-shield-check me-2"/>ISP Scout Card · Powered by <strong style={{color:'#38bdf8'}}>ISP Improve Sports Performance</strong>
        </div>
      </div>
    </div>
  );
}
