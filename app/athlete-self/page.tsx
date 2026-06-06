'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

type AthleteOption = { id: string; name: string; team: string };

/* ── Data definitions (same as main IDP) ───────────────────── */
const BEHAVIOUR = [
  { key:'b_ontime',        label:'การตรงต่อเวลา',              en:'Be On Time'        },
  { key:'b_effort',        label:'ความมุ่งมั่นพยายาม',          en:'Effort'            },
  { key:'b_teamwork',      label:'การทำงานเป็นทีม',             en:'Teamwork'          },
  { key:'b_respect',       label:'การให้เกียรติผู้อื่น',        en:'Respect'           },
  { key:'b_attendance',    label:'การเข้าร่วมฝึกซ้อม',          en:'Attendance'        },
  { key:'b_participation', label:'การมีส่วนร่วมในการฝึก',       en:'Participation'     },
  { key:'b_improvement',   label:'พัฒนาการของตัวเอง',           en:'Self Improvement'  },
];
const LIFESTYLE = [
  { key:'l_sleep',         label:'การนอนหลับพักผ่อน',          en:'Sleep'             },
  { key:'l_hydration',     label:'การดื่มน้ำเพียงพอ',           en:'Hydration'         },
  { key:'l_diet',          label:'การรับประทานอาหาร',            en:'Diet'              },
  { key:'l_screentime',    label:'การใช้อุปกรณ์อิเล็กทรอนิกส์',en:'Screen Time'       },
];
const TECHNICAL = [
  { key:'t_motricity',     label:'กลไกและการเคลื่อนไหวร่างกาย', en:'Motricity'        },
  { key:'t_technical',     label:'ทักษะเทคนิคลูกบอล',            en:'Technical Skills' },
  { key:'t_tactic',        label:'การอ่านเกมและยุทธวิธี',         en:'Tactical Awareness' },
  { key:'t_offfundam',     label:'พื้นฐานเกมรุก',                 en:'Offensive Fundamentals' },
  { key:'t_deffundam',     label:'พื้นฐานเกมรับ',                 en:'Defensive Fundamentals' },
  { key:'t_fitness',       label:'สมรรถภาพทางกาย',                en:'Physical Fitness' },
];

const SCORE_COLOR = (n: number, sel: boolean) => ({
  bg:     sel ? (n<=2?'#ef4444':n===3?'#f59e0b':n===4?'#22c55e':'#0284c7') : 'white',
  border: sel ? (n<=2?'#ef4444':n===3?'#f59e0b':n===4?'#22c55e':'#0284c7') : '#e2e8f0',
  color:  sel ? 'white' : '#cbd5e1',
});

/* ── Section wrapper ──────────────────────────────────────── */
function SectionCard({ num, icon, title, titleTH, color, children }: {
  num: number; icon: string; title: string; titleTH: string; color: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background:'white', borderRadius:18, overflow:'hidden', marginBottom:14, boxShadow:'0 2px 16px rgba(0,0,0,0.07)', border:`1px solid ${color}22` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:`${color}0d`, borderBottom:`1px solid ${color}22` }}>
        <div style={{ width:28, height:28, borderRadius:8, background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.82rem', color, flexShrink:0 }}>{num}</div>
        <span style={{ fontSize:'1rem' }}>{icon}</span>
        <div>
          <div style={{ fontWeight:800, fontSize:'0.9rem', color }}>{title}</div>
          <div style={{ fontSize:'0.65rem', color:'#94a3b8' }}>{titleTH}</div>
        </div>
      </div>
      <div style={{ padding:'14px 18px' }}>{children}</div>
    </div>
  );
}

/* ── Rating row ───────────────────────────────────────────── */
function RatingRow({ label, en, value, onChange, color }: {
  label: string; en: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'9px 0', borderBottom:'1px solid #f8fafc' }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#0f172a' }}>{label}</div>
        <div style={{ fontSize:'0.65rem', color:'#94a3b8', marginTop:1 }}>{en}</div>
      </div>
      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
        {[1,2,3,4,5].map(n => {
          const c = SCORE_COLOR(n, value===n);
          return (
            <button key={n} type="button" onClick={() => onChange(value===n ? 0 : n)} style={{
              width:36, height:36, borderRadius:9, border:`2px solid ${c.border}`,
              background:c.bg, color:c.color, fontWeight:800, fontSize:'0.85rem',
              cursor:'pointer', transition:'all 0.12s',
              transform: value===n ? 'scale(1.12)' : 'scale(1)',
            }}>{n}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Progress dots ────────────────────────────────────────── */
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'10px 0' }}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{ width: i<current ? 20 : 8, height:8, borderRadius:4, background: i<current ? '#0284c7' : '#e2e8f0', transition:'all 0.3s' }}/>
      ))}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────── */
function AthleteSelfContent() {
  const params   = useSearchParams();
  const clubId   = params.get('club') || '';

  const [step,      setStep]      = useState<'select'|'form'|'done'>('select');
  const [athletes,  setAthletes]  = useState<AthleteOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selId,     setSelId]     = useState('');

  /* scores */
  const [scores,    setScores]    = useState<Record<string,number>>({});
  /* medical */
  const [med, setMed] = useState({ period1:'', injury1:'', absence1:'', period2:'', injury2:'', absence2:'' });
  /* observations */
  const [goodLevel,  setGoodLevel]  = useState('');
  const [toImprove,  setToImprove]  = useState('');
  /* goals */
  const [goalShort,  setGoalShort]  = useState('');
  const [goalLong,   setGoalLong]   = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [dream,      setDream]      = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState('');

  useEffect(() => {
    const url = clubId ? `/api/athlete-self?club=${encodeURIComponent(clubId)}` : '/api/athlete-self';
    fetch(url)
      .then(r => r.json())
      .then(d => { setAthletes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clubId]);

  const athlete   = athletes.find(a => a.id === selId);
  const setScore  = (key: string, val: number) => setScores(p => ({ ...p, [key]: p[key]===val ? 0 : val }));

  /* progress */
  const allKeys   = [...BEHAVIOUR, ...LIFESTYLE, ...TECHNICAL].map(x => x.key);
  const filled    = allKeys.filter(k => (scores[k]||0)>0).length;
  const progress  = Math.round(filled / allKeys.length * 100);

  const handleSubmit = async () => {
    if (!selId) return;
    setSubmitting(true); setErr('');
    try {
      const res  = await fetch('/api/athlete-self', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          pid: selId, ...scores,
          ...med,
          goodLevel, toImprove,
          goalShort, goalLong, actionPlan, dream,
        }),
      });
      const data = await res.json();
      if (data.ok) setStep('done');
      else setErr(data.error || 'เกิดข้อผิดพลาด');
    } catch { setErr('ไม่สามารถเชื่อมต่อได้'); }
    finally { setSubmitting(false); }
  };

  /* ── DONE ── */
  if (step==='done') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#f0f9ff,#f8fafc)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ textAlign:'center', maxWidth:360 }}>
        <div style={{ fontSize:'5rem', marginBottom:16 }}>🎯</div>
        <h2 style={{ color:'#10b981', margin:'0 0 10px', fontSize:'1.5rem', fontWeight:900 }}>ส่งข้อมูลสำเร็จ!</h2>
        <p style={{ color:'#64748b', fontSize:'0.9rem', lineHeight:1.7, margin:0 }}>
          ขอบคุณ <strong>{athlete?.name}</strong><br/>
          โค้ชจะนำข้อมูลไปวางแผนพัฒนาของคุณต่อไป
        </p>
      </div>
    </div>
  );

  /* ── SELECT NAME ── */
  if (step==='select') return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f172a,#1e3a5f)', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ width:'100%', maxWidth:400, background:'white', borderRadius:24, padding:'36px 28px', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:'3rem', marginBottom:10 }}>🎯</div>
          <h2 style={{ margin:'0 0 6px', fontSize:'1.4rem', fontWeight:900, color:'#0f172a' }}>IDP Self Assessment</h2>
          <p style={{ margin:0, fontSize:'0.82rem', color:'#64748b', lineHeight:1.6 }}>
            ประเมินตัวเองและกรอกเป้าหมาย<br/>Individual Development Plan
          </p>
        </div>
        <label style={{ fontSize:'0.82rem', fontWeight:700, color:'#475569', display:'block', marginBottom:8 }}>เลือกชื่อของคุณ *</label>
        {loading
          ? <div style={{ textAlign:'center', padding:'24px 0', color:'#94a3b8', fontSize:'0.9rem' }}>⏳ กำลังโหลด...</div>
          : <select value={selId} onChange={e => setSelId(e.target.value)} style={{ width:'100%', padding:'13px 14px', borderRadius:12, border:'2px solid #e2e8f0', fontSize:'1rem', fontWeight:600, color:selId?'#0f172a':'#94a3b8', outline:'none', background:'white', marginBottom:20 }}>
              <option value="">— เลือกชื่อของคุณ —</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.name}{a.team?` (${a.team})`:''}</option>)}
            </select>
        }
        <button onClick={() => selId && setStep('form')} disabled={!selId} style={{
          width:'100%', padding:'15px', borderRadius:14, border:'none',
          cursor: selId?'pointer':'not-allowed', fontWeight:800, fontSize:'1rem',
          background: selId?'linear-gradient(135deg,#0f172a,#1e3a5f)':'#e2e8f0',
          color: selId?'white':'#94a3b8', transition:'all 0.2s',
          boxShadow: selId?'0 4px 20px rgba(15,23,42,0.3)':'none',
        }}>
          เริ่มกรอกข้อมูล →
        </button>
      </div>
    </div>
  );

  /* ── FORM ── */
  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ maxWidth:580, margin:'0 auto', padding:'0 14px 48px' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#0f172a,#1e3a5f)', padding:'20px 20px 16px', marginBottom:16, borderRadius:'0 0 20px 20px', boxShadow:'0 4px 20px rgba(15,23,42,0.2)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <span style={{ fontSize:'1.5rem' }}>🎯</span>
            <div>
              <div style={{ fontWeight:900, fontSize:'1rem', color:'white' }}>IDP Self Assessment</div>
              <div style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.55)' }}>Individual Development Plan</div>
            </div>
            <button onClick={() => setStep('select')} style={{ marginLeft:'auto', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', color:'white', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:'0.72rem', fontWeight:700 }}>
              เปลี่ยนชื่อ
            </button>
          </div>
          {/* Athlete badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'8px 14px' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'rgba(56,189,248,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'#38bdf8', fontSize:'0.9rem' }}>
              {(athlete?.name||'?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:800, color:'white', fontSize:'0.9rem' }}>{athlete?.name}</div>
              {athlete?.team && <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.55)' }}>{athlete.team}</div>}
            </div>
          </div>
          {/* Progress */}
          {filled > 0 && (
            <div style={{ marginTop:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.55)', fontWeight:700 }}>ความคืบหน้า</span>
                <span style={{ fontSize:'0.65rem', color:progress===100?'#34d399':'rgba(255,255,255,0.7)', fontWeight:800 }}>{filled}/{allKeys.length}</span>
              </div>
              <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.15)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background:progress===100?'#34d399':'#38bdf8', width:`${progress}%`, transition:'width 0.4s' }}/>
              </div>
            </div>
          )}
        </div>

        {/* ① Behaviour */}
        <SectionCard num={1} icon="🧠" title="การประเมินพฤติกรรม" titleTH="Behaviour Assessment  (1=ต้องปรับปรุง · 5=ดีมาก)" color="#818cf8">
          {BEHAVIOUR.map(item => (
            <RatingRow key={item.key} label={item.label} en={item.en}
              value={scores[item.key]||0} onChange={v=>setScore(item.key,v)} color="#818cf8"/>
          ))}
        </SectionCard>

        {/* ② Lifestyle */}
        <SectionCard num={2} icon="🌿" title="การประเมินวิถีชีวิต" titleTH="Lifestyle Assessment  (ดูแลตัวเองช่วงนี้เป็นอย่างไร?)" color="#34d399">
          {LIFESTYLE.map(item => (
            <RatingRow key={item.key} label={item.label} en={item.en}
              value={scores[item.key]||0} onChange={v=>setScore(item.key,v)} color="#34d399"/>
          ))}
        </SectionCard>

        {/* ③ Technical */}
        <SectionCard num={3} icon="⚽" title="การประเมินทักษะของตัวเอง" titleTH="Technical Self-Assessment  (ให้คะแนนตัวเองตามความเป็นจริง)" color="#38bdf8">
          {TECHNICAL.map(item => (
            <RatingRow key={item.key} label={item.label} en={item.en}
              value={scores[item.key]||0} onChange={v=>setScore(item.key,v)} color="#38bdf8"/>
          ))}
        </SectionCard>

        {/* ④ Medical */}
        <SectionCard num={4} icon="🩺" title="ประวัติการบาดเจ็บ" titleTH="Injury / Medical Record  (ถ้าไม่มีข้ามได้)" color="#ef4444">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {([
              {label:'ช่วงเวลา (1)',     k:'period1',  ph:'เช่น ม.ค. 2026'},
              {label:'อาการบาดเจ็บ (1)', k:'injury1',  ph:'เช่น ข้อเท้า, กล้ามเนื้อต้นขา...'},
              {label:'ระยะเวลาพัก (1)',  k:'absence1', ph:'เช่น 2 สัปดาห์'},
              {label:'ช่วงเวลา (2)',     k:'period2',  ph:''},
              {label:'อาการบาดเจ็บ (2)', k:'injury2',  ph:''},
              {label:'ระยะเวลาพัก (2)',  k:'absence2', ph:''},
            ] as {label:string;k:keyof typeof med;ph:string}[]).map(f => (
              <div key={f.k}>
                <label style={{ fontSize:'0.75rem', fontWeight:700, color:'#475569', display:'block', marginBottom:4 }}>{f.label}</label>
                <input value={med[f.k]} onChange={e => setMed(m => ({...m,[f.k]:e.target.value}))} placeholder={f.ph}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:'0.875rem', outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
                  onFocus={e=>e.currentTarget.style.borderColor='#ef4444'}
                  onBlur={e =>e.currentTarget.style.borderColor='#e2e8f0'}
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ⑤ Observations */}
        <SectionCard num={5} icon="💬" title="ความเห็นของตัวเอง" titleTH="Self Observations" color="#f59e0b">
          {([
            {label:'สิ่งที่รู้สึกว่าตัวเองทำได้ดี',    ph:'จุดแข็งของตัวเอง สิ่งที่ภูมิใจ...',           state:goodLevel,  set:setGoodLevel},
            {label:'สิ่งที่อยากพัฒนาตัวเองมากที่สุด',  ph:'ด้านที่รู้สึกว่าต้องปรับปรุง...', state:toImprove,  set:setToImprove},
          ]).map(f => (
            <div key={f.label} style={{ marginBottom:12 }}>
              <label style={{ fontSize:'0.8rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>{f.label}</label>
              <textarea rows={3} value={f.state} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:'0.875rem', resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e=>e.currentTarget.style.borderColor='#f59e0b'}
                onBlur={e =>e.currentTarget.style.borderColor='#e2e8f0'}
              />
            </div>
          ))}
        </SectionCard>

        {/* ⑥ Goals */}
        <SectionCard num={6} icon="🎯" title="เป้าหมายและแผนพัฒนา" titleTH="Goals & Development Plan" color="#a855f7">
          {([
            {label:'เป้าหมาย 3 เดือนข้างหน้า',       icon:'📅', ph:'สิ่งที่อยากทำให้ได้ภายใน 3 เดือน...', state:goalShort,  set:setGoalShort},
            {label:'เป้าหมาย 6–12 เดือนข้างหน้า',    icon:'🏆', ph:'สิ่งที่อยากทำให้ได้ภายใน 1 ปี...',   state:goalLong,   set:setGoalLong},
            {label:'แผนฝึกซ้อมของตัวเอง',             icon:'📋', ph:'สิ่งที่จะทำด้วยตัวเองนอกเวลาฝึก เช่น วิ่ง 20 นาที/วัน...', state:actionPlan, set:setActionPlan},
            {label:'⭐ ความฝัน / เป้าหมายอาชีพนักกีฬา', icon:'✨', ph:'อยากเป็นนักกีฬาระดับไหน ทีมไหน...', state:dream,      set:setDream},
          ]).map(f => (
            <div key={f.label} style={{ marginBottom:14 }}>
              <label style={{ fontSize:'0.8rem', fontWeight:700, color:'#475569', display:'block', marginBottom:5 }}>{f.label}</label>
              <textarea rows={3} value={f.state} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:'0.875rem', resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                onFocus={e=>e.currentTarget.style.borderColor='#a855f7'}
                onBlur={e =>e.currentTarget.style.borderColor='#e2e8f0'}
              />
            </div>
          ))}
        </SectionCard>

        {err && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'12px 16px', fontSize:'0.875rem', color:'#991b1b', marginBottom:14 }}>
            ⚠️ {err}
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting} style={{
          width:'100%', padding:'17px', borderRadius:16, border:'none', cursor:'pointer',
          fontWeight:900, fontSize:'1.05rem',
          background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#0f172a,#1e3a5f)',
          color:'white', boxShadow:'0 6px 24px rgba(15,23,42,0.3)', transition:'all 0.2s',
          letterSpacing:0.5,
        }}>
          {submitting ? '⏳ กำลังบันทึก...' : '✅ ส่งข้อมูล IDP'}
        </button>
        <p style={{ textAlign:'center', fontSize:'0.7rem', color:'#94a3b8', marginTop:12 }}>
          ข้อมูลของคุณจะถูกส่งให้โค้ชเพื่อวางแผนพัฒนาต่อไป
        </p>
      </div>
    </div>
  );
}

export default function AthleteSelfPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f172a,#1e3a5f)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.9rem' }}>
        ⏳ กำลังโหลด...
      </div>
    }>
      <AthleteSelfContent />
    </Suspense>
  );
}
