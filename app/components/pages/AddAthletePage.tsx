'use client';

import { useState, useRef } from 'react';
import { callGAS } from '@/lib/api';

interface Props { onSuccess: () => void }

const POSITIONS = ['FWD', 'MID', 'DEF', 'GK', 'FWD/MID', 'MID/DEF'];
const TEAMS = ['U10', 'U12', 'U14', 'U15', 'U17', 'U19', 'U21', 'Senior'];

export default function AddAthletePage({ onSuccess }: Props) {
  const [form, setForm] = useState({
    name: '', nickname: '', dob: '', team: '', position: '',
    club: '', province: '', domHand: 'R', domFoot: 'R', clubId: '',
  });
  const [photo, setPhoto] = useState<{ base64: string; mime: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPhotoPreview(result);
      setPhoto({ base64: result, mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return setMsg({ type: 'error', text: 'Name is required' });
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        photoBase64: photo?.base64 || '',
        photoMimeType: photo?.mime || '',
      };
      const res = await callGAS('saveAthlete', payload) as { status: string; message: string };
      if (res.status === 'success') {
        setMsg({ type: 'success', text: res.message });
        setTimeout(onSuccess, 1200);
      } else {
        setMsg({ type: 'error', text: res.message });
      }
    } catch (err) {
      if ((err as Error).message !== 'SESSION_EXPIRED') {
        setMsg({ type: 'error', text: 'Connection error — กรุณาลองใหม่' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Add Athlete</h2>
          <p className="page-subtitle">Register a new athlete profile</p>
        </div>
      </div>

      <div className="surface" style={{ maxWidth: 700 }}>
        <form onSubmit={handleSubmit}>
          {/* Photo */}
          <div className="mb-4">
            <label className="form-label">Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {photoPreview
                ? <img src={photoPreview} alt="Preview" className="photo-preview" />
                : <div className="photo-placeholder" onClick={() => fileRef.current?.click()}><i className="bi bi-camera" /></div>}
              <div>
                <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                  <i className="bi bi-upload" /> Upload Photo
                </button>
                {photoPreview && (
                  <button type="button" className="btn-outline btn-sm ms-2" onClick={() => { setPhoto(null); setPhotoPreview(''); }}>
                    <i className="bi bi-x" /> Remove
                  </button>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>JPG, PNG, max 5MB</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Athlete full name" required />
            </div>
            <div className="col-md-6">
              <label className="form-label">Nickname</label>
              <input className="form-control" value={form.nickname} onChange={e => set('nickname', e.target.value)} placeholder="Nickname or short name" />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Date of Birth</label>
              <input type="date" className="form-control" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Position</label>
              <select className="form-select" value={form.position} onChange={e => set('position', e.target.value)}>
                <option value="">Select position</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Team</label>
              <select className="form-select" value={form.team} onChange={e => set('team', e.target.value)}>
                <option value="">Select team</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Club</label>
              <input className="form-control" value={form.club} onChange={e => set('club', e.target.value)} placeholder="Club name" />
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label">Province</label>
              <input className="form-control" value={form.province} onChange={e => set('province', e.target.value)} placeholder="Province or city" />
            </div>
            <div className="col-md-3">
              <label className="form-label">Dom. Hand</label>
              <select className="form-select" value={form.domHand} onChange={e => set('domHand', e.target.value)}>
                <option value="R">Right</option>
                <option value="L">Left</option>
                <option value="A">Ambidextrous</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Dom. Foot</label>
              <select className="form-select" value={form.domFoot} onChange={e => set('domFoot', e.target.value)}>
                <option value="R">Right</option>
                <option value="L">Left</option>
                <option value="A">Both</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Club ID (optional)</label>
            <input className="form-control" value={form.clubId} onChange={e => set('clubId', e.target.value)} placeholder="Matches the ClubID assigned in Admin" />
          </div>

          {msg && (
            <div className={`mb-3`} style={{ background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: msg.type === 'success' ? '#166534' : '#991b1b' }}>
              <i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />{msg.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><span className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }} /> Saving…</> : <><i className="bi bi-check-lg" /> Save Athlete</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
