'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface AthleteInfo {
  playerId: string;
  name: string;
  nickname: string;
  team: string;
  photoUrl: string;
}

function CheckInContent() {
  const params = useSearchParams();
  const sessionDate = params.get('date') || '';
  const sessionName = params.get('session') || '';
  const sessionType = params.get('type') || 'training';
  const clubId      = params.get('club') || '';

  const [athletes,  setAthletes]  = useState<AthleteInfo[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(true);
  const [checking,  setChecking]  = useState<string | null>(null);
  const [done,      setDone]      = useState<string | null>(null);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');

  // Synchronous lock — prevents double-tap before React state update propagates
  const inFlight = useRef<Set<string>>(new Set());

  const loadInfo = useCallback(async (silent = false) => {
    if (!sessionDate || !sessionName || !clubId) { setError('QR Code ไม่ถูกต้อง'); if (!silent) setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCheckInInfo', params: { clubId, sessionDate, sessionName } }),
      });
      const d = await res.json() as { athletes?: AthleteInfo[]; checkedIn?: string[] };
      if (!silent) setAthletes(d.athletes || []);
      setCheckedIn(prev => {
        const fromServer = new Set<string>(d.checkedIn || []);
        // Never remove players already confirmed locally or still in-flight
        for (const id of prev) fromServer.add(id);
        for (const id of inFlight.current) fromServer.add(id);
        return fromServer;
      });
    } catch {
      if (!silent) setError('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionDate, sessionName, clubId]);

  useEffect(() => { loadInfo(); }, [loadInfo]);

  // Poll every 8s silently — merges server state, never reverts local check-ins
  useEffect(() => {
    const id = setInterval(() => loadInfo(true), 8000);
    return () => clearInterval(id);
  }, [loadInfo]);

  const handleCheckIn = async (a: AthleteInfo) => {
    // Synchronous guard first (before React state update) — blocks double-tap race
    if (checkedIn.has(a.playerId) || inFlight.current.has(a.playerId)) return;
    inFlight.current.add(a.playerId);
    setChecking(a.playerId);
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submitCheckIn', params: { playerId: a.playerId, sessionDate, sessionName, sessionType, clubId } }),
      });
      const d = await res.json() as { status: string };
      if (d.status === 'success') {
        setCheckedIn(prev => new Set([...prev, a.playerId]));
        setDone(a.name);
        setTimeout(() => setDone(null), 3000);
      }
    } finally {
      inFlight.current.delete(a.playerId);
      setChecking(null);
    }
  };

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); } catch { return s; }
  };

  const TYPE_LABEL: Record<string, string> = { training:'ฝึกซ้อม', match:'แข่งขัน', fitness:'กายภาพ', other:'อื่นๆ' };
  const filtered = athletes.filter(a => !search || (a.name+a.nickname).toLowerCase().includes(search.toLowerCase()));
  const teams = Array.from(new Set(athletes.map(a => a.team).filter(Boolean)));

  if (!sessionDate || !clubId) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', padding:20 }}>
        <div style={{ textAlign:'center', color:'white' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>❌</div>
          <div style={{ fontWeight:700, fontSize:'1.1rem' }}>QR Code ไม่ถูกต้อง</div>
          <div style={{ color:'#94a3b8', marginTop:8, fontSize:'0.85rem' }}>กรุณาสแกน QR Code ใหม่จากโค้ช</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f172a 0%,#1e1b4b 100%)', padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'20px 20px 16px', textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#38bdf8,#818cf8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', margin:'0 auto 10px' }}>✅</div>
        <div style={{ fontWeight:800, fontSize:'1.1rem', color:'white' }}>{sessionName}</div>
        <div style={{ fontSize:'0.8rem', color:'#94a3b8', marginTop:4 }}>{fmtDate(sessionDate)} · {TYPE_LABEL[sessionType] || sessionType}</div>
        <div style={{ display:'flex', justifyContent:'center', gap:16, marginTop:12 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#10b981' }}>{checkedIn.size}</div>
            <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase' }}>เช็คอิน</div>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,0.1)' }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#94a3b8' }}>{athletes.length}</div>
            <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase' }}>ทั้งหมด</div>
          </div>
          <div style={{ width:1, background:'rgba(255,255,255,0.1)' }}/>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#f59e0b' }}>{athletes.length - checkedIn.size}</div>
            <div style={{ fontSize:'0.65rem', color:'#94a3b8', fontWeight:700, textTransform:'uppercase' }}>ยังไม่มา</div>
          </div>
        </div>
      </div>

      {/* Success toast */}
      {done && (
        <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#10b981', color:'white', borderRadius:12, padding:'12px 24px', fontWeight:700, fontSize:'0.9rem', zIndex:999, boxShadow:'0 8px 24px rgba(0,0,0,0.4)', whiteSpace:'nowrap' }}>
          ✅ {done} — เช็คอินสำเร็จ!
        </div>
      )}

      <div style={{ maxWidth:520, margin:'0 auto', padding:'20px 16px 0' }}>
        {error ? (
          <div style={{ textAlign:'center', color:'#f87171', padding:40, fontSize:'0.9rem' }}>{error}</div>
        ) : loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
            <div style={{ width:32, height:32, border:'3px solid rgba(56,189,248,0.3)', borderTopColor:'#38bdf8', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
            กำลังโหลด...
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:14 }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 ค้นหาชื่อนักกีฬา..."
                style={{ width:'100%', padding:'12px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'white', fontSize:'0.9rem', outline:'none', boxSizing:'border-box' }}/>
            </div>

            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
              กดชื่อตัวเองเพื่อเช็คอิน
            </div>

            {teams.length > 1 ? teams.map(team => {
              const teamAths = filtered.filter(a => a.team === team);
              if (!teamAths.length) return null;
              return (
                <div key={team} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:'0.72rem', fontWeight:800, color:'#38bdf8', textTransform:'uppercase', letterSpacing:1, marginBottom:8, paddingLeft:4 }}>{team}</div>
                  <AthleteGrid athletes={teamAths} checkedIn={checkedIn} checking={checking} onCheckIn={handleCheckIn} />
                </div>
              );
            }) : (
              <AthleteGrid athletes={filtered} checkedIn={checkedIn} checking={checking} onCheckIn={handleCheckIn} />
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign:'center', color:'#64748b', padding:40, fontSize:'0.85rem' }}>ไม่พบนักกีฬาที่ค้นหา</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AthleteGrid({ athletes, checkedIn, checking, onCheckIn }: {
  athletes: AthleteInfo[];
  checkedIn: Set<string>;
  checking: string | null;
  onCheckIn: (a: AthleteInfo) => void;
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
      {athletes.map(a => {
        const isIn    = checkedIn.has(a.playerId);
        const isWait  = checking === a.playerId;
        const ini     = (a.name || '?').split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase();
        return (
          <button key={a.playerId} onClick={() => onCheckIn(a)} disabled={isIn || !!checking}
            style={{
              padding:'14px 10px', borderRadius:14, border:'none', cursor: isIn ? 'default' : checking ? 'not-allowed' : 'pointer',
              background: isIn ? 'linear-gradient(135deg,#052e16,#14532d)' : 'rgba(255,255,255,0.05)',
              outline: isIn ? '2px solid #10b981' : '1.5px solid rgba(255,255,255,0.08)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:8,
              transition:'all 0.15s', transform: isWait ? 'scale(0.96)' : 'scale(1)',
            }}
            onMouseEnter={e => { if (!isIn && !checking) (e.currentTarget as HTMLButtonElement).style.background='rgba(56,189,248,0.1)'; }}
            onMouseLeave={e => { if (!isIn) (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,0.05)'; }}
          >
            <div style={{ width:48, height:48, borderRadius:'50%', overflow:'hidden', position:'relative', flexShrink:0,
              border: isIn ? '3px solid #10b981' : '2px solid rgba(255,255,255,0.15)',
              background: '#1e293b', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {a.photoUrl
                ? <img src={a.photoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', objectPosition:'top' }}/>
                : <span style={{ fontSize:'1rem', fontWeight:900, color: isIn ? '#10b981' : '#94a3b8' }}>{ini}</span>
              }
              {isIn && <div style={{ position:'absolute', inset:0, background:'rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>✅</div>}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'0.78rem', fontWeight:700, color: isIn ? '#4ade80' : 'white', lineHeight:1.3 }}>
                {a.nickname || a.name.split(' ')[0]}
              </div>
              {isIn && <div style={{ fontSize:'0.6rem', color:'#10b981', fontWeight:700, marginTop:2 }}>เช็คอินแล้ว ✓</div>}
              {isWait && <div style={{ fontSize:'0.6rem', color:'#38bdf8', fontWeight:700, marginTop:2 }}>กำลังบันทึก...</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function CheckInPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0f172a', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>Loading...</div>}>
      <CheckInContent />
    </Suspense>
  );
}
