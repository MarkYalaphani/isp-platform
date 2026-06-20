'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { athletes: Athlete[]; user: User; }

interface NutritionSession { id: string; teamName: string; sessionDate: string; createdBy: string; }
interface NutritionCheckin {
  id: string; playerId: string; playerName: string;
  dayType: string; trainingType: string;
  coreChecks: boolean[]; extraChecks: boolean[];
  score: number; maxScore: number; submittedAt: string;
}

const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const TEAM_COLORS: Record<string,string> = { U8:'#6366f1',U9:'#38bdf8',U10:'#10b981',U11:'#f59e0b',U12:'#ef4444',U13:'#8b5cf6',U14:'#06b6d4',U15:'#f97316',U16:'#ec4899',U17:'#14b8a6',U18:'#84cc16',Senior:'#1d4ed8' };

const CORE_ITEMS = [
  'กินครบ 3 มื้อ','กินข้าวเช้า','กินก่อนซ้อม 2–4 ชั่วโมง','กินหลังซ้อมภายใน 60 นาที',
  'มีโปรตีนทุกมื้อ','มีคาร์โบไฮเดรตก่อนซ้อม/วันซ้อม','ดื่มน้ำเพียงพอ','ปัสสาวะสีเหลืองใส',
  'ไม่ดื่มน้ำหวาน/น้ำอัดลมมากเกินไป','ไม่อดอาหารเพื่อลดน้ำหนัก','นอนอย่างน้อย 8 ชั่วโมง',
];
const MATCH_ITEMS = [
  'กินมื้อหลักก่อนแข่ง 3–4 ชั่วโมง','เลือกอาหารย่อยง่าย','เน้นคาร์โบไฮเดรต',
  'ลดของทอด/ไขมันสูง','ดื่มน้ำก่อนแข่ง','มีของว่างก่อนแข่ง (กล้วย/ขนมปัง/เกลือแร่)','หลังแข่งมีคาร์บ + โปรตีน',
];
const TRAINING_LABEL: Record<string,string> = {
  recovery:'Recovery', strength:'Strength', field_gym:'Field+Gym', tactical:'Tactical', pre_match:'Pre-Match',
};
const DAY_TYPE_LABEL: Record<string,string> = { training:'วันซ้อม', match:'วันแข่ง', rest:'วันพัก' };

function getStatus(score: number, max: number) {
  const p = max > 0 ? score / max : 0;
  if (p >= 0.82) return { label:'Nutrition Ready', color:'#10b981', bg:'rgba(16,185,129,0.1)', emoji:'🟢' };
  if (p >= 0.55) return { label:'ต้องปรับบางจุด',   color:'#f59e0b', bg:'rgba(245,158,11,0.1)', emoji:'🟡' };
  return             { label:'เสี่ยงพลังงานไม่พอ',    color:'#ef4444', bg:'rgba(239,68,68,0.1)',   emoji:'🔴' };
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' }); }
  catch { return d; }
}
function initials(name: string) {
  return name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
}

export default function NutritionPage({ athletes, user }: Props) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [creatingQR, setCreatingQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeSession, setActiveSession] = useState<NutritionSession | null>(null);
  const [checkins, setCheckins] = useState<NutritionCheckin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [sessions, setSessions] = useState<NutritionSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [tab, setTab] = useState<'qr'|'history'>('qr');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Team athletes count for the selected team
  const teamAthletes = athletes.filter(a => !selectedTeam || a.Team === selectedTeam);

  const loadCheckins = useCallback(async (sessionId: string) => {
    setLoadingCheckins(true);
    try {
      const d = await callGAS('getNutritionCheckins', { sessionId }) as NutritionCheckin[];
      setCheckins(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
    finally { setLoadingCheckins(false); }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const d = await callGAS('getNutritionSessions', { teamName: '' }) as NutritionSession[];
      setSessions(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Poll checkins every 15s when a session is active
  useEffect(() => {
    if (!activeSession) { if (pollRef.current) clearInterval(pollRef.current); return; }
    loadCheckins(activeSession.id);
    pollRef.current = setInterval(() => loadCheckins(activeSession.id), 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSession, loadCheckins]);

  const generateQR = async (token: string) => {
    try {
      const QRCode = await import('qrcode');
      const url = `${window.location.origin}/nutrition/${token}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 280, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
      setQrDataUrl(dataUrl);
    } catch { showToast('ไม่สามารถสร้าง QR ได้', 'error'); }
  };

  const handleCreateQR = async () => {
    if (!selectedTeam) { showToast('กรุณาเลือกทีม', 'error'); return; }
    setCreatingQR(true);
    try {
      const res = await callGAS('createNutritionSession', {
        teamName: selectedTeam,
        sessionDate: selectedDate,
      }) as { status: string; sessionId: string };
      if (res.status !== 'success') { showToast('สร้าง Session ไม่สำเร็จ', 'error'); return; }
      const sess: NutritionSession = { id: res.sessionId, teamName: selectedTeam, sessionDate: selectedDate, createdBy: user.username };
      setActiveSession(sess);
      await generateQR(res.sessionId);
      setTab('qr');
      loadSessions();
    } catch { showToast('Connection error', 'error'); }
    finally { setCreatingQR(false); }
  };

  const selectSession = async (s: NutritionSession) => {
    setActiveSession(s);
    setSelectedTeam(s.teamName);
    setSelectedDate(s.sessionDate);
    await generateQR(s.id);
    setTab('qr');
  };

  const copyUrl = () => {
    if (!activeSession) return;
    const url = `${window.location.origin}/nutrition/${activeSession.id}`;
    navigator.clipboard.writeText(url).then(() => showToast('คัดลอก URL แล้ว', 'success'));
  };

  // Dashboard stats
  const submittedCount = checkins.length;
  const totalCount = teamAthletes.length;
  const notSubmitted = teamAthletes.filter(a => !checkins.some(c => c.playerId === a.PlayerID));
  const greenCount  = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#10b981').length;
  const yellowCount = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#f59e0b').length;
  const redCount    = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#ef4444').length;

  const getMissed = (c: NutritionCheckin) => {
    const missed: string[] = [];
    CORE_ITEMS.forEach((item, i) => { if (!c.coreChecks[i]) missed.push(item); });
    if (c.dayType === 'match') MATCH_ITEMS.forEach((item, i) => { if (!c.extraChecks[i]) missed.push(item); });
    return missed.slice(0, 2);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Daily Nutrition Check-in</h2>
          <p className="page-subtitle">สร้าง QR ให้เด็กสแกน · ติดตามโภชนาการรายวัน</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,marginBottom:20,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:4,overflow:'hidden'}}>
        {[{id:'qr',label:'สร้าง QR / Dashboard',icon:'bi-qr-code'},{id:'history',label:'ประวัติ Session',icon:'bi-clock-history'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as typeof tab)} style={{
            flex:1,padding:'9px 14px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:'0.82rem',
            background: tab===t.id ? '#38bdf8' : 'transparent',
            color: tab===t.id ? 'white' : 'var(--text-muted)',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          }}>
            <i className={`bi ${t.icon}`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── QR TAB ── */}
      {tab === 'qr' && (
        <div>
          {/* Session creator */}
          <div className="surface" style={{padding:'16px 20px',marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:14,color:'#38bdf8'}}><i className="bi bi-qr-code me-2"/>สร้าง QR Code ประจำวัน</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:'1 1 140px'}}>
                <label className="form-label">รุ่นทีม *</label>
                <select className="form-select" value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}>
                  <option value="">— เลือกทีม —</option>
                  {TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:'1 1 140px'}}>
                <label className="form-label">วันที่</label>
                <input type="date" className="form-control" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/>
              </div>
              <button className="btn-primary" style={{flexShrink:0}} onClick={handleCreateQR} disabled={creatingQR}>
                {creatingQR ? <><span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/> กำลังสร้าง...</> : <><i className="bi bi-qr-code me-1"/>สร้าง / โหลด QR</>}
              </button>
            </div>
          </div>

          {/* QR display + stats */}
          {activeSession && qrDataUrl && (
            <>
              <div style={{display:'flex',flexWrap:'wrap',gap:16,marginBottom:16,alignItems:'flex-start'}}>
                {/* QR card */}
                <div className="surface" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,padding:'16px 20px',flexShrink:0,minWidth:220}}>
                  <img src={qrDataUrl} alt="QR Code" style={{width:200,height:200,borderRadius:12,border:'4px solid var(--border)'}}/>
                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)',textAlign:'center'}}>
                    ทีม <strong>{activeSession.teamName}</strong> · {fmtDate(activeSession.sessionDate)}
                  </div>
                  <button className="btn-outline btn-sm" onClick={copyUrl} style={{width:'100%',justifyContent:'center'}}>
                    <i className="bi bi-clipboard me-1"/>คัดลอก URL
                  </button>
                  <a href={`/nutrition/${activeSession.id}`} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:'0.72rem',color:'#38bdf8',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
                    <i className="bi bi-box-arrow-up-right"/>ทดสอบ link
                  </a>
                </div>

                {/* Stats card */}
                <div className="surface" style={{flex:'1 1 260px',padding:'16px 20px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:'0.88rem'}}>สถานะวันนี้</div>
                    <button className="btn-outline btn-sm" onClick={()=>loadCheckins(activeSession.id)} disabled={loadingCheckins} style={{marginLeft:'auto',padding:'3px 10px'}}>
                      {loadingCheckins ? <span className="spinner-ring" style={{width:12,height:12,borderWidth:2,margin:0}}/> : <><i className="bi bi-arrow-clockwise me-1"/>รีเฟรช</>}
                    </button>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
                    {[
                      {l:'ส่งแล้ว',            v:`${submittedCount}/${totalCount}`, c:'#38bdf8'},
                      {l:'ยังไม่ส่ง',           v:totalCount-submittedCount,        c:'#64748b'},
                      {l:'🟢 Nutrition Ready', v:greenCount,                        c:'#10b981'},
                      {l:'🟡 ต้องปรับ',         v:yellowCount,                      c:'#f59e0b'},
                      {l:'🔴 เสี่ยง',           v:redCount,                         c:'#ef4444'},
                    ].map(k=>(
                      <div key={k.l} style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',borderLeft:`3px solid ${k.c}`}}>
                        <div style={{fontWeight:900,fontSize:'1.4rem',color:k.c}}>{k.v}</div>
                        <div style={{fontSize:'0.65rem',color:'var(--text-muted)',fontWeight:600,marginTop:2}}>{k.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Not submitted list */}
              {notSubmitted.length > 0 && (
                <div className="surface" style={{padding:'12px 16px',marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:'0.82rem',color:'#64748b',marginBottom:10}}><i className="bi bi-person-x me-2"/>ยังไม่ส่งข้อมูล ({notSubmitted.length} คน)</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {notSubmitted.map(a=>(
                      <div key={a.PlayerID} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 10px',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:20,fontSize:'0.75rem'}}>
                        <div style={{width:22,height:22,borderRadius:'50%',overflow:'hidden',background:TEAM_COLORS[a.Team]||'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.55rem',fontWeight:800,color:'white',flexShrink:0}}>
                          {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(a.Name)}
                        </div>
                        <span style={{color:'var(--text-muted)'}}>{a.Nickname||a.Name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkins table */}
              {checkins.length > 0 && (
                <div className="surface" style={{padding:0,overflow:'hidden'}}>
                  <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem',display:'flex',alignItems:'center',gap:8}}>
                    <i className="bi bi-table" style={{color:'#38bdf8'}}/>ผลการตรวจสอบ ({checkins.length} คน)
                  </div>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                      <thead><tr style={{background:'var(--bg)'}}>
                        {['นักกีฬา','ประเภทวัน','คะแนน','สถานะ','จุดที่ขาด'].map(h=>(
                          <th key={h} style={{padding:'8px 14px',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',textAlign: h==='นักกีฬา' ? 'left':'center',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {checkins.map(c => {
                          const a = athletes.find(x => x.PlayerID === c.playerId);
                          const st = getStatus(c.score, c.maxScore);
                          const missed = getMissed(c);
                          return (
                            <tr key={c.id} style={{borderBottom:'1px solid var(--border)'}}>
                              <td style={{padding:'10px 14px'}}>
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                  <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:TEAM_COLORS[a?.Team||'']||'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.6rem',fontWeight:800,color:'white'}}>
                                    {a?.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(c.playerName)}
                                  </div>
                                  <div>
                                    <div style={{fontWeight:700}}>{c.playerName}</div>
                                    {a?.Nickname && <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{a.Nickname}</div>}
                                  </div>
                                </div>
                              </td>
                              <td style={{textAlign:'center',padding:'8px 14px'}}>
                                <div style={{fontWeight:600}}>{DAY_TYPE_LABEL[c.dayType]||c.dayType}</div>
                                {c.trainingType && <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{TRAINING_LABEL[c.trainingType]||c.trainingType}</div>}
                              </td>
                              <td style={{textAlign:'center',padding:'8px 14px'}}>
                                <span style={{fontWeight:900,color:st.color,fontSize:'0.95rem'}}>{c.score}</span>
                                <span style={{color:'var(--text-muted)',fontSize:'0.72rem'}}>/{c.maxScore}</span>
                              </td>
                              <td style={{textAlign:'center',padding:'8px 14px'}}>
                                <span style={{background:st.bg,color:st.color,borderRadius:6,padding:'3px 10px',fontSize:'0.7rem',fontWeight:800,border:`1px solid ${st.color}30`,whiteSpace:'nowrap'}}>
                                  {st.emoji} {st.label}
                                </span>
                              </td>
                              <td style={{padding:'8px 14px',maxWidth:180}}>
                                {missed.length > 0 ? (
                                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)',lineHeight:1.5}}>
                                    {missed.map((m,i) => <div key={i} style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>• {m}</div>)}
                                  </div>
                                ) : (
                                  <span style={{fontSize:'0.7rem',color:'#10b981',fontWeight:600}}>ครบทุกข้อ ✓</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {checkins.length === 0 && !loadingCheckins && (
                <div style={{textAlign:'center',padding:40,color:'var(--text-muted)',fontSize:'0.85rem'}}>
                  <i className="bi bi-hourglass-split" style={{display:'block',fontSize:'2.5rem',marginBottom:10,color:'#cbd5e1'}}/>
                  รอนักกีฬาสแกน QR และกรอกข้อมูล...
                </div>
              )}
            </>
          )}

          {!activeSession && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-qr-code" style={{fontSize:'3rem',display:'block',marginBottom:12,color:'#cbd5e1'}}/>
              <p>เลือกทีมและวันที่ แล้วกด <strong>สร้าง / โหลด QR</strong></p>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div>
          {loadingSessions && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}
          {!loadingSessions && sessions.length === 0 && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-clock-history" style={{fontSize:'3rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>
              <p>ยังไม่มีประวัติ Session</p>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {sessions.map(s => {
              const tc = TEAM_COLORS[s.teamName]||'#6366f1';
              const isActive = activeSession?.id === s.id;
              return (
                <div key={s.id} onClick={()=>selectSession(s)} style={{
                  padding:'14px 18px',cursor:'pointer',borderLeft:`4px solid ${tc}`,
                }} className="surface">
                  <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <span style={{background:`${tc}20`,color:tc,borderRadius:6,padding:'2px 10px',fontSize:'0.75rem',fontWeight:800,border:`1px solid ${tc}40`}}>{s.teamName}</span>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:'0.88rem'}}>{fmtDate(s.sessionDate)}</div>
                      <div style={{fontSize:'0.68rem',color:'var(--text-muted)',marginTop:2}}>สร้างโดย {s.createdBy}</div>
                    </div>
                    {isActive && <span style={{fontSize:'0.72rem',color:'#38bdf8',fontWeight:700}}>✓ กำลังดูอยู่</span>}
                    <i className="bi bi-chevron-right" style={{color:'var(--text-muted)'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
