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

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}); }
  catch { return d; }
}

export default function MatchLogPage({ athletes, user }: Props) {
  const [tab, setTab] = useState<'list'|'add'|'detail'>('list');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match|null>(null);
  const [matchStats, setMatchStats] = useState<MatchStat[]>([]);

  // Add match form
  const [form, setForm] = useState({ matchDate: todayStr(), opponent: '', venue: '', matchType: 'ลีก', teamName: '', scoreFor: '0', scoreAgainst: '0', notes: '' });
  // Per-player stats in add mode
  const [statVals, setStatVals] = useState<Record<string, Partial<MatchStat>>>({});

  const [filterTeam, setFilterTeam] = useState('ALL');
  const teamOptions = useMemo(() => ['ALL', ...TEAMS], []);
  const filteredAthletes = useMemo(() => athletes.filter(a => form.teamName === '' || a.Team === form.teamName), [athletes, form.teamName]);

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
      const stats = filteredAthletes.map(a => {
        const s = statVals[a.PlayerID] || {};
        return { playerId: a.PlayerID, minutesPlayed: s.minutesPlayed||0, goals: s.goals||0, assists: s.assists||0, yellowCards: s.yellowCards||0, redCards: s.redCards||0, rating: s.rating||0, notes: s.notes||'' };
      }).filter(s => s.minutesPlayed > 0 || s.goals > 0 || s.assists > 0);

      const res = await callGAS('saveMatch', {
        ...form, scoreFor: sf, scoreAgainst: sa, result,
        clubId: user.clubId || '', createdBy: user.displayName || user.username,
        stats,
      }) as { status: string; message: string };
      if (res.status === 'success') {
        showToast('บันทึกผลแข่งขันสำเร็จ', 'success');
        setForm({ matchDate: todayStr(), opponent: '', venue: '', matchType: 'ลีก', teamName: '', scoreFor: '0', scoreAgainst: '0', notes: '' });
        setStatVals({});
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

  // Stats summary
  const summary = useMemo(() => {
    const w = matches.filter(m=>m.result==='W').length;
    const d = matches.filter(m=>m.result==='D').length;
    const l = matches.filter(m=>m.result==='L').length;
    const gf = matches.reduce((s,m)=>s+m.scoreFor,0);
    const ga = matches.reduce((s,m)=>s+m.scoreAgainst,0);
    return { w, d, l, gf, ga, total: matches.length };
  }, [matches]);

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
          <button className="btn-primary" onClick={()=>{setTab('add');setStatVals({});}}>
            <i className="bi bi-plus-circle me-1"/>บันทึกผลแข่ง
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary.total > 0 && (
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

      {tab === 'list' && (
        <>
          {loading && <div style={{textAlign:'center',padding:40}}><div className="spinner-ring"/></div>}
          {!loading && matches.length === 0 && (
            <div style={{textAlign:'center',padding:60,color:'var(--text-muted)'}}>
              <i className="bi bi-shield-check" style={{fontSize:'3rem',display:'block',marginBottom:10,color:'#cbd5e1'}}/>
              <p>ยังไม่มีข้อมูลการแข่งขัน</p>
              <button className="btn-primary" style={{marginTop:12}} onClick={()=>setTab('add')}><i className="bi bi-plus-circle me-1"/>บันทึกผลแข่งแรก</button>
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

      {tab === 'add' && (
        <div>
          <button className="btn-outline btn-sm" onClick={()=>setTab('list')} style={{marginBottom:16}}><i className="bi bi-arrow-left me-1"/>กลับ</button>
          <div className="surface" style={{marginBottom:16,padding:'16px 20px'}}>
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
                  <option value="">ทั้งหมด</option>
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
                <label className="form-label">ประตูที่ยิงได้</label>
                <input type="number" min={0} className="form-control" value={form.scoreFor} onChange={e=>setForm(f=>({...f,scoreFor:e.target.value}))}/>
              </div>
              <div style={{flex:'1 1 80px'}}>
                <label className="form-label">ประตูที่เสีย</label>
                <input type="number" min={0} className="form-control" value={form.scoreAgainst} onChange={e=>setForm(f=>({...f,scoreAgainst:e.target.value}))}/>
              </div>
              <div style={{flex:'2 1 200px'}}>
                <label className="form-label">สนาม</label>
                <input className="form-control" value={form.venue} placeholder="สนามแข่งขัน" onChange={e=>setForm(f=>({...f,venue:e.target.value}))}/>
              </div>
            </div>
          </div>

          {/* Player stats */}
          <div className="surface" style={{padding:0,overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem'}}>
              <i className="bi bi-people-fill me-2" style={{color:'#38bdf8'}}/>สถิตินักกีฬา ({filteredAthletes.length} คน)
            </div>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.78rem'}}>
                <thead><tr style={{background:'var(--bg)'}}>
                  {['นักกีฬา','นาทีที่เล่น','ประตู','Assist','ใบเหลือง','ใบแดง','Rating (1-10)'].map(h=>(
                    <th key={h} style={{padding:'8px 10px',fontWeight:700,color:'var(--text-muted)',borderBottom:'1px solid var(--border)',textAlign:'center',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredAthletes.map(a => {
                    const s = statVals[a.PlayerID] || {};
                    const inp = (k: keyof MatchStat, max: number, col?: string) => (
                      <input type="number" min={0} max={max} style={{width:54,textAlign:'center',border:'1px solid var(--border)',borderRadius:6,padding:'4px',background:'var(--bg)',color:col||'var(--text-main)',fontWeight:700}}
                        value={s[k]||''} placeholder="—" onChange={e=>setStat(a.PlayerID, k, Number(e.target.value))}/>
                    );
                    return (
                      <tr key={a.PlayerID} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'8px 12px'}}>
                          <div style={{fontWeight:700}}>{a.Name}</div>
                          <div style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{a.Nickname&&`"${a.Nickname}" · `}{a.Position||'—'}</div>
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

          <button className="btn-primary w-100" style={{justifyContent:'center',padding:14}} onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner-ring" style={{width:18,height:18,borderWidth:2,margin:0}}/> บันทึก...</> : <><i className="bi bi-floppy me-1"/>บันทึกผลการแข่งขัน</>}
          </button>
        </div>
      )}

      {tab === 'detail' && selectedMatch && (
        <div>
          <button className="btn-outline btn-sm" onClick={()=>setTab('list')} style={{marginBottom:16}}><i className="bi bi-arrow-left me-1"/>กลับ</button>
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
          {matchStats.length > 0 && (
            <div className="surface" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',fontWeight:700,fontSize:'0.85rem'}}>สถิตินักกีฬา</div>
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
                      return (
                        <tr key={s.id} style={{borderBottom:'1px solid var(--border)'}}>
                          <td style={{padding:'8px 12px',fontWeight:700}}>{a?.Name||s.playerId}</td>
                          <td style={{textAlign:'center'}}>{s.minutesPlayed}'</td>
                          <td style={{textAlign:'center',color:'#10b981',fontWeight:700}}>{s.goals||'—'}</td>
                          <td style={{textAlign:'center',color:'#38bdf8',fontWeight:700}}>{s.assists||'—'}</td>
                          <td style={{textAlign:'center'}}>{s.yellowCards>0?<span style={{color:'#f59e0b',fontWeight:900}}>{'🟨'.repeat(s.yellowCards)}</span>:'—'}</td>
                          <td style={{textAlign:'center'}}>{s.redCards>0?<span style={{color:'#ef4444',fontWeight:900}}>🟥</span>:'—'}</td>
                          <td style={{textAlign:'center',fontWeight:900,color:'#6366f1'}}>{s.rating||'—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
