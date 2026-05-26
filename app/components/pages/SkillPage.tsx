'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Athlete, SkillAssessment, User, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface Props {
  athletes: Athlete[];
  user: User;
  onNavigate: (page: Page, id?: string) => void;
}

/* ── Category definitions ─────────────────────────────────────────── */
const CATEGORIES = [
  {
    id: 'ballControl', label: 'Ball Control', labelTH: 'การควบคุมบอล',
    icon: 'bi-circle-fill', color: '#38bdf8',
    skills: [
      { key: 'skFirstTouch',   labelTH: 'First Touch',              desc: 'คุณภาพการรับบอลครั้งแรก' },
      { key: 'skBallControl',  labelTH: 'Ball Control',             desc: 'ควบคุมบอลขณะเคลื่อนที่' },
      { key: 'skReceiving',    labelTH: 'Receiving',                desc: 'รับบอลจากหลายทิศทาง' },
      { key: 'skWeakFoot',     labelTH: 'Weak Foot Control',        desc: 'ใช้เท้าอ่อนควบคุมบอล' },
      { key: 'skPressureCtrl', labelTH: 'Under Pressure Control',   desc: 'ควบคุมบอลภายใต้แรงกดดัน' },
    ],
    scoreKey: 'scoreBallControl',
  },
  {
    id: 'passing', label: 'Passing', labelTH: 'การส่งบอล',
    icon: 'bi-send-fill', color: '#34d399',
    skills: [
      { key: 'skPassAccuracy', labelTH: 'Passing Accuracy',         desc: 'ความแม่นยำในการส่ง' },
      { key: 'skShortPass',    labelTH: 'Short Pass',               desc: 'ส่งบอลระยะสั้น' },
      { key: 'skLongPass',     labelTH: 'Long Pass',                desc: 'ส่งบอลระยะยาว' },
      { key: 'skThroughPass',  labelTH: 'Through Pass',             desc: 'ส่งบอลทะลุแนวรับ' },
      { key: 'skOneTouch',     labelTH: 'One-touch Pass',           desc: 'ส่งบอลหนึ่งสัมผัส' },
      { key: 'skPassPressure', labelTH: 'Passing Under Pressure',   desc: 'ส่งบอลภายใต้แรงกดดัน' },
    ],
    scoreKey: 'scorePassing',
  },
  {
    id: 'dribbling', label: 'Dribbling', labelTH: 'การเลี้ยงบอล',
    icon: 'bi-lightning-fill', color: '#f59e0b',
    skills: [
      { key: 'skDribbleSpeed',    labelTH: 'Dribbling Speed',       desc: 'ความเร็วในการเลี้ยง' },
      { key: 'skDirectionChange', labelTH: 'Change of Direction',   desc: 'เปลี่ยนทิศทางอย่างฉับพลัน' },
      { key: 'skBeatOpp',         labelTH: 'Beat Opponent',         desc: 'ผ่านคู่ต่อสู้ 1v1' },
      { key: 'skTightSpace',      labelTH: 'Tight Space Control',   desc: 'เลี้ยงในพื้นที่แคบ' },
      { key: 'skSkillExec',       labelTH: 'Skill Execution',       desc: 'ทำท่าเทคนิคสำเร็จ' },
    ],
    scoreKey: 'scoreDribbling',
  },
  {
    id: 'shooting', label: 'Shooting', labelTH: 'การยิงประตู',
    icon: 'bi-bullseye', color: '#f472b6',
    skills: [
      { key: 'skShootAccuracy',   labelTH: 'Shooting Accuracy',     desc: 'ยิงตรงเป้าหมาย' },
      { key: 'skShotPower',       labelTH: 'Shot Power',            desc: 'พลังในการยิง' },
      { key: 'skWeakFinish',      labelTH: 'Weak Foot Finishing',   desc: 'ยิงด้วยเท้าอ่อน' },
      { key: 'skFinishPressure',  labelTH: 'Finishing Under Pressure', desc: 'ยิงภายใต้แรงกดดัน' },
      { key: 'skFirstTime',       labelTH: 'First-time Finish',     desc: 'ยิงครั้งแรกที่รับบอล' },
    ],
    scoreKey: 'scoreShooting',
  },
  {
    id: 'tactical', label: 'Tactical IQ', labelTH: 'สติปัญญาทางยุทธวิธี',
    icon: 'bi-cpu-fill', color: '#a78bfa',
    skills: [
      { key: 'skPositioning', labelTH: 'Positioning',               desc: 'ยืนในตำแหน่งที่ถูกต้อง' },
      { key: 'skScanning',    labelTH: 'Scanning',                  desc: 'มองสนามก่อนรับบอล' },
      { key: 'skDecision',    labelTH: 'Decision Making',           desc: 'ตัดสินใจรวดเร็วและถูกต้อง' },
      { key: 'skOffBall',     labelTH: 'Off-ball Movement',         desc: 'เคลื่อนที่เมื่อไม่มีบอล' },
      { key: 'skSpatial',     labelTH: 'Spatial Awareness',         desc: 'รับรู้พื้นที่รอบตัว' },
      { key: 'skTransition',  labelTH: 'Transition Understanding',  desc: 'เข้าใจการเปลี่ยนจังหวะรุก/รับ' },
    ],
    scoreKey: 'scoreTactical',
  },
] as const;

type FormData = Omit<SkillAssessment, 'id' | 'playerId' | 'assessedAt'> & {
  notesBallControl: string;
  notesPassing: string;
  notesDribbling: string;
  notesShooting: string;
  notesTactical: string;
};
type SkillKey = keyof FormData;

const CAT_NOTE_KEYS: Record<string, keyof FormData> = {
  ballControl: 'notesBallControl',
  passing:     'notesPassing',
  dribbling:   'notesDribbling',
  shooting:    'notesShooting',
  tactical:    'notesTactical',
};

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: '—',      color: '#94a3b8', bg: '#f1f5f9' },
  1: { label: 'ต่ำมาก',color: '#dc2626', bg: '#fef2f2' },
  2: { label: 'พัฒนา', color: '#ea580c', bg: '#fff7ed' },
  3: { label: 'ปานกลาง',color:'#ca8a04', bg: '#fefce8' },
  4: { label: 'ดี',     color: '#16a34a', bg: '#f0fdf4' },
  5: { label: 'ยอดเยี่ยม',color:'#0284c7',bg:'#eff6ff' },
};

function calcCategoryScore(vals: number[]): number {
  const v = vals.filter(x => x > 0);
  if (!v.length) return 0;
  return Math.round((v.reduce((a, b) => a + b, 0) / (v.length * 5)) * 100);
}

function calcTotal(scores: { bc: number; pa: number; dr: number; sh: number; tq: number }): number {
  if (!scores.bc && !scores.pa && !scores.dr && !scores.sh && !scores.tq) return 0;
  const w = { bc: 0.20, pa: 0.25, dr: 0.20, sh: 0.20, tq: 0.15 };
  const vals = [
    scores.bc * w.bc, scores.pa * w.pa,
    scores.dr * w.dr, scores.sh * w.sh, scores.tq * w.tq,
  ];
  const wt = [w.bc, w.pa, w.dr, w.sh, w.tq];
  const active = [scores.bc, scores.pa, scores.dr, scores.sh, scores.tq].map((v, i) => v > 0 ? wt[i] : 0);
  const wSum = active.reduce((a, b) => a + b, 0);
  if (!wSum) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / wSum);
}

function makeBlankForm(): FormData {
  return {
    assessedBy: '', season: '',
    skFirstTouch: 0, skBallControl: 0, skReceiving: 0, skWeakFoot: 0, skPressureCtrl: 0,
    skPassAccuracy: 0, skShortPass: 0, skLongPass: 0, skThroughPass: 0, skOneTouch: 0, skPassPressure: 0,
    skDribbleSpeed: 0, skDirectionChange: 0, skBeatOpp: 0, skTightSpace: 0, skSkillExec: 0,
    skShootAccuracy: 0, skShotPower: 0, skWeakFinish: 0, skFinishPressure: 0, skFirstTime: 0,
    skPositioning: 0, skScanning: 0, skDecision: 0, skOffBall: 0, skSpatial: 0, skTransition: 0,
    scoreBallControl: 0, scorePassing: 0, scoreDribbling: 0, scoreShooting: 0, scoreTactical: 0, scoreTotal: 0,
    notes: '',
    notesBallControl: '', notesPassing: '', notesDribbling: '', notesShooting: '', notesTactical: '',
  };
}

function formFromAssessment(a: SkillAssessment): FormData {
  const { id: _id, playerId: _pid, assessedAt: _at, notes, ...rest } = a;
  let general = notes || '';
  let bc = '', pa = '', dr = '', sh = '', tq = '';
  try {
    const p = JSON.parse(notes || '');
    if (p && typeof p === 'object') {
      general = String(p.general || '');
      bc = String(p.bc || ''); pa = String(p.pa || '');
      dr = String(p.dr || ''); sh = String(p.sh || '');
      tq = String(p.tq || '');
    }
  } catch { /* plain text — general note only */ }
  return {
    ...rest,
    notes: general,
    notesBallControl: bc, notesPassing: pa, notesDribbling: dr,
    notesShooting: sh, notesTactical: tq,
  };
}

export default function SkillPage({ athletes, user, onNavigate }: Props) {
  const [selectedId, setSelectedId] = useState(athletes[0]?.PlayerID || '');
  const [form, setForm]             = useState<FormData>(makeBlankForm());
  const [history, setHistory]       = useState<SkillAssessment[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const athlete = athletes.find(a => a.PlayerID === selectedId);

  const loadHistory = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const d = await callGAS('getSkillAssessments', { playerId: selectedId }) as SkillAssessment[];
      setHistory(Array.isArray(d) ? d : []);
    } finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    setForm(makeBlankForm());
    setEditId(null);
  }, [selectedId]);

  /* ── Derived scores ─────────────────────────────────────── */
  const bc = calcCategoryScore([form.skFirstTouch, form.skBallControl, form.skReceiving, form.skWeakFoot, form.skPressureCtrl]);
  const pa = calcCategoryScore([form.skPassAccuracy, form.skShortPass, form.skLongPass, form.skThroughPass, form.skOneTouch, form.skPassPressure]);
  const dr = calcCategoryScore([form.skDribbleSpeed, form.skDirectionChange, form.skBeatOpp, form.skTightSpace, form.skSkillExec]);
  const sh = calcCategoryScore([form.skShootAccuracy, form.skShotPower, form.skWeakFinish, form.skFinishPressure, form.skFirstTime]);
  const tq = calcCategoryScore([form.skPositioning, form.skScanning, form.skDecision, form.skOffBall, form.skSpatial, form.skTransition]);
  const total = calcTotal({ bc, pa, dr, sh, tq });

  const catScores = [bc, pa, dr, sh, tq];
  const catColors = CATEGORIES.map(c => c.color);

  const radarData = {
    labels: CATEGORIES.map(c => c.labelTH),
    datasets: [{
      label: athlete?.Nickname || athlete?.Name || 'นักกีฬา',
      data: catScores,
      backgroundColor: 'rgba(56,189,248,0.15)',
      borderColor: '#38bdf8',
      borderWidth: 2,
      pointBackgroundColor: catColors,
      pointRadius: 5,
    }],
  };

  const radarOpts = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { stepSize: 20, font: { size: 9 }, backdropColor: 'transparent' },
        pointLabels: { font: { size: 11, weight: 700 as const }, color: '#475569' },
        grid: { color: 'rgba(0,0,0,0.06)' },
        angleLines: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  };

  /* ── Handlers ───────────────────────────────────────────── */
  const setSkill = (key: SkillKey, val: number) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!selectedId) { showToast('กรุณาเลือกนักกีฬา', 'error'); return; }
    setSaving(true);
    try {
      const hasCatNotes = [form.notesBallControl, form.notesPassing, form.notesDribbling, form.notesShooting, form.notesTactical].some(n => n.trim());
      const serializedNotes = hasCatNotes
        ? JSON.stringify({ general: form.notes, bc: form.notesBallControl, pa: form.notesPassing, dr: form.notesDribbling, sh: form.notesShooting, tq: form.notesTactical })
        : form.notes;
      const payload = {
        ...(editId ? { id: editId } : {}),
        ...form,
        notes: serializedNotes,
        playerId: selectedId,
        assessedAt: new Date().toISOString(),
        assessedBy: form.assessedBy || user.displayName || user.username,
        scoreBallControl: bc, scorePassing: pa,
        scoreDribbling: dr,   scoreShooting: sh,
        scoreTactical: tq,    scoreTotal: total,
      };
      const res = await callGAS('saveSkillAssessment', payload) as { status: string; message: string };
      if (res.status === 'success') {
        showToast(editId ? 'อัพเดทเรียบร้อย' : 'บันทึกผลการประเมินเรียบร้อย', 'success');
        setEditId(null);
        setForm(makeBlankForm());
        loadHistory();
      } else showToast(res.message, 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = (a: SkillAssessment) => {
    setForm(formFromAssessment(a));
    setEditId(a.id);
    setShowHistory(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบการประเมินนี้?')) return;
    await callGAS('deleteSkillAssessment', { id });
    loadHistory();
  };

  const handleReset = () => { setForm(makeBlankForm()); setEditId(null); };

  const latestScore = history[0];
  const prevScore   = history[1];

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Technical Skill Assessment</h2>
          <p className="page-subtitle">ประเมินทักษะฟุตบอล 5 หมวด · Ball Control · Passing · Dribbling · Shooting · Tactical IQ</p>
        </div>
        {athlete && (
          <button className="btn-outline btn-sm" onClick={() => onNavigate('scout', selectedId)}>
            <i className="bi bi-person-badge me-1"/>Scout Report
          </button>
        )}
      </div>

      {/* Athlete selector */}
      <div className="surface" style={{ marginBottom: 20, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>เลือกนักกีฬา</label>
          <select className="form-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {athletes.map(a => (
              <option key={a.PlayerID} value={a.PlayerID}>{a.Name}{a.Nickname ? ` (${a.Nickname})` : ''}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>ผู้ประเมิน</label>
          <input className="form-control" value={form.assessedBy} onChange={e => setForm(f => ({ ...f, assessedBy: e.target.value }))} placeholder={user.displayName || user.username}/>
        </div>
        <div style={{ minWidth: 130 }}>
          <label className="form-label" style={{ marginBottom: 4 }}>ฤดูกาล</label>
          <input className="form-control" value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="2025-26"/>
        </div>
        <button className="btn-outline btn-sm" onClick={() => { setShowHistory(v => !v); loadHistory(); }} style={{ marginTop: 20 }}>
          <i className={`bi bi-${showHistory ? 'x-lg' : 'clock-history'} me-1`}/>
          {showHistory ? 'ซ่อน' : `ประวัติ (${history.length})`}
        </button>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="surface" style={{ marginBottom: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.875rem' }}>
            <i className="bi bi-clock-history me-2" style={{ color: '#38bdf8' }}/>ประวัติการประเมิน
          </div>
          {loading ? <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner-ring"/></div> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 18 }}>วันที่</th>
                    <th>ผู้ประเมิน</th>
                    <th style={{ textAlign: 'center' }}>BC</th>
                    <th style={{ textAlign: 'center' }}>PA</th>
                    <th style={{ textAlign: 'center' }}>DR</th>
                    <th style={{ textAlign: 'center' }}>SH</th>
                    <th style={{ textAlign: 'center' }}>TQ</th>
                    <th style={{ textAlign: 'center', fontWeight: 900 }}>รวม</th>
                    <th style={{ paddingRight: 18 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>ยังไม่มีประวัติการประเมิน</td></tr>
                  )}
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={{ paddingLeft: 18, fontSize: '0.82rem' }}>{new Date(h.assessedAt).toLocaleDateString('th-TH')}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{h.assessedBy || '—'}</td>
                      {[h.scoreBallControl, h.scorePassing, h.scoreDribbling, h.scoreShooting, h.scoreTactical].map((s, i) => (
                        <td key={i} style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: s >= 80 ? '#10b981' : s >= 60 ? '#3b82f6' : s >= 40 ? '#f59e0b' : '#94a3b8' }}>{s || '—'}</span>
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontWeight: 900, fontSize: '1rem', color: h.scoreTotal >= 80 ? '#10b981' : h.scoreTotal >= 60 ? '#3b82f6' : '#f59e0b' }}>
                          {h.scoreTotal || '—'}
                        </span>
                      </td>
                      <td style={{ paddingRight: 18 }}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button className="btn-outline btn-sm" onClick={() => handleEdit(h)}><i className="bi bi-pencil"/></button>
                          <button className="btn-danger btn-sm" onClick={() => handleDelete(h.id)}><i className="bi bi-trash"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Main grid: left form + right scores */}
      <div className="skill-main-grid">

        {/* ── LEFT: Assessment form — all categories at once ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Progress indicator */}
          {(() => {
            const filled = CATEGORIES.reduce((sum, cat) => sum + cat.skills.filter(sk => (form[sk.key as SkillKey] as number) > 0).length, 0);
            const total27 = CATEGORIES.reduce((sum, cat) => sum + cat.skills.length, 0);
            const pct = Math.round(filled / total27 * 100);
            return filled > 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>ความคืบหน้า</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: pct === 100 ? '#10b981' : '#38bdf8' }}>{filled}/{total27} ทักษะ ({pct}%)</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 5, background: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 5, background: pct === 100 ? '#10b981' : '#38bdf8', width: `${pct}%`, transition: 'width 0.4s' }}/>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* All categories */}
          {CATEGORIES.map((cat, ci) => {
            const filledCount = cat.skills.filter(sk => (form[sk.key as SkillKey] as number) > 0).length;
            return (
              <div key={cat.id} className="surface" style={{ borderTop: `3px solid ${cat.color}`, padding: 0, overflow: 'hidden' }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: `${cat.color}0a`, borderBottom: `1px solid ${cat.color}20` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cat.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`bi ${cat.icon}`} style={{ color: cat.color, fontSize: '1rem' }}/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{cat.labelTH}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {filledCount}/{cat.skills.length} ทักษะ · ให้คะแนน 1–5
                    </div>
                  </div>
                  {catScores[ci] > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontSize: '1.5rem', color: cat.color, lineHeight: 1 }}>{catScores[ci]}</div>
                      <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</div>
                    </div>
                  )}
                </div>

                {/* Skills grid */}
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
                  {cat.skills.map(sk => {
                    const val = form[sk.key as SkillKey] as number || 0;
                    const sl  = SCORE_LABELS[val];
                    return (
                      <div key={sk.key} className="skill-item" style={{
                        border: `1.5px solid ${val > 0 ? cat.color + '55' : 'var(--border)'}`,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sk.labelTH}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>{sk.desc}</div>
                        </div>
                        <div className="skill-btn-row">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setSkill(sk.key as SkillKey, val === n ? 0 : n)} style={{
                              width: 30, height: 30, borderRadius: 7, border: '1.5px solid',
                              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.1s',
                              background: val === n ? SCORE_LABELS[n].bg : 'white',
                              borderColor: val === n ? SCORE_LABELS[n].color : '#e2e8f0',
                              color: val === n ? SCORE_LABELS[n].color : '#94a3b8',
                              transform: val === n ? 'scale(1.15)' : 'scale(1)',
                            }}>{n}</button>
                          ))}
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: sl.color, background: sl.bg, padding: '2px 5px', borderRadius: 5, minWidth: 44, textAlign: 'center' }}>
                            {sl.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Category comment */}
                <div style={{ padding: '0 18px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <i className="bi bi-chat-left-text" style={{ color: cat.color, fontSize: '0.72rem' }}/>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ความคิดเห็น {cat.labelTH}</span>
                  </div>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={`ข้อสังเกต / คำแนะนำ ${cat.labelTH}...`}
                    value={form[CAT_NOTE_KEYS[cat.id]] as string || ''}
                    onChange={e => setForm(f => ({ ...f, [CAT_NOTE_KEYS[cat.id]]: e.target.value }))}
                    style={{ fontSize: '0.8rem', resize: 'vertical', borderColor: form[CAT_NOTE_KEYS[cat.id]] ? cat.color + '66' : undefined }}
                  />
                </div>
              </div>
            );
          })}

          {/* Notes + Actions */}
          <div className="surface" style={{ marginTop: 14 }}>
            <label className="form-label">หมายเหตุ / ข้อสังเกต</label>
            <textarea className="form-control" rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="บันทึกข้อสังเกตเพิ่มเติม เช่น เท้าซ้ายอ่อน, First touch ช้าเมื่อเหนื่อย..."
              style={{ resize: 'vertical' }}/>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              {editId && <button className="btn-outline" onClick={handleReset}><i className="bi bi-x-lg me-1"/>ยกเลิกแก้ไข</button>}
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving
                  ? <><span className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }}/> บันทึก...</>
                  : editId
                  ? <><i className="bi bi-check-lg me-1"/>อัพเดทผลการประเมิน</>
                  : <><i className="bi bi-floppy me-1"/>บันทึกผลการประเมิน</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Score panel ── */}
        <div className="skill-score-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Overall score */}
          <div className="surface" style={{ textAlign: 'center', borderTop: '3px solid #38bdf8' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Technical Score</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1, color: total >= 80 ? '#10b981' : total >= 60 ? '#38bdf8' : total >= 40 ? '#f59e0b' : total > 0 ? '#ef4444' : 'var(--text-muted)' }}>
              {total || '—'}
            </div>
            {total > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>คะแนนรวม / 100</div>}

            {/* Trend vs previous */}
            {latestScore && prevScore && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', fontWeight: 700, color: latestScore.scoreTotal >= prevScore.scoreTotal ? '#10b981' : '#ef4444' }}>
                <i className={`bi bi-arrow-${latestScore.scoreTotal >= prevScore.scoreTotal ? 'up' : 'down'}-right me-1`}/>
                {Math.abs(latestScore.scoreTotal - prevScore.scoreTotal)} pts จากครั้งก่อน
              </div>
            )}
          </div>

          {/* Radar chart */}
          {catScores.some(s => s > 0) && (
            <div className="surface" style={{ padding: '16px 12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Skill Radar</div>
              <Radar data={radarData} options={radarOpts}/>
            </div>
          )}

          {/* Category breakdown */}
          <div className="surface" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Category Scores</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATEGORIES.map((cat, i) => (
                <div key={cat.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`bi ${cat.icon}`} style={{ color: cat.color, fontSize: '0.8rem' }}/>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{cat.labelTH}</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: '0.9rem', color: cat.color }}>{catScores[i] || '—'}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, background: cat.color, width: `${catScores[i]}%`, transition: 'width 0.6s ease' }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest score from DB */}
          {latestScore && !editId && (
            <div className="surface" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>ผลล่าสุดที่บันทึก</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                {new Date(latestScore.assessedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                {latestScore.assessedBy && <span> · {latestScore.assessedBy}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { l: 'BC', v: latestScore.scoreBallControl },
                  { l: 'PA', v: latestScore.scorePassing },
                  { l: 'DR', v: latestScore.scoreDribbling },
                  { l: 'SH', v: latestScore.scoreShooting },
                  { l: 'TQ', v: latestScore.scoreTactical },
                ].map(({ l, v }) => (
                  <div key={l} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 700 }}>{l}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 900, color: v >= 70 ? '#10b981' : v >= 50 ? '#38bdf8' : '#f59e0b' }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          {total > 0 && (() => {
            const weakCat = CATEGORIES.reduce((w, c, i) => (catScores[i] < catScores[w] ? i : w), 0);
            const weakScore = catScores[weakCat];
            if (weakScore > 60) return null;
            const recs: Record<string, string[]> = {
              ballControl: ['รับบอลหลายทิศทาง', 'จำกัดจำนวนสัมผัส', 'Wall pass'],
              passing: ['Rondo 4v2', 'One-touch passing', 'Small-sided game'],
              dribbling: ['Cone dribbling', 'Zigzag drill', '1v1 Box drill'],
              shooting: ['Finishing circuit', 'Weak foot shooting', 'First-time finish'],
              tactical: ['Position shadow play', 'Rondo', 'Match analysis video'],
            };
            return (
              <div className="surface" style={{ padding: '14px 16px', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  <i className="bi bi-lightbulb-fill me-1"/>แนะนำการฝึก
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>
                  พัฒนา: {CATEGORIES[weakCat].labelTH}
                </div>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {(recs[CATEGORIES[weakCat].id] || []).map(r => (
                    <li key={r} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 3 }}>{r}</li>
                  ))}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
