'use client';

import { useState, useEffect } from 'react';
import { Athlete, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

interface Props { athletes: Athlete[]; user: User; onNavigate: (page: Page) => void; }

type Status = 'idle' | 'running' | 'pass' | 'fail';

interface TestItem {
  id: string;
  label: string;
  desc: string;
  status: Status;
  result?: string;
  ms?: number;
}

/* ── All navigable pages ─────────────────────────────────── */
const ALL_PAGES: { page: Page; label: string; icon: string; color: string }[] = [
  { page:'home',        label:'Home',           icon:'bi-house-fill',            color:'#38bdf8' },
  { page:'dashboard',   label:'Dashboard',      icon:'bi-grid-1x2-fill',         color:'#818cf8' },
  { page:'roster',      label:'Roster',         icon:'bi-people-fill',           color:'#34d399' },
  { page:'scout',       label:'Scout Report',   icon:'bi-person-badge-fill',     color:'#f472b6' },
  { page:'skill',       label:'Skill',          icon:'bi-bullseye',              color:'#f59e0b' },
  { page:'attendance',  label:'Attendance',     icon:'bi-check2-square',         color:'#4ade80' },
  { page:'wellness',    label:'Wellness',       icon:'bi-heart-pulse-fill',      color:'#fb923c' },
  { page:'ir',          label:'IDP',            icon:'bi-clipboard2-check-fill', color:'#a78bfa' },
  { page:'compare',     label:'Compare',        icon:'bi-intersect',             color:'#60a5fa' },
  { page:'lineup',      label:'Line-Up',        icon:'bi-diagram-3-fill',        color:'#c084fc' },
  { page:'teamreport',  label:'Team Report',    icon:'bi-bar-chart-line-fill',   color:'#10b981' },
  { page:'performance', label:'Update Results', icon:'bi-clipboard-data-fill',   color:'#fbbf24' },
  { page:'quicktest',   label:'Quick Test',     icon:'bi-lightning-fill',        color:'#f87171' },
  { page:'register',    label:'Add Athlete',    icon:'bi-person-plus-fill',      color:'#6ee7b7' },
  { page:'training',    label:'Training Video', icon:'bi-play-btn-fill',         color:'#ef4444' },
  { page:'adminUsers',  label:'Admin',          icon:'bi-shield-lock-fill',      color:'#94a3b8' },
];

/* ── API test definitions ────────────────────────────────── */
const API_TESTS = [
  { id:'getAthletes', label:'Load Athletes',    desc:'callGAS getAthleteData',   fn: () => callGAS('getAthleteData') },
  { id:'getUsers',    label:'Load Users',       desc:'callGAS getUsers',         fn: () => callGAS('getUsers') },
  { id:'getClub',     label:'Club Settings',    desc:'callGAS getClubSettings',  fn: () => callGAS('getClubSettings') },
  { id:'getVideos',   label:'Training Videos',  desc:'DB getTrainingVideos',     fn: () => fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'getTrainingVideos' }) }).then(r => r.json()) },
  { id:'getAttend',   label:'Attendance API',   desc:'DB getAttendanceSessions', fn: () => fetch('/api/db', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'getAttendanceSessions' }) }).then(r => r.json()) },
];

/* ── Viewport display ────────────────────────────────────── */
function useViewport() {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return vp;
}

export default function TesterPage({ athletes, user, onNavigate }: Props) {
  const [tests, setTests]     = useState<TestItem[]>(
    API_TESTS.map(t => ({ id: t.id, label: t.label, desc: t.desc, status: 'idle' }))
  );
  const [runningAll, setRunningAll] = useState(false);
  const [checks, setChecks]   = useState<Record<string, boolean>>({});
  const vp = useViewport();

  /* ── Data stats ─── */
  const teams    = [...new Set(athletes.map(a => a.Team).filter(Boolean))].length;
  const tested   = athletes.filter(a => (a.History?.length || 0) > 0).length;
  const totalRec = athletes.reduce((s, a) => s + (a.History?.length || 0), 0);
  const withRating = athletes.filter(a => Number(a.Latest?.Rating) > 0);
  const avgRating = withRating.length
    ? Math.round(withRating.reduce((s, a) => s + Number(a.Latest?.Rating), 0) / withRating.length)
    : 0;

  /* ── Run single API test ─── */
  const runTest = async (id: string) => {
    const def = API_TESTS.find(t => t.id === id)!;
    setTests(p => p.map(t => t.id === id ? { ...t, status: 'running', result: undefined } : t));
    const t0 = Date.now();
    try {
      const res = await def.fn();
      const ms = Date.now() - t0;
      const ok = Array.isArray(res) ? res.length >= 0 : !!res;
      const result = Array.isArray(res)
        ? `${res.length} records`
        : typeof res === 'object' && res !== null
          ? `OK — ${JSON.stringify(res).slice(0, 60)}`
          : String(res);
      setTests(p => p.map(t => t.id === id ? { ...t, status: ok ? 'pass' : 'fail', result, ms } : t));
    } catch (e: unknown) {
      setTests(p => p.map(t => t.id === id ? { ...t, status: 'fail', result: String(e), ms: Date.now() - t0 } : t));
    }
  };

  /* ── Run all ─── */
  const runAll = async () => {
    setRunningAll(true);
    for (const t of API_TESTS) { await runTest(t.id); }
    setRunningAll(false);
    const results = tests;
    const pass = results.filter(t => t.status === 'pass').length;
    showToast(`ทดสอบเสร็จ: ${pass}/${API_TESTS.length} ผ่าน`, pass === API_TESTS.length ? 'success' : 'warning');
  };

  const passCount  = tests.filter(t => t.status === 'pass').length;
  const failCount  = tests.filter(t => t.status === 'fail').length;
  const doneCount  = passCount + failCount;

  /* ── Device class ─── */
  const device = vp.w === 0 ? '—' : vp.w < 640 ? '📱 Mobile' : vp.w < 1024 ? '📟 Tablet' : '🖥️ Desktop';
  const breakpoint = vp.w === 0 ? '—' : vp.w < 640 ? '< 640px' : vp.w < 1024 ? '640–1024px' : '> 1024px';

  /* ── Manual checklist ─── */
  const CHECKLIST = [
    { id:'login',    label:'เข้าสู่ระบบ Login ได้',                   cat:'Auth' },
    { id:'logout',   label:'ออกจากระบบ Logout ได้',                   cat:'Auth' },
    { id:'profile',  label:'แก้ไข Profile / โลโก้ได้',                cat:'Auth' },
    { id:'sidebar',  label:'Sidebar เปิด/ปิดบน Mobile ได้',           cat:'UI' },
    { id:'toast',    label:'Toast notification ขึ้นเมื่อบันทึก',       cat:'UI' },
    { id:'roster2',  label:'Roster แสดงรายชื่อ + filter ได้',         cat:'Pages' },
    { id:'scout2',   label:'Scout Report แสดงข้อมูลนักกีฬาได้',       cat:'Pages' },
    { id:'scout3',   label:'Scout Report Print/PDF ได้',               cat:'Pages' },
    { id:'skill2',   label:'Skill Assessment บันทึกได้',               cat:'Pages' },
    { id:'idp2',     label:'IDP บันทึก + QR Code ได้',                cat:'Pages' },
    { id:'attend2',  label:'Attendance เช็คชื่อ + บันทึกได้',         cat:'Pages' },
    { id:'wellness2',label:'Wellness & RPE บันทึกได้',                 cat:'Pages' },
    { id:'dash2',    label:'Dashboard แสดง KPI + Chart ได้',           cat:'Pages' },
    { id:'compare2', label:'Compare H2H ทำงานได้',                    cat:'Pages' },
    { id:'lineup2',  label:'Line-Up จัด Formation ได้',               cat:'Pages' },
    { id:'video2',   label:'Training Video เล่นได้',                  cat:'Pages' },
    { id:'register2',label:'เพิ่มนักกีฬาใหม่ได้',                     cat:'Data' },
    { id:'perf2',    label:'บันทึกผลทดสอบได้',                        cat:'Data' },
    { id:'admin2',   label:'Admin จัดการ User ได้',                   cat:'Admin' },
    { id:'perms',    label:'Club permissions เปิด/ปิดได้',             cat:'Admin' },
    { id:'mobile2',  label:'ใช้งานบน Mobile ได้ (≤ 640px)',           cat:'Responsive' },
    { id:'tablet2',  label:'ใช้งานบน Tablet ได้ (640–1024px)',        cat:'Responsive' },
  ];

  const cats = [...new Set(CHECKLIST.map(c => c.cat))];
  const checkedCount = Object.values(checks).filter(Boolean).length;

  const toggleCheck = (id: string) => setChecks(p => ({ ...p, [id]: !p[id] }));
  const checkAll = (cat: string) => {
    const ids = CHECKLIST.filter(c => c.cat === cat).map(c => c.id);
    const allOn = ids.every(id => checks[id]);
    setChecks(p => { const n = { ...p }; ids.forEach(id => { n[id] = !allOn; }); return n; });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><i className="bi bi-bug-fill me-2" style={{ color:'#f59e0b' }}/>System Tester</h2>
          <p className="page-subtitle">ทดสอบฟีเจอร์ทั้งหมดก่อน Deploy · Admin Only</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-outline btn-sm" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-1"/>รีเฟรช
          </button>
        </div>
      </div>

      {/* ══ SYSTEM OVERVIEW ═══════════════════════════════════ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'นักกีฬา',    val: athletes.length, icon:'bi-people-fill',         color:'#38bdf8' },
          { label:'ทีม',         val: teams,           icon:'bi-shield-fill',          color:'#34d399' },
          { label:'ทดสอบแล้ว',  val: tested,          icon:'bi-clipboard-check-fill', color:'#818cf8' },
          { label:'Test Records',val: totalRec,        icon:'bi-database-fill',        color:'#f59e0b' },
          { label:'Avg Rating',  val: avgRating,       icon:'bi-star-fill',            color:'#f472b6' },
          { label:'API Tests',   val:`${passCount}/${API_TESTS.length}`, icon:'bi-check-circle-fill', color: failCount > 0 ? '#ef4444' : passCount === API_TESTS.length ? '#10b981' : '#94a3b8' },
          { label:'Checklist',   val:`${checkedCount}/${CHECKLIST.length}`, icon:'bi-list-check', color: checkedCount === CHECKLIST.length ? '#10b981' : '#f59e0b' },
          { label:'Device',      val: vp.w ? `${vp.w}px` : '—', icon:'bi-display-fill', color:'#a78bfa' },
        ].map(s => (
          <div key={s.label} className="surface" style={{ padding:'12px 14px', textAlign:'center' }}>
            <i className={`bi ${s.icon}`} style={{ color:s.color, fontSize:'1.2rem', display:'block', marginBottom:6 }}/>
            <div style={{ fontSize:'1.25rem', fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:'0.6rem', color:'var(--text-muted)', fontWeight:700, marginTop:3, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

        {/* ══ API TESTS ══ */}
        <div className="surface">
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'rgba(56,189,248,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="bi bi-hdd-network-fill" style={{ color:'#38bdf8' }}/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:'0.88rem' }}>API Connection Tests</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text-muted)' }}>ทดสอบการเชื่อมต่อ GAS + Supabase</div>
            </div>
            <button className="btn-primary btn-sm" onClick={runAll} disabled={runningAll} style={{ whiteSpace:'nowrap' }}>
              {runningAll
                ? <><span className="spinner-ring" style={{ width:14,height:14,borderWidth:2,margin:0 }}/> Running...</>
                : <><i className="bi bi-play-fill me-1"/>Run All</>}
            </button>
          </div>

          {/* Progress bar */}
          {doneCount > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-muted)' }}>{doneCount}/{API_TESTS.length} tests</span>
                <span style={{ fontSize:'0.7rem', fontWeight:700, color: failCount > 0 ? '#ef4444' : '#10b981' }}>
                  {passCount} pass · {failCount} fail
                </span>
              </div>
              <div style={{ height:6, borderRadius:4, background:'#f1f5f9', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:4, background: failCount > 0 ? '#ef4444' : '#10b981', width:`${(passCount/API_TESTS.length)*100}%`, transition:'width 0.4s' }}/>
              </div>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {tests.map(t => (
              <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:'var(--bg)', border:`1.5px solid ${t.status==='pass'?'#86efac':t.status==='fail'?'#fca5a5':t.status==='running'?'#93c5fd':'var(--border)'}` }}>
                {/* Status icon */}
                <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  background: t.status==='pass'?'#f0fdf4':t.status==='fail'?'#fef2f2':t.status==='running'?'#eff6ff':'#f1f5f9' }}>
                  {t.status === 'idle'    && <i className="bi bi-circle" style={{ color:'#cbd5e1', fontSize:'0.75rem' }}/>}
                  {t.status === 'running' && <span className="spinner-ring" style={{ width:14,height:14,borderWidth:2 }}/>}
                  {t.status === 'pass'    && <i className="bi bi-check-lg" style={{ color:'#16a34a', fontSize:'0.85rem' }}/>}
                  {t.status === 'fail'    && <i className="bi bi-x-lg" style={{ color:'#dc2626', fontSize:'0.85rem' }}/>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:'0.8rem' }}>{t.label}</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {t.result || t.desc}
                    {t.ms !== undefined && <span style={{ color:'#94a3b8', marginLeft:6 }}>{t.ms}ms</span>}
                  </div>
                </div>
                <button onClick={() => runTest(t.id)} disabled={t.status==='running'}
                  style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:'0.68rem', fontWeight:700, cursor:'pointer', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                  {t.status === 'running' ? '...' : 'Run'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Toast Demo */}
          <div className="surface">
            <div style={{ fontWeight:800, fontSize:'0.88rem', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-bell-fill" style={{ color:'#f59e0b' }}/>Toast Demo
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { type:'success' as const, label:'✅ Success',  text:'บันทึกสำเร็จ!' },
                { type:'error'   as const, label:'❌ Error',    text:'เกิดข้อผิดพลาด!' },
                { type:'warning' as const, label:'⚠️ Warning',  text:'ข้อมูลไม่ครบ' },
                { type:'info'    as const, label:'ℹ️ Info',     text:'กำลังโหลดข้อมูล...' },
              ].map(t => (
                <button key={t.type} onClick={() => showToast(t.text, t.type)}
                  style={{ padding:'10px', borderRadius:9, border:'1px solid var(--border)', background:'var(--bg)', cursor:'pointer', fontWeight:700, fontSize:'0.78rem', transition:'all 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='var(--surface)')}
                  onMouseLeave={e=>(e.currentTarget.style.background='var(--bg)')}>
                  {t.label}
                </button>
              ))}
            </div>
            <button onClick={() => {
              showToast('บันทึกสำเร็จ!', 'success');
              setTimeout(() => showToast('กำลังซิงค์...', 'info'), 400);
              setTimeout(() => showToast('ข้อมูลไม่ครบ', 'warning'), 800);
            }} style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:9, border:'1px solid #fcd34d', background:'#fffbeb', cursor:'pointer', fontWeight:700, fontSize:'0.78rem', color:'#92400e' }}>
              🔥 Test Stack (3 toasts)
            </button>
          </div>

          {/* Viewport Info */}
          <div className="surface">
            <div style={{ fontWeight:800, fontSize:'0.88rem', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-phone-fill" style={{ color:'#a78bfa' }}/>Viewport / Device
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Width',       val:`${vp.w}px` },
                { label:'Height',      val:`${vp.h}px` },
                { label:'Device',      val: device },
                { label:'Breakpoint',  val: breakpoint },
                { label:'User-Agent',  val: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥 Desktop') : '—' },
                { label:'Touch',       val: typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 ? `✅ Yes (${navigator.maxTouchPoints})` : '❌ No' },
              ].map(s => (
                <div key={s.label} style={{ padding:'8px 10px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:'0.58rem', color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
                  <div style={{ fontSize:'0.82rem', fontWeight:800, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.val}</div>
                </div>
              ))}
            </div>
            {/* Responsive indicator */}
            <div style={{ marginTop:10, display:'flex', gap:6 }}>
              {[
                { label:'Mobile',  max:640,  color:'#f87171' },
                { label:'Tablet',  max:1024, color:'#fbbf24' },
                { label:'Desktop', max:99999,color:'#34d399' },
              ].map(b => {
                const active = vp.w > 0 && vp.w <= b.max && (b.label === 'Mobile' ? vp.w <= 640 : b.label === 'Tablet' ? vp.w > 640 && vp.w <= 1024 : vp.w > 1024);
                return (
                  <div key={b.label} style={{ flex:1, textAlign:'center', padding:'6px', borderRadius:7, background: active ? b.color+'18' : 'var(--bg)', border:`1.5px solid ${active ? b.color : 'var(--border)'}`, transition:'all 0.2s' }}>
                    <div style={{ fontSize:'0.68rem', fontWeight:800, color: active ? b.color : 'var(--text-muted)' }}>{b.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Info */}
          <div className="surface" style={{ padding:'14px 16px' }}>
            <div style={{ fontWeight:800, fontSize:'0.88rem', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <i className="bi bi-person-badge-fill" style={{ color:'#38bdf8' }}/>Current Session
            </div>
            {[
              { label:'Username',  val: user.username },
              { label:'Role',      val: user.role },
              { label:'Display',   val: user.displayName || '—' },
              { label:'Club ID',   val: user.clubId || '—' },
            ].map(s => (
              <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:'0.8rem' }}>
                <span style={{ color:'var(--text-muted)', fontWeight:600 }}>{s.label}</span>
                <span style={{ fontWeight:700 }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ PAGE NAVIGATION TEST ══════════════════════════════ */}
      <div className="surface" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <i className="bi bi-grid-fill" style={{ color:'#818cf8' }}/>
          <div style={{ fontWeight:800, fontSize:'0.88rem' }}>Page Navigation Test</div>
          <div style={{ flex:1, height:1, background:'var(--border)' }}/>
          <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>กดเพื่อนำทางไปแต่ละหน้า</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
          {ALL_PAGES.map(p => (
            <button key={p.page} onClick={() => onNavigate(p.page)}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, background:'var(--bg)', border:'1px solid var(--border)', cursor:'pointer', transition:'all 0.15s', textAlign:'left' }}
              onMouseEnter={e=>{ e.currentTarget.style.background = p.color+'12'; e.currentTarget.style.borderColor = p.color+'55'; }}
              onMouseLeave={e=>{ e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              <div style={{ width:28, height:28, borderRadius:7, background:p.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`bi ${p.icon}`} style={{ color:p.color, fontSize:'0.78rem' }}/>
              </div>
              <span style={{ fontSize:'0.75rem', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ MANUAL CHECKLIST ══════════════════════════════════ */}
      <div className="surface">
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <i className="bi bi-list-check" style={{ color:'#10b981', fontSize:'1.1rem' }}/>
          <div style={{ fontWeight:800, fontSize:'0.88rem' }}>Manual Test Checklist</div>
          <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:'0.72rem', fontWeight:700, color: checkedCount===CHECKLIST.length ? '#10b981' : 'var(--text-muted)' }}>
              {checkedCount}/{CHECKLIST.length} ✓
            </span>
            {checkedCount === CHECKLIST.length && (
              <span style={{ background:'#f0fdf4', border:'1px solid #86efac', color:'#166534', borderRadius:6, padding:'3px 10px', fontSize:'0.68rem', fontWeight:800 }}>
                🎉 Ready to Deploy!
              </span>
            )}
          </div>
        </div>

        {/* Overall progress bar */}
        <div style={{ height:8, borderRadius:6, background:'#f1f5f9', overflow:'hidden', marginBottom:18 }}>
          <div style={{ height:'100%', borderRadius:6, background:'linear-gradient(90deg,#38bdf8,#10b981)', width:`${(checkedCount/CHECKLIST.length)*100}%`, transition:'width 0.4s' }}/>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {cats.map(cat => {
            const items = CHECKLIST.filter(c => c.cat === cat);
            const catDone = items.filter(c => checks[c.id]).length;
            const catColor = catDone === items.length ? '#10b981' : '#38bdf8';
            return (
              <div key={cat}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:'0.65rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:1 }}>{cat}</span>
                  <span style={{ fontSize:'0.62rem', color:catColor, fontWeight:700 }}>{catDone}/{items.length}</span>
                  <div style={{ flex:1, height:1, background:'var(--border)' }}/>
                  <button onClick={() => checkAll(cat)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'0.62rem', fontWeight:700, color:'var(--text-muted)', padding:'0 4px' }}>
                    {items.every(i => checks[i.id]) ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {items.map(item => (
                    <div key={item.id} onClick={() => toggleCheck(item.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:9, cursor:'pointer', transition:'all 0.12s',
                        background: checks[item.id] ? '#f0fdf4' : 'var(--bg)',
                        border: `1.5px solid ${checks[item.id] ? '#86efac' : 'var(--border)'}`,
                      }}>
                      <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${checks[item.id] ? '#10b981' : '#cbd5e1'}`, background: checks[item.id] ? '#10b981' : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}>
                        {checks[item.id] && <i className="bi bi-check-lg" style={{ color:'white', fontSize:'0.65rem' }}/>}
                      </div>
                      <span style={{ fontSize:'0.78rem', fontWeight: checks[item.id] ? 700 : 500, color: checks[item.id] ? '#166534' : 'var(--text-main)', textDecoration: checks[item.id] ? 'none' : 'none' }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
