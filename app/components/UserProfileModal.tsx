'use client';

import { useState, useRef } from 'react';
import { User } from '@/lib/types';
import { callGAS } from '@/lib/api';

interface Props {
  user: User;
  onClose: () => void;
  onSaved: (updated: Partial<User>) => void;
}

export default function UserProfileModal({ user, onClose, onSaved }: Props) {
  const [displayName, setDisplayName]   = useState(user.displayName || '');
  const [logo, setLogo]                 = useState<{ base64: string; mime: string } | null>(null);
  const [logoPreview, setLogoPreview]   = useState(user.logoUrl || '');
  const [showPw, setShowPw]             = useState(false);
  const [newPw, setNewPw]               = useState('');
  const [confirmPw, setConfirmPw]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setLogoPreview(result);
      setLogo({ base64: result, mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return setMsg({ type: 'error', text: 'กรุณากรอกชื่อที่แสดง' });
    if (showPw && newPw !== confirmPw) return setMsg({ type: 'error', text: 'รหัสผ่านใหม่ไม่ตรงกัน' });
    if (showPw && newPw.length < 6)   return setMsg({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });

    setSaving(true); setMsg(null);
    try {
      const res = await callGAS('updateProfile', {
        username: user.username,
        displayName: displayName.trim(),
        logoBase64: logo?.base64 || '',
        logoMimeType: logo?.mime || '',
      }) as { status: string; logoUrl?: string; message?: string };

      if (res.status !== 'success') {
        setMsg({ type: 'error', text: res.message || 'เกิดข้อผิดพลาด' });
        return;
      }

      if (showPw && newPw) {
        const pwRes = await callGAS('changePassword', {
          username: user.username,
          newPassword: newPw,
        }) as { status: string; message?: string };
        if (pwRes.status !== 'success') {
          setMsg({ type: 'error', text: pwRes.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ' });
          return;
        }
      }

      setMsg({ type: 'success', text: 'บันทึกสำเร็จ!' });
      const newLogoUrl = res.logoUrl || (logo ? logoPreview : user.logoUrl) || '';
      setTimeout(() => { onSaved({ displayName: displayName.trim(), logoUrl: newLogoUrl }); onClose(); }, 700);
    } catch {
      setMsg({ type: 'error', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,18,40,0.8)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', borderRadius:18, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', padding:'28px 32px', boxShadow:'0 24px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.07)' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h5 style={{ margin:0, fontWeight:700 }}><i className="bi bi-person-gear me-2" style={{ color:'#38bdf8' }}/>แก้ไขข้อมูลผู้ใช้</h5>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:3 }}>@{user.username} · {user.role === 'admin' ? 'Admin' : 'Club'}</div>
          </div>
          <button className="btn-outline btn-sm" onClick={onClose}><i className="bi bi-x-lg"/></button>
        </div>

        <form onSubmit={handleSave}>

          {/* Logo upload */}
          <div style={{ marginBottom:22, padding:16, background:'rgba(56,189,248,0.04)', border:'1px dashed rgba(56,189,248,0.3)', borderRadius:14, textAlign:'center' }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)', marginBottom:12, textTransform:'uppercase', letterSpacing:1 }}>
              <i className="bi bi-image me-1"/>โลโก้ทีม / Team Logo
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width:100, height:100, borderRadius:16, border:'2px dashed rgba(56,189,248,0.4)', background:'rgba(56,189,248,0.06)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', cursor:'pointer', overflow:'hidden', transition:'all 0.2s' }}
            >
              {logoPreview
                ? <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain', padding:6 }}/>
                : <i className="bi bi-image-fill" style={{ fontSize:'2.2rem', color:'rgba(56,189,248,0.4)' }}/>}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              <button type="button" className="btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
                <i className="bi bi-upload me-1"/>อัปโหลดโลโก้
              </button>
              {logoPreview && (
                <button type="button" className="btn-outline btn-sm" onClick={() => { setLogo(null); setLogoPreview(''); }}>
                  <i className="bi bi-x me-1"/>ลบโลโก้
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleLogo}/>
            <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:10 }}>โลโก้จะแสดงใน sidebar และในรายงานทุกหน้า</div>
          </div>

          {/* Display name */}
          <div style={{ marginBottom:16 }}>
            <label className="form-label">ชื่อที่แสดง (Display Name)</label>
            <input className="form-control" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ชื่อทีม / ชื่อผู้ใช้" required/>
          </div>

          {/* Password change */}
          <div style={{ marginBottom:16, padding:14, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:12 }}>
            <button type="button" className="btn-outline btn-sm" onClick={() => { setShowPw(v=>!v); setNewPw(''); setConfirmPw(''); }}>
              <i className={`bi bi-${showPw?'chevron-up':'key-fill'} me-1`}/>
              {showPw ? 'ยกเลิก' : 'เปลี่ยนรหัสผ่าน'}
            </button>
            {showPw && (
              <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:12 }}>
                <div>
                  <label className="form-label">รหัสผ่านใหม่</label>
                  <input type="password" className="form-control" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete="new-password"/>
                </div>
                <div>
                  <label className="form-label">ยืนยันรหัสผ่านใหม่</label>
                  <input type="password" className="form-control" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" autoComplete="new-password"/>
                  {newPw && confirmPw && newPw !== confirmPw && (
                    <div style={{ fontSize:'0.72rem', color:'#ef4444', marginTop:4 }}><i className="bi bi-x-circle me-1"/>รหัสผ่านไม่ตรงกัน</div>
                  )}
                  {newPw && confirmPw && newPw === confirmPw && (
                    <div style={{ fontSize:'0.72rem', color:'#10b981', marginTop:4 }}><i className="bi bi-check-circle me-1"/>รหัสผ่านตรงกัน</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {msg && (
            <div className={`alert ${msg.type==='success'?'alert-success':'alert-danger'} mt-3`} style={{ borderRadius:8, fontSize:'0.875rem' }}>
              {msg.type==='success' ? <i className="bi bi-check-circle me-2"/> : <i className="bi bi-exclamation-triangle me-2"/>}
              {msg.text}
            </div>
          )}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
            <button type="button" className="btn-outline" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? <><span className="spinner-ring" style={{ width:14, height:14, borderWidth:2, margin:'0 6px 0 0' }}/>กำลังบันทึก...</>
                : <><i className="bi bi-check-lg me-1"/>บันทึก</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
