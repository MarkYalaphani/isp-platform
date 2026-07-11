'use client';

import { useState, useMemo } from 'react';
import { Athlete } from '@/lib/types';

/* ── Types ── */
type Gender    = 'male' | 'female';
type Goal      = 'fat_loss' | 'maintain' | 'muscle_gain';
type DayType   = 'recovery' | 'strength' | 'field_gym' | 'pre_match' | 'match_day';
type Intensity = 'low' | 'moderate' | 'high' | 'match';

/* ── Constants ── */
const ACTIVITY: Record<Intensity, number> = {
  low: 1.375, moderate: 1.55, high: 1.725, match: 1.9,
};

/* Macros per kg [carb_lo, carb_hi, protein_lo, protein_hi, fat_lo, fat_hi] */
const MACROS: Record<DayType, Record<Goal, [number,number,number,number,number,number]>> = {
  recovery:  {
    fat_loss:    [3,4,  1.8,2.0, 0.8,0.8],
    maintain:    [3,4,  1.6,2.0, 0.8,1.0],
    muscle_gain: [4,5,  1.8,2.0, 0.8,1.0],
  },
  strength:  {
    fat_loss:    [3,4,  1.8,2.0, 0.8,0.8],
    maintain:    [4,6,  1.6,2.0, 0.8,1.0],
    muscle_gain: [5,7,  1.8,2.2, 0.8,1.0],
  },
  field_gym: {
    fat_loss:    [3,5,  1.8,2.0, 0.8,0.8],
    maintain:    [5,8,  1.4,2.0, 0.8,1.0],
    muscle_gain: [6,8,  1.6,2.0, 0.8,1.0],
  },
  pre_match: {
    fat_loss:    [4,6,  1.6,1.8, 0.8,0.8],
    maintain:    [7,10, 1.4,1.6, 0.8,1.0],
    muscle_gain: [7,10, 1.4,1.6, 0.8,1.0],
  },
  match_day: {
    fat_loss:    [5,7,  1.4,1.6, 0.8,1.0],
    maintain:    [7,12, 1.4,1.6, 0.8,1.5],
    muscle_gain: [7,12, 1.4,1.6, 0.8,1.5],
  },
};

const TIPS: Record<DayType, Record<Goal, string[]>> = {
  recovery: {
    fat_loss:    ['โปรตีนสูงเพื่อรักษากล้ามเนื้อ — คาร์บต่ำ','เน้นผัก ไฟเบอร์ ช่วยอิ่มนาน','งดน้ำตาล ของทอด อาหารแปรรูป','ดื่มน้ำ 2+ ลิตร/วัน','พักผ่อน 8–9 ชม. เพื่อฟื้นฟูเต็มที่'],
    maintain:    ['โปรตีนสูงช่วยซ่อมแซมกล้ามเนื้อ','คาร์บปานกลาง เติมไกลโคเจน','เน้นไขมันดี: ถั่ว ปลา อาโวคาโด','ดื่มน้ำให้เพียงพอตลอดวัน','นอนหลับ 8–9 ชม. = ฟื้นฟูสูงสุด'],
    muscle_gain: ['โปรตีนสูงสุด — กินทุก 3–4 ชม.','คาร์บพอดีรักษาพลังงาน','โปรตีนก่อนนอน (casein) ช่วยสร้างกล้าม','น้ำ + เกลือแร่ทดแทนที่เสียไป','นอนหลับพอ — Growth Hormone หลั่งตอนนอน'],
  },
  strength: {
    fat_loss:    ['คาร์บเล็กน้อยก่อนซ้อม — เพื่อพลังงาน','โปรตีนหลังซ้อม ภายใน 30 นาที','ลดไขมันอิ่มตัว เลือกเนื้อไม่ติดมัน','ผัก ผลไม้ทุกมื้อ — ไฟเบอร์ช่วยอิ่ม','เลี่ยงน้ำตาลและของทอดทุกชนิด'],
    maintain:    ['คาร์บก่อนซ้อม 1–2 ชม.: ข้าว กล้วย','โปรตีน + คาร์บหลังซ้อมใน 30–45 นาที','ดื่มน้ำ 500–750 ml ก่อนซ้อม','เกลือแร่ทดแทนหากเหงื่อออกมาก','มื้อก่อนนอน: โปรตีนเบาๆ + ผัก'],
    muscle_gain: ['คาร์บ + โปรตีนก่อนซ้อม 1–2 ชม.','Recovery meal หลังซ้อมทันที','เพิ่มแคลอรี่รวม 300 kcal/วัน','โปรตีนทุก 3–4 ชั่วโมง ตลอดวัน','Growth Hormone หลั่งตอนนอน — พักผ่อนให้เพียงพอ'],
  },
  field_gym: {
    fat_loss:    ['คาร์บก่อนซ้อม — เลือกคุณภาพสูง','โปรตีนสูงรักษา Lean Mass','ดื่มน้ำ 500 ml/ชม. ระหว่างซ้อม','หลีกเลี่ยงน้ำตาลหลังซ้อม','มื้อเย็น: โปรตีน + ผักใบเขียว'],
    maintain:    ['มื้อก่อนซ้อม 3–4 ชม.: ข้าว + เนื้อ + ผัก','ระหว่างซ้อม: น้ำ + เกลือแร่ ทุก 15–20 นาที','หลังซ้อม: คาร์บ + โปรตีน ใน 30–45 นาที','Field + Gym = พลังงานสูง — กินให้เพียงพอ','ดื่มน้ำ 2–3 ลิตร/วัน'],
    muscle_gain: ['คาร์บ + โปรตีนสูง ทั้งก่อนและหลังซ้อม','มื้อก่อนซ้อม: ข้าว ไข่ กล้วย','ระหว่างซ้อม: น้ำผลไม้ หรือ Energy gel','หลังซ้อม: Shake หรือข้าว + เนื้อ + นม','เพิ่มแคลอรี่ 300–500 kcal/วัน'],
  },
  pre_match: {
    fat_loss:    ['คาร์บโหลดเบาๆ: ข้าว ขนมปัง','โปรตีนปานกลาง ย่อยง่าย','หลีกเลี่ยงไขมันสูง ไฟเบอร์สูง','ดื่มน้ำให้เต็มที่ตลอดวัน','งดอาหารใหม่ที่ไม่คุ้นเคย'],
    maintain:    ['คาร์บโหลด: ข้าว พาสต้า มันฝรั่ง','โปรตีนย่อยง่าย: ไข่ต้ม ปลา อกไก่','หลีกเลี่ยงไขมันสูง อาหารทอด','ดื่มน้ำ 2–3 ลิตร + Electrolytes','มื้อค่ำ: คาร์บสูง โปรตีนปานกลาง'],
    muscle_gain: ['คาร์บโหลดเต็มที่ 2–3 วัน','โปรตีนย่อยง่ายทุกมื้อ','ไขมันต่ำเพื่อไม่ให้ย่อยช้า','น้ำ + เกลือแร่สม่ำเสมอ','นอนหลับให้พอ 8–9 ชม.'],
  },
  match_day: {
    fat_loss:    ['มื้อก่อนแข่ง 3–4 ชม.: คาร์บ + โปรตีนเบา','ห้ามอดอาหาร — ต้องมีพลังงานพอ','ระหว่างแข่ง: น้ำ + เกลือแร่','หลังแข่ง: คาร์บ + โปรตีนฟื้นฟู','ดื่มน้ำ 150–200 ml ทุก 15–20 นาที'],
    maintain:    ['มื้อเช้าวันแข่ง: ข้าวต้ม ขนมปัง กล้วย','ก่อนแข่ง 1 ชม.: กล้วย หรือ Energy gel','ระหว่างพักครึ่งเวลา: ผลไม้ + น้ำ','หลังแข่ง: Recovery meal ใน 30–45 นาที','ดื่มน้ำทดแทนเหงื่อที่เสียไป'],
    muscle_gain: ['มื้อเช้า: คาร์บสูง ย่อยง่าย','Pre-match: กล้วย หรือข้าวต้มหวาน','ระหว่างแข่ง: เครื่องดื่มเกลือแร่','หลังแข่ง: Recovery shake หรือข้าว + ไก่ + นม','ฟื้นฟูคืนนี้: โปรตีนสูง คาร์บปานกลาง'],
  },
};

const DAY_META: Record<DayType, {label:string;icon:string;color:string;desc:string}> = {
  recovery:  { label:'Recovery',    icon:'💤', color:'#64748b', desc:'พักฟื้น' },
  strength:  { label:'Strength',    icon:'💪', color:'#7c3aed', desc:'เวทเทรนนิ่ง' },
  field_gym: { label:'Field + Gym', icon:'⚽', color:'#0284c7', desc:'ซ้อมสนาม+เวท' },
  pre_match: { label:'Pre-Match',   icon:'🎯', color:'#d97706', desc:'เตรียมแข่ง' },
  match_day: { label:'Match Day',   icon:'🏆', color:'#dc2626', desc:'วันแข่งขัน' },
};

const GOAL_META: Record<Goal, {label:string;icon:string;color:string}> = {
  fat_loss:    { label:'ลดไขมัน',      icon:'📉', color:'#ef4444' },
  maintain:    { label:'รักษาน้ำหนัก', icon:'⚖️', color:'#10b981' },
  muscle_gain: { label:'เพิ่มน้ำหนัก', icon:'📈', color:'#3b82f6' },
};

const INT_META: Record<Intensity, {label:string;icon:string}> = {
  low:      { label:'เบา (Recovery)',  icon:'🌱' },
  moderate: { label:'ปานกลาง',        icon:'🔥' },
  high:     { label:'หนัก',           icon:'⚡' },
  match:    { label:'แข่งขัน',        icon:'🏆' },
};

/* ── helpers ── */
function mid(lo: number, hi: number) { return (lo + hi) / 2; }
function fmt(n: number) { return Math.round(n).toLocaleString(); }

function calcBMR(weight:number, height:number, age:number, gender:Gender) {
  return gender === 'male'
    ? 10*weight + 6.25*height - 5*age + 5
    : 10*weight + 6.25*height - 5*age - 161;
}

/* ── Sub-components ── */
function SelectChip({ label, icon, color, active, onClick }:{label:string;icon:string;color:string;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,
      border:`2px solid ${active?color:'var(--border)'}`,
      background:active?color+'18':'var(--bg)',
      color:active?color:'var(--text-muted)',
      fontWeight:700,fontSize:'0.82rem',cursor:'pointer',transition:'all 0.15s',
      flexShrink:0,
    }}>
      <span style={{fontSize:'1rem'}}>{icon}</span>{label}
    </button>
  );
}

function KpiCard({icon,label,value,unit,color,note}:{icon:string;label:string;value:string;unit:string;color:string;note?:string}) {
  return (
    <div style={{
      background:'var(--surface)',border:`1.5px solid ${color}30`,borderRadius:14,
      padding:'16px 18px',display:'flex',flexDirection:'column',gap:4,
      boxShadow:`0 2px 12px ${color}15`,
    }}>
      <div style={{fontSize:'0.65rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:1,display:'flex',alignItems:'center',gap:5}}>
        <span style={{fontSize:'0.9rem'}}>{icon}</span>{label}
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:5,marginTop:2}}>
        <span style={{fontSize:'2rem',fontWeight:900,color,lineHeight:1}}>{value}</span>
        <span style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)'}}>{unit}</span>
      </div>
      {note&&<div style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:2}}>{note}</div>}
    </div>
  );
}

function MacroBar({label,icon,grams,pct,color}:{label:string;icon:string;grams:number;pct:number;color:string}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:'1rem'}}>{icon}</span>
          <span style={{fontWeight:700,fontSize:'0.82rem'}}>{label}</span>
        </div>
        <div style={{display:'flex',alignItems:'baseline',gap:4}}>
          <span style={{fontWeight:900,fontSize:'1.2rem',color}}>{Math.round(grams)}</span>
          <span style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:700}}>g</span>
          <span style={{fontSize:'0.65rem',color:'var(--text-muted)',marginLeft:4}}>{pct}%</span>
        </div>
      </div>
      <div style={{height:8,borderRadius:4,background:'var(--bg)',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:4,transition:'width 0.5s ease'}}/>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function NutritionPlannerPage({ athletes = [] }: { athletes?: Athlete[] }) {
  /* Athlete picker state */
  const [athleteQuery,  setAthleteQuery]  = useState('');
  const [pickerOpen,    setPickerOpen]    = useState(false);

  /* Form state */
  const [name,      setName]      = useState('');
  const [gender,    setGender]    = useState<Gender>('male');
  const [age,       setAge]       = useState(15);
  const [weight,    setWeight]    = useState(55);
  const [height,    setHeight]    = useState(165);
  const [goal,      setGoal]      = useState<Goal>('maintain');
  const [dayType,   setDayType]   = useState<DayType>('field_gym');
  const [intensity, setIntensity] = useState<Intensity>('high');
  const [calculated, setCalculated] = useState(false);

  /* Athlete search */
  const filteredAthletes = useMemo(() => {
    const q = athleteQuery.toLowerCase();
    return athletes.filter(a =>
      a.Name.toLowerCase().includes(q) || (a.Nickname||'').toLowerCase().includes(q)
    );
  }, [athletes, athleteQuery]);

  const selectAthlete = (a: Athlete) => {
    setName(a.Nickname ? `${a.Name} (${a.Nickname})` : a.Name);
    const dobMs = new Date(a.DOB).getTime();
    if (dobMs > 0) {
      const calcAge = Math.floor((Date.now() - dobMs) / 31557600000);
      if (calcAge >= 8 && calcAge <= 50) setAge(calcAge);
    }
    const w = parseFloat(a.Latest?.Weight || '0');
    if (w >= 20) setWeight(w);
    const h = parseFloat(a.Latest?.Height || '0');
    if (h >= 100) setHeight(h);
    setPickerOpen(false);
    setAthleteQuery('');
  };

  /* Calculation */
  const result = useMemo(() => {
    const bmr  = calcBMR(weight, height, age, gender);
    const tdee = bmr * ACTIVITY[intensity];
    let target = tdee;
    if (goal === 'fat_loss')    target = tdee - 300;
    if (goal === 'muscle_gain') target = tdee + 300;
    target = Math.max(target, 1400); // floor for young athletes

    const [cLo,cHi,pLo,pHi,fLo,fHi] = MACROS[dayType][goal];
    const carbG    = weight * mid(cLo, cHi);
    const proteinG = weight * mid(pLo, pHi);
    const fatG     = weight * mid(fLo, fHi);
    const totalMacroKcal = carbG*4 + proteinG*4 + fatG*9;

    const carbPct    = Math.round(carbG*4    / totalMacroKcal * 100);
    const proteinPct = Math.round(proteinG*4 / totalMacroKcal * 100);
    const fatPct     = 100 - carbPct - proteinPct;

    const tips = TIPS[dayType][goal];

    return { bmr, tdee, target, carbG, proteinG, fatG, carbPct, proteinPct, fatPct,
             carbRange:`${cLo}–${cHi}`, proteinRange:`${pLo}–${pHi}`, fatRange:`${fLo}–${fHi}`,
             tips, totalMacroKcal };
  }, [weight, height, age, gender, goal, dayType, intensity]);

  const bmi = +(weight / ((height/100)**2)).toFixed(1);
  const bmiLabel = bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 25 ? 'ปกติ' : bmi < 30 ? 'น้ำหนักเกิน' : 'อ้วน';
  const bmiColor = bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#10b981' : '#ef4444';

  const dm = DAY_META[dayType];
  const gm = GOAL_META[goal];

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>
      {/* Header */}
      <div className="page-header" style={{marginBottom:20}}>
        <div>
          <h2 className="page-title">Nutrition Planner</h2>
          <p className="page-subtitle">คำนวณพลังงานและสารอาหารสำหรับนักกีฬา</p>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* ── BOX 1: Athlete Info ── */}
        <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
          <div className="section-hd" style={{marginBottom:18}}>
            <i className="bi bi-person-fill me-2" style={{color:'#38bdf8'}}/>ข้อมูลนักกีฬา
          </div>

          {/* Name + Gender row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,marginBottom:14}}>
            <div style={{position:'relative'}}>
              <label className="form-label">ชื่อในทีม</label>
              <input
                className="form-control"
                placeholder="ค้นหาชื่อ / ชื่อเล่น..."
                value={pickerOpen ? athleteQuery : name}
                onFocus={() => { setPickerOpen(true); setAthleteQuery(''); }}
                onChange={e => { setAthleteQuery(e.target.value); setPickerOpen(true); }}
                onBlur={() => setTimeout(() => setPickerOpen(false), 160)}
                style={{fontSize:'0.88rem'}}
              />
              {pickerOpen && (
                <div style={{
                  position:'absolute',top:'100%',left:0,right:0,zIndex:300,
                  background:'var(--surface)',border:'1.5px solid var(--border)',
                  borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.22)',
                  maxHeight:220,overflowY:'auto',marginTop:3,
                }}>
                  {filteredAthletes.length === 0 ? (
                    <div style={{padding:'12px 14px',fontSize:'0.8rem',color:'var(--text-muted)'}}>ไม่พบนักกีฬา</div>
                  ) : filteredAthletes.map(a => (
                    <button key={a.PlayerID} onMouseDown={() => selectAthlete(a)} style={{
                      display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                      width:'100%',background:'none',border:'none',
                      borderBottom:'1px solid var(--border)',cursor:'pointer',
                      textAlign:'left',color:'var(--text-main)',transition:'background 0.1s',
                    }}
                    onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                    onMouseLeave={e=>(e.currentTarget.style.background='none')}
                    >
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:'0.85rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.Name}</div>
                        {a.Nickname && <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{a.Nickname}</div>}
                      </div>
                      {a.Latest?.Weight && (
                        <span style={{fontSize:'0.7rem',color:'var(--text-muted)',flexShrink:0}}>
                          {a.Latest.Weight} kg
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">เพศ</label>
              <div style={{display:'flex',gap:6,marginTop:2}}>
                {(['male','female'] as Gender[]).map(g=>(
                  <button key={g} onClick={()=>setGender(g)} style={{
                    padding:'8px 14px',borderRadius:9,fontWeight:700,fontSize:'0.8rem',cursor:'pointer',
                    background:gender===g?'#38bdf8':'var(--bg)',
                    color:gender===g?'white':'var(--text-muted)',
                    border:`2px solid ${gender===g?'#38bdf8':'var(--border)'}`,transition:'all 0.15s',
                  }}>{g==='male'?'👦 ชาย':'👧 หญิง'}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Age / Weight / Height */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
            {([
              {label:'อายุ',unit:'ปี',val:age,set:setAge,min:8,max:50},
              {label:'น้ำหนัก',unit:'kg',val:weight,set:setWeight,min:20,max:150},
              {label:'ส่วนสูง',unit:'cm',val:height,set:setHeight,min:100,max:220},
            ] as {label:string;unit:string;val:number;set:(v:number)=>void;min:number;max:number}[]).map(f=>(
              <div key={f.label}>
                <label className="form-label">{f.label} ({f.unit})</label>
                <input type="number" className="form-control" value={f.val} min={f.min} max={f.max}
                  onChange={e=>f.set(Number(e.target.value))}
                  style={{fontSize:'1rem',fontWeight:700,textAlign:'center'}}/>
              </div>
            ))}
          </div>

          {/* Goal */}
          <div style={{marginBottom:14}}>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>เป้าหมาย</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(Object.keys(GOAL_META) as Goal[]).map(g=>(
                <SelectChip key={g} {...GOAL_META[g]} active={goal===g} onClick={()=>setGoal(g)}/>
              ))}
            </div>
          </div>

          {/* Day Type */}
          <div style={{marginBottom:14}}>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>ประเภทวันซ้อม</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(Object.keys(DAY_META) as DayType[]).map(d=>(
                <SelectChip key={d} label={DAY_META[d].label} icon={DAY_META[d].icon} color={DAY_META[d].color} active={dayType===d} onClick={()=>setDayType(d)}/>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div style={{marginBottom:18}}>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>ความหนักวันนี้</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(Object.keys(INT_META) as Intensity[]).map(i=>(
                <SelectChip key={i} label={INT_META[i].label} icon={INT_META[i].icon} color='#38bdf8' active={intensity===i} onClick={()=>setIntensity(i)}/>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={()=>setCalculated(true)} style={{width:'100%',padding:'12px',fontSize:'1rem',fontWeight:800,borderRadius:12,letterSpacing:0.5}}>
            <i className="bi bi-calculator me-2"/>คำนวณ
          </button>
        </div>

        {/* ── Results (only after calculate) ── */}
        {calculated && (
          <>
            {/* Summary banner */}
            <div style={{
              padding:'12px 18px',borderRadius:14,
              background:`linear-gradient(135deg,${dm.color}22,${gm.color}11)`,
              border:`1.5px solid ${dm.color}30`,
              display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',
            }}>
              <span style={{fontSize:'1.5rem'}}>{dm.icon}</span>
              <div>
                <div style={{fontWeight:800,fontSize:'0.95rem'}}>{name||'นักกีฬา'} · {dm.label}</div>
                <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>เป้าหมาย: {gm.icon} {gm.label} · BMI {bmi} <span style={{color:bmiColor,fontWeight:700}}>({bmiLabel})</span></div>
              </div>
              <div style={{marginLeft:'auto',textAlign:'right'}}>
                <div style={{fontSize:'0.68rem',color:'var(--text-muted)'}}>Activity Factor</div>
                <div style={{fontWeight:900,fontSize:'1.1rem',color:'#38bdf8'}}>{ACTIVITY[intensity].toFixed(3)}</div>
              </div>
            </div>

            {/* ── BOX 2: Energy Cards ── */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
              <div className="section-hd" style={{marginBottom:16}}>
                <i className="bi bi-lightning-charge-fill me-2" style={{color:'#f59e0b'}}/>ผลคำนวณพลังงาน
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                <KpiCard icon="🔥" label="BMR (พื้นฐาน)" value={fmt(result.bmr)} unit="kcal/วัน"
                  color="#94a3b8" note="พลังงานที่ร่างกายใช้ขณะพัก"/>
                <KpiCard icon="⚡" label="TDEE (รวมกิจกรรม)" value={fmt(result.tdee)} unit="kcal/วัน"
                  color="#38bdf8" note={`BMR × ${ACTIVITY[intensity]}`}/>
                <KpiCard icon="🎯" label={`เป้าหมาย (${gm.label})`} value={fmt(result.target)} unit="kcal/วัน"
                  color={gm.color} note={goal==='fat_loss'?'TDEE − 300':goal==='muscle_gain'?'TDEE + 300':'= TDEE'}/>
                <KpiCard icon={dm.icon} label={`${dm.label}`} value={fmt(result.target)} unit="kcal/วัน"
                  color={dm.color} note={`${INT_META[intensity].icon} ${INT_META[intensity].label}`}/>
              </div>

              {/* Energy balance note */}
              <div style={{marginTop:14,padding:'10px 14px',borderRadius:10,background:'var(--bg)',border:'1px solid var(--border)',fontSize:'0.75rem',color:'var(--text-muted)',lineHeight:1.6}}>
                <strong style={{color:'var(--text-main)'}}>⚖️ Energy Balance:</strong>
                {' '}พลังงานเข้า = ออก → รักษาน้ำหนัก &nbsp;|&nbsp;
                พลังงานเข้า &lt; ออก → ลดน้ำหนัก &nbsp;|&nbsp;
                พลังงานเข้า &gt; ออก → เพิ่มน้ำหนัก
                {goal==='fat_loss'&&<><br/><span style={{color:'#f59e0b'}}>⚠️ เด็กนักบอลไม่ควรลดแบบเร็ว — ลดแค่ 200–300 kcal/วัน เน้นเพิ่มกล้ามลดไขมัน</span></>}
              </div>
            </div>

            {/* ── BOX 3: Macronutrients ── */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
              <div className="section-hd" style={{marginBottom:16}}>
                <i className="bi bi-pie-chart-fill me-2" style={{color:'#10b981'}}/>สารอาหารแนะนำ
                <span style={{marginLeft:8,fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:600}}>อ้างอิงจากน้ำหนัก {weight} kg</span>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:16}}>
                <MacroBar label="คาร์โบไฮเดรต" icon="🍚" grams={result.carbG}    pct={result.carbPct}    color="#f59e0b"/>
                <MacroBar label="โปรตีน"        icon="🥩" grams={result.proteinG} pct={result.proteinPct} color="#ef4444"/>
                <MacroBar label="ไขมัน"         icon="🥑" grams={result.fatG}     pct={result.fatPct}     color="#10b981"/>
              </div>

              {/* Macro detail table */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {([
                  {label:'คาร์บ',icon:'🍚',g:result.carbG,kcal:result.carbG*4,range:result.carbRange,color:'#f59e0b',unit:'4 kcal/g'},
                  {label:'โปรตีน',icon:'🥩',g:result.proteinG,kcal:result.proteinG*4,range:result.proteinRange,color:'#ef4444',unit:'4 kcal/g'},
                  {label:'ไขมัน',icon:'🥑',g:result.fatG,kcal:result.fatG*9,range:result.fatRange,color:'#10b981',unit:'9 kcal/g'},
                ] as {label:string;icon:string;g:number;kcal:number;range:string;color:string;unit:string}[]).map(m=>(
                  <div key={m.label} style={{padding:'12px 14px',borderRadius:12,background:m.color+'10',border:`1.5px solid ${m.color}25`,textAlign:'center'}}>
                    <div style={{fontSize:'1.4rem',marginBottom:4}}>{m.icon}</div>
                    <div style={{fontWeight:900,fontSize:'1.5rem',color:m.color,lineHeight:1}}>{Math.round(m.g)}<span style={{fontSize:'0.7rem',fontWeight:700}}> g</span></div>
                    <div style={{fontSize:'0.62rem',color:'var(--text-muted)',marginTop:2}}>≈ {Math.round(m.kcal)} kcal</div>
                    <div style={{fontSize:'0.6rem',color:m.color,fontWeight:700,marginTop:4}}>{m.range} g/kg</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:12,padding:'8px 12px',borderRadius:8,background:'var(--bg)',border:'1px solid var(--border)',fontSize:'0.68rem',color:'var(--text-muted)'}}>
                ช่วงอ้างอิงสำหรับ <strong>{dm.label}</strong> · เป้าหมาย <strong>{gm.label}</strong>
                &nbsp;·&nbsp; คาร์บ {result.carbRange} g/kg &nbsp;·&nbsp; โปรตีน {result.proteinRange} g/kg &nbsp;·&nbsp; ไขมัน {result.fatRange} g/kg
              </div>
            </div>

            {/* ── BOX 4: Daily Tips ── */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
              <div className="section-hd" style={{marginBottom:14}}>
                <span style={{fontSize:'1.1rem',marginRight:8}}>{dm.icon}</span>คำแนะนำวันนี้
                <span style={{
                  marginLeft:10,padding:'2px 10px',borderRadius:20,
                  background:dm.color+'20',color:dm.color,
                  fontSize:'0.68rem',fontWeight:700,
                }}>{dm.label} · {gm.label}</span>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {result.tips.map((tip,i)=>(
                  <div key={i} style={{
                    display:'flex',alignItems:'flex-start',gap:10,
                    padding:'10px 14px',borderRadius:10,
                    background:i%2===0?'var(--bg)':'var(--surface)',
                    border:'1px solid var(--border)',
                  }}>
                    <div style={{
                      width:24,height:24,borderRadius:6,flexShrink:0,marginTop:1,
                      background:dm.color,color:'white',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:'0.65rem',fontWeight:900,
                    }}>{i+1}</div>
                    <span style={{fontSize:'0.85rem',fontWeight:600,lineHeight:1.5}}>{tip}</span>
                  </div>
                ))}
              </div>

              {/* Hydration reminder */}
              <div style={{
                marginTop:14,padding:'12px 16px',borderRadius:12,
                background:'linear-gradient(135deg,rgba(56,189,248,0.08),rgba(56,189,248,0.03))',
                border:'1.5px solid rgba(56,189,248,0.2)',
                display:'flex',alignItems:'center',gap:10,
              }}>
                <span style={{fontSize:'1.3rem'}}>💧</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.82rem',color:'#38bdf8'}}>การดื่มน้ำ</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>
                    แนะนำ <strong style={{color:'var(--text-main)'}}>{(weight * 0.04).toFixed(1)} – {(weight * 0.06).toFixed(1)} ลิตร/วัน</strong>
                    {' '}(40–60 ml/kg) · ดูสีปัสสาวะ — ควรเหลืองอ่อน
                  </div>
                </div>
              </div>
            </div>

            {/* Print-friendly footer note */}
            <div style={{textAlign:'center',fontSize:'0.65rem',color:'var(--text-muted)',padding:'4px 0 8px'}}>
              ISP Nutrition Planner · คำนวณ ณ วันที่ {new Date().toLocaleDateString('th-TH')} · ค่าที่ได้เป็นค่าประมาณการ ควรปรึกษานักโภชนาการสำหรับแผนรายบุคคล
            </div>
          </>
        )}
      </div>
    </div>
  );
}
