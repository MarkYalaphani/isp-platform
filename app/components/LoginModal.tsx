'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { LOGO_URL } from '@/lib/devData';

interface Props { onLogin: (user: User) => void; }

const HERO_CARDS = [
  {
    icon: 'bi-stars',
    color: '#f59e0b',
    bg: 'linear-gradient(135deg,rgba(245,158,11,0.13) 0%,rgba(251,146,60,0.07) 100%)',
    border: 'rgba(245,158,11,0.28)',
    glow: 'rgba(245,158,11,0.12)',
    title: 'AI-Powered Analytics',
    titleTH: 'วิเคราะห์ด้วย AI',
    desc: 'สร้างรายงาน Scout มืออาชีพในไม่กี่วินาที',
    badge: 'AI',
    features: ['Scout Report + FC26 Card', 'Team Report + Dashboard', 'Compare H2H + Leaderboard'],
  },
  {
    icon: 'bi-lightning-charge-fill',
    color: '#38bdf8',
    bg: 'linear-gradient(135deg,rgba(56,189,248,0.13) 0%,rgba(96,165,250,0.07) 100%)',
    border: 'rgba(56,189,248,0.28)',
    glow: 'rgba(56,189,248,0.12)',
    title: 'Physical Performance',
    titleTH: 'สมรรถภาพร่างกาย',
    desc: 'ทดสอบ 8 ด้าน เทียบมาตรฐาน DPE ไทย U10–Senior',
    badge: '8ด้าน',
    features: ['Skill Assessment 27 ทักษะ', 'IDP แผนพัฒนา + QR Fill', 'Quick Test · Update Results'],
  },
  {
    icon: 'bi-diagram-3-fill',
    color: '#34d399',
    bg: 'linear-gradient(135deg,rgba(52,211,153,0.13) 0%,rgba(74,222,128,0.07) 100%)',
    border: 'rgba(52,211,153,0.28)',
    glow: 'rgba(52,211,153,0.12)',
    title: 'Team Management',
    titleTH: 'จัดการทีมครบวงจร',
    desc: 'Line-Up · Match Log · ปฏิทิน ทุกอย่างในที่เดียว',
    badge: 'NEW',
    features: ['Line-Up Builder Drag & Drop', 'Match Log + Calendar', 'Training Program + Video'],
  },
  {
    icon: 'bi-heart-pulse-fill',
    color: '#f472b6',
    bg: 'linear-gradient(135deg,rgba(244,114,182,0.13) 0%,rgba(167,139,250,0.07) 100%)',
    border: 'rgba(244,114,182,0.28)',
    glow: 'rgba(244,114,182,0.12)',
    title: 'Athlete Tracking',
    titleTH: 'ติดตามนักกีฬา',
    desc: 'Roster · Attendance QR · Wellness ครบทุกมิติ',
    badge: 'QR',
    features: ['Roster + Register Athlete', 'Attendance + QR Check-in', 'Wellness & RPE · Load'],
  },
];

const STATS = [
  { num: '20+', label: 'โมดูล',  sub: 'All-in-one' },
  { num: '27',  label: 'ทักษะ',  sub: 'Skill Assessment' },
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
        @keyframes lglow    { 0%,100%{opacity:0.55} 50%{opacity:1} }
        @keyframes lf1      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-32px,24px)} }
        @keyframes lf2      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(26px,-22px)} }
        @keyframes lf3      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18px,-28px)} }
        @keyframes lf4      { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,16px)} }
        @keyframes shimmer  { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes badgepop { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @media (max-width:700px) {
          .lm-left  { display:none !important; }
          .lm-right { flex:1 1 100% !important; min-height:100dvh !important; border-left:none !important; padding:32px 22px !important; }
        }
        .lm-card { transition:transform 0.2s ease, box-shadow 0.2s ease; }
        .lm-card:hover { transform:translateY(-4px) !important; }
        .lm-cap:hover { background:rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
      <div className="lm-left" style={{
        flex: '1 1 55%', minWidth: 0,
        background: 'linear-gradient(148deg,#060d1f 0%,#0b1936 55%,#071428 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px,4.5vw,60px)',
      }}>
        {/* Ambient orbs */}
        <div style={{ position:'absolute', top:'-8%', right:'-4%', width:580, height:580, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.10) 0%,transparent 65%)', animation:'lf1 15s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-20%', left:'-5%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.08) 0%,transparent 65%)', animation:'lf2 19s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'38%', left:'34%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.07) 0%,transparent 65%)', animation:'lf3 12s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'8%', left:'18%', width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.06) 0%,transparent 65%)', animation:'lf4 9s ease-in-out infinite', pointerEvents:'none' }}/>
        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.025, backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.7) 1px,transparent 1px)', backgroundSize:'28px 28px' }}/>

        <div style={{ position:'relative', zIndex:1, maxWidth:560 }}>

          {/* ── Logo + Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
            <div style={{ width:50, height:50, borderRadius:13, overflow:'hidden', flexShrink:0, border:'1.5px solid rgba(56,189,248,0.3)', boxShadow:'0 0 32px rgba(56,189,248,0.22)' }}>
              <img src={LOGO_URL} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            </div>
            <div>
              <div style={{ fontSize:'1.25rem', fontWeight:900, color:'white', letterSpacing:0.5, lineHeight:1.15 }}>
                ISP{' '}
                <span style={{ background:'linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                  Improve Sports Performance
                </span>
              </div>
              <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.25)', letterSpacing:3, textTransform:'uppercase', marginTop:3 }}>
                Sports Performance Platform
              </div>
            </div>
          </div>

          {/* ── Capability badges */}
          <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
            {[
              { icon:'bi-stars',                color:'#f59e0b', text:'AI-Powered' },
              { icon:'bi-lightning-charge-fill', color:'#38bdf8', text:'DPE Thailand Norms' },
              { icon:'bi-diagram-3-fill',        color:'#34d399', text:'Football-Specific' },
            ].map(b => (
              <div key={b.text} className="lm-cap" style={{
                display:'flex', alignItems:'center', gap:5,
                padding:'4px 11px', borderRadius:20,
                background:`${b.color}11`, border:`1px solid ${b.color}2a`,
                cursor:'default', transition:'background 0.15s',
              }}>
                <i className={`bi ${b.icon}`} style={{ color:b.color, fontSize:'0.62rem' }}/>
                <span style={{ fontSize:'0.62rem', fontWeight:700, color:'rgba(255,255,255,0.62)' }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* ── Headline */}
          <h1 style={{ fontSize:'clamp(1.7rem,2.8vw,2.55rem)', fontWeight:900, color:'white', lineHeight:1.12, margin:'0 0 8px', letterSpacing:-0.5 }}>
            ระบบพัฒนานักกีฬา<br/>
            <span style={{
              background:'linear-gradient(90deg,#38bdf8 0%,#818cf8 45%,#a78bfa 80%,#38bdf8 100%)',
              backgroundSize:'200% auto',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
              animation:'shimmer 6s linear infinite',
            }}>
              ฟุตบอลครบวงจร
            </span>
          </h1>
          <p style={{ fontSize:'0.84rem', color:'rgba(255,255,255,0.33)', lineHeight:1.7, margin:'0 0 22px', maxWidth:420 }}>
            วางแผน · ทดสอบ · วิเคราะห์ · พัฒนา ·{' '}
            <span style={{ color:'#38bdf8', fontWeight:600 }}>ข้อมูลจริง ไม่ใช่ความรู้สึก</span>
          </p>

          {/* ── 2×2 Hero Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
            {HERO_CARDS.map(card => (
              <div key={card.title} className="lm-card" style={{
                padding:'15px 16px', borderRadius:15, cursor:'default',
                background: card.bg,
                border: `1px solid ${card.border}`,
                boxShadow: `0 4px 28px ${card.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:`${card.color}1e`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 0 12px ${card.glow}` }}>
                    <i className={`bi ${card.icon}`} style={{ color:card.color, fontSize:'0.92rem' }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.73rem', fontWeight:800, color:'rgba(255,255,255,0.92)', lineHeight:1.2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{card.title}</div>
                    <div style={{ fontSize:'0.57rem', color:'rgba(255,255,255,0.35)', marginTop:1 }}>{card.titleTH}</div>
                  </div>
                  <span style={{
                    fontSize:'0.47rem', fontWeight:900, letterSpacing:0.4,
                    color:card.color, background:`${card.color}1a`,
                    border:`1px solid ${card.color}35`,
                    padding:'2px 7px', borderRadius:5, flexShrink:0,
                    animation: card.badge === 'AI' || card.badge === 'NEW' ? 'badgepop 3s ease-in-out infinite' : 'none',
                  }}>
                    {card.badge}
                  </span>
                </div>
                {/* Desc */}
                <div style={{
                  fontSize:'0.63rem', color:'rgba(255,255,255,0.46)',
                  lineHeight:1.55, marginBottom:9, paddingBottom:9,
                  borderBottom:`1px solid ${card.border}`,
                }}>
                  {card.desc}
                </div>
                {/* Features */}
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {card.features.map(f => (
                    <div key={f} style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:4, height:4, borderRadius:'50%', background:card.color, flexShrink:0, opacity:0.65 }}/>
                      <span style={{ fontSize:'0.59rem', color:'rgba(255,255,255,0.44)', lineHeight:1.3 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Stats Bar */}
          <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:18 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                flex:1, textAlign:'center',
                borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                padding:'0 8px',
              }}>
                <div style={{ fontSize:'1.5rem', fontWeight:900, color:'white', lineHeight:1, letterSpacing:-0.5 }}>{s.num}</div>
                <div style={{ fontSize:'0.63rem', fontWeight:700, color:'rgba(255,255,255,0.45)', marginTop:3 }}>{s.label}</div>
                <div style={{ fontSize:'0.5rem', color:'rgba(255,255,255,0.17)', marginTop:2, letterSpacing:0.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════ */}
      <div className="lm-right" style={{
        flex: '0 0 clamp(320px,40%,460px)',
        background: '#0d1526',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(28px,5vw,56px)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa,#34d399,#f59e0b)' }}/>
        {/* Subtle background glow */}
        <div style={{ position:'absolute', top:'28%', left:'50%', transform:'translateX(-50%)', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.045) 0%,transparent 65%)', pointerEvents:'none' }}/>

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
            <h2 style={{ fontSize:'1.55rem', fontWeight:800, color:'white', margin:'0 0 7px', lineHeight:1.2 }}>เข้าสู่ระบบ</h2>
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
          <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:7 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <i className="bi bi-shield-lock-fill" style={{ color:'#34d399', fontSize:'0.82rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.27)', lineHeight:1.4 }}>ระบบเข้าสู่ระบบแบบปลอดภัย — ข้อมูลนักกีฬาถูกเข้ารหัสทุกครั้ง</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
              <i className="bi bi-people-fill" style={{ color:'#818cf8', fontSize:'0.82rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.7rem', color:'rgba(255,255,255,0.27)', lineHeight:1.4 }}>สำหรับโค้ช สต๊าฟ และผู้ดูแลระบบสโมสรเท่านั้น</span>
            </div>
          </div>

          <div style={{ marginTop:22, textAlign:'center', fontSize:'0.58rem', color:'rgba(255,255,255,0.11)', letterSpacing:0.5 }}>
            © 2026 Improve Sports Performance · All rights reserved
          </div>
        </div>
      </div>

    </div>
  );
}
