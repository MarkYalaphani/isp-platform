'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { LOGO_URL } from '@/lib/devData';

interface Props { onLogin: (user: User) => void; }

const FEATURES = [
  { icon: 'bi-stars',                  color: '#f59e0b', label: 'AI Scout Report',  badge: 'AI' },
  { icon: 'bi-grid-1x2-fill',          color: '#38bdf8', label: 'Dashboard',        badge: '' },
  { icon: 'bi-person-badge-fill',      color: '#818cf8', label: 'Scout + FC26',     badge: '' },
  { icon: 'bi-lightning-charge-fill',  color: '#60a5fa', label: 'Physical Tests',   badge: '8ด้าน' },
  { icon: 'bi-bullseye',               color: '#a78bfa', label: 'Skill Assessment', badge: '27' },
  { icon: 'bi-clipboard2-check-fill',  color: '#818cf8', label: 'IDP + QR Fill',    badge: '' },
  { icon: 'bi-people-fill',            color: '#34d399', label: 'Roster',           badge: '' },
  { icon: 'bi-check2-square',          color: '#4ade80', label: 'Attendance',       badge: 'QR' },
  { icon: 'bi-heart-pulse-fill',       color: '#f472b6', label: 'Wellness & RPE',   badge: '' },
  { icon: 'bi-diagram-3-fill',         color: '#60a5fa', label: 'Line-Up Builder',  badge: '' },
  { icon: 'bi-flag-fill',              color: '#fb923c', label: 'Match Log',        badge: '' },
  { icon: 'bi-calendar3',              color: '#38bdf8', label: 'ปฏิทินทีม',       badge: '' },
  { icon: 'bi-bar-chart-line-fill',    color: '#10b981', label: 'Team Report',      badge: '' },
  { icon: 'bi-intersect',              color: '#fb923c', label: 'Compare H2H',      badge: '' },
  { icon: 'bi-trophy-fill',            color: '#fbbf24', label: 'Leaderboard',      badge: '' },
  { icon: 'bi-list-check',             color: '#818cf8', label: 'Training Program', badge: '' },
  { icon: 'bi-play-btn-fill',          color: '#f87171', label: 'Training Video',   badge: '' },
  { icon: 'bi-clipboard-data-fill',    color: '#e879f9', label: 'Update Results',   badge: '' },
  { icon: 'bi-lightning-fill',         color: '#fbbf24', label: 'Quick Test',       badge: '' },
  { icon: 'bi-display-fill',           color: '#94a3b8', label: 'Admin Monitor',    badge: '' },
  { icon: 'bi-person-plus-fill',       color: '#6ee7b7', label: 'Add Athlete',      badge: '' },
];

const HIGHLIGHTS = [
  { icon: 'bi-stars',               color: '#f59e0b', grad: 'rgba(245,158,11,0.12)', label: 'AI Scout Report', sub: 'Gemini-powered' },
  { icon: 'bi-lightning-charge-fill', color: '#38bdf8', grad: 'rgba(56,189,248,0.10)', label: '8 Physical Tests', sub: 'DPE Thailand Norms' },
  { icon: 'bi-phone-fill',          color: '#4ade80', grad: 'rgba(74,222,128,0.10)', label: 'QR Self-Fill',    sub: 'Mobile Friendly' },
];

const STATS = [
  { num: '21+', label: 'โมดูล',  sub: 'All-in-one' },
  { num: '27',  label: 'ทักษะ',  sub: 'Football Skills' },
  { num: 'AI',  label: 'Scout',  sub: 'Gemini Powered' },
  { num: 'QR',  label: 'เช็คชื่อ', sub: 'Mobile Ready' },
];

export default function LoginModal({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gasReady, setGasReady] = useState<boolean | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    fetch('/api/gas')
      .then(r => r.json())
      .then(d => setGasReady(d.configured))
      .catch(() => setGasReady(false));
  }, []);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await callGAS('login', { username, password }) as { status: string; message?: string; user?: User; token?: string };
      if (res.status === 'success' && res.user) {
        if (res.token) {
          sessionStorage.setItem('scoutToken', res.token);
          localStorage.setItem('scoutToken', res.token);
        }
        onLogin(res.user);
      } else {
        setError(res.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch {
      setError('เกิดข้อผิดพลาด: ไม่สามารถเชื่อมต่อ GAS ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'row', flexWrap: 'wrap',
      fontFamily: "'Space Grotesk','Prompt',sans-serif",
      background: '#060d1f', overflowY: 'auto',
    }}>
      <style>{`
        @keyframes lglow   { 0%,100%{opacity:0.55} 50%{opacity:1} }
        @keyframes lf1     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,22px)} }
        @keyframes lf2     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(24px,-20px)} }
        @keyframes lf3     { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-16px,-26px)} }
        @keyframes lfadeup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @media (max-width:700px) {
          .lm-left  { display:none !important; }
          .lm-right { flex:1 1 100% !important; min-height:100dvh !important; border-left:none !important; padding:32px 22px !important; }
        }
        .lm-feat:hover { background:rgba(255,255,255,0.06) !important; border-color:rgba(255,255,255,0.12) !important; }
        .lm-hi:hover   { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,0.4) !important; }
      `}</style>

      {/* ── LEFT: Brand Panel ── */}
      <div className="lm-left" style={{
        flex: '1 1 55%', minWidth: 0,
        background: 'linear-gradient(148deg,#060d1f 0%,#0c1a3a 55%,#071428 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px,4.5vw,60px)',
      }}>
        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'-12%', right:'-6%', width:540, height:540, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.11) 0%,transparent 65%)', animation:'lf1 14s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-22%', left:'-6%', width:460, height:460, borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.08) 0%,transparent 65%)', animation:'lf2 17s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'42%', left:'38%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.07) 0%,transparent 65%)', animation:'lf3 11s ease-in-out infinite', pointerEvents:'none' }}/>
        {/* Grid overlay */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.03, backgroundImage:'linear-gradient(rgba(56,189,248,1) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,1) 1px,transparent 1px)', backgroundSize:'52px 52px' }}/>

        <div style={{ position:'relative', zIndex:1, maxWidth:560 }}>

          {/* Logo + Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
            <div style={{ width:50, height:50, borderRadius:13, overflow:'hidden', flexShrink:0, border:'1.5px solid rgba(56,189,248,0.25)', boxShadow:'0 0 26px rgba(56,189,248,0.18)' }}>
              <img src={LOGO_URL} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            </div>
            <div>
              <div style={{ fontSize:'1.3rem', fontWeight:900, color:'white', letterSpacing:0.5, lineHeight:1.15 }}>
                ISP{' '}
                <span style={{ background:'linear-gradient(90deg,#38bdf8,#818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Improve Sports Performance
                </span>
              </div>
              <div style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.28)', letterSpacing:3, textTransform:'uppercase', marginTop:3 }}>
                Sports Performance Platform
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize:'clamp(1.6rem,2.8vw,2.5rem)', fontWeight:900, color:'white', lineHeight:1.15, margin:'0 0 8px', letterSpacing:-0.5 }}>
            ระบบพัฒนานักกีฬา<br/>
            <span style={{ background:'linear-gradient(90deg,#38bdf8,#818cf8 60%,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              ฟุตบอลครบวงจร
            </span>
          </h1>
          <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.35)', lineHeight:1.65, margin:'0 0 20px', maxWidth:420 }}>
            วางแผน · ทดสอบ · วิเคราะห์ · พัฒนา ·{' '}
            <span style={{ color:'#38bdf8', fontWeight:600 }}>ข้อมูลจริง ไม่ใช่ความรู้สึก</span>
          </p>

          {/* Platform Highlights */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:18 }}>
            {HIGHLIGHTS.map(h => (
              <div key={h.label} className="lm-hi" style={{
                padding:'11px 13px', borderRadius:12, cursor:'default',
                background: h.grad, border:`1px solid ${h.color}28`,
                backdropFilter:'blur(12px)', transition:'transform 0.18s, box-shadow 0.18s',
              }}>
                <i className={`bi ${h.icon}`} style={{ color:h.color, fontSize:'1.05rem', display:'block', marginBottom:7 }}/>
                <div style={{ fontSize:'0.7rem', fontWeight:800, color:'rgba(255,255,255,0.88)', lineHeight:1.2 }}>{h.label}</div>
                <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.32)', marginTop:2 }}>{h.sub}</div>
              </div>
            ))}
          </div>

          {/* Feature Grid */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:'0.55rem', fontWeight:800, color:'rgba(255,255,255,0.22)', letterSpacing:2.5, textTransform:'uppercase' }}>21 MODULES</span>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }}/>
              <span style={{ fontSize:'0.55rem', fontWeight:700, color:'#38bdf8', letterSpacing:1, textTransform:'uppercase' }}>All-in-one Platform</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:5 }}>
              {FEATURES.map(f => (
                <div key={f.label} className="lm-feat" style={{
                  display:'flex', alignItems:'center', gap:7,
                  padding:'5px 9px', borderRadius:8,
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
                  cursor:'default', transition:'background 0.15s, border-color 0.15s',
                }}>
                  <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className={`bi ${f.icon}`} style={{ color:f.color, fontSize:'0.62rem' }}/>
                  </div>
                  <span style={{ fontSize:'0.63rem', fontWeight:700, color:'rgba(255,255,255,0.62)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, minWidth:0 }}>
                    {f.label}
                  </span>
                  {f.badge && (
                    <span style={{ fontSize:'0.47rem', fontWeight:800, color:f.color, background:`${f.color}20`, padding:'1px 5px', borderRadius:4, flexShrink:0, letterSpacing:0.3 }}>
                      {f.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:18 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                flex:1, textAlign:'center',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                padding:'0 8px',
              }}>
                <div style={{ fontSize:'1.55rem', fontWeight:900, color:'white', lineHeight:1, letterSpacing:-0.5 }}>{s.num}</div>
                <div style={{ fontSize:'0.65rem', fontWeight:700, color:'rgba(255,255,255,0.48)', marginTop:3 }}>{s.label}</div>
                <div style={{ fontSize:'0.52rem', color:'rgba(255,255,255,0.18)', marginTop:2, letterSpacing:0.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div className="lm-right" style={{
        flex: '0 0 clamp(320px,40%,460px)',
        background: '#0f172a',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px,5vw,56px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Rainbow accent line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa,#34d399,#f59e0b)' }}/>
        {/* Subtle glow behind form */}
        <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.05) 0%,transparent 65%)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1 }}>

          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)',
              borderRadius:20, padding:'4px 12px', marginBottom:14,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8', display:'inline-block', animation:'lglow 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:'0.62rem', fontWeight:700, color:'#38bdf8', letterSpacing:1.5, textTransform:'uppercase' }}>ระบบสด</span>
            </div>
            <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'white', margin:'0 0 6px', lineHeight:1.2 }}>เข้าสู่ระบบ</h2>
            <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)', lineHeight:1.6, margin:0 }}>
              เฉพาะโค้ชและสต๊าฟที่ได้รับอนุญาต<br/>กรุณาใช้บัญชีที่ได้รับมอบหมาย
            </p>
          </div>

          {/* GAS warning */}
          {gasReady === false && (
            <div className="login-error" style={{ marginBottom:20 }}>
              <i className="bi bi-exclamation-triangle me-2"/>
              ระบบยังไม่พร้อม — กรุณาติดต่อผู้ดูแลระบบ
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'0.62rem', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:7 }}>
                USERNAME
              </label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-person-fill" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.2)', fontSize:'0.88rem' }}/>
                <input
                  className="login-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="กรอก Username..."
                  autoComplete="username"
                  disabled={gasReady === false}
                  style={{ paddingLeft:38 }}
                  onKeyDown={e => e.key === 'Enter' && (document.getElementById('pw-input') as HTMLInputElement)?.focus()}
                />
              </div>
            </div>

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:'0.62rem', fontWeight:700, letterSpacing:1.5, textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:7 }}>
                PASSWORD
              </label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-lock-fill" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.2)', fontSize:'0.88rem' }}/>
                <input
                  id="pw-input"
                  type={showPw ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="กรอก Password..."
                  autoComplete="current-password"
                  disabled={gasReady === false}
                  style={{ paddingLeft:38, paddingRight:40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.26)', padding:4, lineHeight:1 }}
                >
                  <i className={`bi bi-eye${showPw ? '-slash' : ''}-fill`} style={{ fontSize:'0.88rem' }}/>
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom:14 }}>
                <i className="bi bi-exclamation-triangle me-2"/>{error}
              </div>
            )}

            <button
              type="submit"
              className="login-btn"
              disabled={loading || gasReady === false}
              style={{ marginTop:4 }}
            >
              {loading ? (
                <><span className="spinner-ring" style={{ width:18, height:18, borderWidth:2, margin:0 }}/> กำลังเข้าสู่ระบบ...</>
              ) : gasReady === null ? (
                <><span className="spinner-ring" style={{ width:18, height:18, borderWidth:2, margin:0 }}/> กำลังตรวจสอบ...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right"/> เข้าสู่ระบบ</>
              )}
            </button>
          </form>

          {/* Footer notices */}
          <div style={{ marginTop:26, display:'flex', flexDirection:'column', gap:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <i className="bi bi-shield-lock-fill" style={{ color:'#34d399', fontSize:'0.82rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.27)' }}>ระบบเข้าสู่ระบบแบบปลอดภัย — ข้อมูลนักกีฬาถูกเข้ารหัสทุกครั้ง</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <i className="bi bi-people-fill" style={{ color:'#818cf8', fontSize:'0.82rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.27)' }}>สำหรับโค้ช สต๊าฟ และผู้ดูแลระบบสโมสรเท่านั้น</span>
            </div>
          </div>

          <div style={{ marginTop:20, textAlign:'center', fontSize:'0.58rem', color:'rgba(255,255,255,0.12)', letterSpacing:0.5 }}>
            © 2026 Improve Sports Performance · All rights reserved
          </div>
        </div>
      </div>

    </div>
  );
}
