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
interface OverviewRow {
  id: string; teamName: string; sessionDate: string;
  count: number; totalScore: number; totalMax: number;
  green: number; yellow: number; red: number;
}

const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const TEAM_COLORS: Record<string,string> = {
  U8:'#6366f1',U9:'#38bdf8',U10:'#10b981',U11:'#f59e0b',U12:'#ef4444',
  U13:'#8b5cf6',U14:'#06b6d4',U15:'#f97316',U16:'#ec4899',U17:'#14b8a6',
  U18:'#84cc16',Senior:'#1d4ed8',
};
const CORE_ITEMS = [
  'กินครบ 3 มื้อ','กินข้าวเช้า','กินก่อนซ้อม 2–4 ชั่วโมง','กินหลังซ้อมภายใน 60 นาที',
  'มีโปรตีนทุกมื้อ','มีคาร์โบไฮเดรตก่อนซ้อม/วันซ้อม','ดื่มน้ำเพียงพอ','ปัสสาวะสีเหลืองใส',
  'ไม่ดื่มน้ำหวาน/น้ำอัดลมมากเกินไป','ไม่อดอาหารเพื่อลดน้ำหนัก','นอนอย่างน้อย 8 ชั่วโมง',
];
const MATCH_ITEMS = [
  'กินมื้อหลักก่อนแข่ง 3–4 ชั่วโมง','เลือกอาหารย่อยง่าย','เน้นคาร์โบไฮเดรต',
  'ลดของทอด/ไขมันสูง','ดื่มน้ำก่อนแข่ง','มีของว่างก่อนแข่ง (กล้วย/ขนมปัง/เกลือแร่)','หลังแข่งมีคาร์บ + โปรตีน',
];
const TRAINING_OPTS = [
  { value:'', label:'— ไม่ระบุ —' },
  { value:'recovery', label:'Recovery' }, { value:'strength', label:'Strength' },
  { value:'field_gym', label:'Field+Gym' }, { value:'tactical', label:'Tactical' },
  { value:'pre_match', label:'Pre-Match' },
];
const TRAINING_LABEL: Record<string,string> = { recovery:'Recovery',strength:'Strength',field_gym:'Field+Gym',tactical:'Tactical',pre_match:'Pre-Match' };
const DAY_TYPE_LABEL: Record<string,string> = { training:'วันซ้อม', match:'วันแข่ง', rest:'วันพัก' };

function getStatus(score: number, max: number) {
  const p = max > 0 ? score / max : 0;
  if (p >= 0.82) return { label:'Nutrition Ready', color:'#10b981', bg:'rgba(16,185,129,0.1)', emoji:'🟢' };
  if (p >= 0.55) return { label:'ต้องปรับบางจุด', color:'#f59e0b', bg:'rgba(245,158,11,0.1)', emoji:'🟡' };
  return            { label:'เสี่ยงพลังงานไม่พอ', color:'#ef4444', bg:'rgba(239,68,68,0.1)', emoji:'🔴' };
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
  const [tab, setTab] = useState<'overview'|'qr'|'history'>('overview');

  // QR tab state
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [creatingQR, setCreatingQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [activeSession, setActiveSession] = useState<NutritionSession | null>(null);
  const [checkins, setCheckins] = useState<NutritionCheckin[]>([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History tab state
  const [sessions, setSessions] = useState<NutritionSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);

  // Overview tab state
  const [overview, setOverview] = useState<OverviewRow[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Edit checkin modal
  const [editCheckin, setEditCheckin] = useState<NutritionCheckin | null>(null);
  const [editDayType, setEditDayType] = useState('training');
  const [editTrainType, setEditTrainType] = useState('');
  const [editCore, setEditCore] = useState<boolean[]>(Array(11).fill(false));
  const [editExtra, setEditExtra] = useState<boolean[]>(Array(7).fill(false));
  const [saving, setSaving] = useState(false);

  // Delete checkin confirm
  const [confirmDeleteCheckin, setConfirmDeleteCheckin] = useState<string | null>(null);
  const [deletingCheckin, setDeletingCheckin] = useState(false);

  const teamAthletes = athletes.filter(a => !activeSession || a.Team === activeSession.teamName);

  // ── Data loaders ─────────────────────────────────────────────────────────────
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

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const d = await callGAS('getNutritionOverview', {}) as OverviewRow[];
      setOverview(Array.isArray(d) ? d : []);
    } catch { /* silent */ }
    finally { setLoadingOverview(false); }
  }, []);

  useEffect(() => { loadSessions(); loadOverview(); }, [loadSessions, loadOverview]);

  // Poll checkins every 15s when a session is active on QR tab
  useEffect(() => {
    if (!activeSession || tab !== 'qr') { if (pollRef.current) clearInterval(pollRef.current); return; }
    loadCheckins(activeSession.id);
    pollRef.current = setInterval(() => loadCheckins(activeSession.id), 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeSession, tab, loadCheckins]);

  // ── QR helpers ────────────────────────────────────────────────────────────────
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
      const res = await callGAS('createNutritionSession', { teamName: selectedTeam, sessionDate: selectedDate }) as { status: string; sessionId: string };
      if (res.status !== 'success') { showToast('สร้าง Session ไม่สำเร็จ', 'error'); return; }
      const sess: NutritionSession = { id: res.sessionId, teamName: selectedTeam, sessionDate: selectedDate, createdBy: user.username };
      setActiveSession(sess);
      await generateQR(res.sessionId);
      loadSessions(); loadOverview();
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

  // ── Delete session ────────────────────────────────────────────────────────────
  const handleDeleteSession = async (id: string) => {
    setDeletingSession(true);
    try {
      await callGAS('deleteNutritionSession', { id });
      showToast('ลบ Session สำเร็จ', 'success');
      if (activeSession?.id === id) { setActiveSession(null); setCheckins([]); setQrDataUrl(''); }
      setConfirmDeleteSession(null);
      loadSessions(); loadOverview();
    } catch { showToast('ลบไม่สำเร็จ', 'error'); }
    finally { setDeletingSession(false); }
  };

  // ── Delete checkin ────────────────────────────────────────────────────────────
  const handleDeleteCheckin = async (id: string) => {
    setDeletingCheckin(true);
    try {
      await callGAS('deleteNutritionCheckin', { id });
      showToast('ลบข้อมูลสำเร็จ', 'success');
      setCheckins(prev => prev.filter(c => c.id !== id));
      setConfirmDeleteCheckin(null);
      loadOverview();
    } catch { showToast('ลบไม่สำเร็จ', 'error'); }
    finally { setDeletingCheckin(false); }
  };

  // ── Edit checkin ──────────────────────────────────────────────────────────────
  const openEdit = (c: NutritionCheckin) => {
    setEditCheckin(c);
    setEditDayType(c.dayType);
    setEditTrainType(c.trainingType || '');
    setEditCore(c.coreChecks.length === CORE_ITEMS.length ? [...c.coreChecks] : Array(CORE_ITEMS.length).fill(false));
    setEditExtra(c.extraChecks.length === MATCH_ITEMS.length ? [...c.extraChecks] : Array(MATCH_ITEMS.length).fill(false));
  };

  const handleSaveEdit = async () => {
    if (!editCheckin) return;
    setSaving(true);
    try {
      await callGAS('updateNutritionCheckin', {
        id: editCheckin.id, dayType: editDayType, trainingType: editTrainType,
        coreChecks: editCore, extraChecks: editDayType === 'match' ? editExtra : [],
      });
      showToast('บันทึกสำเร็จ', 'success');
      setEditCheckin(null);
      if (activeSession) loadCheckins(activeSession.id);
      loadOverview();
    } catch { showToast('บันทึกไม่สำเร็จ', 'error'); }
    finally { setSaving(false); }
  };

  // ── Overview derived data ─────────────────────────────────────────────────────
  const totalSessions = overview.length;
  const totalCheckins = overview.reduce((s, r) => s + r.count, 0);
  const totalGreen    = overview.reduce((s, r) => s + r.green, 0);
  const totalYellow   = overview.reduce((s, r) => s + r.yellow, 0);
  const totalRed      = overview.reduce((s, r) => s + r.red, 0);
  const globalAvgPct  = totalCheckins > 0
    ? Math.round(overview.reduce((s, r) => s + r.totalScore, 0) / overview.reduce((s, r) => s + r.totalMax, 0) * 100)
    : 0;

  const teamSummary = (() => {
    const map: Record<string, { sessions:number; checkins:number; score:number; max:number; green:number; yellow:number; red:number }> = {};
    for (const r of overview) {
      if (!map[r.teamName]) map[r.teamName] = { sessions:0, checkins:0, score:0, max:0, green:0, yellow:0, red:0 };
      const m = map[r.teamName];
      m.sessions++; m.checkins += r.count; m.score += r.totalScore; m.max += r.totalMax;
      m.green += r.green; m.yellow += r.yellow; m.red += r.red;
    }
    return Object.entries(map).sort((a, b) => b[1].sessions - a[1].sessions);
  })();

  // ── Dashboard (per-session) derived ──────────────────────────────────────────
  const submittedCount = checkins.length;
  const totalCount     = teamAthletes.length;
  const notSubmitted   = teamAthletes.filter(a => !checkins.some(c => c.playerId === a.PlayerID));
  const greenCount     = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#10b981').length;
  const yellowCount    = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#f59e0b').length;
  const redCount       = checkins.filter(c => getStatus(c.score, c.maxScore).color === '#ef4444').length;

  const getMissed = (c: NutritionCheckin) => {
    const missed: string[] = [];
    CORE_ITEMS.forEach((item, i) => { if (!c.coreChecks[i]) missed.push(item); });
    if (c.dayType === 'match') MATCH_ITEMS.forEach((item, i) => { if (!c.extraChecks[i]) missed.push(item); });
    return missed;
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Edit checkin modal */}
      {editCheckin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => { if (e.target === e.currentTarget) setEditCheckin(null); }}>
          <div style={{ background:'var(--surface)', borderRadius:16, padding:24, width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:'1rem' }}><i className="bi bi-pencil-square me-2" style={{color:'#38bdf8'}}/>แก้ไข: {editCheckin.playerName}</div>
              <button onClick={() => setEditCheckin(null)} style={{ background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'var(--text-muted)' }}>×</button>
            </div>
            {/* Day type */}
            <div style={{ marginBottom:14 }}>
              <label className="form-label">ประเภทวัน</label>
              <div style={{ display:'flex', gap:8 }}>
                {[{v:'training',l:'🏃 ซ้อม'},{v:'match',l:'🏟️ แข่ง'},{v:'rest',l:'🛌 พัก'}].map(opt => (
                  <button key={opt.v} onClick={() => setEditDayType(opt.v)} style={{ flex:1, padding:'8px 10px', borderRadius:8, border:`2px solid ${editDayType===opt.v?'#38bdf8':'var(--border)'}`, background: editDayType===opt.v?'rgba(56,189,248,0.12)':'transparent', cursor:'pointer', fontWeight:700, fontSize:'0.8rem', color: editDayType===opt.v?'#38bdf8':'var(--text-muted)' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            {/* Training type */}
            <div style={{ marginBottom:16 }}>
              <label className="form-label">ประเภทการซ้อม</label>
              <select className="form-select" value={editTrainType} onChange={e => setEditTrainType(e.target.value)}>
                {TRAINING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {/* Core checklist */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#38bdf8', marginBottom:8 }}>รายการหลัก ({editCore.filter(Boolean).length}/{CORE_ITEMS.length})</div>
              {CORE_ITEMS.map((item, i) => (
                <label key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, cursor:'pointer', marginBottom:4, background: editCore[i] ? 'rgba(16,185,129,0.07)' : 'var(--bg)', border:`1px solid ${editCore[i]?'#10b98130':'var(--border)'}` }}>
                  <input type="checkbox" checked={!!editCore[i]} onChange={e => { const n=[...editCore]; n[i]=e.target.checked; setEditCore(n); }} style={{ width:16, height:16, accentColor:'#10b981', flexShrink:0 }}/>
                  <span style={{ fontSize:'0.82rem', color: editCore[i] ? '#10b981' : 'var(--text)' }}>{item}</span>
                </label>
              ))}
            </div>
            {/* Match-day extras */}
            {editDayType === 'match' && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#f59e0b', marginBottom:8 }}>รายการวันแข่ง ({editExtra.filter(Boolean).length}/{MATCH_ITEMS.length})</div>
                {MATCH_ITEMS.map((item, i) => (
                  <label key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:8, cursor:'pointer', marginBottom:4, background: editExtra[i] ? 'rgba(245,158,11,0.07)' : 'var(--bg)', border:`1px solid ${editExtra[i]?'#f59e0b30':'var(--border)'}` }}>
                    <input type="checkbox" checked={!!editExtra[i]} onChange={e => { const n=[...editExtra]; n[i]=e.target.checked; setEditExtra(n); }} style={{ width:16, height:16, accentColor:'#f59e0b', flexShrink:0 }}/>
                    <span style={{ fontSize:'0.82rem', color: editExtra[i] ? '#f59e0b' : 'var(--text)' }}>{item}</span>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary" style={{ flex:1 }}>
                {saving ? <><span className="spinner-ring" style={{width:14,height:14,borderWidth:2,margin:0}}/> บันทึก...</> : <><i className="bi bi-check-lg me-1"/>บันทึก</>}
              </button>
              <button onClick={() => setEditCheckin(null)} className="btn-outline" style={{ flex:1 }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2 className="page-title">Daily Nutrition Check-in</h2>
          <p className="page-subtitle">ติดตามโภชนาการ · สร้าง QR · แก้ไข · ลบ</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:4 }}>
        {[
          { id:'overview', label:'ภาพรวม', icon:'bi-bar-chart-fill' },
          { id:'qr',       label:'QR / Dashboard', icon:'bi-qr-code' },
          { id:'history',  label:'ประวัติ Session', icon:'bi-clock-history' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as typeof tab)} style={{
            flex:1, padding:'9px 10px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:'0.78rem',
            background: tab===t.id ? '#38bdf8' : 'transparent',
            color: tab===t.id ? 'white' : 'var(--text-muted)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:5,
          }}>
            <i className={`bi ${t.icon}`}/>{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {tab === 'overview' && (
        <div>
          {loadingOverview && <div style={{ textAlign:'center', padding:40 }}><div className="spinner-ring"/></div>}
          {!loadingOverview && overview.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
              <i className="bi bi-bar-chart" style={{ fontSize:'3rem', display:'block', marginBottom:10, color:'#cbd5e1' }}/>
              <p>ยังไม่มีข้อมูล Nutrition Check-in</p>
            </div>
          )}
          {!loadingOverview && overview.length > 0 && (
            <>
              {/* Global KPI */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
                {[
                  { label:'Sessions ทั้งหมด', val:totalSessions, color:'#38bdf8', icon:'bi-calendar3' },
                  { label:'Check-in ทั้งหมด', val:totalCheckins, color:'#818cf8', icon:'bi-people-fill' },
                  { label:'เฉลี่ยรวม %',       val:`${globalAvgPct}%`, color: globalAvgPct>=82?'#10b981':globalAvgPct>=55?'#f59e0b':'#ef4444', icon:'bi-percent' },
                  { label:'🟢 Nutrition Ready', val:totalGreen,  color:'#10b981', icon:'bi-circle-fill' },
                  { label:'🟡 ต้องปรับ',         val:totalYellow, color:'#f59e0b', icon:'bi-circle-fill' },
                  { label:'🔴 เสี่ยง',           val:totalRed,    color:'#ef4444', icon:'bi-circle-fill' },
                ].map(k => (
                  <div key={k.label} style={{ background:'var(--surface)', border:`1px solid ${k.color}22`, borderTop:`3px solid ${k.color}`, borderRadius:10, padding:'12px 14px' }}>
                    <i className={`bi ${k.icon}`} style={{ color:k.color, fontSize:'0.9rem', display:'block', marginBottom:6 }}/>
                    <div style={{ fontWeight:900, fontSize:'1.5rem', color:k.color, lineHeight:1 }}>{k.val}</div>
                    <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', fontWeight:700, marginTop:4 }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Overall progress bar */}
              <div className="surface" style={{ marginBottom:20, padding:'14px 18px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontWeight:700, fontSize:'0.85rem' }}>อัตราโภชนาการรวม</span>
                  <span style={{ fontWeight:900, color: globalAvgPct>=82?'#10b981':globalAvgPct>=55?'#f59e0b':'#ef4444' }}>{globalAvgPct}%</span>
                </div>
                <div style={{ display:'flex', height:12, borderRadius:10, overflow:'hidden', gap:2 }}>
                  {totalCheckins > 0 && [
                    { v:totalGreen,  c:'#10b981' },
                    { v:totalYellow, c:'#f59e0b' },
                    { v:totalRed,    c:'#ef4444' },
                  ].map((seg, i) => seg.v > 0 && (
                    <div key={i} style={{ width:`${seg.v/totalCheckins*100}%`, background:seg.c, borderRadius:4, transition:'width 0.6s' }}
                         title={`${seg.v} คน (${Math.round(seg.v/totalCheckins*100)}%)`}/>
                  ))}
                </div>
                <div style={{ display:'flex', gap:14, marginTop:8 }}>
                  {[{l:`🟢 พร้อม (${totalGreen})`,c:'#10b981'},{l:`🟡 ปรับปรุง (${totalYellow})`,c:'#f59e0b'},{l:`🔴 ต้องดูแล (${totalRed})`,c:'#ef4444'}].map(s=>(
                    <div key={s.l} style={{ fontSize:'0.68rem', color:s.c, fontWeight:700 }}>{s.l}</div>
                  ))}
                </div>
              </div>

              {/* Per-team breakdown */}
              <div className="surface" style={{ marginBottom:20, padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem' }}>
                  <i className="bi bi-people-fill me-2" style={{ color:'#818cf8' }}/>สรุปรายทีม
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                    <thead><tr style={{ background:'var(--bg)' }}>
                      {['ทีม','Sessions','Check-in','เฉลี่ย %','🟢','🟡','🔴','แนวโน้ม'].map(h => (
                        <th key={h} style={{ padding:'8px 14px', fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', textAlign: h==='ทีม'?'left':'center', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {teamSummary.map(([team, d]) => {
                        const avg = d.max > 0 ? Math.round(d.score / d.max * 100) : 0;
                        const tc = TEAM_COLORS[team] || '#6366f1';
                        return (
                          <tr key={team} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={{ padding:'10px 14px' }}>
                              <span style={{ background:`${tc}20`, color:tc, borderRadius:6, padding:'2px 10px', fontSize:'0.75rem', fontWeight:800, border:`1px solid ${tc}40` }}>{team}</span>
                            </td>
                            <td style={{ textAlign:'center' }}>{d.sessions}</td>
                            <td style={{ textAlign:'center' }}>{d.checkins}</td>
                            <td style={{ textAlign:'center', fontWeight:900, color: avg>=82?'#10b981':avg>=55?'#f59e0b':'#ef4444' }}>{avg}%</td>
                            <td style={{ textAlign:'center', color:'#10b981', fontWeight:700 }}>{d.green}</td>
                            <td style={{ textAlign:'center', color:'#f59e0b', fontWeight:700 }}>{d.yellow}</td>
                            <td style={{ textAlign:'center', color:'#ef4444', fontWeight:700 }}>{d.red}</td>
                            <td style={{ textAlign:'center', padding:'8px 14px' }}>
                              <div style={{ display:'flex', height:8, borderRadius:6, overflow:'hidden', gap:1, minWidth:60 }}>
                                {d.checkins > 0 && [
                                  { v:d.green, c:'#10b981' },{ v:d.yellow, c:'#f59e0b' },{ v:d.red, c:'#ef4444' },
                                ].map((seg,i) => seg.v > 0 && (
                                  <div key={i} style={{ width:`${seg.v/d.checkins*100}%`, background:seg.c }}/>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent 15 sessions */}
              <div className="surface" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem' }}>
                  <i className="bi bi-clock-history me-2" style={{ color:'#38bdf8' }}/>15 Session ล่าสุด
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.82rem' }}>
                    <thead><tr style={{ background:'var(--bg)' }}>
                      {['วันที่','ทีม','Check-in','เฉลี่ย %','สถานะ'].map(h => (
                        <th key={h} style={{ padding:'8px 14px', fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', textAlign: h==='วันที่'||h==='ทีม'?'left':'center' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {overview.slice(0,15).map(r => {
                        const avg = r.totalMax > 0 ? Math.round(r.totalScore / r.totalMax * 100) : 0;
                        const tc = TEAM_COLORS[r.teamName] || '#6366f1';
                        const sc = avg>=82?'#10b981':avg>=55?'#f59e0b':'#ef4444';
                        return (
                          <tr key={r.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={() => selectSession({ id:r.id, teamName:r.teamName, sessionDate:r.sessionDate, createdBy:'' })}>
                            <td style={{ padding:'10px 14px', fontSize:'0.78rem' }}>{fmtDate(r.sessionDate)}</td>
                            <td style={{ padding:'8px 14px' }}>
                              <span style={{ background:`${tc}20`, color:tc, borderRadius:6, padding:'2px 8px', fontSize:'0.72rem', fontWeight:800 }}>{r.teamName}</span>
                            </td>
                            <td style={{ textAlign:'center' }}>{r.count} คน</td>
                            <td style={{ textAlign:'center', fontWeight:900, color:sc }}>{r.count>0?`${avg}%`:'—'}</td>
                            <td style={{ textAlign:'center' }}>
                              {r.count > 0 ? (
                                <span style={{ background:`${sc}22`, color:sc, borderRadius:12, padding:'2px 10px', fontSize:'0.7rem', fontWeight:700 }}>
                                  {avg>=82?'🟢 พร้อม':avg>=55?'🟡 ปรับปรุง':'🔴 ต้องดูแล'}
                                </span>
                              ) : <span style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>ไม่มีข้อมูล</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════ QR / DASHBOARD TAB ══════════════════ */}
      {tab === 'qr' && (
        <div>
          {/* Session creator */}
          <div className="surface" style={{ padding:'16px 20px', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:'0.85rem', marginBottom:14, color:'#38bdf8' }}><i className="bi bi-qr-code me-2"/>สร้าง QR Code ประจำวัน</div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
              <div style={{ flex:'1 1 140px' }}>
                <label className="form-label">รุ่นทีม *</label>
                <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                  <option value="">— เลือกทีม —</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ flex:'1 1 140px' }}>
                <label className="form-label">วันที่</label>
                <input type="date" className="form-control" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}/>
              </div>
              <button className="btn-primary" style={{ flexShrink:0 }} onClick={handleCreateQR} disabled={creatingQR}>
                {creatingQR ? <><span className="spinner-ring" style={{width:16,height:16,borderWidth:2,margin:0}}/> กำลังสร้าง...</> : <><i className="bi bi-qr-code me-1"/>สร้าง / โหลด QR</>}
              </button>
            </div>
          </div>

          {activeSession && qrDataUrl && (
            <>
              {/* QR + Stats row */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:16, marginBottom:16, alignItems:'flex-start' }}>
                {/* QR card */}
                <div className="surface" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'16px 20px', flexShrink:0, minWidth:220 }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width:200, height:200, borderRadius:12, border:'4px solid var(--border)' }}/>
                  <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', textAlign:'center' }}>
                    ทีม <strong>{activeSession.teamName}</strong> · {fmtDate(activeSession.sessionDate)}
                  </div>
                  <button className="btn-outline btn-sm" onClick={copyUrl} style={{ width:'100%', justifyContent:'center' }}>
                    <i className="bi bi-clipboard me-1"/>คัดลอก URL
                  </button>
                  <a href={`/nutrition/${activeSession.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:'0.72rem', color:'#38bdf8', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                    <i className="bi bi-box-arrow-up-right"/>ทดสอบ link
                  </a>
                </div>

                {/* Stats card */}
                <div className="surface" style={{ flex:'1 1 260px', padding:'16px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                    <div style={{ fontWeight:700, fontSize:'0.88rem' }}>สถานะวันนี้</div>
                    <button className="btn-outline btn-sm" onClick={() => loadCheckins(activeSession.id)} disabled={loadingCheckins} style={{ marginLeft:'auto', padding:'3px 10px' }}>
                      {loadingCheckins ? <span className="spinner-ring" style={{width:12,height:12,borderWidth:2,margin:0}}/> : <><i className="bi bi-arrow-clockwise me-1"/>รีเฟรช</>}
                    </button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
                    {[
                      { l:'ส่งแล้ว', v:`${submittedCount}/${totalCount}`, c:'#38bdf8' },
                      { l:'ยังไม่ส่ง', v:totalCount-submittedCount, c:'#64748b' },
                      { l:'🟢 Nutrition Ready', v:greenCount, c:'#10b981' },
                      { l:'🟡 ต้องปรับ', v:yellowCount, c:'#f59e0b' },
                      { l:'🔴 เสี่ยง', v:redCount, c:'#ef4444' },
                    ].map(k => (
                      <div key={k.l} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${k.c}` }}>
                        <div style={{ fontWeight:900, fontSize:'1.4rem', color:k.c }}>{k.v}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', fontWeight:600, marginTop:2 }}>{k.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Not submitted */}
              {notSubmitted.length > 0 && (
                <div className="surface" style={{ padding:'12px 16px', marginBottom:16 }}>
                  <div style={{ fontWeight:700, fontSize:'0.82rem', color:'#64748b', marginBottom:10 }}><i className="bi bi-person-x me-2"/>ยังไม่ส่งข้อมูล ({notSubmitted.length} คน)</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {notSubmitted.map(a => (
                      <div key={a.PlayerID} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:20, fontSize:'0.75rem' }}>
                        <div style={{ width:22, height:22, borderRadius:'50%', overflow:'hidden', background:TEAM_COLORS[a.Team]||'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.55rem', fontWeight:800, color:'white', flexShrink:0 }}>
                          {a.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(a.Name)}
                        </div>
                        <span style={{ color:'var(--text-muted)' }}>{a.Nickname||a.Name.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checkins table with Edit + Delete */}
              {checkins.length > 0 && (
                <div className="surface" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', fontWeight:700, fontSize:'0.85rem', display:'flex', alignItems:'center', gap:8 }}>
                    <i className="bi bi-table" style={{ color:'#38bdf8' }}/>ผลการตรวจสอบ ({checkins.length} คน)
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.8rem' }}>
                      <thead><tr style={{ background:'var(--bg)' }}>
                        {['นักกีฬา','ประเภทวัน','คะแนน','สถานะ','จุดที่ขาด','จัดการ'].map(h => (
                          <th key={h} style={{ padding:'8px 14px', fontWeight:700, color:'var(--text-muted)', borderBottom:'1px solid var(--border)', textAlign: h==='นักกีฬา'?'left':'center', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {checkins.map(c => {
                          const a = athletes.find(x => x.PlayerID === c.playerId);
                          const st = getStatus(c.score, c.maxScore);
                          const missed = getMissed(c);
                          const isDeleting = confirmDeleteCheckin === c.id;
                          return (
                            <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                              <td style={{ padding:'10px 14px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:TEAM_COLORS[a?.Team||'']||'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontWeight:800, color:'white' }}>
                                    {a?.PhotoUrl ? <img src={a.PhotoUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : initials(c.playerName)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight:700 }}>{c.playerName}</div>
                                    {a?.Nickname && <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{a.Nickname}</div>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ textAlign:'center', padding:'8px 14px' }}>
                                <div style={{ fontWeight:600 }}>{DAY_TYPE_LABEL[c.dayType]||c.dayType}</div>
                                {c.trainingType && <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{TRAINING_LABEL[c.trainingType]||c.trainingType}</div>}
                              </td>
                              <td style={{ textAlign:'center', padding:'8px 14px' }}>
                                <span style={{ fontWeight:900, color:st.color, fontSize:'0.95rem' }}>{c.score}</span>
                                <span style={{ color:'var(--text-muted)', fontSize:'0.72rem' }}>/{c.maxScore}</span>
                              </td>
                              <td style={{ textAlign:'center', padding:'8px 14px' }}>
                                <span style={{ background:st.bg, color:st.color, borderRadius:6, padding:'3px 10px', fontSize:'0.7rem', fontWeight:800, border:`1px solid ${st.color}30`, whiteSpace:'nowrap' }}>
                                  {st.emoji} {st.label}
                                </span>
                              </td>
                              <td style={{ padding:'8px 14px', maxWidth:160 }}>
                                {missed.length > 0 ? (
                                  <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', lineHeight:1.6 }}>
                                    {missed.slice(0,3).map((m,i) => <div key={i} style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>• {m}</div>)}
                                    {missed.length > 3 && <div style={{ color:'#94a3b8' }}>+{missed.length-3} รายการ</div>}
                                  </div>
                                ) : (
                                  <span style={{ fontSize:'0.7rem', color:'#10b981', fontWeight:600 }}>ครบทุกข้อ ✓</span>
                                )}
                              </td>
                              <td style={{ textAlign:'center', padding:'8px 10px', whiteSpace:'nowrap' }}>
                                {isDeleting ? (
                                  <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                                    <button onClick={() => handleDeleteCheckin(c.id)} disabled={deletingCheckin} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:6, padding:'4px 10px', fontSize:'0.7rem', fontWeight:700, cursor:'pointer' }}>
                                      {deletingCheckin ? '...' : 'ยืนยัน'}
                                    </button>
                                    <button onClick={() => setConfirmDeleteCheckin(null)} style={{ background:'var(--bg)', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:'0.7rem', cursor:'pointer' }}>ยกเลิก</button>
                                  </div>
                                ) : (
                                  <div style={{ display:'flex', gap:5, justifyContent:'center' }}>
                                    <button onClick={() => openEdit(c)} title="แก้ไข" style={{ background:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'1px solid #38bdf840', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer', fontWeight:700 }}>
                                      <i className="bi bi-pencil-fill"/>
                                    </button>
                                    <button onClick={() => setConfirmDeleteCheckin(c.id)} title="ลบ" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid #ef444440', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer' }}>
                                      <i className="bi bi-trash-fill"/>
                                    </button>
                                  </div>
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
                <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)', fontSize:'0.85rem' }}>
                  <i className="bi bi-hourglass-split" style={{ display:'block', fontSize:'2.5rem', marginBottom:10, color:'#cbd5e1' }}/>
                  รอนักกีฬาสแกน QR และกรอกข้อมูล...
                </div>
              )}
            </>
          )}

          {!activeSession && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
              <i className="bi bi-qr-code" style={{ fontSize:'3rem', display:'block', marginBottom:12, color:'#cbd5e1' }}/>
              <p>เลือกทีมและวันที่ แล้วกด <strong>สร้าง / โหลด QR</strong></p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ HISTORY TAB ══════════════════ */}
      {tab === 'history' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="btn-outline btn-sm" onClick={loadSessions} disabled={loadingSessions}>
              <i className="bi bi-arrow-clockwise me-1"/>รีเฟรช
            </button>
          </div>
          {loadingSessions && <div style={{ textAlign:'center', padding:40 }}><div className="spinner-ring"/></div>}
          {!loadingSessions && sessions.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:'var(--text-muted)' }}>
              <i className="bi bi-clock-history" style={{ fontSize:'3rem', display:'block', marginBottom:10, color:'#cbd5e1' }}/>
              <p>ยังไม่มีประวัติ Session</p>
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sessions.map(s => {
              const tc = TEAM_COLORS[s.teamName] || '#6366f1';
              const isActive = activeSession?.id === s.id;
              const isDeletingThis = confirmDeleteSession === s.id;
              return (
                <div key={s.id} style={{ borderLeft:`4px solid ${tc}`, borderRadius:10 }} className="surface">
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', padding:'14px 18px' }}>
                    <span style={{ background:`${tc}20`, color:tc, borderRadius:6, padding:'2px 10px', fontSize:'0.75rem', fontWeight:800, border:`1px solid ${tc}40` }}>{s.teamName}</span>
                    <div style={{ flex:1, cursor:'pointer' }} onClick={() => selectSession(s)}>
                      <div style={{ fontWeight:700, fontSize:'0.88rem' }}>{fmtDate(s.sessionDate)}</div>
                      <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2 }}>สร้างโดย {s.createdBy || '—'}</div>
                    </div>
                    {isActive && <span style={{ fontSize:'0.72rem', color:'#38bdf8', fontWeight:700 }}>✓ กำลังดูอยู่</span>}
                    {isDeletingThis ? (
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <span style={{ fontSize:'0.72rem', color:'#ef4444', fontWeight:600 }}>ลบ Session นี้?</span>
                        <button onClick={() => handleDeleteSession(s.id)} disabled={deletingSession} style={{ background:'#ef4444', color:'white', border:'none', borderRadius:6, padding:'4px 12px', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' }}>
                          {deletingSession ? '...' : 'ยืนยัน'}
                        </button>
                        <button onClick={() => setConfirmDeleteSession(null)} style={{ background:'var(--bg)', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 8px', fontSize:'0.72rem', cursor:'pointer' }}>ยกเลิก</button>
                      </div>
                    ) : (
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => selectSession(s)} title="เปิด Dashboard" style={{ background:'rgba(56,189,248,0.1)', color:'#38bdf8', border:'1px solid #38bdf840', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer', fontWeight:700 }}>
                          <i className="bi bi-qr-code-scan"/>
                        </button>
                        <button onClick={() => setConfirmDeleteSession(s.id)} title="ลบ Session" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', border:'1px solid #ef444440', borderRadius:6, padding:'5px 10px', fontSize:'0.75rem', cursor:'pointer' }}>
                          <i className="bi bi-trash-fill"/>
                        </button>
                      </div>
                    )}
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
