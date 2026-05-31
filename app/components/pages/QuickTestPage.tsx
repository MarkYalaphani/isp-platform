'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { calcYoyoDist, calcVo2 } from '@/lib/devData';
import { getScorePoint, SCORE_COLORS } from '@/lib/score';
import AthleteSearchSelect from '../AthleteSearchSelect';

interface Props { athletes: Athlete[]; onSuccess: () => void; }

type FormData = Record<string, string>;

const STEPS = [
  { id: 'athlete', title: 'เลือกนักกีฬา', icon: 'bi-person-fill' },
  { id: 'body',    title: 'Body Composition', icon: 'bi-person-fill' },
  { id: 'speed',   title: 'Speed & Power', icon: 'bi-lightning-charge-fill' },
  { id: 'agility', title: 'Agility', icon: 'bi-arrow-repeat' },
  { id: 'yoyo',    title: 'Yo-Yo Endurance', icon: 'bi-heart-pulse-fill' },
  { id: 'strength',title: 'Strength & Flex', icon: 'bi-activity' },
  { id: 'review',  title: 'ตรวจสอบ & บันทึก', icon: 'bi-check-circle-fill' },
];

export default function QuickTestPage({ athletes, onSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ playerId: '', height: '', weight: '', fat: '', muscle: '', speed30: '', cmj: '', agiL: '', agiR: '', yoyoLevel: '', yoyoShuttle: '', situp: '', longJump: '', pushup: '', sitReach: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const athlete = athletes.find(a => a.PlayerID === form.playerId);
  const dob = athlete?.DOB || '';

  const yoyoDist = calcYoyoDist(form.yoyoLevel, form.yoyoShuttle);
  const yoyo     = yoyoDist > 0 ? String(yoyoDist) : '';
  const vo2      = yoyoDist > 0 ? calcVo2(yoyoDist) : '';
  const agiTotal = form.agiL && form.agiR ? (parseFloat(form.agiL) + parseFloat(form.agiR)).toFixed(2) : '';
  const bmi      = form.height && form.weight ? (parseFloat(form.weight) / Math.pow(parseFloat(form.height) / 100, 2)).toFixed(1) : '';
  const pp       = form.cmj && form.weight ? Math.max(0, Math.round(60.7 * parseFloat(form.cmj) + 45.3 * parseFloat(form.weight) - 2055)) : 0;

  const pos = athlete?.Position || '';
  const liveScore = (key: string, val: string) => val ? getScorePoint(key, val, dob, pos) : 0;
  const allScores = {
    speed30:  liveScore('speed30',  form.speed30),
    cmj:      liveScore('cmj',      form.cmj),
    agility:  liveScore('agility',  agiTotal),
    situp:    liveScore('situp',    form.situp),
    longjump: liveScore('longjump', form.longJump),
    yoyo:     liveScore('yoyo',     yoyo),
    pushup:   liveScore('pushup',   form.pushup),
    sitreach: liveScore('sitreach', form.sitReach),
  };
  const validScores = Object.values(allScores).filter(s => s > 0);
  const estRating = validScores.length ? Math.round(validScores.reduce((a,b) => a+b,0) / (validScores.length * 5) * 100) : 0;

  const canNext = () => {
    if (step === 0) return !!form.playerId;
    return true;
  };

  const handleSubmit = async () => {
    if (!form.playerId) return;
    setSaving(true);
    try {
      await callGAS('saveTest', {
        playerId: form.playerId,
        height: form.height, weight: form.weight, fat: form.fat, muscle: form.muscle,
        cmj: form.cmj, speed30: form.speed30,
        agiL: form.agiL, agiR: form.agiR,
        yoyoLevel: form.yoyoLevel, yoyoShuttle: form.yoyoShuttle,
        yoyo, vo2max: vo2,
        situp: form.situp, longJump: form.longJump,
        pushup: form.pushup, sitReach: form.sitReach,
      });
      setDone(true);
      setTimeout(() => { onSuccess(); setDone(false); setStep(0); setForm(f => ({ ...f, playerId: '' })); }, 1500);
    } catch { /* show nothing */ }
    finally { setSaving(false); }
  };

  const inputCard = (label: string, key: string, opts?: { type?: string; step?: string; children?: React.ReactNode; readonly?: boolean; value?: string; color?: string }) => (
    <div style={{ flex: '1 1 140px' }}>
      <label className="form-label">{label}</label>
      {opts?.children || (
        opts?.readonly
          ? <div style={{ background: opts.color ? `${opts.color}15` : '#f0f7ff', border: `1px solid ${opts.color ? opts.color + '40' : '#bae6fd'}`, borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: opts.color || '#0369a1', fontSize: '1rem' }}>
              {opts.value || '—'}
            </div>
          : <input type={opts?.type || 'number'} step={opts?.step || '0.1'} className="form-control" value={form[key]} onChange={e => set(key, e.target.value)} />
      )}
    </div>
  );

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4', border: '3px solid #22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <i className="bi bi-check-lg" style={{ fontSize: '2.5rem', color: '#22c55e' }} />
      </div>
      <h3 style={{ fontWeight: 800, marginBottom: 8 }}>บันทึกสำเร็จ!</h3>
      <p style={{ color: 'var(--text-muted)' }}>ข้อมูล {athlete?.Name} ถูกบันทึกแล้ว</p>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Quick Test Entry</h2><p className="page-subtitle">บันทึกผลการทดสอบแบบ step-by-step</p></div>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 14, left: '7%', right: '7%', height: 2, background: '#e2e8f0', zIndex: 0 }}>
            <div style={{ height: '100%', width: `${(step / (STEPS.length - 1)) * 100}%`, background: '#38bdf8', transition: 'width 0.4s' }} />
          </div>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div onClick={() => i < step && setStep(i)} style={{ width: 28, height: 28, borderRadius: '50%', background: i < step ? '#38bdf8' : i === step ? '#0f172a' : '#e2e8f0', border: i === step ? '3px solid #38bdf8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: i < step ? 'pointer' : 'default', transition: 'all 0.3s' }}>
                {i < step ? <i className="bi bi-check-lg" style={{ color: 'white', fontSize: '0.75rem' }} /> : <span style={{ fontSize: '0.65rem', fontWeight: 800, color: i === step ? 'white' : '#94a3b8' }}>{i + 1}</span>}
              </div>
              <span style={{ fontSize: '0.6rem', marginTop: 5, color: i === step ? '#0f172a' : '#94a3b8', fontWeight: i === step ? 700 : 400, textAlign: 'center', maxWidth: 60 }}>{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Athlete name banner */}
      {athlete && (
        <div style={{ background: 'linear-gradient(90deg,#0f172a,#1e293b)', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <i className="bi bi-person-fill" style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
          <div>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '1rem' }}>{athlete.Name}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{athlete.Team || '—'} · {athlete.Position || '—'}</div>
          </div>
          {estRating > 0 && <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>{estRating}</div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Est. Rating</div>
          </div>}
        </div>
      )}

      <div className="surface">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${STEPS[step].icon}`} style={{ color: '#38bdf8', fontSize: '1rem' }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{STEPS[step].title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ขั้นที่ {step + 1} จาก {STEPS.length}</div>
          </div>
        </div>

        {/* STEP 0: Select athlete */}
        {step === 0 && (
          <div>
            <label className="form-label">เลือกนักกีฬา *</label>
            <AthleteSearchSelect athletes={athletes} value={form.playerId} onChange={id => set('playerId', id)} />
            {form.playerId && athlete && (
              <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{athlete.Name}</div>
                <div style={{ fontSize: '0.82rem', color: '#166534' }}>Last Rating: {athlete.Latest?.Rating || 'N/A'} · Tests done: {athlete.History?.length || 0}</div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Body */}
        {step === 1 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {inputCard('Height (cm)', 'height')}
          {inputCard('Weight (kg)', 'weight')}
          {inputCard('Body Fat (%)', 'fat')}
          {inputCard('Muscle (%)', 'muscle')}
          {inputCard('BMI (auto)', 'bmi', { readonly: true, value: bmi || '—', color: '#7c3aed' })}
        </div>}

        {/* STEP 2: Speed & Power */}
        {step === 2 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {inputCard('Speed 30m (s)', 'speed30', { step: '0.01' })}
          {inputCard('CMJ (cm)', 'cmj')}
          {inputCard('Peak Power (auto)', 'pp', { readonly: true, value: pp > 0 ? `${pp.toLocaleString()} W` : '—', color: '#0369a1' })}
          {form.speed30 && <ScorePill label="Speed Score" score={allScores.speed30} />}
          {form.cmj && <ScorePill label="CMJ Score" score={allScores.cmj} />}
        </div>}

        {/* STEP 3: Agility */}
        {step === 3 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {inputCard('หมุนซ้าย (s)', 'agiL', { step: '0.01' })}
          {inputCard('หมุนขวา (s)', 'agiR', { step: '0.01' })}
          {inputCard('รวม (auto)', 'agiT', { readonly: true, value: agiTotal || '—', color: '#7c3aed' })}
          {agiTotal && <ScorePill label="Agility Score" score={allScores.agility} />}
        </div>}

        {/* STEP 4: Yo-Yo */}
        {step === 4 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ flex: '1 1 140px' }}>
            <label className="form-label">Level</label>
            <select className="form-select" value={form.yoyoLevel} onChange={e => set('yoyoLevel', e.target.value)}>
              <option value="">- เลือก -</option>
              {[5,9,11,12,13,14,15,16,17,18,19,20,21,22,23].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="form-label">Shuttle</label>
            <select className="form-select" value={form.yoyoShuttle} onChange={e => set('yoyoShuttle', e.target.value)}>
              <option value="">- เลือก -</option>
              {[1,2,3,4,5,6,7,8].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {inputCard('Distance (m)', 'yd', { readonly: true, value: yoyo || '—', color: '#dc2626' })}
          {inputCard('VO₂ Max', 'v2', { readonly: true, value: vo2 || '—', color: '#dc2626' })}
          {yoyo && <ScorePill label="Yo-Yo Score" score={allScores.yoyo} />}
        </div>}

        {/* STEP 5: Strength */}
        {step === 5 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {inputCard('Sit-up (รอบ/40s)', 'situp', { step: '1' })}
          {inputCard('Long Jump (cm)', 'longJump')}
          {inputCard('Push-up (รอบ/40s)', 'pushup', { step: '1' })}
          {inputCard('Sit & Reach (cm)', 'sitReach')}
        </div>}

        {/* STEP 6: Review */}
        {step === 6 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'นักกีฬา',     val: athlete?.Name || '—' },
                { label: 'Height/Weight', val: form.height && form.weight ? `${form.height}cm / ${form.weight}kg` : '—' },
                { label: 'BMI',          val: bmi || '—' },
                { label: 'Speed 30m',    val: form.speed30 ? `${form.speed30}s` : '—' },
                { label: 'CMJ',          val: form.cmj ? `${form.cmj}cm` : '—' },
                { label: 'Agility',      val: agiTotal ? `${agiTotal}s` : '—' },
                { label: 'Yo-Yo',        val: yoyo ? `${yoyo}m` : '—' },
                { label: 'VO₂ Max',      val: vo2 || '—' },
                { label: 'Sit-up',       val: form.situp ? `${form.situp} reps` : '—' },
                { label: 'Long Jump',    val: form.longJump ? `${form.longJump}cm` : '—' },
                { label: 'Push-up',      val: form.pushup ? `${form.pushup} reps` : '—' },
                { label: 'Sit & Reach',  val: form.sitReach ? `${form.sitReach}cm` : '—' },
              ].map(x => (
                <div key={x.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{x.label}</div>
                  <div style={{ fontWeight: 700, marginTop: 3, color: x.val === '—' ? '#cbd5e1' : '#0f172a' }}>{x.val}</div>
                </div>
              ))}
            </div>
            {estRating > 0 && (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, color: estRating >= 60 ? '#4ade80' : estRating >= 40 ? '#facc15' : '#f87171', lineHeight: 1 }}>{estRating}</div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Est. Rating</div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(allScores).filter(([,s]) => s > 0).map(([k, s]) => {
                    const col = SCORE_COLORS[s];
                    return <span key={k} style={{ background: col.bg, color: col.color, borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700 }}>{k} {s}/5</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="btn-outline" onClick={() => setStep(s => s - 1)} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
          <i className="bi bi-arrow-left me-1" />ย้อนกลับ
        </button>
        {step < STEPS.length - 1
          ? <button className="btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()} style={{ minWidth: 140, justifyContent: 'center' }}>
              ถัดไป <i className="bi bi-arrow-right ms-1" />
            </button>
          : <button className="btn-primary" onClick={handleSubmit} disabled={saving || !form.playerId} style={{ minWidth: 160, justifyContent: 'center', background: '#0f172a' }}>
              {saving ? <><span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> กำลังบันทึก…</> : <><i className="bi bi-cloud-arrow-up me-1" />บันทึกผลการทดสอบ</>}
            </button>}
      </div>
    </div>
  );
}

function ScorePill({ label, score }: { label: string; score: number }) {
  if (!score) return null;
  const col = SCORE_COLORS[score];
  return (
    <div style={{ flex: '1 1 140px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <label className="form-label" style={{ opacity: 0 }}>.</label>
      <div style={{ background: col.bg, color: col.color, borderRadius: 8, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, gap: 6 }}>
        <span style={{ fontSize: '1.1rem' }}>{score}/5</span>
        <span style={{ fontSize: '0.7rem' }}>{col.label}</span>
      </div>
    </div>
  );
}
