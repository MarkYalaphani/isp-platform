'use client';

import { useState, useEffect, useCallback, use } from 'react';

interface NutritionSession { id: string; teamName: string; sessionDate: string; }
interface AthleteInfo { playerId: string; name: string; nickname: string; team: string; photoUrl: string; }
interface MealLog { breakfast: string; lunch: string; dinner: string; preWorkout: string; postWorkout: string; }

const MEAL_TIMES: { id: keyof MealLog; label: string; icon: string; placeholder: string }[] = [
  { id: 'breakfast',   label: 'มื้อเช้า',        icon: '🌅', placeholder: 'เช่น ข้าวต้มไก่ นม กล้วย' },
  { id: 'lunch',       label: 'มื้อกลางวัน',    icon: '☀️', placeholder: 'เช่น ข้าวผัดไก่ น้ำเปล่า' },
  { id: 'dinner',      label: 'มื้อเย็น/ค่ำ',   icon: '🌙', placeholder: 'เช่น ข้าวหน้าเป็ด ผลไม้' },
  { id: 'preWorkout',  label: 'ก่อนซ้อม/แข่ง',  icon: '⚡', placeholder: 'เช่น กล้วย ขนมปัง เกลือแร่' },
  { id: 'postWorkout', label: 'หลังซ้อม/แข่ง',  icon: '💪', placeholder: 'เช่น นม โปรตีนเชค ข้าว+ไก่' },
];

const CORE_ITEMS = [
  'กินครบ 3 มื้อ',
  'กินข้าวเช้า',
  'กินก่อนซ้อม 2–4 ชั่วโมง',
  'กินหลังซ้อมภายใน 60 นาที',
  'มีโปรตีนทุกมื้อ',
  'มีคาร์โบไฮเดรตก่อนซ้อม/วันซ้อม',
  'ดื่มน้ำเพียงพอ',
  'ปัสสาวะสีเหลืองใส',
  'ไม่ดื่มน้ำหวาน/น้ำอัดลมมากเกินไป',
  'ไม่อดอาหารเพื่อลดน้ำหนัก',
  'นอนอย่างน้อย 8 ชั่วโมง',
];

const MATCH_ITEMS = [
  'กินมื้อหลักก่อนแข่ง 3–4 ชั่วโมง',
  'เลือกอาหารย่อยง่าย',
  'เน้นคาร์โบไฮเดรต',
  'ลดของทอด/ไขมันสูง',
  'ดื่มน้ำก่อนแข่ง',
  'มีของว่างก่อนแข่ง (กล้วย/ขนมปัง/เกลือแร่)',
  'หลังแข่งมีคาร์บ + โปรตีน',
];

const TRAINING_TYPES = [
  { id: 'recovery',  label: 'Recovery',    tip: 'โปรตีนสูง / คาร์บต่ำ' },
  { id: 'strength',  label: 'Strength',    tip: 'โปรตีนสูง / คาร์บปานกลาง' },
  { id: 'field_gym', label: 'Field + Gym', tip: 'โปรตีน-คาร์บสูง' },
  { id: 'tactical',  label: 'Tactical',    tip: 'โปรตีน-คาร์บปานกลาง' },
  { id: 'pre_match', label: 'Pre-Match',   tip: 'คาร์บโหลด / ไขมันต่ำ' },
];

const EMPTY_MEALS: MealLog = { breakfast: '', lunch: '', dinner: '', preWorkout: '', postWorkout: '' };

function getStatus(score: number, max: number) {
  const p = max > 0 ? score / max : 0;
  if (p >= 0.82) return { label: 'Nutrition Ready', sub: 'โภชนาการดีมาก!',       color: '#10b981', bg: '#052e16', badge: '🟢' };
  if (p >= 0.55) return { label: 'ต้องปรับบางจุด', sub: 'ดีแต่ควรเพิ่มเติม',    color: '#f59e0b', bg: '#422006', badge: '🟡' };
  return             { label: 'เสี่ยงพลังงานไม่พอ', sub: 'ต้องใส่ใจโภชนาการมากขึ้น', color: '#ef4444', bg: '#450a0a', badge: '🔴' };
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
  catch { return d; }
}

function initials(name: string) {
  return name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
}

export default function NutritionFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [session, setSession]   = useState<NutritionSession | null>(null);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  const [player, setPlayer]       = useState<AthleteInfo | null>(null);
  const [dayType, setDayType]     = useState<'training'|'match'|'rest'|''>('');
  const [trainType, setTrainType] = useState('');
  const [core, setCore]           = useState<boolean[]>(new Array(CORE_ITEMS.length).fill(false));
  const [extra, setExtra]         = useState<boolean[]>(new Array(MATCH_ITEMS.length).fill(false));
  const [meals, setMeals]         = useState<MealLog>(EMPTY_MEALS);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ score: number; maxScore: number; mealsLogged: boolean } | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getNutritionSession', params: { token } }),
      });
      if (!res.ok) { setError('ไม่พบ QR Session นี้'); setLoading(false); return; }
      const d = await res.json() as { session: NutritionSession; athletes: AthleteInfo[]; submittedIds: string[] };
      setSession(d.session);
      setAthletes(d.athletes || []);
    } catch { setError('ไม่สามารถโหลดข้อมูลได้'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = athletes.filter(a =>
    !search || (a.name + a.nickname).toLowerCase().includes(search.toLowerCase())
  );

  const setMealField = (key: keyof MealLog, val: string) =>
    setMeals(prev => ({ ...prev, [key]: val }));

  const hasMeals = Object.values(meals).some(v => v.trim().length > 0);

  const handleSubmit = async () => {
    if (!player || !dayType) return;
    setSubmitting(true);
    try {
      const extraChecks = dayType === 'match' ? extra : [];
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submitNutritionCheckin',
          params: {
            token, playerId: player.playerId, playerName: player.name,
            dayType, trainingType: trainType,
            coreChecks: core, extraChecks,
            meals: hasMeals ? meals : undefined,
          },
        }),
      });
      const d = await res.json() as { status: string; score?: number; maxScore?: number; message?: string };
      if (d.status === 'success' && d.score !== undefined) {
        setResult({ score: d.score!, maxScore: d.maxScore!, mealsLogged: hasMeals });
      } else if (d.message === 'already_submitted') {
        setAlreadyDone(true);
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  // ── States ──
  if (loading) return <CenterScreen><Spinner/></CenterScreen>;
  if (error || !session) return (
    <CenterScreen>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>❌</div>
        <div style={{fontWeight:700}}>{error||'QR ไม่ถูกต้อง'}</div>
        <div style={{color:'#94a3b8',marginTop:8,fontSize:'0.85rem'}}>กรุณาสแกน QR Code ใหม่</div>
      </div>
    </CenterScreen>
  );

  if (alreadyDone) return (
    <CenterScreen>
      <div style={{textAlign:'center',color:'white'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>✅</div>
        <div style={{fontWeight:700,fontSize:'1.1rem'}}>ส่งข้อมูลแล้ววันนี้</div>
        <div style={{color:'#94a3b8',marginTop:8,fontSize:'0.85rem'}}>{player?.name} ส่งข้อมูลไปแล้ว</div>
      </div>
    </CenterScreen>
  );

  if (result) {
    const st = getStatus(result.score, result.maxScore);
    const missedCore  = CORE_ITEMS.filter((_, i) => !core[i]);
    const missedExtra = dayType === 'match' ? MATCH_ITEMS.filter((_, i) => !extra[i]) : [];
    const missed = [...missedCore, ...missedExtra].slice(0, 3);
    const loggedMeals = MEAL_TIMES.filter(m => meals[m.id]?.trim());
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0f172a,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{maxWidth:420,width:'100%'}}>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:'3.5rem',marginBottom:12}}>
              {st.badge}
            </div>
            <div style={{background:st.bg,borderRadius:20,padding:'22px 20px',border:`2px solid ${st.color}40`,marginBottom:16}}>
              <div style={{color:st.color,fontWeight:900,fontSize:'2.6rem',lineHeight:1}}>{result.score}<span style={{fontSize:'1.1rem',fontWeight:600,color:'#94a3b8'}}>/{result.maxScore}</span></div>
              <div style={{color:st.color,fontWeight:800,fontSize:'1rem',marginTop:8}}>{st.label}</div>
              <div style={{color:'#94a3b8',fontSize:'0.8rem',marginTop:4}}>{st.sub}</div>
            </div>
          </div>

          {/* Meal diary summary */}
          {result.mealsLogged && loggedMeals.length > 0 && (
            <div style={{background:'rgba(16,185,129,0.07)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:16,padding:'14px 18px',marginBottom:16}}>
              <div style={{color:'#10b981',fontWeight:700,fontSize:'0.78rem',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:'1rem'}}>🍽️</span> ไดอารี่อาหารวันนี้ บันทึกแล้ว
              </div>
              {loggedMeals.map(m => (
                <div key={m.id} style={{display:'flex',gap:8,marginBottom:6,fontSize:'0.8rem'}}>
                  <span style={{flexShrink:0}}>{m.icon}</span>
                  <div>
                    <span style={{color:'rgba(255,255,255,0.45)',fontSize:'0.7rem'}}>{m.label}: </span>
                    <span style={{color:'rgba(255,255,255,0.82)'}}>{meals[m.id]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!result.mealsLogged && (
            <div style={{background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'10px 14px',marginBottom:16,fontSize:'0.78rem',color:'#f59e0b',display:'flex',alignItems:'center',gap:8}}>
              <span>💡</span>
              <span>วันหน้าลองบันทึกมื้ออาหารด้วยนะ — โค้ชจะวางแผนโภชนาการให้ได้ตรงกว่านี้</span>
            </div>
          )}

          {missed.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'14px 18px',marginBottom:16,border:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{color:'#f59e0b',fontWeight:700,fontSize:'0.78rem',marginBottom:10}}>💡 จุดที่ควรเพิ่มพรุ่งนี้</div>
              {missed.map((m,i) => (
                <div key={i} style={{color:'#94a3b8',fontSize:'0.8rem',marginBottom:6,display:'flex',gap:8}}>
                  <span style={{color:'#f59e0b',flexShrink:0}}>•</span>{m}
                </div>
              ))}
            </div>
          )}
          <div style={{textAlign:'center',color:'#10b981',fontWeight:700,fontSize:'0.9rem'}}>✅ ส่งข้อมูลสำเร็จแล้ว!</div>
          <div style={{textAlign:'center',color:'#475569',fontSize:'0.72rem',marginTop:6}}>{player?.name}</div>
        </div>
      </div>
    );
  }

  // Preview score
  const previewExtra = dayType === 'match' ? extra : [];
  const previewScore = [...core, ...previewExtra].filter(Boolean).length;
  const previewMax   = CORE_ITEMS.length + (dayType === 'match' ? MATCH_ITEMS.length : 0);
  const previewSt    = dayType ? getStatus(previewScore, previewMax) : null;
  const trainTip     = TRAINING_TYPES.find(t => t.id === trainType);
  const canSubmit    = !!player && !!dayType;

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0f172a,#1e1b4b)',paddingBottom:120}}>
      {/* Header */}
      <div style={{background:'rgba(255,255,255,0.04)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'20px 20px 16px',textAlign:'center'}}>
        <div style={{fontSize:'1.6rem',marginBottom:6}}>🥗</div>
        <div style={{fontWeight:800,fontSize:'1.1rem',color:'white'}}>Daily Nutrition Check-in</div>
        <div style={{fontSize:'0.78rem',color:'#94a3b8',marginTop:4}}>
          {session.teamName && `ทีม ${session.teamName} · `}{fmtDate(session.sessionDate)}
        </div>
      </div>

      <div style={{maxWidth:520,margin:'0 auto',padding:'20px 16px 0'}}>

        {/* 1. Select player */}
        <Block title="1. เลือกชื่อของคุณ" icon="👤">
          {!player ? (
            <>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นชื่อ..." style={iStyle}/>
              <div style={{maxHeight:260,overflowY:'auto',marginTop:10}}>
                {filtered.length === 0 && <div style={{textAlign:'center',color:'#64748b',padding:24,fontSize:'0.85rem'}}>ไม่พบนักกีฬา</div>}
                {filtered.map(a => (
                  <button key={a.playerId} onClick={()=>setPlayer(a)} style={{
                    width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
                    background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:12,marginBottom:8,cursor:'pointer',color:'white',textAlign:'left',transition:'all 0.15s',
                  }}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='rgba(0,102,204,0.18)'}
                    onMouseLeave={e=>(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.04)'}
                  >
                    <Avatar name={a.name} photo={a.photoUrl} size={38}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:'0.88rem'}}>{a.name}</div>
                      {a.nickname && <div style={{fontSize:'0.7rem',color:'#94a3b8'}}>{a.nickname}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'rgba(0,102,204,0.12)',borderRadius:12,border:'1.5px solid rgba(0,102,204,0.3)'}}>
              <Avatar name={player.name} photo={player.photoUrl} size={40}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'#60a5fa'}}>{player.name}</div>
                {player.nickname && <div style={{fontSize:'0.7rem',color:'#94a3b8'}}>{player.nickname}</div>}
              </div>
              <button onClick={()=>setPlayer(null)} style={{background:'none',border:'none',color:'#64748b',cursor:'pointer',fontSize:'1.1rem',padding:'4px 8px'}}>✕</button>
            </div>
          )}
        </Block>

        {/* 2. Day type */}
        <Block title="2. ประเภทวันนี้" icon="📅">
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
            {[
              {id:'training',label:'วันซ้อม', icon:'⚽'},
              {id:'match',   label:'วันแข่ง', icon:'🏆'},
              {id:'rest',    label:'วันพัก',  icon:'💤'},
            ].map(d => (
              <button key={d.id} onClick={()=>setDayType(d.id as typeof dayType)} style={{
                padding:'13px 8px',borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:'0.8rem',
                border: dayType===d.id ? '2px solid #0066cc' : '1.5px solid rgba(255,255,255,0.1)',
                background: dayType===d.id ? 'rgba(0,102,204,0.18)' : 'rgba(255,255,255,0.04)',
                color: dayType===d.id ? '#60a5fa' : '#94a3b8',
                display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              }}>
                <span style={{fontSize:'1.5rem'}}>{d.icon}</span>{d.label}
              </button>
            ))}
          </div>
        </Block>

        {/* 2b. Training type */}
        {dayType === 'training' && (
          <Block title="ประเภทการซ้อม" icon="🏋️">
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {TRAINING_TYPES.map(t => (
                <button key={t.id} onClick={()=>setTrainType(t.id)} style={{
                  padding:'7px 14px',borderRadius:20,cursor:'pointer',fontWeight:600,fontSize:'0.78rem',
                  border: trainType===t.id ? '2px solid #0066cc' : '1.5px solid rgba(255,255,255,0.1)',
                  background: trainType===t.id ? 'rgba(0,102,204,0.18)' : 'rgba(255,255,255,0.04)',
                  color: trainType===t.id ? '#60a5fa' : '#94a3b8',
                }}>{t.label}</button>
              ))}
            </div>
            {trainTip && (
              <div style={{background:'rgba(0,102,204,0.1)',borderRadius:10,padding:'10px 14px',marginTop:12,fontSize:'0.78rem',color:'#93c5fd'}}>
                💡 แนะนำ: <strong>{trainTip.tip}</strong>
              </div>
            )}
          </Block>
        )}

        {/* 3. Core checklist */}
        <Block title="3. เช็กลิสต์โภชนาการ" icon="✅">
          <div style={{fontSize:'0.72rem',color:'#64748b',marginBottom:10}}>วันนี้คุณทำสิ่งเหล่านี้หรือเปล่า?</div>
          {CORE_ITEMS.map((item, i) => (
            <CheckRow key={i} label={item} checked={core[i]}
              onChange={v=>setCore(p=>{const n=[...p];n[i]=v;return n;})}/>
          ))}
        </Block>

        {/* 4. Match extras */}
        {dayType === 'match' && (
          <Block title="4. เช็กลิสต์วันแข่ง" icon="🏆">
            {MATCH_ITEMS.map((item, i) => (
              <CheckRow key={i} label={item} checked={extra[i]}
                onChange={v=>setExtra(p=>{const n=[...p];n[i]=v;return n;})}/>
            ))}
          </Block>
        )}

        {/* 5. Meal Diary */}
        <Block title="5. บันทึกมื้ออาหารวันนี้" icon="🍽️">
          <div style={{fontSize:'0.72rem',color:'#64748b',marginBottom:12,lineHeight:1.6}}>
            กรอกว่าวันนี้กินอะไรในแต่ละมื้อ — ไม่บังคับ แต่ช่วยโค้ชวางแผนโภชนาการได้ดีขึ้น
          </div>
          {MEAL_TIMES.map(m => (
            <div key={m.id} style={{marginBottom:12}}>
              <div style={{fontSize:'0.7rem',color:'#94a3b8',marginBottom:5,display:'flex',alignItems:'center',gap:5,fontWeight:600}}>
                <span style={{fontSize:'0.9rem'}}>{m.icon}</span>{m.label}
                {meals[m.id] && <span style={{color:'#10b981',marginLeft:'auto',fontSize:'0.65rem'}}>✓ บันทึกแล้ว</span>}
              </div>
              <input
                value={meals[m.id]}
                onChange={e => setMealField(m.id, e.target.value)}
                placeholder={m.placeholder}
                style={{
                  ...iStyle,
                  borderColor: meals[m.id] ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.12)',
                  background: meals[m.id] ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.04)',
                }}
              />
            </div>
          ))}
          {hasMeals && (
            <div style={{marginTop:4,padding:'8px 12px',background:'rgba(16,185,129,0.08)',borderRadius:8,fontSize:'0.72rem',color:'#10b981',display:'flex',alignItems:'center',gap:6}}>
              <span>🍽️</span>
              บันทึกอาหาร {Object.values(meals).filter(v=>v.trim()).length} มื้อ — ขอบคุณ!
            </div>
          )}
        </Block>

        {/* Live score preview */}
        {previewSt && (
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'14px 18px',marginBottom:20,textAlign:'center',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div style={{fontWeight:900,fontSize:'1.9rem',color:previewSt.color,lineHeight:1}}>
              {previewScore}<span style={{fontSize:'0.9rem',fontWeight:600,color:'#94a3b8'}}>/{previewMax}</span>
            </div>
            <div style={{fontSize:'0.8rem',color:previewSt.color,fontWeight:700,marginTop:4}}>{previewSt.badge} {previewSt.label}</div>
          </div>
        )}
      </div>

      {/* Fixed submit button */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'12px 20px',paddingBottom:'calc(12px + env(safe-area-inset-bottom))',background:'rgba(15,23,42,0.96)',borderTop:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(12px)'}}>
        <button onClick={handleSubmit} disabled={!canSubmit||submitting} style={{
          width:'100%',padding:15,borderRadius:14,border:'none',fontWeight:800,fontSize:'1rem',
          background: canSubmit ? '#0066cc' : 'rgba(255,255,255,0.07)',
          color: canSubmit ? 'white' : '#475569',
          cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
          transition:'background 0.15s',
        }}>
          {submitting
            ? <><Spinner small/> กำลังส่ง...</>
            : <>🥗 ส่งข้อมูลโภชนาการ{hasMeals ? ' + ไดอารี่อาหาร' : ''}</>}
        </button>
        {!canSubmit && (
          <div style={{textAlign:'center',fontSize:'0.7rem',color:'#475569',marginTop:6}}>
            {!player ? 'เลือกชื่อของคุณก่อน' : 'เลือกประเภทวัน'}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Helpers ──
function CenterScreen({ children }: { children: React.ReactNode }) {
  return <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0f172a,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>{children}</div>;
}

function Spinner({ small }: { small?: boolean }) {
  const s = small ? 18 : 32;
  return <div style={{width:s,height:s,border:`${small?2:3}px solid rgba(0,102,204,0.3)`,borderTopColor:'#0066cc',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}}/>;
}

function Avatar({ name, photo, size }: { name: string; photo: string; size: number }) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.8rem',color:'#60a5fa'}}>
      {photo ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(name)}
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{fontWeight:700,fontSize:'0.72rem',color:'#60a5fa',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
        <span>{icon}</span>{title}
      </div>
      <div style={{background:'rgba(255,255,255,0.03)',borderRadius:14,padding:'14px 16px',border:'1px solid rgba(255,255,255,0.07)'}}>
        {children}
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={()=>onChange(!checked)} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',cursor:'pointer',userSelect:'none'}}>
      <div style={{
        width:22,height:22,borderRadius:6,flexShrink:0,transition:'all 0.15s',
        border: checked ? 'none' : '2px solid rgba(255,255,255,0.2)',
        background: checked ? '#0066cc' : 'transparent',
        display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        {checked && <span style={{color:'white',fontSize:'0.72rem',fontWeight:900,lineHeight:1}}>✓</span>}
      </div>
      <span style={{fontSize:'0.86rem',lineHeight:1.4,color:checked?'white':'#94a3b8',flex:1}}>{label}</span>
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width:'100%',padding:'10px 14px',borderRadius:10,
  border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.04)',
  color:'white',fontSize:'0.9rem',outline:'none',boxSizing:'border-box',
  transition:'border-color 0.15s,background 0.15s',
};
