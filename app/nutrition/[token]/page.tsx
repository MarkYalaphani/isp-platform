'use client';

import { useState, useEffect, useCallback, use } from 'react';

interface NutritionSession { id: string; teamName: string; sessionDate: string; }
interface AthleteInfo { playerId: string; name: string; nickname: string; team: string; photoUrl: string; }

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

function getStatus(score: number, max: number) {
  const p = max > 0 ? score / max : 0;
  if (p >= 0.82) return { label: 'Nutrition Ready', sub: 'โภชนาการดีมาก!',       color: '#10b981', bg: '#052e16', emoji: '🟢' };
  if (p >= 0.55) return { label: 'ต้องปรับบางจุด', sub: 'ดีแต่ควรเพิ่มเติม',    color: '#f59e0b', bg: '#422006', emoji: '🟡' };
  return             { label: 'เสี่ยงพลังงานไม่พอ', sub: 'ต้องใส่ใจโภชนาการมากขึ้น', color: '#ef4444', bg: '#450a0a', emoji: '🔴' };
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

  const [player, setPlayer]   = useState<AthleteInfo | null>(null);
  const [dayType, setDayType] = useState<'training'|'match'|'rest'|''>('');
  const [trainType, setTrainType] = useState('');
  const [core, setCore]   = useState<boolean[]>(new Array(CORE_ITEMS.length).fill(false));
  const [extra, setExtra] = useState<boolean[]>(new Array(MATCH_ITEMS.length).fill(false));

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<{ score: number; maxScore: number } | null>(null);
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
          params: { token, playerId: player.playerId, playerName: player.name, dayType, trainingType: trainType, coreChecks: core, extraChecks },
        }),
      });
      const d = await res.json() as { status: string; score?: number; maxScore?: number; message?: string };
      if (d.status === 'success' && d.score !== undefined) {
        setResult({ score: d.score!, maxScore: d.maxScore! });
      } else if (d.message === 'already_submitted') {
        setAlreadyDone(true);
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  // ── States ──
  if (loading) return <CenterScreen><Spinner/></CenterScreen>;
  if (error || !session) return <CenterScreen><div style={{textAlign:'center',color:'white'}}><div style={{fontSize:'3rem',marginBottom:12}}>❌</div><div style={{fontWeight:700}}>{error||'QR ไม่ถูกต้อง'}</div><div style={{color:'#94a3b8',marginTop:8,fontSize:'0.85rem'}}>กรุณาสแกน QR Code ใหม่</div></div></CenterScreen>;

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
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(160deg,#0f172a,#1e1b4b)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
        <div style={{maxWidth:400,width:'100%',textAlign:'center'}}>
          <div style={{fontSize:'4rem',marginBottom:16}}>{st.emoji}</div>
          <div style={{background:st.bg,borderRadius:20,padding:'24px 20px',border:`2px solid ${st.color}40`,marginBottom:20}}>
            <div style={{color:st.color,fontWeight:900,fontSize:'2.8rem',lineHeight:1}}>{result.score}<span style={{fontSize:'1.2rem',fontWeight:600,color:'#94a3b8'}}>/{result.maxScore}</span></div>
            <div style={{color:st.color,fontWeight:800,fontSize:'1.1rem',marginTop:8}}>{st.label}</div>
            <div style={{color:'#94a3b8',fontSize:'0.82rem',marginTop:4}}>{st.sub}</div>
          </div>
          {missed.length > 0 && (
            <div style={{background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'16px 20px',textAlign:'left',marginBottom:20,border:'1px solid rgba(255,255,255,0.07)'}}>
              <div style={{color:'#f59e0b',fontWeight:700,fontSize:'0.82rem',marginBottom:10}}>💡 จุดที่ควรเพิ่มพรุ่งนี้</div>
              {missed.map((m,i)=>(
                <div key={i} style={{color:'#94a3b8',fontSize:'0.82rem',marginBottom:6,display:'flex',gap:8}}>
                  <span style={{color:'#f59e0b',flexShrink:0}}>•</span>{m}
                </div>
              ))}
            </div>
          )}
          <div style={{color:'#10b981',fontWeight:700,fontSize:'0.9rem'}}>✅ ส่งข้อมูลสำเร็จแล้ว!</div>
          <div style={{color:'#475569',fontSize:'0.72rem',marginTop:6}}>{player?.name}</div>
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
        <div style={{fontSize:'2rem',marginBottom:6}}>🥗</div>
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
                {filtered.map(a=>(
                  <button key={a.playerId} onClick={()=>setPlayer(a)} style={{
                    width:'100%',display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
                    background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:12,marginBottom:8,cursor:'pointer',color:'white',textAlign:'left',transition:'all 0.15s',
                  }}
                    onMouseEnter={e=>(e.currentTarget as HTMLButtonElement).style.background='rgba(56,189,248,0.12)'}
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
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'rgba(56,189,248,0.1)',borderRadius:12,border:'1.5px solid rgba(56,189,248,0.3)'}}>
              <Avatar name={player.name} photo={player.photoUrl} size={40}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:'#38bdf8'}}>{player.name}</div>
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
              {id:'training',label:'วันซ้อม',emoji:'⚽'},
              {id:'match',   label:'วันแข่ง',emoji:'🏆'},
              {id:'rest',    label:'วันพัก', emoji:'💤'},
            ].map(d=>(
              <button key={d.id} onClick={()=>setDayType(d.id as typeof dayType)} style={{
                padding:'14px 8px',borderRadius:12,cursor:'pointer',fontWeight:700,fontSize:'0.8rem',
                border: dayType===d.id ? '2px solid #38bdf8' : '1.5px solid rgba(255,255,255,0.1)',
                background: dayType===d.id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                color: dayType===d.id ? '#38bdf8' : '#94a3b8',
                display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              }}>
                <span style={{fontSize:'1.5rem'}}>{d.emoji}</span>{d.label}
              </button>
            ))}
          </div>
        </Block>

        {/* 2b. Training type */}
        {dayType === 'training' && (
          <Block title="ประเภทการซ้อม" icon="🏋️">
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {TRAINING_TYPES.map(t=>(
                <button key={t.id} onClick={()=>setTrainType(t.id)} style={{
                  padding:'7px 14px',borderRadius:20,cursor:'pointer',fontWeight:600,fontSize:'0.78rem',
                  border: trainType===t.id ? '2px solid #38bdf8' : '1.5px solid rgba(255,255,255,0.1)',
                  background: trainType===t.id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                  color: trainType===t.id ? '#38bdf8' : '#94a3b8',
                }}>{t.label}</button>
              ))}
            </div>
            {trainTip && (
              <div style={{background:'rgba(56,189,248,0.08)',borderRadius:10,padding:'10px 14px',marginTop:12,fontSize:'0.78rem',color:'#7dd3fc'}}>
                💡 แนะนำ: <strong>{trainTip.tip}</strong>
              </div>
            )}
          </Block>
        )}

        {/* 3. Core checklist */}
        <Block title="3. เช็กลิสต์โภชนาการ" icon="✅">
          <div style={{fontSize:'0.72rem',color:'#64748b',marginBottom:10}}>วันนี้คุณทำสิ่งเหล่านี้หรือเปล่า?</div>
          {CORE_ITEMS.map((item,i)=>(
            <CheckRow key={i} label={item} checked={core[i]}
              onChange={v=>setCore(p=>{const n=[...p];n[i]=v;return n;})}/>
          ))}
        </Block>

        {/* 4. Match extras */}
        {dayType === 'match' && (
          <Block title="4. เช็กลิสต์วันแข่ง" icon="🏆">
            {MATCH_ITEMS.map((item,i)=>(
              <CheckRow key={i} label={item} checked={extra[i]}
                onChange={v=>setExtra(p=>{const n=[...p];n[i]=v;return n;})}/>
            ))}
          </Block>
        )}

        {/* Live score preview */}
        {previewSt && (
          <div style={{background:'rgba(255,255,255,0.04)',borderRadius:14,padding:'14px 18px',marginBottom:20,textAlign:'center',border:'1px solid rgba(255,255,255,0.07)'}}>
            <div style={{fontWeight:900,fontSize:'2rem',color:previewSt.color,lineHeight:1}}>
              {previewScore}<span style={{fontSize:'1rem',fontWeight:600,color:'#94a3b8'}}>/{previewMax}</span>
            </div>
            <div style={{fontSize:'0.82rem',color:previewSt.color,fontWeight:700,marginTop:4}}>{previewSt.emoji} {previewSt.label}</div>
          </div>
        )}
      </div>

      {/* Fixed submit button */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,padding:'12px 20px',paddingBottom:'calc(12px + env(safe-area-inset-bottom))',background:'rgba(15,23,42,0.95)',borderTop:'1px solid rgba(255,255,255,0.08)',backdropFilter:'blur(10px)'}}>
        <button onClick={handleSubmit} disabled={!canSubmit||submitting} style={{
          width:'100%',padding:16,borderRadius:14,border:'none',fontWeight:800,fontSize:'1rem',
          background: canSubmit ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'rgba(255,255,255,0.07)',
          color: canSubmit ? 'white' : '#475569',
          cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
          display:'flex',alignItems:'center',justifyContent:'center',gap:10,
        }}>
          {submitting ? <><Spinner small/> กำลังส่ง...</> : <>🥗 ส่งข้อมูลโภชนาการ</>}
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
  return <div style={{width:s,height:s,border:`${small?2:3}px solid rgba(56,189,248,0.3)`,borderTopColor:'#38bdf8',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}}/>;
}

function Avatar({ name, photo, size }: { name: string; photo: string; size: number }) {
  return (
    <div style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:'#1e3a5f',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'0.8rem',color:'#38bdf8'}}>
      {photo ? <img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(name)}
    </div>
  );
}

function Block({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontWeight:700,fontSize:'0.78rem',color:'#38bdf8',textTransform:'uppercase',letterSpacing:0.5,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
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
        background: checked ? '#38bdf8' : 'transparent',
        display:'flex',alignItems:'center',justifyContent:'center',
      }}>
        {checked && <span style={{color:'white',fontSize:'0.72rem',fontWeight:900,lineHeight:1}}>✓</span>}
      </div>
      <span style={{fontSize:'0.86rem',lineHeight:1.4,color:checked?'white':'#94a3b8',flex:1}}>{label}</span>
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width:'100%',padding:'11px 16px',borderRadius:12,
  border:'1.5px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.06)',
  color:'white',fontSize:'0.88rem',outline:'none',boxSizing:'border-box',
};
