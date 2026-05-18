'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type AthleteRow = { PlayerID: string; Name: string; Nickname: string; Team: string; Position: string; PhotoUrl: string; Rating: number; Speed30: string; CMJ: string; Agility: string; YoYo: string; Tests: number };

function getGradeColor(r: number) {
  if (r >= 80) return '#10b981';
  if (r >= 60) return '#3b82f6';
  if (r >= 40) return '#f59e0b';
  return '#ef4444';
}

function posColor(pos: string) {
  const p = pos.toLowerCase();
  if (p.includes('forward')) return '#ef4444';
  if (p.includes('def')) return '#3b82f6';
  if (p.includes('goal')) return '#f59e0b';
  return '#8b5cf6';
}

function LeaderboardContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const team = sp.get('team') || '';

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/leaderboard${team ? `?team=${encodeURIComponent(team)}` : ''}`)
      .then(r => r.json())
      .then(d => { setAthletes(d.athletes || []); setTeams(d.teams || []); })
      .finally(() => setLoading(false));
  }, [team]);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: "'Prompt','Space Grotesk',sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0c1628,#162040)', borderBottom: '1px solid rgba(56,189,248,0.15)', padding: '24px 24px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: 3, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8 }}>ISP</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, paddingBottom: 20 }}>
            <div>
              <h1 style={{ color: 'white', fontWeight: 900, fontSize: '1.8rem', margin: 0 }}>🏆 Leaderboard</h1>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>อันดับสมรรถภาพนักกีฬา</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/leaderboard')} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: !team ? 'rgba(56,189,248,0.2)' : 'transparent', color: !team ? '#38bdf8' : '#64748b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>ทุกรุ่น</button>
              {teams.map(t => (
                <button key={t} onClick={() => router.push(`/leaderboard?team=${encodeURIComponent(t)}`)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: team === t ? 'rgba(56,189,248,0.2)' : 'transparent', color: team === t ? '#38bdf8' : '#64748b', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>{t}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(56,189,248,0.3)', borderTop: '3px solid #38bdf8', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            กำลังโหลด...
          </div>
        ) : (
          <>
            {/* Top 3 */}
            {athletes.length >= 3 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: 12, marginBottom: 24 }}>
                {[1, 0, 2].map((idx, pos) => {
                  const a = athletes[idx];
                  const medal = pos === 1 ? '🥇' : pos === 0 ? '🥈' : '🥉';
                  const initials = (a.Name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                  return (
                    <div key={a.PlayerID} onClick={() => window.open(`/athlete/${a.PlayerID}`, '_blank')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', marginTop: pos !== 1 ? 20 : 0 }}>
                      <div style={{ fontSize: '2rem', marginBottom: 10 }}>{medal}</div>
                      <div style={{ width: 56, height: 56, borderRadius: 14, border: `2px solid ${getGradeColor(a.Rating)}`, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', overflow: 'hidden' }}>
                        {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 800, color: '#38bdf8' }}>{initials}</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '0.9rem', marginBottom: 4 }}>{a.Name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 10 }}>{a.Team || '—'}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: getGradeColor(a.Rating) }}>{a.Rating}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Rankings */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              {athletes.map((a, i) => {
                const initials = (a.Name || '?').split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <div key={a.PlayerID} onClick={() => window.open(`/athlete/${a.PlayerID}`, '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(56,189,248,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? getGradeColor(a.Rating) : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: i < 3 ? 'white' : '#64748b', fontSize: '0.75rem', flexShrink: 0 }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.75rem' }}>{initials}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: '0.875rem' }}>{a.Name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
                        {a.Team && <span style={{ marginRight: 8 }}>{a.Team}</span>}
                        {a.Position && <span style={{ background: posColor(a.Position) + '20', color: posColor(a.Position), borderRadius: 4, padding: '1px 6px', fontSize: '0.65rem' }}>{a.Position}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {[{ label: 'Speed', val: a.Speed30, unit: 's' }, { label: 'CMJ', val: a.CMJ, unit: 'cm' }, { label: 'Yo-Yo', val: a.YoYo, unit: 'm' }].map(x => (
                        <div key={x.label} style={{ textAlign: 'center', display: 'none' }} className="show-md">
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>{x.val || '—'}</div>
                          <div style={{ fontSize: '0.58rem', color: '#475569' }}>{x.label}</div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', minWidth: 52 }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: getGradeColor(a.Rating), lineHeight: 1 }}>{a.Rating}</div>
                        <div style={{ fontSize: '0.58rem', color: '#475569', marginTop: 2 }}>RATING</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {athletes.length === 0 && (
                <div style={{ textAlign: 'center', padding: 48, color: '#475569' }}>ไม่มีข้อมูลนักกีฬา</div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: '#334155' }}>
              Powered by ISP Improve Sports Performance · อัปเดตอัตโนมัติ
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f172a' }} />}>
      <LeaderboardContent />
    </Suspense>
  );
}
