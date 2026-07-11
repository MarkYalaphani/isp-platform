'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

/* ── Types ── */
type Gender    = 'male' | 'female';
type Goal      = 'fat_loss' | 'maintain' | 'muscle_gain';
type DayType   = 'recovery' | 'strength' | 'field_gym' | 'pre_match' | 'match_day';
type Intensity = 'low' | 'moderate' | 'high' | 'match';

interface SavedPlan {
  id: string; playerId: string; playerName: string; team: string;
  gender: Gender; age: number; weight: number; height: number;
  goal: Goal; dayType: DayType; intensity: Intensity;
  targetKcal: number; carbG: number; proteinG: number; fatG: number;
  notes: string; createdBy: string; createdAt: string; updatedAt: string;
}

/* ── Constants ── */
const ACTIVITY: Record<Intensity, number> = {
  low: 1.375, moderate: 1.55, high: 1.725, match: 1.9,
};

const MACROS: Record<DayType, Record<Goal, [number,number,number,number,number,number]>> = {
  recovery:  { fat_loss:[3,4,1.8,2.0,0.8,0.8], maintain:[3,4,1.6,2.0,0.8,1.0], muscle_gain:[4,5,1.8,2.0,0.8,1.0] },
  strength:  { fat_loss:[3,4,1.8,2.0,0.8,0.8], maintain:[4,6,1.6,2.0,0.8,1.0], muscle_gain:[5,7,1.8,2.2,0.8,1.0] },
  field_gym: { fat_loss:[3,5,1.8,2.0,0.8,0.8], maintain:[5,8,1.4,2.0,0.8,1.0], muscle_gain:[6,8,1.6,2.0,0.8,1.0] },
  pre_match: { fat_loss:[4,6,1.6,1.8,0.8,0.8], maintain:[7,10,1.4,1.6,0.8,1.0], muscle_gain:[7,10,1.4,1.6,0.8,1.0] },
  match_day: { fat_loss:[5,7,1.4,1.6,0.8,1.0], maintain:[7,12,1.4,1.6,0.8,1.5], muscle_gain:[7,12,1.4,1.6,0.8,1.5] },
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
  low:      { label:'เบา (Recovery)', icon:'🌱' },
  moderate: { label:'ปานกลาง',       icon:'🔥' },
  high:     { label:'หนัก',          icon:'⚡' },
  match:    { label:'แข่งขัน',       icon:'🏆' },
};

function mid(lo: number, hi: number) { return (lo + hi) / 2; }
function fmt(n: number) { return Math.round(n).toLocaleString(); }
function calcBMR(weight:number, height:number, age:number, gender:Gender) {
  return gender === 'male'
    ? 10*weight + 6.25*height - 5*age + 5
    : 10*weight + 6.25*height - 5*age - 161;
}
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }); }
  catch { return d; }
}

function SelectChip({ label, icon, color, active, onClick }:{label:string;icon:string;color:string;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,
      border:`2px solid ${active?color:'var(--border)'}`,
      background:active?color+'18':'var(--bg)',
      color:active?color:'var(--text-muted)',
      fontWeight:700,fontSize:'0.82rem',cursor:'pointer',transition:'all 0.15s',flexShrink:0,
    }}>
      <span style={{fontSize:'1rem'}}>{icon}</span>{label}
    </button>
  );
}

function KpiCard({icon,label,value,unit,color,note}:{icon:string;label:string;value:string;unit:string;color:string;note?:string}) {
  return (
    <div style={{background:'var(--surface)',border:`1.5px solid ${color}30`,borderRadius:14,padding:'16px 18px',display:'flex',flexDirection:'column',gap:4,boxShadow:`0 2px 12px ${color}15`}}>
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

export default function NutritionPlannerPage({ athletes = [] }: { athletes?: Athlete[] }) {
  /* Athlete picker */
  const [athleteQuery, setAthleteQuery] = useState('');
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  /* Form state */
  const [name,      setName]      = useState('');
  const [gender,    setGender]    = useState<Gender>('male');
  const [age,       setAge]       = useState(15);
  const [weight,    setWeight]    = useState(55);
  const [height,    setHeight]    = useState(165);
  const [goal,      setGoal]      = useState<Goal>('maintain');
  const [dayType,   setDayType]   = useState<DayType>('field_gym');
  const [intensity, setIntensity] = useState<Intensity>('high');
  const [notes,     setNotes]     = useState('');
  const [calculated, setCalculated] = useState(false);

  /* Saved plans state */
  const [plans,         setPlans]         = useState<SavedPlan[]>([]);
  const [loadingPlans,  setLoadingPlans]  = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deletingId,    setDeletingId]    = useState<string | null>(null);

  /* Filter plans by selected athlete */
  const [filterPlayerId, setFilterPlayerId] = useState('');

  /* Athlete search */
  const filteredAthletes = useMemo(() => {
    const q = athleteQuery.toLowerCase();
    return athletes.filter(a =>
      a.Name.toLowerCase().includes(q) || (a.Nickname||'').toLowerCase().includes(q)
    );
  }, [athletes, athleteQuery]);

  const selectAthlete = (a: Athlete) => {
    setSelectedAthlete(a);
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
    target = Math.max(target, 1400);
    const [cLo,cHi,pLo,pHi,fLo,fHi] = MACROS[dayType][goal];
    const carbG    = weight * mid(cLo, cHi);
    const proteinG = weight * mid(pLo, pHi);
    const fatG     = weight * mid(fLo, fHi);
    const totalMacroKcal = carbG*4 + proteinG*4 + fatG*9;
    const carbPct    = Math.round(carbG*4    / totalMacroKcal * 100);
    const proteinPct = Math.round(proteinG*4 / totalMacroKcal * 100);
    const fatPct     = 100 - carbPct - proteinPct;
    return { bmr, tdee, target, carbG, proteinG, fatG, carbPct, proteinPct, fatPct,
             carbRange:`${cLo}–${cHi}`, proteinRange:`${pLo}–${pHi}`, fatRange:`${fLo}–${fHi}`,
             tips: TIPS[dayType][goal], totalMacroKcal };
  }, [weight, height, age, gender, goal, dayType, intensity]);

  const bmi = +(weight / ((height/100)**2)).toFixed(1);
  const bmiLabel = bmi < 18.5 ? 'น้ำหนักน้อย' : bmi < 25 ? 'ปกติ' : bmi < 30 ? 'น้ำหนักเกิน' : 'อ้วน';
  const bmiColor = bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#10b981' : '#ef4444';
  const dm = DAY_META[dayType];
  const gm = GOAL_META[goal];

  /* Load saved plans */
  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const d = await callGAS('getNutritionPlans', {}) as SavedPlan[];
      setPlans(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
    finally { setLoadingPlans(false); }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  /* Save / Update plan */
  const handleSave = async () => {
    if (!selectedAthlete) { showToast('กรุณาเลือกนักกีฬาก่อนบันทึก', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        playerId: selectedAthlete.PlayerID,
        playerName: selectedAthlete.Name,
        team: selectedAthlete.Team || '',
        gender, age, weight, height, goal, dayType, intensity,
        targetKcal: Math.round(result.target),
        carbG: Math.round(result.carbG),
        proteinG: Math.round(result.proteinG),
        fatG: Math.round(result.fatG),
        notes,
      };
      if (editingPlanId) {
        await callGAS('updateNutritionPlan', { id: editingPlanId, ...payload });
        showToast('อัปเดตแผนสำเร็จ', 'success');
        setEditingPlanId(null);
      } else {
        await callGAS('saveNutritionPlan', payload);
        showToast('บันทึกแผนสำเร็จ', 'success');
      }
      loadPlans();
    } catch { showToast('บันทึกไม่สำเร็จ', 'error'); }
    finally { setSaving(false); }
  };

  /* Load plan into form for editing */
  const loadPlanIntoForm = (p: SavedPlan) => {
    const a = athletes.find(x => x.PlayerID === p.playerId);
    if (a) setSelectedAthlete(a);
    setName(p.playerName);
    setGender(p.gender);
    setAge(p.age);
    setWeight(p.weight);
    setHeight(p.height);
    setGoal(p.goal);
    setDayType(p.dayType);
    setIntensity(p.intensity);
    setNotes(p.notes || '');
    setEditingPlanId(p.id);
    setCalculated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('โหลดแผนแล้ว — แก้ไขและกด "อัปเดตแผน"', 'info');
  };

  /* Delete plan */
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await callGAS('deleteNutritionPlan', { id });
      showToast('ลบแผนสำเร็จ', 'success');
      setPlans(prev => prev.filter(p => p.id !== id));
      if (editingPlanId === id) { setEditingPlanId(null); }
      setConfirmDelete(null);
    } catch { showToast('ลบไม่สำเร็จ', 'error'); }
    finally { setDeletingId(null); }
  };

  const cancelEdit = () => {
    setEditingPlanId(null);
    setNotes('');
    showToast('ยกเลิกการแก้ไข', 'info');
  };

  /* Filtered plans */
  const displayedPlans = filterPlayerId
    ? plans.filter(p => p.playerId === filterPlayerId)
    : plans;

  const uniqueAthleteOptions = useMemo(() => {
    const seen = new Set<string>();
    return plans.filter(p => {
      if (seen.has(p.playerId)) return false;
      seen.add(p.playerId);
      return true;
    });
  }, [plans]);

  return (
    <div style={{maxWidth:900,margin:'0 auto'}}>
      <div className="page-header" style={{marginBottom:20}}>
        <div>
          <h2 className="page-title">Nutrition Planner</h2>
          <p className="page-subtitle">คำนวณและบันทึกแผนโภชนาการรายนักกีฬา</p>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* Edit mode banner */}
        {editingPlanId && (
          <div style={{padding:'12px 18px',borderRadius:12,background:'rgba(245,158,11,0.1)',border:'2px solid rgba(245,158,11,0.3)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <span style={{fontSize:'1.1rem'}}>✏️</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#f59e0b',fontSize:'0.88rem'}}>กำลังแก้ไขแผน</div>
              <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>แก้ไขค่าแล้วกด "อัปเดตแผน" หรือกดยกเลิกเพื่อออก</div>
            </div>
            <button onClick={cancelEdit} className="btn-outline btn-sm" style={{flexShrink:0}}>ยกเลิก</button>
          </div>
        )}

        {/* ── BOX 1: Athlete Info ── */}
        <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
          <div className="section-hd" style={{marginBottom:18}}>
            <i className="bi bi-person-fill me-2" style={{color:'#38bdf8'}}/>ข้อมูลนักกีฬา
          </div>

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
                <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:300,background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.22)',maxHeight:220,overflowY:'auto',marginTop:3}}>
                  {filteredAthletes.length === 0
                    ? <div style={{padding:'12px 14px',fontSize:'0.8rem',color:'var(--text-muted)'}}>ไม่พบนักกีฬา</div>
                    : filteredAthletes.map(a => (
                      <button key={a.PlayerID} onMouseDown={() => selectAthlete(a)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',width:'100%',background:'none',border:'none',borderBottom:'1px solid var(--border)',cursor:'pointer',textAlign:'left',color:'var(--text-main)',transition:'background 0.1s'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--bg)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'0.85rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.Name}</div>
                          {a.Nickname && <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{a.Nickname}</div>}
                        </div>
                        {a.Latest?.Weight && <span style={{fontSize:'0.7rem',color:'var(--text-muted)',flexShrink:0}}>{a.Latest.Weight} kg</span>}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
            <div>
              <label className="form-label">เพศ</label>
              <div style={{display:'flex',gap:6,marginTop:2}}>
                {(['male','female'] as Gender[]).map(g=>(
                  <button key={g} onClick={()=>setGender(g)} style={{padding:'8px 14px',borderRadius:9,fontWeight:700,fontSize:'0.8rem',cursor:'pointer',background:gender===g?'#38bdf8':'var(--bg)',color:gender===g?'white':'var(--text-muted)',border:`2px solid ${gender===g?'#38bdf8':'var(--border)'}`,transition:'all 0.15s'}}>
                    {g==='male'?'👦 ชาย':'👧 หญิง'}
                  </button>
                ))}
              </div>
            </div>
          </div>

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

          <div style={{marginBottom:14}}>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>เป้าหมาย</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(Object.keys(GOAL_META) as Goal[]).map(g=>(
                <SelectChip key={g} {...GOAL_META[g]} active={goal===g} onClick={()=>setGoal(g)}/>
              ))}
            </div>
          </div>

          <div style={{marginBottom:14}}>
            <label className="form-label" style={{marginBottom:8,display:'block'}}>ประเภทวันซ้อม</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {(Object.keys(DAY_META) as DayType[]).map(d=>(
                <SelectChip key={d} label={DAY_META[d].label} icon={DAY_META[d].icon} color={DAY_META[d].color} active={dayType===d} onClick={()=>setDayType(d)}/>
              ))}
            </div>
          </div>

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

        {/* ── Results ── */}
        {calculated && (
          <>
            {/* Summary banner */}
            <div style={{padding:'12px 18px',borderRadius:14,background:`linear-gradient(135deg,${dm.color}22,${gm.color}11)`,border:`1.5px solid ${dm.color}30`,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
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

            {/* Energy Cards */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
              <div className="section-hd" style={{marginBottom:16}}>
                <i className="bi bi-lightning-charge-fill me-2" style={{color:'#f59e0b'}}/>ผลคำนวณพลังงาน
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                <KpiCard icon="🔥" label="BMR (พื้นฐาน)" value={fmt(result.bmr)} unit="kcal/วัน" color="#94a3b8" note="พลังงานที่ร่างกายใช้ขณะพัก"/>
                <KpiCard icon="⚡" label="TDEE (รวมกิจกรรม)" value={fmt(result.tdee)} unit="kcal/วัน" color="#38bdf8" note={`BMR × ${ACTIVITY[intensity]}`}/>
                <KpiCard icon="🎯" label={`เป้าหมาย (${gm.label})`} value={fmt(result.target)} unit="kcal/วัน" color={gm.color} note={goal==='fat_loss'?'TDEE − 300':goal==='muscle_gain'?'TDEE + 300':'= TDEE'}/>
                <KpiCard icon={dm.icon} label={dm.label} value={fmt(result.target)} unit="kcal/วัน" color={dm.color} note={`${INT_META[intensity].icon} ${INT_META[intensity].label}`}/>
              </div>
              <div style={{marginTop:14,padding:'10px 14px',borderRadius:10,background:'var(--bg)',border:'1px solid var(--border)',fontSize:'0.75rem',color:'var(--text-muted)',lineHeight:1.6}}>
                <strong style={{color:'var(--text-main)'}}>⚖️ Energy Balance:</strong>
                {' '}พลังงานเข้า = ออก → รักษาน้ำหนัก &nbsp;|&nbsp; พลังงานเข้า &lt; ออก → ลดน้ำหนัก &nbsp;|&nbsp; พลังงานเข้า &gt; ออก → เพิ่มน้ำหนัก
                {goal==='fat_loss'&&<><br/><span style={{color:'#f59e0b'}}>⚠️ เด็กนักบอลไม่ควรลดแบบเร็ว — ลดแค่ 200–300 kcal/วัน เน้นเพิ่มกล้ามลดไขมัน</span></>}
              </div>
            </div>

            {/* Macronutrients */}
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
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {([
                  {label:'คาร์บ',icon:'🍚',g:result.carbG,kcal:result.carbG*4,range:result.carbRange,color:'#f59e0b'},
                  {label:'โปรตีน',icon:'🥩',g:result.proteinG,kcal:result.proteinG*4,range:result.proteinRange,color:'#ef4444'},
                  {label:'ไขมัน',icon:'🥑',g:result.fatG,kcal:result.fatG*9,range:result.fatRange,color:'#10b981'},
                ] as {label:string;icon:string;g:number;kcal:number;range:string;color:string}[]).map(m=>(
                  <div key={m.label} style={{padding:'12px 14px',borderRadius:12,background:m.color+'10',border:`1.5px solid ${m.color}25`,textAlign:'center'}}>
                    <div style={{fontSize:'1.4rem',marginBottom:4}}>{m.icon}</div>
                    <div style={{fontWeight:900,fontSize:'1.5rem',color:m.color,lineHeight:1}}>{Math.round(m.g)}<span style={{fontSize:'0.7rem',fontWeight:700}}> g</span></div>
                    <div style={{fontSize:'0.62rem',color:'var(--text-muted)',marginTop:2}}>≈ {Math.round(m.kcal)} kcal</div>
                    <div style={{fontSize:'0.6rem',color:m.color,fontWeight:700,marginTop:4}}>{m.range} g/kg</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px'}}>
              <div className="section-hd" style={{marginBottom:14}}>
                <span style={{fontSize:'1.1rem',marginRight:8}}>{dm.icon}</span>คำแนะนำวันนี้
                <span style={{marginLeft:10,padding:'2px 10px',borderRadius:20,background:dm.color+'20',color:dm.color,fontSize:'0.68rem',fontWeight:700}}>{dm.label} · {gm.label}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {result.tips.map((tip,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',borderRadius:10,background:i%2===0?'var(--bg)':'var(--surface)',border:'1px solid var(--border)'}}>
                    <div style={{width:24,height:24,borderRadius:6,flexShrink:0,marginTop:1,background:dm.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:900}}>{i+1}</div>
                    <span style={{fontSize:'0.85rem',fontWeight:600,lineHeight:1.5}}>{tip}</span>
                  </div>
                ))}
              </div>
              <div style={{padding:'12px 16px',borderRadius:12,background:'linear-gradient(135deg,rgba(56,189,248,0.08),rgba(56,189,248,0.03))',border:'1.5px solid rgba(56,189,248,0.2)',display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:'1.3rem'}}>💧</span>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.82rem',color:'#38bdf8'}}>การดื่มน้ำ</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>
                    แนะนำ <strong style={{color:'var(--text-main)'}}>{(weight*0.04).toFixed(1)} – {(weight*0.06).toFixed(1)} ลิตร/วัน</strong> (40–60 ml/kg)
                  </div>
                </div>
              </div>
            </div>

            {/* ── Save/Update box ── */}
            <div className="surface" style={{borderRadius:16,padding:'20px 22px',border:`2px solid ${editingPlanId?'rgba(245,158,11,0.3)':'var(--border)'}`}}>
              <div className="section-hd" style={{marginBottom:14}}>
                <i className={`bi ${editingPlanId?'bi-pencil-square':'bi-floppy-fill'} me-2`} style={{color:editingPlanId?'#f59e0b':'#10b981'}}/>
                {editingPlanId ? 'อัปเดตแผนที่บันทึกไว้' : 'บันทึกแผนนี้'}
              </div>
              {!selectedAthlete && (
                <div style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',fontSize:'0.78rem',color:'#f59e0b'}}>
                  ⚠️ กรุณาเลือกชื่อนักกีฬาจากระบบ (ค้นหาในช่องด้านบน) เพื่อบันทึก
                </div>
              )}
              <div style={{marginBottom:12}}>
                <label className="form-label">หมายเหตุ / โน้ตโค้ช (ไม่บังคับ)</label>
                <textarea className="form-control" value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="เช่น แพ้แลคโตส, ชอบกินข้าวเหนียว, แนะนำให้กินเพิ่มช่วงซ้อมหนัก..."
                  rows={2} style={{fontSize:'0.85rem',resize:'vertical'}}/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn-primary" onClick={handleSave} disabled={saving||!selectedAthlete} style={{flex:1,background:editingPlanId?'#f59e0b':'',borderColor:editingPlanId?'#f59e0b':''}}>
                  {saving
                    ? <><span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/> บันทึก...</>
                    : <><i className={`bi ${editingPlanId?'bi-check-circle-fill':'bi-floppy-fill'} me-1`}/>{editingPlanId?'อัปเดตแผน':'บันทึกแผนนี้'}</>
                  }
                </button>
                {editingPlanId && (
                  <button className="btn-outline" onClick={cancelEdit} style={{flexShrink:0}}>ยกเลิก</button>
                )}
              </div>
            </div>

            <div style={{textAlign:'center',fontSize:'0.65rem',color:'var(--text-muted)',padding:'4px 0 8px'}}>
              ISP Nutrition Planner · {new Date().toLocaleDateString('th-TH')} · ค่าที่ได้เป็นค่าประมาณการ
            </div>
          </>
        )}

        {/* ── Saved Plans ── */}
        <div className="surface" style={{padding:0,overflow:'hidden',borderRadius:16}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <div style={{fontWeight:700,fontSize:'0.88rem',display:'flex',alignItems:'center',gap:7}}>
              <i className="bi bi-collection-fill" style={{color:'#818cf8'}}/>แผนที่บันทึกไว้ ({plans.length})
            </div>
            {/* Filter by athlete */}
            {uniqueAthleteOptions.length > 1 && (
              <select value={filterPlayerId} onChange={e=>setFilterPlayerId(e.target.value)}
                className="form-select" style={{flex:'0 0 auto',width:'auto',fontSize:'0.78rem',padding:'4px 10px'}}>
                <option value="">— ทุกคน —</option>
                {uniqueAthleteOptions.map(p => (
                  <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
                ))}
              </select>
            )}
            <button className="btn-outline btn-sm" onClick={loadPlans} disabled={loadingPlans} style={{marginLeft:'auto',padding:'4px 12px'}}>
              {loadingPlans ? <span className="spinner-ring" style={{width:12,height:12,borderWidth:2,margin:0}}/> : <><i className="bi bi-arrow-clockwise me-1"/>รีเฟรช</>}
            </button>
          </div>

          {loadingPlans && (
            <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>
          )}
          {!loadingPlans && displayedPlans.length === 0 && (
            <div style={{textAlign:'center',padding:'50px 20px',color:'var(--text-muted)'}}>
              <i className="bi bi-collection" style={{fontSize:'2.5rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>
              <p style={{fontSize:'0.85rem'}}>ยังไม่มีแผนที่บันทึกไว้</p>
            </div>
          )}
          {!loadingPlans && displayedPlans.length > 0 && (
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                <thead><tr style={{background:'var(--bg)'}}>
                  {['นักกีฬา','ประเภทวัน','เป้าหมาย','พลังงาน','คาร์บ','โปรตีน','ไขมัน','หมายเหตุ','อัปเดต','จัดการ'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',textAlign:h==='นักกีฬา'?'left':'center',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {displayedPlans.map(p => {
                    const dm2 = DAY_META[p.dayType];
                    const gm2 = GOAL_META[p.goal];
                    const isDel = confirmDelete === p.id;
                    const isEditThis = editingPlanId === p.id;
                    return (
                      <tr key={p.id} style={{borderBottom:'1px solid var(--border)',background:isEditThis?'rgba(245,158,11,0.04)':''}}>
                        <td style={{padding:'10px 12px'}}>
                          <div style={{fontWeight:700}}>{p.playerName}</div>
                          {p.team && <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{p.team}</div>}
                          <div style={{fontSize:'0.62rem',color:'var(--text-muted)'}}>{p.weight} kg · {p.height} cm · {p.age} ปี</div>
                        </td>
                        <td style={{textAlign:'center',padding:'8px 12px'}}>
                          <div style={{fontSize:'1rem'}}>{dm2.icon}</div>
                          <div style={{fontWeight:600,fontSize:'0.7rem',color:dm2.color}}>{dm2.label}</div>
                        </td>
                        <td style={{textAlign:'center',padding:'8px 12px'}}>
                          <span style={{fontSize:'0.7rem',fontWeight:700,color:gm2.color}}>{gm2.icon} {gm2.label}</span>
                        </td>
                        <td style={{textAlign:'center',padding:'8px 12px'}}>
                          <span style={{fontWeight:900,color:'#38bdf8'}}>{p.targetKcal.toLocaleString()}</span>
                          <span style={{fontSize:'0.62rem',color:'var(--text-muted)'}}> kcal</span>
                        </td>
                        <td style={{textAlign:'center',color:'#f59e0b',fontWeight:700}}>{p.carbG}g</td>
                        <td style={{textAlign:'center',color:'#ef4444',fontWeight:700}}>{p.proteinG}g</td>
                        <td style={{textAlign:'center',color:'#10b981',fontWeight:700}}>{p.fatG}g</td>
                        <td style={{padding:'8px 12px',maxWidth:120}}>
                          <div style={{fontSize:'0.7rem',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:110}}>
                            {p.notes || '—'}
                          </div>
                        </td>
                        <td style={{textAlign:'center',fontSize:'0.68rem',color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                          {fmtDate(p.updatedAt)}
                        </td>
                        <td style={{textAlign:'center',padding:'8px 8px',whiteSpace:'nowrap'}}>
                          {isDel ? (
                            <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                              <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                                style={{background:'#ef4444',color:'white',border:'none',borderRadius:6,padding:'4px 10px',fontSize:'0.7rem',fontWeight:700,cursor:'pointer'}}>
                                {deletingId === p.id ? '...' : 'ยืนยัน'}
                              </button>
                              <button onClick={() => setConfirmDelete(null)}
                                style={{background:'var(--bg)',color:'var(--text-muted)',border:'1px solid var(--border)',borderRadius:6,padding:'4px 8px',fontSize:'0.7rem',cursor:'pointer'}}>ยกเลิก</button>
                            </div>
                          ) : (
                            <div style={{display:'flex',gap:4,justifyContent:'center'}}>
                              <button onClick={() => loadPlanIntoForm(p)} title="แก้ไข"
                                style={{background: isEditThis?'rgba(245,158,11,0.15)':'rgba(56,189,248,0.1)',color:isEditThis?'#f59e0b':'#38bdf8',border:`1px solid ${isEditThis?'#f59e0b40':'#38bdf840'}`,borderRadius:6,padding:'5px 10px',fontSize:'0.75rem',cursor:'pointer',fontWeight:700}}>
                                <i className="bi bi-pencil-fill"/>
                              </button>
                              <button onClick={() => setConfirmDelete(p.id)} title="ลบ"
                                style={{background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid #ef444440',borderRadius:6,padding:'5px 10px',fontSize:'0.75rem',cursor:'pointer'}}>
                                <i className="bi bi-trash-fill"/>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
