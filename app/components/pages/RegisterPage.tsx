'use client';

import { useState, useRef } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';

interface Props { onSuccess: () => void; user: User; }

const POSITIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const TEAMS = ['U12','U13','U14','U15','U16','U17','U18','Senior'];
const PROVINCES = ['กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'];

export default function RegisterPage({ onSuccess, user }: Props) {
  const [form, setForm] = useState({ name: '', nickname: '', dob: '', team: '', position: 'Forward', club: '', province: '', domHand: 'Right', domFoot: 'Right' });
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

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.name) return setMsg({ type: 'error', text: 'กรุณากรอกชื่อ-นามสกุล' });
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        ...form,
        clubId: user.role === 'club' ? user.clubId : '',
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
    } catch {
      setMsg({ type: 'error', text: 'เกิดข้อผิดพลาด' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2 className="page-title">Add New Athlete</h2><p className="page-subtitle">ลงทะเบียนนักกีฬาใหม่</p></div>
      </div>
      <div className="surface" style={{ maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          {/* Photo */}
          <div style={{ width: '100%', marginBottom: 20, background: 'rgba(56,189,248,0.05)', padding: 16, borderRadius: 12, border: '1px dashed var(--accent)' }}>
            <label className="form-label"><i className="bi bi-camera" /> รูปประจำตัว</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
              {photoPreview
                ? <img src={photoPreview} style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12, border: '2px solid var(--border)' }} alt="" />
                : <div className="photo-placeholder" onClick={() => fileRef.current?.click()}><i className="bi bi-camera" /></div>}
              <div>
                <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}><i className="bi bi-upload" /> Upload Photo</button>
                {photoPreview && <button type="button" className="btn-outline btn-sm ms-2" onClick={() => { setPhoto(null); setPhotoPreview(''); }}><i className="bi bi-x" /></button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
            <div style={{ width: '100%' }}>
              <label className="form-label">ชื่อ-นามสกุล *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">ชื่อเล่น</label>
              <input className="form-control" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">วันเกิด</label>
              <input type="date" className="form-control" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">รุ่นอายุ</label>
              <select className="form-select" value={form.team} onChange={e => set('team', e.target.value)}>
                <option value="">- เลือก -</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">ตำแหน่ง</label>
              <select className="form-select" value={form.position} onChange={e => set('position', e.target.value)}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label className="form-label">เท้าถนัด</label>
              <select className="form-select" value={form.domFoot} onChange={e => set('domFoot', e.target.value)}>
                <option>Right</option><option>Left</option><option>Both</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label className="form-label">มือถนัด</label>
              <select className="form-select" value={form.domHand} onChange={e => set('domHand', e.target.value)}>
                <option>Right</option><option>Left</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">สโมสร/โรงเรียน</label>
              <input className="form-control" value={form.club} onChange={e => set('club', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">จังหวัด</label>
              <select className="form-select" value={form.province} onChange={e => set('province', e.target.value)}>
                <option value="">- เลือก -</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {msg && (
            <div className="mb-3" style={{ background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.type === 'success' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: msg.type === 'success' ? '#166534' : '#991b1b' }}>
              <i className={`bi bi-${msg.type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2`} />{msg.text}
            </div>
          )}

          <button type="submit" className="btn-primary w-100" style={{ justifyContent: 'center', padding: 14, fontSize: '1rem' }} disabled={saving}>
            {saving ? <><span className="spinner-ring" style={{ width: 18, height: 18, borderWidth: 2, margin: 0 }} /> Saving...</> : <><i className="bi bi-person-plus" /> Register Athlete</>}
          </button>
        </form>
      </div>
    </div>
  );
}
