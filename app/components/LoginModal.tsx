'use client';

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { LOGO_URL } from '@/lib/devData';

interface Props { onLogin: (user: User) => void; }

const FEATURES = [
  { icon: 'bi-lightning-charge-fill', color: '#38bdf8', label: 'Performance Metrics', desc: 'วัดสมรรถภาพ 8 ด้านพร้อมคะแนนตามช่วงอายุ' },
  { icon: 'bi-person-badge-fill',     color: '#34d399', label: 'Scout Report',         desc: 'รายงานรายบุคคล + การ์ดผู้เล่นสไตล์ FC26' },
  { icon: 'bi-diagram-3-fill',        color: '#f59e0b', label: 'Line-Up Builder',      desc: 'จัดทีม Formation แบบ Drag & Drop' },
  { icon: 'bi-journal-medical',       color: '#a78bfa', label: 'IDP & QR Self-Fill',   desc: 'แผนพัฒนารายบุคคล นักกีฬากรอกเองผ่าน QR' },
];

const STATS = [
  { num: '8',   unit: 'ตัวชี้วัด',    sub: 'Physical Metrics' },
  { num: '4',   unit: 'กลุ่มอายุ',     sub: 'Age-Adjusted Scoring' },
  { num: '100', unit: 'คะแนนเต็ม',    sub: 'Overall Rating' },
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
      const res = await callGAS('login', { username, password }) as { status: string; message?: string; user?: User };
      if (res.status === 'success' && res.user) {
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
      display: 'flex', fontFamily: "'Space Grotesk','Prompt',sans-serif",
      background: '#060d1f',
    }}>

      {/* ── LEFT: Brand Panel ── */}
      <div style={{
        flex: '1 1 55%', minWidth: 0,
        background: 'linear-gradient(145deg,#060d1f 0%,#0c1a3a 50%,#071428 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(32px,6vw,72px)',
      }}>
        {/* Ambient glow orbs */}
        <div style={{ position:'absolute', top:'-15%', right:'-10%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.13) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', bottom:'-20%', left:'-8%',  width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.09) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:'40%',  left:'38%',     width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.07) 0%,transparent 65%)', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1, maxWidth:520 }}>

          {/* Logo + Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
            <div style={{
              width:60, height:60, borderRadius:16, overflow:'hidden', flexShrink:0,
              border:'1.5px solid rgba(56,189,248,0.3)',
              boxShadow:'0 0 28px rgba(56,189,248,0.2)',
            }}>
              <img src={LOGO_URL} alt="" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
            </div>
            <div>
              <div style={{ fontSize:'1.5rem', fontWeight:900, color:'white', letterSpacing:1, lineHeight:1.1 }}>
                ISP <span style={{ color:'#38bdf8' }}>Improve Sports Performance</span>
              </div>
              <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', letterSpacing:2.5, textTransform:'uppercase', marginTop:3 }}>
                Sports Performance Platform
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize:'clamp(1.8rem,3.5vw,2.8rem)', fontWeight:900, color:'white',
            lineHeight:1.15, marginBottom:12,
            letterSpacing: -0.5,
          }}>
            ระบบติดตาม<br />
            <span style={{ color:'#38bdf8' }}>สมรรถภาพนักกีฬา</span>
          </h1>
          <p style={{ fontSize:'0.95rem', color:'rgba(255,255,255,0.45)', lineHeight:1.7, marginBottom:36, maxWidth:420 }}>
            วิเคราะห์ข้อมูลเชิงลึก วัดผลตามช่วงอายุ<br />
            พัฒนานักกีฬาด้วยข้อมูลจริง ไม่ใช่ความรู้สึก
          </p>

          {/* Feature list */}
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:40 }}>
            {FEATURES.map(f => (
              <div key={f.label} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{
                  width:34, height:34, borderRadius:9, flexShrink:0,
                  background:`rgba(${f.color === '#38bdf8' ? '56,189,248' : f.color === '#34d399' ? '52,211,153' : f.color === '#f59e0b' ? '245,158,11' : '167,139,250'},0.14)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <i className={`bi ${f.icon}`} style={{ color:f.color, fontSize:'0.95rem' }}/>
                </div>
                <div>
                  <div style={{ fontSize:'0.82rem', fontWeight:700, color:'rgba(255,255,255,0.85)', lineHeight:1.2 }}>{f.label}</div>
                  <div style={{ fontSize:'0.73rem', color:'rgba(255,255,255,0.38)', marginTop:2 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div style={{
            display:'flex', gap:0,
            borderTop:'1px solid rgba(255,255,255,0.07)',
            paddingTop:24,
          }}>
            {STATS.map((s, i) => (
              <div key={i} style={{
                flex:1, textAlign:'center',
                borderRight: i < STATS.length-1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                padding:'0 16px',
              }}>
                <div style={{ fontSize:'1.9rem', fontWeight:900, color:'white', lineHeight:1 }}>
                  {s.num}<span style={{ color:'#38bdf8', fontSize:'1.1rem' }}>+</span>
                </div>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.55)', marginTop:4 }}>{s.unit}</div>
                <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.25)', marginTop:2, letterSpacing:0.5 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login Form ── */}
      <div style={{
        flex:'0 0 clamp(320px,40%,460px)',
        background:'#0f172a',
        borderLeft:'1px solid rgba(255,255,255,0.06)',
        display:'flex', flexDirection:'column', justifyContent:'center',
        padding:'clamp(28px,5vw,56px)',
        position:'relative', overflow:'hidden',
      }}>
        {/* Top accent line */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,#818cf8,#34d399)' }}/>

        <div style={{ position:'relative', zIndex:1 }}>

          {/* Form header */}
          <div style={{ marginBottom:32 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:6,
              background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)',
              borderRadius:20, padding:'4px 12px', marginBottom:16,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }}/>
              <span style={{ fontSize:'0.65rem', fontWeight:700, color:'#38bdf8', letterSpacing:1.5, textTransform:'uppercase' }}>
                ระบบสด
              </span>
            </div>
            <h2 style={{ fontSize:'1.55rem', fontWeight:800, color:'white', marginBottom:6, lineHeight:1.2 }}>
              เข้าสู่ระบบ
            </h2>
            <p style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.35)', lineHeight:1.5 }}>
              เฉพาะโค้ชและสต๊าฟที่ได้รับอนุญาต<br />กรุณาใช้บัญชีที่ได้รับมอบหมาย
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
            <div style={{ marginBottom:16 }}>
              <label style={{
                display:'block', fontSize:'0.65rem', fontWeight:700,
                letterSpacing:1.5, textTransform:'uppercase',
                color:'rgba(255,255,255,0.4)', marginBottom:8,
              }}>Username</label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-person-fill" style={{
                  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                  color:'rgba(255,255,255,0.25)', fontSize:'0.9rem',
                }}/>
                <input
                  className="login-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="กรอก Username..."
                  autoComplete="username"
                  disabled={gasReady === false}
                  style={{ paddingLeft:40 }}
                  onKeyDown={e => e.key === 'Enter' && (document.getElementById('pw-input') as HTMLInputElement)?.focus()}
                />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{
                display:'block', fontSize:'0.65rem', fontWeight:700,
                letterSpacing:1.5, textTransform:'uppercase',
                color:'rgba(255,255,255,0.4)', marginBottom:8,
              }}>Password</label>
              <div style={{ position:'relative' }}>
                <i className="bi bi-lock-fill" style={{
                  position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                  color:'rgba(255,255,255,0.25)', fontSize:'0.9rem',
                }}/>
                <input
                  id="pw-input"
                  type={showPw ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="กรอก Password..."
                  autoComplete="current-password"
                  disabled={gasReady === false}
                  style={{ paddingLeft:40, paddingRight:42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer',
                    color:'rgba(255,255,255,0.3)', padding:4, lineHeight:1,
                  }}
                >
                  <i className={`bi bi-eye${showPw ? '-slash' : ''}-fill`} style={{ fontSize:'0.9rem' }}/>
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" style={{ marginBottom:16 }}>
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

          {/* Footer info */}
          <div style={{ marginTop:32, display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'10px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <i className="bi bi-shield-lock-fill" style={{ color:'#34d399', fontSize:'0.85rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>
                ระบบเข้าสู่ระบบแบบปลอดภัย — ข้อมูลนักกีฬาถูกเข้ารหัสทุกครั้ง
              </span>
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'10px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
            }}>
              <i className="bi bi-people-fill" style={{ color:'#818cf8', fontSize:'0.85rem', flexShrink:0 }}/>
              <span style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.3)' }}>
                สำหรับโค้ช สต๊าฟ และผู้ดูแลระบบสโมสรเท่านั้น
              </span>
            </div>
          </div>

          <div style={{
            marginTop:24, textAlign:'center',
            fontSize:'0.62rem', color:'rgba(255,255,255,0.15)',
            letterSpacing:0.5,
          }}>
            © 2026 Improve Sports Performance · All rights reserved
          </div>
        </div>
      </div>

    </div>
  );
}
