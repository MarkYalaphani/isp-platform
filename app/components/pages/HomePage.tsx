'use client';

import { useState, useEffect, useRef } from 'react';
import { Athlete, Page } from '@/lib/types';
import { LOGO_URL } from '@/lib/devData';

interface Props {
  athletes: Athlete[];
  onNavigate: (page: Page) => void;
}

/* ── Animated counter hook ─────────────────────────────── */
function useCounter(target: number, duration = 1400) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const step = Math.ceil(target / (duration / 30));
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
}

/* ── 3-Pillar data ─────────────────────────────────────── */
const PILLARS = [
  {
    id: 'physical', num: '01',
    title: 'Physical Performance',
    titleTH: 'สมรรถภาพร่างกาย',
    icon: 'bi-lightning-charge-fill',
    grad: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
    glow: 'rgba(14,165,233,0.25)',
    border: '#0ea5e9',
    metrics: [
      { icon: '⚡', label: 'Speed 30m',    val: '4.2s',  color: '#38bdf8' },
      { icon: '🦘', label: 'CMJ Height',   val: '52cm',  color: '#34d399' },
      { icon: '🔄', label: 'Agility',      val: '15.4s', color: '#f59e0b' },
      { icon: '❤️', label: 'Yo-Yo IR1',    val: '1680m', color: '#f87171' },
      { icon: '💪', label: 'Push-up 40s',  val: '36 reps',color:'#a78bfa' },
      { icon: '🧘', label: 'Sit & Reach',  val: '24cm',  color: '#4ade80' },
    ],
    desc: '8 ตัวชี้วัด · คะแนนตามช่วงอายุ 4 กลุ่ม · Rating 0–100',
    done: true,
  },
  {
    id: 'mental', num: '02',
    title: 'Mental Performance',
    titleTH: 'สมรรถภาพจิตใจ',
    icon: 'bi-brain',
    grad: 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
    glow: 'rgba(139,92,246,0.25)',
    border: '#8b5cf6',
    metrics: [
      { icon: '🎯', label: 'Motivation',   val: '4/5',  color: '#a78bfa' },
      { icon: '🔥', label: 'Effort',       val: '5/5',  color: '#f97316' },
      { icon: '🤝', label: 'Teamwork',     val: '4/5',  color: '#34d399' },
      { icon: '⏰', label: 'Punctuality',  val: '5/5',  color: '#38bdf8' },
      { icon: '😴', label: 'Sleep',        val: '4/5',  color: '#818cf8' },
      { icon: '🥗', label: 'Diet',         val: '3/5',  color: '#4ade80' },
    ],
    desc: 'พฤติกรรม · ไลฟ์สไตล์ · แผนพัฒนา IDP · QR Self-fill',
    done: true,
  },
  {
    id: 'technical', num: '03',
    title: 'Technical Skill',
    titleTH: 'ทักษะฟุตบอล',
    icon: 'bi-bullseye',
    grad: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
    glow: 'rgba(245,158,11,0.25)',
    border: '#f59e0b',
    metrics: [
      { icon: '⚽', label: 'Ball Control', val: '82/100', color: '#38bdf8' },
      { icon: '🎯', label: 'Passing',      val: '76/100', color: '#34d399' },
      { icon: '⚡', label: 'Dribbling',    val: '71/100', color: '#f59e0b' },
      { icon: '🥅', label: 'Shooting',     val: '65/100', color: '#f472b6' },
      { icon: '🧠', label: 'Tactical IQ',  val: '80/100', color: '#a78bfa' },
      { icon: '📊', label: 'Tech Score',   val: '74/100', color: '#4ade80' },
    ],
    desc: '5 หมวดทักษะ · Radar Chart · Training Recommendation',
    done: true,
  },
];

const QUICK_NAV: { page: Page; icon: string; label: string; labelTH: string; desc: string; grad: string; shadow: string; badge: string }[] = [
  { page:'scout',      icon:'bi-person-badge-fill', label:'Scout Report', labelTH:'รายงานนักกีฬา',  desc:'FC26 Card · Radar · ประวัติการทดสอบ',          grad:'linear-gradient(135deg,#0369a1,#0ea5e9)', shadow:'rgba(14,165,233,0.4)',  badge:'PHY' },
  { page:'skill',      icon:'bi-bullseye',           label:'Skill',        labelTH:'ทักษะฟุตบอล',    desc:'Ball Control · Passing · Dribbling · Tactical',  grad:'linear-gradient(135deg,#b45309,#f59e0b)', shadow:'rgba(245,158,11,0.4)', badge:'TCH' },
  { page:'teamreport', icon:'bi-bar-chart-fill',     label:'Team Report',  labelTH:'รายงานทีม',      desc:'KPI ทีม · จัดอันดับ · เปรียบเทียบ',              grad:'linear-gradient(135deg,#065f46,#10b981)', shadow:'rgba(16,185,129,0.4)', badge:'TEAM' },
  { page:'lineup',     icon:'bi-diagram-3-fill',     label:'Line-Up',      labelTH:'จัดไลน์อัพ',     desc:'Formation · Drag & Drop · พิมพ์ PDF',           grad:'linear-gradient(135deg,#4338ca,#818cf8)', shadow:'rgba(129,140,248,0.4)', badge:'FORM' },
  { page:'ir',         icon:'bi-journal-medical',    label:'IDP',          labelTH:'แผนพัฒนา',       desc:'พฤติกรรม · เป้าหมาย · QR Self-fill',            grad:'linear-gradient(135deg,#7c3aed,#a78bfa)', shadow:'rgba(167,139,250,0.4)', badge:'MNT' },
  { page:'compare',    icon:'bi-intersect',          label:'Compare',      labelTH:'เปรียบเทียบ',    desc:'Radar Chart · Head-to-head · Side-by-side',     grad:'linear-gradient(135deg,#be185d,#f472b6)', shadow:'rgba(244,114,182,0.4)', badge:'CMP' },
];

const TICKER_ITEMS = [
  '⚡ Speed 30m', '🦘 CMJ Power', '🔄 Agility T-Test', '❤️ Yo-Yo IR1',
  '💪 Push-up 40s', '🧘 Flexibility', '⚽ Ball Control', '🎯 Passing Accuracy',
  '⚡ Dribbling', '🥅 Shooting', '🧠 Tactical IQ', '📊 IDP Report',
  '🃏 FC26 Card', '📍 Line-Up Builder', '📈 Progress Tracking',
];

export default function HomePage({ athletes, onNavigate }: Props) {
  const teams  = new Set(athletes.map(a => a.Team).filter(Boolean)).size;
  const tested = athletes.filter(a => a.History && a.History.length > 0).length;
  const tests  = athletes.reduce((s, a) => s + (a.History?.length || 0), 0);

  const cntAthletes = useCounter(athletes.length);
  const cntTeams    = useCounter(teams);
  const cntTests    = useCounter(tests);

  const [tickerPos, setTickerPos] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTickerPos(p => (p + 1) % TICKER_ITEMS.length), 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ marginTop: -8 }}>
      <style>{`
        @keyframes hglow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes drift1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-30px,20px) scale(1.05)} }
        @keyframes drift2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-25px)} }
        @keyframes drift3 { 0%,100%{transform:translate(0,0) rotate(0deg)} 50%{transform:translate(-15px,15px) rotate(5deg)} }
        @keyframes slideTickerIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pillFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .home-page * { box-sizing: border-box; }
      `}</style>

      {/* ══════════════════════════════════════════════════════════
          HERO — Dark stadium feel with pitch grid
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20, marginBottom: 24,
        background: 'linear-gradient(160deg,#03081e 0%,#06112e 45%,#04091a 100%)',
        minHeight: 480,
        border: '1px solid rgba(56,189,248,0.1)',
        boxShadow: '0 0 80px rgba(0,30,100,0.4)',
      }}>
        {/* Pitch grid background */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, opacity:0.07,
          backgroundImage:`
            linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)`,
          backgroundSize:'60px 60px' }}/>

        {/* Football pitch wireframe (right side decorative) */}
        <div style={{ position:'absolute', right:'-5%', top:'50%', transform:'translateY(-50%)', width:420, height:300, pointerEvents:'none', zIndex:0, opacity:0.05 }}>
          <div style={{ position:'absolute', inset:0, border:'2px solid #38bdf8', borderRadius:8 }}/>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:2, background:'#38bdf8', transform:'translateY(-50%)' }}/>
          <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:90, height:90, border:'2px solid #38bdf8', borderRadius:'50%' }}/>
          <div style={{ position:'absolute', top:0, left:'30%', right:'30%', height:'28%', border:'2px solid #38bdf8', borderTop:'none' }}/>
          <div style={{ position:'absolute', bottom:0, left:'30%', right:'30%', height:'28%', border:'2px solid #38bdf8', borderBottom:'none' }}/>
        </div>

        {/* Glow orbs */}
        <div style={{ position:'absolute', top:'-20%', right:'15%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.14) 0%,transparent 65%)', animation:'drift1 10s ease-in-out infinite', pointerEvents:'none', zIndex:1 }}/>
        <div style={{ position:'absolute', bottom:'-30%', left:'5%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,rgba(245,158,11,0.1) 0%,transparent 65%)', animation:'drift2 13s ease-in-out infinite', pointerEvents:'none', zIndex:1 }}/>
        <div style={{ position:'absolute', top:'20%', left:'40%', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(167,139,250,0.08) 0%,transparent 65%)', animation:'drift3 15s ease-in-out infinite', pointerEvents:'none', zIndex:1 }}/>

        {/* Hero content */}
        <div style={{ position:'relative', zIndex:2, padding:'56px 52px 48px', display:'flex', gap:48, alignItems:'center', flexWrap:'wrap' }}>
          {/* Left text block */}
          <div style={{ flex:'1 1 380px', minWidth:0 }}>
            {/* Badge */}
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.25)', borderRadius:20, padding:'5px 14px', marginBottom:22 }}>
              <img src={LOGO_URL} alt="" style={{ width:20, height:20, borderRadius:4, objectFit:'contain' }}/>
              <span style={{ fontSize:'0.65rem', fontWeight:800, color:'#38bdf8', letterSpacing:2, textTransform:'uppercase' }}>ISP · Live Platform</span>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#38bdf8', animation:'hglow 2s ease-in-out infinite', display:'inline-block' }}/>
            </div>

            <h1 style={{ fontSize:'clamp(2.2rem,4.5vw,3.6rem)', fontWeight:900, color:'white', lineHeight:1.08, margin:'0 0 8px', letterSpacing:-1 }}>
              ISP<br/>
              <span style={{ background:'linear-gradient(90deg,#38bdf8,#818cf8,#f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
                Improve Sports
              </span>{' '}Performance
            </h1>

            <p style={{ fontSize:'1rem', color:'rgba(255,255,255,0.5)', lineHeight:1.7, margin:'16px 0 32px', maxWidth:440 }}>
              ระบบพัฒนานักกีฬาครบ 3 มิติ — <span style={{ color:'#38bdf8' }}>ร่างกาย</span> · <span style={{ color:'#a78bfa' }}>จิตใจ</span> · <span style={{ color:'#f59e0b' }}>ทักษะ</span><br/>
              <span style={{ fontSize:'0.88rem' }}>ขับเคลื่อนด้วยข้อมูลจริง เพื่อพัฒนาพรสวรรค์รุ่นใหม่</span>
            </p>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:40 }}>
              <button onClick={() => onNavigate('roster')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:12, background:'linear-gradient(135deg,#0ea5e9,#0284c7)', color:'white', fontWeight:800, fontSize:'0.92rem', border:'none', cursor:'pointer', boxShadow:'0 8px 28px rgba(14,165,233,0.4)', transition:'all 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-2px)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='')}>
                <i className="bi bi-people-fill"/>&nbsp;ดูนักกีฬาทั้งหมด
              </button>
              <button onClick={() => onNavigate('performance')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:12, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', fontWeight:700, fontSize:'0.92rem', border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.12)')}
                onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,0.07)')}>
                <i className="bi bi-clipboard-data-fill"/>&nbsp;บันทึกผลทดสอบ
              </button>
            </div>

            {/* Live stats */}
            <div style={{ display:'flex', gap:0, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:24 }}>
              {[
                { num: cntAthletes, plus:true, label:'นักกีฬา',        sub:'Athletes' },
                { num: cntTeams,    plus:true, label:'ทีม',            sub:'Teams' },
                { num: cntTests,    plus:true, label:'ครั้งทดสอบ',     sub:'Tests Recorded' },
              ].map((s, i) => (
                <div key={i} style={{ flex:1, textAlign:'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none', padding:'0 16px' }}>
                  <div style={{ fontSize:'2.2rem', fontWeight:900, color:'white', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
                    {s.num}{s.plus && <span style={{ color:'#38bdf8', fontSize:'1.2rem' }}>+</span>}
                  </div>
                  <div style={{ fontSize:'0.78rem', fontWeight:700, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{s.label}</div>
                  <div style={{ fontSize:'0.6rem', color:'rgba(255,255,255,0.25)', letterSpacing:0.5 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3-pillar preview badges */}
          <div style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', gap:12, maxWidth:260 }}>
            {PILLARS.map((p, i) => (
              <div key={p.id} style={{
                background:'rgba(255,255,255,0.04)', border:`1px solid ${p.border}44`,
                borderRadius:14, padding:'14px 18px', backdropFilter:'blur(10px)',
                animation:`pillFloat ${6 + i * 0.8}s ease-in-out infinite`,
                boxShadow:`0 4px 20px ${p.glow}`,
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:9, background:p.grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 12px ${p.glow}` }}>
                    <i className={`bi ${p.icon}`} style={{ color:'white', fontSize:'0.9rem' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:'0.72rem', fontWeight:800, color:'white' }}>{p.title}</div>
                    <div style={{ fontSize:'0.58rem', color:'rgba(255,255,255,0.4)' }}>{p.titleTH}</div>
                  </div>
                  <span style={{ marginLeft:'auto', background:`${p.border}22`, color:p.border, borderRadius:6, padding:'2px 7px', fontSize:'0.58rem', fontWeight:800 }}>LIVE</span>
                </div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {p.metrics.slice(0,4).map(m => (
                    <span key={m.label} style={{ background:'rgba(255,255,255,0.06)', borderRadius:6, padding:'2px 7px', fontSize:'0.6rem', fontWeight:700, color:m.color }}>{m.val}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TICKER — Scrolling feature tags
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:24, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 0' }}>
        <div style={{ display:'flex', alignItems:'center', gap:0, animation:'none' }}>
          <div style={{ flexShrink:0, padding:'0 20px', borderRight:'1px solid var(--border)', fontSize:'0.65rem', fontWeight:800, color:'#38bdf8', letterSpacing:2, textTransform:'uppercase' }}>
            FEATURES
          </div>
          <div style={{ display:'flex', gap:8, paddingLeft:20, overflowX:'hidden', flex:1 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'nowrap' }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} style={{ flexShrink:0, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 14px', fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          3-PILLAR SYSTEM — Physical · Mental · Technical
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:28 }} className="home-animate del1">
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
          <div style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:3, color:'var(--text-muted)', textTransform:'uppercase' }}>ระบบพัฒนา 3 มิติ</div>
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          <span style={{ background:'rgba(56,189,248,0.1)', border:'1px solid rgba(56,189,248,0.2)', borderRadius:20, padding:'3px 12px', fontSize:'0.6rem', fontWeight:800, color:'#38bdf8', letterSpacing:1 }}>
            3D ATHLETE DEVELOPMENT
          </span>
        </div>
        <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:18, marginTop:4 }}>
          วัด · วิเคราะห์ · พัฒนา ครบ 3 แกนหลักของนักกีฬาระดับ Professional
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16 }}>
          {PILLARS.map((p, pi) => (
            <div key={p.id} style={{
              background:'var(--surface)', borderRadius:18, overflow:'hidden',
              border:`1px solid ${p.border}33`,
              boxShadow:`0 0 40px ${p.glow}`,
              transition:'all 0.25s',
            }}
              onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 16px 48px ${p.glow}`; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=`0 0 40px ${p.glow}`; }}
            >
              {/* Card header */}
              <div style={{ background:`linear-gradient(135deg,${p.grad.replace('linear-gradient(135deg,','').replace(')','').split(',')[0]}22,${p.grad.replace('linear-gradient(135deg,','').replace(')','').split(',')[1] || 'transparent'}11)`, borderBottom:`1px solid ${p.border}22`, padding:'20px 22px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:p.grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 20px ${p.glow}` }}>
                    <i className={`bi ${p.icon}`} style={{ color:'white', fontSize:'1.3rem' }}/>
                  </div>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:'0.62rem', fontWeight:800, color:p.border, letterSpacing:2, textTransform:'uppercase' }}>{String(pi+1).padStart(2,'0')}</span>
                      <span style={{ background:`${p.border}22`, color:p.border, borderRadius:5, padding:'1px 7px', fontSize:'0.58rem', fontWeight:800 }}>ACTIVE</span>
                    </div>
                    <div style={{ fontWeight:800, fontSize:'1rem', marginTop:2 }}>{p.title}</div>
                    <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{p.titleTH}</div>
                  </div>
                </div>
                <p style={{ fontSize:'0.72rem', color:'var(--text-muted)', margin:0, lineHeight:1.5 }}>{p.desc}</p>
              </div>

              {/* Metrics grid */}
              <div style={{ padding:'16px 22px 20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {p.metrics.map(m => (
                  <div key={m.label} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--bg)', borderRadius:9, border:'1px solid var(--border)' }}>
                    <span style={{ fontSize:'1rem', flexShrink:0 }}>{m.icon}</span>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{m.label}</div>
                      <div style={{ fontSize:'0.8rem', fontWeight:900, color:m.color }}>{m.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          QUICK NAVIGATION — 6 cards
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:28 }} className="home-animate del2">
        <div className="home-sec-hd">เข้าสู่แพลตฟอร์ม</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:12 }}>
          {QUICK_NAV.map(n => (
            <button key={n.page} onClick={() => onNavigate(n.page)} style={{
              textAlign:'left', cursor:'pointer', borderRadius:15, padding:'18px 20px',
              background:'var(--surface)', border:'1px solid var(--border)',
              display:'flex', flexDirection:'column', gap:12, transition:'all 0.2s',
            }}
              onMouseEnter={e=>{
                const el = e.currentTarget;
                el.style.background = n.grad;
                el.style.borderColor = 'transparent';
                el.style.transform = 'translateY(-3px)';
                el.style.boxShadow = `0 16px 40px ${n.shadow}`;
                el.querySelectorAll('[data-txt]').forEach((x: Element) => (x as HTMLElement).style.color = 'rgba(255,255,255,0.9)');
                el.querySelectorAll('[data-sub]').forEach((x: Element) => (x as HTMLElement).style.color = 'rgba(255,255,255,0.6)');
              }}
              onMouseLeave={e=>{
                const el = e.currentTarget;
                el.style.background = 'var(--surface)';
                el.style.borderColor = '';
                el.style.transform = '';
                el.style.boxShadow = '';
                el.querySelectorAll('[data-txt]').forEach((x: Element) => (x as HTMLElement).style.color = '');
                el.querySelectorAll('[data-sub]').forEach((x: Element) => (x as HTMLElement).style.color = '');
              }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ width:44, height:44, borderRadius:12, background:n.grad, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 20px ${n.shadow}` }}>
                  <i className={`bi ${n.icon}`} style={{ color:'white', fontSize:'1.2rem' }}/>
                </div>
                <span style={{ fontSize:'0.58rem', fontWeight:800, letterSpacing:1, background:'var(--bg)', padding:'3px 8px', borderRadius:6, color:'var(--text-muted)' }}>{n.badge}</span>
              </div>
              <div>
                <div data-txt="" style={{ fontWeight:800, fontSize:'0.92rem', color:'var(--text-main)', transition:'color 0.2s' }}>{n.label}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:1, fontWeight:600, transition:'color 0.2s' }}>{n.labelTH}</div>
                <div data-sub="" style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:5, lineHeight:1.45, transition:'color 0.2s' }}>{n.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          HOW IT WORKS — 5 steps
      ══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom:28 }} className="home-animate del3">
        <div className="home-sec-hd">ขั้นตอนการทำงาน</div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, padding:'32px 28px 28px', position:'relative', overflow:'hidden' }}>
          {/* BG accent */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#38bdf8,#818cf8,#f59e0b,#10b981,#38bdf8)' }}/>

          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', flexWrap:'wrap', gap:0 }}>
            {[
              { icon:'🏃', num:'01', label:'ลงทะเบียน\nนักกีฬา',       color:'#38bdf8' },
              { icon:'📋', num:'02', label:'บันทึก\nผลทดสอบ',          color:'#818cf8' },
              { icon:'⭐', num:'03', label:'คะแนน\nอัตโนมัติ',         color:'#f59e0b' },
              { icon:'📊', num:'04', label:'รายงาน\nIDP + Skill',      color:'#10b981' },
              { icon:'🏆', num:'05', label:'ติดตาม\nความก้าวหน้า',     color:'#f472b6' },
            ].map((step, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', flexShrink:0 }}>
                {i > 0 && (
                  <div style={{ display:'flex', alignItems:'center', paddingTop:22, margin:'0 4px', color:'#cbd5e1', fontSize:'1.6rem' }}>›</div>
                )}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, width:92 }}>
                  <div style={{ position:'relative' }}>
                    <div style={{
                      width:58, height:58, borderRadius:16, fontSize:'1.5rem',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background:`${step.color}15`, border:`1.5px solid ${step.color}44`,
                      boxShadow:`0 4px 20px ${step.color}22`,
                    }}>{step.icon}</div>
                    <div style={{ position:'absolute', top:-9, right:-9, width:22, height:22, borderRadius:'50%', background:step.color, color:'white', fontSize:'0.58rem', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${step.color}55` }}>
                      {step.num}
                    </div>
                  </div>
                  <div style={{ textAlign:'center', fontSize:'0.68rem', fontWeight:700, color:step.color, whiteSpace:'pre-line', lineHeight:1.45 }}>{step.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:24, borderTop:'1px solid var(--border)', paddingTop:18, fontSize:'0.82rem', fontStyle:'italic', color:'var(--text-muted)' }}>
            ทุกเซสชั่นคือข้อมูล — ทุกข้อมูลขับเคลื่อนการพัฒนา
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          VISION — Final CTA
      ══════════════════════════════════════════════════════════ */}
      <div style={{
        position:'relative', overflow:'hidden', borderRadius:20,
        background:'linear-gradient(135deg,#03081e 0%,#0c1a3a 50%,#080f26 100%)',
        border:'1px solid rgba(56,189,248,0.12)',
        padding:'52px 48px', textAlign:'center',
        boxShadow:'0 0 60px rgba(0,20,80,0.4)',
      }} className="home-animate del4">
        <div style={{ position:'absolute', top:'-40%', left:'50%', transform:'translateX(-50%)', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,rgba(56,189,248,0.1) 0%,transparent 65%)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, opacity:0.04,
          backgroundImage:'linear-gradient(rgba(56,189,248,0.8) 1px, transparent 1px), linear-gradient(90deg,rgba(56,189,248,0.8) 1px,transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none' }}/>

        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:20, padding:'5px 16px', marginBottom:20 }}>
            <span style={{ fontSize:'1rem' }}>🏆</span>
            <span style={{ fontSize:'0.65rem', fontWeight:800, color:'#f59e0b', letterSpacing:2, textTransform:'uppercase' }}>ISP Improve Sports Performance</span>
          </div>

          <h2 style={{ fontSize:'clamp(1.6rem,3vw,2.4rem)', fontWeight:900, color:'white', lineHeight:1.2, marginBottom:16, maxWidth:600, margin:'0 auto 16px' }}>
            สร้างขึ้นเพื่อ<span style={{ color:'#38bdf8' }}>โค้ช สเกาต์</span><br/>
            และ<span style={{ color:'#f59e0b' }}>สโมสร</span>ที่เชื่อในข้อมูล
          </h2>

          <p style={{ fontSize:'0.95rem', color:'rgba(255,255,255,0.45)', lineHeight:1.75, maxWidth:520, margin:'0 auto 32px' }}>
            ISP เชื่อมช่องว่างระหว่าง<strong style={{ color:'rgba(255,255,255,0.7)' }}> พรสวรรค์ดิบ </strong>
            กับ<strong style={{ color:'rgba(255,255,255,0.7)'}}> การเติบโตที่มีแผน </strong>
            ด้วยข้อมูลจริงที่วัดผลได้
          </p>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => onNavigate('dashboard')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:12, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'white', fontWeight:800, fontSize:'0.92rem', border:'none', cursor:'pointer', boxShadow:'0 8px 28px rgba(245,158,11,0.4)', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e=>e.currentTarget.style.transform=''}>
              <i className="bi bi-speedometer2"/>เข้าสู่แดชบอร์ด
            </button>
            <button onClick={() => onNavigate('skill')} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:12, background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', fontWeight:700, fontSize:'0.92rem', border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
              <i className="bi bi-bullseye"/>ประเมินทักษะ
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
