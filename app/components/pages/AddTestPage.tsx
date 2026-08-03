'use client';

import { useState } from 'react';
import { Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { calcYoyoDist, calcVo2, YOYO_MAX_SHUTTLE, YOYO_LEVELS } from '@/lib/devData';

interface Props { athletes: Athlete[]; onSuccess: () => void }

const emptyForm = {
  height: '', weight: '', muscle: '', fat: '',
  speed30: '', cmj: '',
  agiL: '', agiR: '',
  yoyoLevel: '', yoyoShuttle: '',
  pushup: '', situp: '', longJump: '', sitReach: '',
};

export default function AddTestPage({ athletes, onSuccess }: Props) {
  const [playerId, setPlayerId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selected = athletes.find(a => a.PlayerID === playerId);

  const yoyoDist = calcYoyoDist(form.yoyoLevel, form.yoyoShuttle);
  const yoyo     = yoyoDist > 0 ? String(yoyoDist) : '';
  const vo2max   = yoyoDist > 0 ? calcVo2(yoyoDist) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) return setMsg({ type: 'error', text: 'Select an athlete' });
    setSaving(true);
    setMsg(null);
    try {
      const res = await callGAS('saveTest', { playerId, ...form, yoyo, vo2max }) as { status: string; message: string };
      if (res.status === 'success') {
        setMsg({ type: 'success', text: res.message });
        setForm(emptyForm);
        setTimeout(onSuccess, 1200);
      } else {
        setMsg({ type: 'error', text: res.message });
      }
    } catch {
      setMsg({ type: 'error', text: 'Connection error' });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, k, unit, placeholder }: { label: string; k: string; unit?: string; placeholder?: string }) => (
    <div>
      <label className="form-label">{label}{unit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> ({unit})</span>}</label>
      <input
        type="number" step="any" className="form-control"
        value={(form as Record<string, string>)[k]}
        onChange={e => set(k, e.target.value)}
        placeholder={placeholder || '—'}
      />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Add Test</h2>
          <p className="page-subtitle">Record physical test results for an athlete</p>
        </div>
      </div>

      <div className="surface" style={{ maxWidth: 760 }}>
        <form onSubmit={handleSubmit}>
          {/* Athlete select */}
          <div className="mb-4">
            <label className="form-label">Athlete *</label>
            <select className="form-select" value={playerId} onChange={e => setPlayerId(e.target.value)} required>
              <option value="">Select athlete…</option>
              {athletes.map(a => (
                <option key={a.PlayerID} value={a.PlayerID}>{a.Name} — {a.Team || a.Club || a.PlayerID}</option>
              ))}
            </select>
            {selected && (
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <i className="bi bi-person-check me-1" />{selected.Name} | {selected.Position || '—'} | DOB: {selected.DOB || '—'}
              </div>
            )}
          </div>

          {/* Body composition */}
          <div className="ir-section-title mb-3">Body Composition</div>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3"><Field label="Height" k="height" unit="cm" /></div>
            <div className="col-6 col-md-3"><Field label="Weight" k="weight" unit="kg" /></div>
            <div className="col-6 col-md-3"><Field label="Muscle" k="muscle" unit="%" /></div>
            <div className="col-6 col-md-3"><Field label="Fat" k="fat" unit="%" /></div>
          </div>

          {/* Speed & Power */}
          <div className="ir-section-title mb-3">Speed & Power</div>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4"><Field label="Speed 30m" k="speed30" unit="s" placeholder="e.g. 4.20" /></div>
            <div className="col-6 col-md-4"><Field label="CMJ" k="cmj" unit="cm" placeholder="e.g. 38.0" /></div>
            <div className="col-6 col-md-4"><Field label="Long Jump" k="longJump" unit="cm" placeholder="e.g. 210" /></div>
          </div>

          {/* Agility */}
          <div className="ir-section-title mb-3">Agility</div>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-6"><Field label="Agility Left" k="agiL" unit="s" /></div>
            <div className="col-6 col-md-6"><Field label="Agility Right" k="agiR" unit="s" /></div>
          </div>

          {/* Endurance */}
          <div className="ir-section-title mb-3">Endurance (Yo-Yo)</div>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <label className="form-label">Level</label>
              <select className="form-select" value={form.yoyoLevel} onChange={e => { set('yoyoLevel', e.target.value); set('yoyoShuttle', ''); }}>
                <option value="">- เลือก -</option>
                {YOYO_LEVELS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Shuttle</label>
              <select className="form-select" value={form.yoyoShuttle} onChange={e => set('yoyoShuttle', e.target.value)}>
                <option value="">- เลือก -</option>
                {Array.from({length: YOYO_MAX_SHUTTLE[parseInt(form.yoyoLevel)] ?? 8}, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Distance <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (m)</span></label>
              <input type="text" className="form-control" value={yoyo || '—'} readOnly disabled />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">VO₂Max <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> (ml/kg/min)</span></label>
              <input type="text" className="form-control" value={vo2max || '—'} readOnly disabled />
            </div>
          </div>

          {/* Strength */}
          <div className="ir-section-title mb-3">Strength (40s)</div>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4"><Field label="Push-up" k="pushup" unit="reps" /></div>
            <div className="col-6 col-md-4"><Field label="Sit-up" k="situp" unit="reps" /></div>
            <div className="col-6 col-md-4"><Field label="Sit & Reach" k="sitReach" unit="cm" /></div>
          </div>

          {msg && (
            <div className="mb-3" style={{ background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: msg.type === 'success' ? '#166534' : '#991b1b' }}>
              <i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />{msg.text}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving || !playerId}>
            {saving ? <><span className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }} /> Saving…</> : <><i className="bi bi-clipboard-check" /> Save Test</>}
          </button>
        </form>
      </div>
    </div>
  );
}
