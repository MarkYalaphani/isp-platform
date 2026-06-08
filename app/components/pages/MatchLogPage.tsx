'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Athlete, User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { athletes: Athlete[]; user: User; }

interface Match {
  id: string;
  matchDate: string;
  opponent: string;
  venue: string;
  matchType: string;
  teamName: string;
  scoreFor: number;
  scoreAgainst: number;
  result: 'W' | 'D' | 'L';
  notes: string;
  createdBy: string;
}
interface MatchStat {
  id: string;
  matchId: string;
  playerId: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  notes: string;
}

const MATCH_TYPES = ['ลีก','ถ้วย','กระชับมิตร','ทัวร์นาเมนต์','อื่นๆ'];
const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const POSITIONS = ['Goalkeeper','Defender','Midfielder','Forward'];
const TEAM_COLORS: Record<string,string> = { U8:'#6366f1',U9:'#38bdf8',U10:'#10b981',U11:'#f59e0b',U12:'#ef4444',U13:'#8b5cf6',U14:'#06b6d4',U15:'#f97316',U16:'#ec4899',U17:'#14b8a6',U18:'#84cc16',Senior:'#1d4ed8' };

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); }
  catch { return d; }
}
function initials(name: string) {
  return name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
}

export default function MatchLogPage({ athletes, user }: Props) {
  const [tab, setTab] = useState<'list'|'add'|'detail'>('list');
  const [addStep, setAddStep] = useState<1|2|3>(1);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match|null>(null);
  const [matchStats, setMatchStats] = useState<MatchStat[]>([]);

  // Match form
  const blankForm = () => ({ matchDate: todayStr(), opponent: '', venue: '', matchType: 'ลีก', teamName: '', scoreFor: '0', scoreAgainst: '0', notes: '' });
  const [form, setForm] = useState(blankForm);

  // Step 2 – player selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQ, setSearchQ] = useState('');
  const [filterPos, setFilterPos] = useState('');

  // Step 3 – per-player stats
  const [statVals, setStatVals] = useState<Record<string, Partial<MatchStat>>>({});

  const [filterTeam, setFilterTeam] = useState('ALL');
  const teamOptions = useMemo(() => ['ALL', ...TEAMS], []);

  // Edit mode for detail view
  const [isEditingMatch, setIsEditingMatch] = useState(false);
  const [editMatchForm, setEditMatchForm] = useState<typeof form>(blankForm());
  const [editStatVals, setEditStatVals] = useState<Record<string, Partial<MatchStat>>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Athletes available for selection: filtered by match team if set
  const poolAthletes = useMemo(() =>
    athletes.filter(a => !form.teamName || a.Team === form.teamName),
    [athletes, form.teamName]);

  // Displayed in step 2 with search + position filter
  const displayAthletes = useMemo(() => {
    let list = poolAthletes;
    if (filterPos) list = list.filter(a => a.Position === filterPos);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(a =>
        a.Name.toLowerCase().includes(q) ||
        (a.Nickname||'').toLowerCase().includes(q)
      );
    }
    return list;
  }, [poolAthletes, filterPos, searchQ]);

  const allDisplaySelected = displayAthletes.length > 0 && displayAthletes.every(a => selectedIds.has(a.PlayerID));

  const toggleSelectAll = () => {
    if (allDisplaySelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        displayAthletes.forEach(a => next.delete(a.PlayerID));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        displayAthletes.forEach(a => next.add(a.PlayerID));
        return next;
      });
    }
  };

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Athletes in step 3 (only selected)
  const selectedAthletes = useMemo(() =>
    athletes.filter(a => selectedIds.has(a.PlayerID)),
    [athletes, selectedIds]);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callGAS('getMatches', { clubId: user.clubId || '', teamName: filterTeam === 'ALL' ? '' : filterTeam }) as Match[];
      setMatches(Array.isArray(d) ? d : []);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [user.clubId, filterTeam]);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const loadMatchStats = async (matchId: string) => {
    try {
      const d = await callGAS('getMatchStats', { matchId }) as MatchStat[];
      setMatchStats(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
  };

  const setStat = (pid: string, k: keyof MatchStat, v: number) =>
    setStatVals(p => ({ ...p, [pid]: { ...(p[pid]||{}), [k]: v } }));

  const handleSave = async () => {
    if (!form.opponent.trim()) { showToast('กรุณากรอกชื่อทีมคู่แข่ง', 'error'); return; }
    setSaving(true);
    try {
      const sf = Number(form.scoreFor)||0, sa = Number(form.scoreAgainst)||0;
      const result: Match['result'] = sf > sa ? 'W' : sf < sa ? 'L' : 'D';
      const stats = selectedAthletes.map(a => {
        const s = statVals[a.PlayerID] || {};
        return { playerId: a.PlayerID, minutesPlayed: s.minutesPlayed||0, goals: s.goals||0, assists: s.assists||0, yellowCards: s.yellowCards||0, redCards: s.redCards||0, rating: s.rating||0, notes: s.notes||'' };
      }).filter(s => s.minutesPlayed > 0 || s.goals > 0 || s.assists > 0 || s.rating > 0);

      const res = await callGAS('saveMatch', {
        ...form, scoreFor: sf, scoreAgainst: sa, result,
        clubId: user.clubId || '', createdBy: user.displayName || user.username,
        stats,
      }) as { status: string; message: string };
      if (res.status === 'success') {
        showToast('บันทึกผลแข่งขันสำเร็จ', 'success');
        setForm(blankForm());
        setStatVals({});
        setSelectedIds(new Set());
        setAddStep(1);
        setTab('list');
        loadMatches();
      } else showToast(res.message, 'error');
    } catch { showToast('Connection error', 'error'); }
    finally { setSaving(false); }
  };

  const resultBadge = (r: Match['result']) => {
    const cfg = { W: { bg:'#f0fdf4',color:'#166534',label:'ชนะ' }, D: { bg:'#eff6ff',color:'#1e40af',label:'เสมอ' }, L: { bg:'#fef2f2',color:'#dc2626',label:'แพ้' } };
    const c = cfg[r];
    return <span style={{ background:c.bg, color:c.color, borderRadius:6, padding:'2px 8px', fontSize:'0.7rem', fontWeight:800, border:`1px solid ${c.color}40` }}>{c.label}</span>;
  };

  const summary = useMemo(() => {
    const w = matches.filter(m=>m.result==='W').length;
    const d = matches.filter(m=>m.result==='D').length;
    const l = matches.filter(m=>m.result==='L').length;
    const gf = matches.reduce((s,m)=>s+m.scoreFor,0);
    const ga = matches.reduce((s,m)=>s+m.scoreAgainst,0);
    return { w, d, l, gf, ga, total: matches.length };
  }, [matches]);

  const startAdd = () => {
    setForm(blankForm());
    setStatVals({});
    setSelectedIds(new Set());
    setSearchQ('');
    setFilterPos('');
    setAddStep(1);
    setTab('add');
  };

  const startEditMatch = () => {
    if (!selectedMatch) return;
    setEditMatchForm({
      matchDate: selectedMatch.matchDate, opponent: selectedMatch.opponent,
      venue: selectedMatch.venue, matchType: selectedMatch.matchType,
      teamName: selectedMatch.teamName, scoreFor: String(selectedMatch.scoreFor),
      scoreAgainst: String(selectedMatch.scoreAgainst), notes: selectedMatch.notes,
    });
    const preload: Record<string, Partial<MatchStat>> = {};
    matchStats.forEach(s => { preload[s.playerId] = { ...s }; });
    setEditStatVals(preload);
    setIsEditingMatch(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMatch) return;
    setSavingEdit(true);
    try {
      const sf = Number(editMatchForm.scoreFor)||0, sa = Number(editMatchForm.scoreAgainst)||0;
      const res = await callGAS('updateMatch', { id: selectedMatch.id, ...editMatchForm, scoreFor: sf, scoreAgainst: sa }) as { status: string; result?: Match['result'] };
      if (res.status !== 'success') { showToast('บันทึกไม่สำเร็จ', 'error'); return; }

      // update per-player stats in parallel
      await Promise.all(matchStats.map(s => {
        const ev = editStatVals[s.playerId];
        if (!ev) return Promise.resolve();
        return callGAS('updateMatchStat', { id: s.id, minutesPlayed: ev.minutesPlayed||0, goals: ev.goals||0, assists: ev.assists||0, yellowCards: ev.yellowCards||0, redCards: ev.redCards||0, rating: ev.rating||0, notes: ev.notes||'' });
      }));

      const newResult = res.result || selectedMatch.result;
      const updated: Match = { ...selectedMatch, ...editMatchForm, scoreFor: sf, scoreAgainst: sa, result: newResult };
      setSelectedMatch(updated);
      setMatches(ms => ms.map(m => m.id === updated.id ? updated : m));
      setMatchStats(prev => prev.map(s => {
        const ev = editStatVals[s.playerId];
        if (!ev) return s;
        return { ...s, minutesPlayed: ev.minutesPlayed||0, goals: ev.goals||0, assists: ev.assists||0, yellowCards: ev.yellowCards||0, redCards: ev.redCards||0, rating: ev.rating||0, notes: ev.notes||'' };
      }));
      showToast('แก้ไขสำเร็จ', 'success');
      setIsEditingMatch(false);
    } catch { showToast('Connection error', 'error'); }
    finally { setSavingEdit(false); }
  };

  const setEditStat = (pid: string, k: keyof MatchStat, v: number) =>
    setEditStatVals(p => ({ ...p, [pid]: { ...(p[pid]||{}), [k]: v } }));

  // ── Step indicator ──
  const StepBar = () => (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 16px', overflow:'hidden' }}>
      {[{n:1,label:'ข้อมูลแมทช์'},{n:2,label:'เลือกผู้เล่น'},{n:3,label:'กรอกสถิติ'}].map((s,i)=>(
        <div key={s.n} style={{ display:'flex', alignItems:'center', flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{
              width:26, height:26, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:800, fontSize:'0.75rem',
              background: addStep >= s.n ? '#38bdf8' : 'var(--border)',
              color: addStep >= s.n ? 'white' : 'var(--text-muted)',
            }}>{s.n}</div>
            <span style={{ fontSize:'0.75rem', fontWeight:600, color: addStep === s.n ? '#38bdf8' : addStep > s.n ? 'var(--text-main)' : 'var(--text-muted)', whiteSpace:'nowrap' }}>{s.label}</span>
          </div>
          {i < 2 && <div style={{ flex:1, height:2, background: addStep > s.n ? '#38bdf8' : 'var(--border)', margin:'0 8px', minWidth:12 }}/>}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Match Log</h2>
          <p className="page-subtitle">บันทึกผลการแข่งขัน · สถิตินักกีฬาต่อแมทช์</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select className="form-select" style={{ width:'auto' }} value={filterTeam} onChange={e=>setFilterTeam(e.target.value)}>
            {teamOptions.map(t=><option key={t} value={t}>{t==='ALL'?'ทุกรุ่น':t}</option>)}
          </select>
          <button className="btn-primary" onClick={startAdd}>
            <i className="bi bi-plus-circle me-1"/>บันทึกผลแข่ง
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary.total > 0 && tab === 'list' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10, marginBottom:18 }}>
          {[
            { l:'แมทช์', v:summary.total, c:'#38bdf8' },
            { l:'ชนะ',   v:summary.w,     c:'#10b981' },
            { l:'เสมอ',  v:summary.d,     c:'#6366f1' },
            { l:'แพ้',   v:summary.l,     c:'#ef4444' },
            { l:'ยิงได้', v:summary.gf,   c:'#f59e0b' },
            { l:'เสียประตู', v:summary.ga, c:'#f97316' },
          ].map(k=>(
            <div key={k.l} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', borderLeft:`3px solid ${k.c}` }}>
              <div style={{ fontWeight:900, fontSize:'1.4rem', color:k.c }}>{k.v}</div>
              <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:600 }}>{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <>
          {loading && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}
          {!loading && matches.length === 0 && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-shield-check" style={{fontSize:'3rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>
              <p>ยังไม่มีข้อมูลการแข่งขัน</p>
              <button className="btn-primary" style={{marginTop:12}} onClick={startAdd}><i className="bi bi-plus-circle me-1"/>บันทึกผลแข่งแรก</button>
            </div>
          )}
          {!loading && matches.map(m => (
            <div key={m.id} className="surface" style={{ marginBottom:10, padding:'14px 18px', cursor:'pointer' }}
              onClick={async()=>{ setSelectedMatch(m); await loadMatchStats(m.id); setTab('detail'); }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ minWidth:80 }}>
                  <div style={{ fontWeight:700, fontSize:'0.8rem' }}>{fmtDate(m.matchDate)}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{m.matchType} {m.teamName && `· ${m.teamName}`}</div>
                </div>
                {resultBadge(m.result)}
                <div style={{ flex:1, textAlign:'center' }}>
                  <div style={{ fontWeight:900, fontSize:'1.4rem', letterSpacing:2 }}>{m.scoreFor} <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>vs</span> {m.scoreAgainst}</div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>vs {m.opponent}</div>
                </div>
                {m.venue && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}><i className="bi bi-geo-alt me-1"/>{m.venue}</div>}
                <i className="bi bi-chevron-right" style={{ color:'var(--text-muted)' }}/>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── ADD TAB ── */}
      {tab === 'add' && (
        <div>
          <button className="btn-outline btn-sm" onClick={()=>{setTab('list');setAddStep(1);}} style={{marginBottom:16}}>
            <i className="bi bi-arrow-left me-1"/>กลับ
          </button>

          <StepBar />

          {/* ── STEP 1: Match Info ── */}
          {addStep === 1 && (
            <div>
              <div className="surface" style={{padding:'16px 20px',marginBottom:16}}>
                <div className="section-hd" style={{marginBottom:14}}><i className="bi bi-shield-check me-2" style={{color:'#38bdf8'}}/>ข้อมูลการแข่งขัน</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
                  <div style={{flex:'1 1 140px'}}>
                    <label className="form-label">วันที่</label>
                    <input type="date" className="form-control" value={form.matchDate} onChange={e=>setForm(f=>({...f,matchDate:e.target.value}))}/>
                  </div>
                  <div style={{flex:'2 1 200px'}}>
                    <label className="form-label">ทีมคู่แข่ง *</label>
                    <input className="form-control" value={form.opponent} placeholder="ชื่อทีมคู่แข่ง" onChange={e=>setForm(f=>({...f,opponent:e.target.value}))}/>
                  </div>
                  <div style={{flex:'1 1 120px'}}>
                    <label className="form-label">รุ่นทีม</label>
                    <select className="form-select" value={form.teamName} onChange={e=>setForm(f=>({...f,teamName:e.target.value}))}>
                      <option value="">— ทั้งหมด —</option>
                      {TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{flex:'1 1 120px'}}>
                    <label className="form-label">ประเภท</label>
                    <select className="form-select" value={form.matchType} onChange={e=>setForm(f=>({...f,matchType:e.target.value}))}>
                      {MATCH_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{flex:'1 1 80px'}}>
                    <label className="form-label">ประตูได้</label>
                    <input type="number" min={0} className="form-control" value={form.scoreFor} onChange={e=>setForm(f=>({...f,scoreFor:e.target.value}))}/>
                  </div>
                  <div style={{flex:'1 1 80px'}}>
                    <label className="form-label">ประตูเสีย</label>
                    <input type="number" min={0} className="form-control" value={form.scoreAgainst} onChange={e=>setForm(f=>({...f,scoreAgainst:e.target.value}))}/>
                  </div>
                  <div style={{flex:'2 1 200px'}}>
                    <label className="form-label">สนาม</label>
                    <input className="form-control" value={form.venue} placeholder="สนามแข่งขัน" onChange={e=>setForm(f=>({...f,venue:e.target.value}))}/>
                  </div>
                  <div style={{flex:'100% 1 100%'}}>
                    <label className="form-label">หมายเหตุ</label>
                    <input className="form-control" value={form.notes} placeholder="บันทึกเพิ่มเติม..." onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                  </div>
                </div>
              </div>
              <button className="btn-primary w-100" style={{justifyContent:'center',padding:14}} onClick={()=>{
                if (!form.opponent.trim()) { showToast('กรุณากรอกชื่อทีมคู่แข่ง','error'); return; }
                setAddStep(2);
              }}>
                ถัดไป: เลือกผู้เล่น <i className="bi bi-arrow-right ms-1"/>
              </button>
            </div>
          )}

          {/* ── STEP 2: Player Selection ── */}
          {addStep === 2 && (
            <div>
              {/* Header */}
              <div className="surface" style={{padding:'14px 16px',marginBottom:12}}>
                <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:10}}>
                  <i className="bi bi-people-fill me-2" style={{color:'#38bdf8'}}/>
                  เลือกนักกีฬาที่ลงเล่น
                </div>
                {/* Filters */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <select className="form-select" style={{flex:'1 1 120px'}} value={form.teamName} onChange={e=>setForm(f=>({...f,teamName:e.target.value}))}>
                    <option value="">— รุ่นทั้งหมด —</option>
                    {TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="form-select" style={{flex:'1 1 140px'}} value={filterPos} onChange={e=>setFilterPos(e.target.value)}>
                    <option value="">— ตำแหน่งทั้งหมด —</option>
                    {POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                  <div style={{flex:'2 1 200px',position:'relative'}}>
                    <i className="bi bi-search" style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-muted)',fontSize:'0.8rem'}}/>
                    <input className="form-control" style={{paddingLeft:30}} placeholder="ค้นชื่อ..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
                  </div>
                </div>
              </div>

              {/* Select all row */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 16px',background:'var(--surface)',border:'1px solid var(--border)',borderRadius:8,marginBottom:8}}>
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',fontWeight:600,fontSize:'0.82rem'}}>
                  <input type="checkbox" checked={allDisplaySelected} onChange={toggleSelectAll}
                    style={{width:16,height:16,accentColor:'#38bdf8',cursor:'pointer'}}/>
                  เลือกทั้งหมด ({displayAthletes.length} คน)
                </label>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>แสดง {displayAthletes.length} คน</span>
              </div>

              {/* Athlete list */}
              <div style={{marginBottom:80}}>
                {displayAthletes.length === 0 && (
                  <div style={{textAlign:'center',padding:40,color:'var(--text-muted)',fontSize:'0.85rem'}}>
                    <i className="bi bi-search" style={{display:'block',fontSize:'2rem',marginBottom:8,color:'#cbd5e1'}}/>
                    ไม่พบนักกีฬา
                  </div>
                )}
                {displayAthletes.map(a => {
                  const checked = selectedIds.has(a.PlayerID);
                  const teamColor = TEAM_COLORS[a.Team] || '#6366f1';
                  return (
                    <div key={a.PlayerID}
                      onClick={()=>togglePlayer(a.PlayerID)}
                      style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:'10px 16px', cursor:'pointer',
                        borderBottom:'1px solid var(--border)',
                        background: checked ? 'rgba(56,189,248,0.06)' : 'var(--surface)',
                        transition:'background 0.15s',
                      }}>
                      <input type="checkbox" checked={checked} onChange={()=>togglePlayer(a.PlayerID)}
                        onClick={e=>e.stopPropagation()}
                        style={{width:16,height:16,accentColor:'#38bdf8',cursor:'pointer',flexShrink:0}}/>
                      {/* Avatar */}
                      <div style={{
                        width:40,height:40,borderRadius:'50%',flexShrink:0,overflow:'hidden',
                        background: a.PhotoUrl ? 'transparent' : teamColor,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'0.75rem',fontWeight:800,color:'white',
                        border: checked ? `2px solid #38bdf8` : '2px solid transparent',
                      }}>
                        {a.PhotoUrl
                          ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          : initials(a.Name)
                        }
                      </div>
                      {/* Name */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:'0.85rem',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.Name}</div>
                        {a.Nickname && <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{a.Nickname}</div>}
                      </div>
                      {/* Team badge */}
                      {a.Team && (
                        <span style={{
                          background:`${teamColor}20`,color:teamColor,
                          borderRadius:6,padding:'2px 8px',fontSize:'0.7rem',fontWeight:800,
                          border:`1px solid ${teamColor}40`,flexShrink:0,
                        }}>{a.Team}</span>
                      )}
                      {/* Position */}
                      {a.Position && (
                        <span style={{fontSize:'0.72rem',color:'var(--text-muted)',flexShrink:0,minWidth:60,textAlign:'right'}}>{a.Position}</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sticky bottom bar */}
              <div style={{
                position:'sticky',bottom:0,left:0,right:0,
                background:'var(--bg)',borderTop:'1px solid var(--border)',
                padding:'12px 16px',display:'flex',gap:10,alignItems:'center',
                backdropFilter:'blur(8px)',
              }}>
                <button className="btn-outline" style={{flexShrink:0}} onClick={()=>setAddStep(1)}>
                  <i className="bi bi-arrow-left me-1"/>ก่อนหน้า
                </button>
                <div style={{flex:1,fontSize:'0.82rem',color:'var(--text-muted)'}}>
                  เลือกแล้ว <strong style={{color:'#38bdf8'}}>{selectedIds.size} คน</strong>
                </div>
                <button className="btn-primary" style={{flexShrink:0}} onClick={()=>{
                  if (selectedIds.size === 0) { showToast('กรุณาเลือกผู้เล่นอย่างน้อย 1 คน','error'); return; }
                  setAddStep(3);
                }}>
                  <i className="bi bi-people-fill me-1"/>เพิ่มเข้าตาราง ({selectedIds.size} คน)
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: Stats ── */}
          {addStep === 3 && (
            <div>
              {/* Match summary */}
              <div style={{background:'linear-gradient(135deg,#0f172a,#1e293b)',borderRadius:12,padding:'14px 18px',marginBottom:16,color:'white',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontWeight:900,fontSize:'1.6rem',letterSpacing:2}}>{form.scoreFor} <span style={{color:'#7dd3fc',fontSize:'0.9rem'}}>vs</span> {form.scoreAgainst}</div>
                  <div style={{fontSize:'0.78rem',color:'#7dd3fc'}}>vs {form.opponent}</div>
                </div>
                <div style={{flex:1,fontSize:'0.75rem',color:'#94a3b8'}}>
                  <div>{fmtDate(form.matchDate)} · {form.matchType} {form.teamName && `· ${form.teamName}`}</div>
                  {form.venue && <div><i className="bi bi-geo-alt me-1"/>{form.venue}</div>}
                </div>
                <button style={{background:'transparent',border:'1px solid #334155',borderRadius:8,color:'#94a3b8',padding:'4px 12px',fontSize:'0.75rem',cursor:'pointer'}} onClick={()=>setAddStep(2)}>
                  <i className="bi bi-people-fill me-1"/>{selectedIds.size} คน
                </button>
              </div>

              <div className="surface" style={{padding:0,overflow:'hidden',marginBottom:16}}>
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem'}}>
                  <i className="bi bi-table me-2" style={{color:'#38bdf8'}}/>สถิตินักกีฬา ({selectedAthletes.length} คน)
                </div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
                    <thead><tr style={{background:'var(--bg)'}}>
                      {['นักกีฬา','นาทีที่เล่น','ประตู','Assist','ใบเหลือง','ใบแดง','Rating'].map(h=>(
                        <th key={h} style={{padding:'8px 10px',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {selectedAthletes.map(a => {
                        const s = statVals[a.PlayerID] || {};
                        const inp = (k: keyof MatchStat, max: number, col?: string) => (
                          <input type="number" min={0} max={max}
                            style={{width:54,textAlign:'center',border:'1px solid var(--border)',borderRadius:6,padding:'4px',background:'var(--bg)',color:col||'var(--text-main)',fontWeight:700}}
                            value={s[k]||''} placeholder="—"
                            onChange={e=>setStat(a.PlayerID, k, Number(e.target.value))}/>
                        );
                        return (
                          <tr key={a.PlayerID} style={{borderBottom:'1px solid var(--border)'}}>
                            <td style={{padding:'8px 12px'}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <div style={{
                                  width:28,height:28,borderRadius:'50%',overflow:'hidden',flexShrink:0,
                                  background:TEAM_COLORS[a.Team]||'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',
                                  fontSize:'0.65rem',fontWeight:800,color:'white',
                                }}>
                                  {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(a.Name)}
                                </div>
                                <div>
                                  <div style={{fontWeight:700}}>{a.Name}</div>
                                  <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{a.Nickname&&`"${a.Nickname}" · `}{a.Position||'—'}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('minutesPlayed',200)}</td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('goals',20,'#10b981')}</td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('assists',20,'#38bdf8')}</td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('yellowCards',2,'#f59e0b')}</td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('redCards',1,'#ef4444')}</td>
                            <td style={{textAlign:'center',padding:'4px 6px'}}>{inp('rating',10,'#6366f1')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{display:'flex',gap:10}}>
                <button className="btn-outline" onClick={()=>setAddStep(2)}>
                  <i className="bi bi-arrow-left me-1"/>ก่อนหน้า
                </button>
                <button className="btn-primary" style={{flex:1,justifyContent:'center',padding:14}} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> บันทึก...</> : <><i className="bi bi-floppy me-1"/>บันทึกผลการแข่งขัน</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL TAB ── */}
      {tab === 'detail' && selectedMatch && (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
            <button className="btn-outline btn-sm" onClick={()=>{setTab('list');setIsEditingMatch(false);}}><i className="bi bi-arrow-left me-1"/>กลับ</button>
            <div style={{flex:1}}/>
            {!isEditingMatch ? (
              <button className="btn-outline btn-sm" onClick={startEditMatch} style={{borderColor:'#f59e0b',color:'#f59e0b'}}>
                <i className="bi bi-pencil-fill me-1"/>แก้ไข
              </button>
            ) : (
              <>
                <button className="btn-outline btn-sm" onClick={()=>setIsEditingMatch(false)}>ยกเลิก</button>
                <button className="btn-primary btn-sm" onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <><span className="spinner-ring" style={{width:14,height:14,borderWidth:2,margin:0}}/> บันทึก...</> : <><i className="bi bi-floppy me-1"/>บันทึก</>}
                </button>
              </>
            )}
          </div>

          {/* Match header — view or edit */}
          {!isEditingMatch ? (
            <div className="surface" style={{marginBottom:16,padding:'20px 24px',background:'linear-gradient(135deg,#0f172a,#1e293b)',color:'white'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                {resultBadge(selectedMatch.result)}
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:'1.8rem',letterSpacing:3}}>{selectedMatch.scoreFor} – {selectedMatch.scoreAgainst}</div>
                  <div style={{fontSize:'0.85rem',color:'#7dd3fc'}}>vs {selectedMatch.opponent}</div>
                </div>
                <div style={{textAlign:'right',fontSize:'0.78rem',color:'#94a3b8'}}>
                  <div>{fmtDate(selectedMatch.matchDate)}</div>
                  <div>{selectedMatch.matchType} {selectedMatch.teamName&&`· ${selectedMatch.teamName}`}</div>
                  {selectedMatch.venue&&<div><i className="bi bi-geo-alt me-1"/>{selectedMatch.venue}</div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="surface" style={{marginBottom:16,padding:'16px 20px'}}>
              <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:12,color:'#f59e0b'}}><i className="bi bi-pencil-fill me-2"/>แก้ไขข้อมูลแมทช์</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                <div style={{flex:'1 1 130px'}}><label className="form-label">วันที่</label><input type="date" className="form-control" value={editMatchForm.matchDate} onChange={e=>setEditMatchForm(f=>({...f,matchDate:e.target.value}))}/></div>
                <div style={{flex:'2 1 180px'}}><label className="form-label">ทีมคู่แข่ง</label><input className="form-control" value={editMatchForm.opponent} onChange={e=>setEditMatchForm(f=>({...f,opponent:e.target.value}))}/></div>
                <div style={{flex:'1 1 100px'}}><label className="form-label">รุ่น</label>
                  <select className="form-select" value={editMatchForm.teamName} onChange={e=>setEditMatchForm(f=>({...f,teamName:e.target.value}))}>
                    <option value="">— ไม่ระบุ —</option>
                    {TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{flex:'1 1 120px'}}><label className="form-label">ประเภท</label>
                  <select className="form-select" value={editMatchForm.matchType} onChange={e=>setEditMatchForm(f=>({...f,matchType:e.target.value}))}>
                    {MATCH_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{flex:'1 1 70px'}}><label className="form-label">ทำประตู</label><input type="number" min={0} className="form-control" value={editMatchForm.scoreFor} onChange={e=>setEditMatchForm(f=>({...f,scoreFor:e.target.value}))}/></div>
                <div style={{flex:'1 1 70px'}}><label className="form-label">เสียประตู</label><input type="number" min={0} className="form-control" value={editMatchForm.scoreAgainst} onChange={e=>setEditMatchForm(f=>({...f,scoreAgainst:e.target.value}))}/></div>
                <div style={{flex:'2 1 200px'}}><label className="form-label">สนาม</label><input className="form-control" value={editMatchForm.venue} onChange={e=>setEditMatchForm(f=>({...f,venue:e.target.value}))}/></div>
              </div>
            </div>
          )}

          {/* Stats — view or edit */}
          {matchStats.length > 0 && (
            <div className="surface" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem'}}>สถิตินักกีฬา {isEditingMatch&&<span style={{fontSize:'0.72rem',fontWeight:400,color:'#f59e0b',marginLeft:8}}>(แก้ไขได้)</span>}</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.8rem'}}>
                  <thead><tr style={{background:'var(--bg)'}}>
                    {['นักกีฬา','นาที','⚽','🅰️','🟨','🟥','Rating'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',textAlign:'center'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {matchStats.map(s=>{
                      const a = athletes.find(x=>x.PlayerID===s.playerId);
                      const ev = editStatVals[s.playerId] || s;
                      const numInp = (k: keyof MatchStat, max: number, col?: string) => isEditingMatch ? (
                        <input type="number" min={0} max={max} style={{width:52,textAlign:'center',border:'1px solid var(--border)',borderRadius:6,padding:'3px',background:'var(--bg)',color:col||'var(--text-main)',fontWeight:700}} value={ev[k] as number||''} placeholder="0" onChange={e=>setEditStat(s.playerId, k, Number(e.target.value))}/>
                      ) : null;
                      return (
                        <tr key={s.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'8px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              {a && <div style={{width:28,height:28,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:TEAM_COLORS[a.Team]||'#6366f1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:800,color:'white'}}>{a.PhotoUrl?<img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:initials(a.Name)}</div>}
                              <span style={{fontWeight:700}}>{a?.Name||s.playerId}</span>
                            </div>
                          </td>
                          <td style={{textAlign:'center'}}>{isEditingMatch ? numInp('minutesPlayed',200) : `${s.minutesPlayed}'`}</td>
                          <td style={{textAlign:'center',color:'#10b981',fontWeight:700}}>{isEditingMatch ? numInp('goals',20,'#10b981') : (s.goals||'—')}</td>
                          <td style={{textAlign:'center',color:'#38bdf8',fontWeight:700}}>{isEditingMatch ? numInp('assists',20,'#38bdf8') : (s.assists||'—')}</td>
                          <td style={{textAlign:'center'}}>{isEditingMatch ? numInp('yellowCards',2,'#f59e0b') : (s.yellowCards>0?<span style={{color:'#f59e0b',fontWeight:900}}>{'🟨'.repeat(s.yellowCards)}</span>:'—')}</td>
                          <td style={{textAlign:'center'}}>{isEditingMatch ? numInp('redCards',1,'#ef4444') : (s.redCards>0?<span style={{color:'#ef4444',fontWeight:900}}>🟥</span>:'—')}</td>
                          <td style={{textAlign:'center',fontWeight:900,color:'#6366f1'}}>{isEditingMatch ? numInp('rating',10,'#6366f1') : (s.rating||'—')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {matchStats.length === 0 && (
            <div style={{textAlign:'center',padding:40,color:'var(--text-muted)',fontSize:'0.85rem'}}>
              <i className="bi bi-bar-chart" style={{display:'block',fontSize:'2rem',marginBottom:8,color:'#cbd5e1'}}/>
              ไม่มีสถิตินักกีฬาในแมทช์นี้
            </div>
          )}
        </div>
      )}
    </div>
  );
}
