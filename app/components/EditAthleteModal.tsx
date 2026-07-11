'use client';

import { useState, useRef } from 'react';
import { Athlete } from '@/lib/types';
import { callGAS } from '@/lib/api';
import { showToast } from '@/lib/toast';

const POSITIONS = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];
const TEAMS = ['U8','U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Senior'];
const SQUADS = ['A', 'B', 'C', 'D'];
const PROVINCES = ['กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน','บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร','สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี'];

interface Props {
  athlete: Athlete;
  onClose: () => void;
  onSaved: () => void;
}

interface EditForm {
  name: string; nickname: string; dob: string; team: string; squad: string;
  position: string; domFoot: string; domHand: string; club: string; province: string;
  height: string; weight: string;
}

export default function EditAthleteModal({ athlete, onClose, onSaved }: Props) {
  const initHeight = String(athlete.Latest?.Height || '');
  const initWeight = String(athlete.Latest?.Weight || '');

  const [form, setForm] = useState<EditForm>({
    name:     athlete.Name     || '',
    nickname: athlete.Nickname || '',
    dob:      athlete.DOB      || '',
    team:     athlete.Team     || '',
    squad:    athlete.Squad    || '',
    position: athlete.Position || '',
    domFoot:  athlete.DomFoot  || 'Right',
    domHand:  athlete.DomHand  || 'Right',
    club:     athlete.Club     || '',
    province: athlete.Province || '',
    height:   initHeight,
    weight:   initWeight,
  });
  const [photo, setPhoto]           = useState<{ base64: string; mime: string } | null>(null);
  const [photoPreview, setPreview]  = useState(athlete.PhotoUrl || '');
  const [photoCleared, setPhotoCleared] = useState(false);
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof EditForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      setPhoto({ base64: result, mime: file.type });
      setPhotoCleared(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.name) { showToast('กรุณากรอกชื่อ', 'error'); return; }
    setSaving(true);
    try {
      const res = await callGAS('updateAthlete', {
        playerId: athlete.PlayerID,
        name: form.name, nickname: form.nickname, dob: form.dob,
        team: form.team, squad: form.squad, domHand: form.domHand, domFoot: form.domFoot,
        position: form.position, club: form.club, province: form.province,
        photoBase64: photo?.base64 || '', photoMimeType: photo?.mime || '',
        clearPhoto: photoCleared && !photo,
      }) as { status: string; message?: string };

      if (res.status !== 'success') {
        showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
        return;
      }

      // Save height/weight only when changed
      const bodyChanged = form.height !== initHeight || form.weight !== initWeight;
      if (bodyChanged && (form.height || form.weight)) {
        const latestId = athlete.Latest?.id;
        if (latestId) {
          // Update existing record — only height/weight, don't touch other test fields
          await callGAS('updateBodyComp', {
            testId: latestId, playerId: athlete.PlayerID,
            height: form.height, weight: form.weight,
          });
        } else {
          // No test record yet → create first one
          await callGAS('saveTest', {
            playerId: athlete.PlayerID,
            height: form.height, weight: form.weight,
          });
        }
      }

      showToast('บันทึกสำเร็จ', 'success');
      setTimeout(() => { onSaved(); onClose(); }, 700);
    } catch { showToast('เกิดข้อผิดพลาด', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,0.78)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '28px 32px', boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h5 style={{ margin: 0, fontWeight: 700 }}><i className="bi bi-pencil-square me-2" style={{ color: '#38bdf8' }} />แก้ไขข้อมูลนักกีฬา</h5>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>{athlete.Name} · {athlete.PlayerID}</div>
          </div>
          <button className="btn-outline btn-sm" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <form onSubmit={handleSave}>
          {/* Photo */}
          <div style={{ marginBottom: 18, background: 'rgba(56,189,248,0.04)', padding: 16, borderRadius: 12, border: '1px dashed rgba(56,189,248,0.35)' }}>
            <div className="form-label" style={{ marginBottom: 10 }}><i className="bi bi-camera me-1" />รูปประจำตัว</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ width: 90, height: 90, borderRadius: 14, border: '2px solid rgba(56,189,248,0.4)', background: 'rgba(56,189,248,0.08)', overflow: 'hidden', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {photoPreview
                  ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <i className="bi bi-person-fill" style={{ fontSize: '2rem', color: 'rgba(56,189,248,0.5)' }} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                  <i className="bi bi-upload me-1" />เปลี่ยนรูป
                </button>
                {photoPreview && (
                  <button type="button" className="btn-outline btn-sm" onClick={() => { setPhoto(null); setPreview(''); setPhotoCleared(true); }}>
                    <i className="bi bi-x me-1" />ลบรูป
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>

          {/* Height / Weight */}
          <div style={{ marginBottom: 16, background: 'rgba(52,211,153,0.04)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="form-label" style={{ marginBottom: 10 }}><i className="bi bi-person-fill me-1" style={{ color: '#34d399' }} />ร่างกาย</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">ส่วนสูง (cm)</label>
                <input type="number" step="0.1" className="form-control" value={form.height} onChange={e => set('height', e.target.value)} placeholder="เช่น 170" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">น้ำหนัก (kg)</label>
                <input type="number" step="0.1" className="form-control" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="เช่น 65" />
              </div>
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ width: '100%' }}>
              <label className="form-label">ชื่อ-นามสกุล *</label>
              <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">ชื่อเล่น</label>
              <input className="form-control" value={form.nickname} onChange={e => set('nickname', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="form-label">วันเกิด</label>
              <input type="date" className="form-control" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">รุ่นอายุ / ทีม</label>
              <select className="form-select" value={form.team} onChange={e => set('team', e.target.value)}>
                <option value="">- เลือก -</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 110px' }}>
              <label className="form-label">ชุด</label>
              <select className="form-select" value={form.squad} onChange={e => set('squad', e.target.value)}>
                <option value="">- ทุกชุด -</option>
                {SQUADS.map(s => <option key={s} value={s}>ชุด {s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label className="form-label">ตำแหน่ง</label>
              <select className="form-select" value={form.position} onChange={e => set('position', e.target.value)}>
                <option value="">- เลือก -</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">มือถนัด</label>
              <select className="form-select" value={form.domHand} onChange={e => set('domHand', e.target.value)}>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="form-label">เท้าถนัด</label>
              <select className="form-select" value={form.domFoot} onChange={e => set('domFoot', e.target.value)}>
                <option value="Right">Right</option>
                <option value="Left">Left</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">สโมสร</label>
              <input className="form-control" value={form.club} onChange={e => set('club', e.target.value)} placeholder="ชื่อสโมสร" />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">จังหวัด</label>
              <select className="form-select" value={form.province} onChange={e => set('province', e.target.value)}>
                <option value="">- เลือกจังหวัด -</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn-outline" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? <><span className="spinner-ring" style={{ width: 14, height: 14, borderWidth: 2, margin: '0 6px 0 0' }} />กำลังบันทึก...</>
                : <><i className="bi bi-check-lg me-1" />บันทึก</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
