'use client';

import { useState, useEffect } from 'react';
import { UserRecord } from '@/lib/types';
import { callGAS } from '@/lib/api';

const PAGE_FEATURES = [
  { id: 'dashboard',   labelTH: 'แดชบอร์ด',           icon: 'bi-grid-1x2',           desc: 'ภาพรวม KPI และสถิติทีม' },
  { id: 'roster',      labelTH: 'รายชื่อนักกีฬา',      icon: 'bi-people',             desc: 'ดูและจัดการรายชื่อ' },
  { id: 'scout',       labelTH: 'Scout Report',          icon: 'bi-person-badge',       desc: 'รายงานรายบุคคล + FC26 Card' },
  { id: 'teamreport',  labelTH: 'Team Report',           icon: 'bi-bar-chart-line',     desc: 'รายงานสถิติทีมรวม' },
  { id: 'compare',     labelTH: 'เปรียบเทียบ',          icon: 'bi-intersect',          desc: 'Radar Chart ตัวต่อตัว' },
  { id: 'lineup',      labelTH: 'Line-Up',               icon: 'bi-diagram-3',          desc: 'จัดทีม Formation' },
  { id: 'ir',          labelTH: 'IDP',                   icon: 'bi-journal-medical',    desc: 'แผนพัฒนารายบุคคล + QR' },
  { id: 'performance', labelTH: 'บันทึกผลทดสอบ',        icon: 'bi-clipboard-data',     desc: 'อัพเดทผลการทดสอบ' },
  { id: 'quicktest',   labelTH: 'Quick Test',            icon: 'bi-lightning',          desc: 'บันทึกเร็ว' },
  { id: 'register',    labelTH: 'ลงทะเบียนนักกีฬา',    icon: 'bi-person-plus',        desc: 'เพิ่มนักกีฬาใหม่' },
  { id: 'training',    labelTH: 'วิดีโอการฝึก',         icon: 'bi-play-btn',           desc: 'คลังวิดีโอฝึกซ้อม' },
];

const ROLE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  admin:    { label: 'Admin',    bg: '#fef3c7', color: '#92400e' },
  club_pro: { label: 'Club Pro', bg: '#ede9fe', color: '#5b21b6' },
  club:     { label: 'Club',     bg: '#eff6ff', color: '#1d4ed8' },
};

type EditForm = { username: string; newPassword: string; role: string; displayName: string };

export default function AdminPage() {
  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [addForm, setAddForm]           = useState({ username:'', password:'', role:'club', displayName:'', clubId:'' });
  const [saving, setSaving]             = useState(false);
  const [addMsg, setAddMsg]             = useState<{type:'success'|'error'; text:string}|null>(null);
  const [editModal, setEditModal]       = useState<EditForm|null>(null);
  const [editSaving, setEditSaving]     = useState(false);
  const [editMsg, setEditMsg]           = useState<{type:'success'|'error'; text:string}|null>(null);

  // Global Club settings
  const [clubPages, setClubPages]       = useState<string[]>([]);
  const [clubSettingsSaved, setClubSettingsSaved] = useState(false);
  const [clubSaving, setClubSaving]     = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try { const d = await callGAS('getUsers') as UserRecord[]; setUsers(Array.isArray(d)?d:[]); }
    finally { setLoadingUsers(false); }
  };

  const loadClubSettings = async () => {
    try {
      const d = await callGAS('getClubSettings') as { pages: string };
      setClubPages(d.pages ? d.pages.split(',').filter(Boolean) : PAGE_FEATURES.map(p=>p.id));
    } catch {
      setClubPages(PAGE_FEATURES.map(p=>p.id));
    }
  };

  useEffect(() => { loadUsers(); loadClubSettings(); }, []);

  const handleSaveClubSettings = async () => {
    setClubSaving(true);
    try {
      await callGAS('saveClubSettings', { pages: clubPages.join(',') });
      setClubSettingsSaved(true);
      setTimeout(() => setClubSettingsSaved(false), 2000);
    } finally { setClubSaving(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.username || !addForm.password) return setAddMsg({ type:'error', text:'Username และ Password จำเป็น' });
    setSaving(true); setAddMsg(null);
    try {
      const res = await callGAS('saveUser', addForm) as { status:string; message:string };
      if (res.status === 'success') {
        setAddMsg({ type:'success', text:res.message });
        setAddForm({ username:'', password:'', role:'club', displayName:'', clubId:'' });
        loadUsers();
      } else setAddMsg({ type:'error', text:res.message });
    } finally { setSaving(false); }
  };

  const openEdit = (u: UserRecord) =>
    setEditModal({ username:u.Username, newPassword:'', role:u.Role||'club', displayName:u.DisplayName||'' });

  const handleEdit = async () => {
    if (!editModal) return;
    setEditSaving(true); setEditMsg(null);
    try {
      const res = await callGAS('updateUser', editModal) as { status:string; message:string };
      if (res.status === 'success') {
        setEditMsg({ type:'success', text:'บันทึกเรียบร้อย' });
        loadUsers();
        setTimeout(() => setEditModal(null), 700);
      } else setEditMsg({ type:'error', text:res.message||'เกิดข้อผิดพลาด' });
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (username: string) => {
    if (!confirm(`ลบบัญชี "${username}" ใช่หรือไม่?`)) return;
    await callGAS('deleteUser', { username });
    loadUsers();
  };

  const togglePage = (id: string) =>
    setClubPages(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev, id]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">จัดการระบบ</h2>
          <p className="page-subtitle">จัดการบัญชีและสิทธิ์การใช้งานสำหรับ Club ทั้งหมด</p>
        </div>
        <button className="btn-outline btn-sm" onClick={loadUsers}><i className="bi bi-arrow-clockwise me-1"/>รีเฟรช</button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          GLOBAL CLUB SETTINGS — applies to ALL Club users at once
      ════════════════════════════════════════════════════════════════ */}
      <div className="surface" style={{ marginBottom:28, border:'2px solid rgba(56,189,248,0.25)', borderRadius:16 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'rgba(56,189,248,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="bi bi-toggles2" style={{ color:'#38bdf8', fontSize:'1.1rem' }}/>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:'1rem' }}>สิทธิ์ฟีเจอร์สำหรับ Club</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>เปิด/ปิดฟีเจอร์ที่นี่จะมีผลกับ <strong>ทุกบัญชี Club</strong> ทันที</div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn-outline btn-sm" onClick={() => setClubPages(PAGE_FEATURES.map(p=>p.id))}>เปิดทั้งหมด</button>
              <button className="btn-outline btn-sm" onClick={() => setClubPages([])}>ปิดทั้งหมด</button>
            </div>
            <button
              className="btn-primary"
              onClick={handleSaveClubSettings}
              disabled={clubSaving}
              style={{ minWidth:110 }}
            >
              {clubSaving
                ? <><span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,margin:0 }}/> บันทึก...</>
                : clubSettingsSaved
                ? <><i className="bi bi-check-lg me-1"/>บันทึกแล้ว</>
                : <><i className="bi bi-floppy me-1"/>บันทึก</>}
            </button>
          </div>
        </div>

        {/* Toggle grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
          {PAGE_FEATURES.map(p => {
            const on = clubPages.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => togglePage(p.id)}
                style={{
                  display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
                  borderRadius:12, cursor:'pointer', transition:'all 0.18s',
                  background: on ? 'rgba(56,189,248,0.08)' : 'var(--bg)',
                  border: `1.5px solid ${on ? 'rgba(56,189,248,0.4)' : 'var(--border)'}`,
                }}
              >
                {/* Toggle switch */}
                <div style={{ position:'relative', width:38, height:22, borderRadius:11, background: on?'#38bdf8':'#cbd5e1', transition:'background 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:3, left: on?18:3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.25)' }}/>
                </div>
                <i className={`bi ${p.icon}`} style={{ color: on?'#38bdf8':'#94a3b8', fontSize:'1rem', flexShrink:0 }}/>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'0.8rem', fontWeight:700, color: on?'var(--text-main)':'var(--text-muted)', lineHeight:1.2 }}>{p.labelTH}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:1 }}>{p.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:14, fontSize:'0.72rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:10, display:'flex', alignItems:'center', gap:6 }}>
          <i className="bi bi-info-circle" style={{ color:'#38bdf8' }}/>
          เปิด {clubPages.length}/{PAGE_FEATURES.length} ฟีเจอร์ · Admin และ Club Pro ไม่ได้รับผลกระทบ — ใช้ได้ทุกฟีเจอร์เสมอ
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          USER ACCOUNTS
      ══════════════════════════════════════════════ */}
      <div className="row g-4">
        {/* Users table */}
        <div className="col-lg-8">
          <div className="surface" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <div className="section-hd" style={{ margin:0, border:'none', padding:0 }}>
                <i className="bi bi-people me-2"/>บัญชีทั้งหมด ({users.length})
              </div>
            </div>
            {loadingUsers ? (
              <div style={{ padding:40, textAlign:'center' }}><div className="spinner-ring"/></div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft:20 }}>Username</th>
                      <th>ชื่อที่แสดง</th>
                      <th>Role</th>
                      <th>Club ID</th>
                      <th>สร้างเมื่อ</th>
                      <th style={{ paddingRight:20 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>ไม่พบบัญชีผู้ใช้</td></tr>
                    )}
                    {users.map(u => {
                      const rc = ROLE_CONFIG[u.Role] || ROLE_CONFIG.club;
                      return (
                        <tr key={u.Username}>
                          <td style={{ paddingLeft:20, fontWeight:700 }}>{u.Username}</td>
                          <td style={{ fontSize:'0.85rem' }}>{u.DisplayName||'—'}</td>
                          <td>
                            <span style={{ background:rc.bg, color:rc.color, padding:'3px 10px', borderRadius:6, fontSize:'0.72rem', fontWeight:800 }}>
                              {rc.label}
                            </span>
                          </td>
                          <td style={{ color:'var(--text-muted)', fontSize:'0.82rem' }}>{u.ClubID||'—'}</td>
                          <td style={{ color:'var(--text-muted)', fontSize:'0.78rem' }}>{u.CreatedAt?.split('T')[0]||'—'}</td>
                          <td style={{ paddingRight:20 }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn-outline btn-sm" onClick={() => openEdit(u)} title="แก้ไข">
                                <i className="bi bi-pencil-square"/>
                              </button>
                              {u.Role !== 'admin' && (
                                <button className="btn-danger btn-sm" onClick={() => handleDelete(u.Username)} title="ลบ">
                                  <i className="bi bi-trash"/>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Add user */}
        <div className="col-lg-4">
          <div className="surface">
            <div className="section-hd"><i className="bi bi-person-plus me-2"/>สร้างบัญชีใหม่</div>
            <form onSubmit={handleAdd}>
              <div className="mb-3">
                <label className="form-label">Username *</label>
                <input className="form-control" value={addForm.username} onChange={e=>setAddForm(f=>({...f,username:e.target.value}))} placeholder="ตัวอักษรและตัวเลขเท่านั้น"/>
              </div>
              <div className="mb-3">
                <label className="form-label">Password *</label>
                <input type="password" className="form-control" value={addForm.password} onChange={e=>setAddForm(f=>({...f,password:e.target.value}))} placeholder="รหัสผ่านชั่วคราว"/>
              </div>
              <div className="mb-3">
                <label className="form-label">ชื่อที่แสดง</label>
                <input className="form-control" value={addForm.displayName} onChange={e=>setAddForm(f=>({...f,displayName:e.target.value}))} placeholder="ชื่อสโมสร หรือชื่อผู้ใช้"/>
              </div>
              <div className="mb-3">
                <label className="form-label">Club ID</label>
                <input className="form-control" value={addForm.clubId} onChange={e=>setAddForm(f=>({...f,clubId:e.target.value}))} placeholder="ใช้กรองนักกีฬาตามสโมสร"/>
              </div>
              <div className="mb-4">
                <label className="form-label">Role</label>
                <select className="form-select" value={addForm.role} onChange={e=>setAddForm(f=>({...f,role:e.target.value}))}>
                  <option value="club">Club — ใช้ตามสิทธิ์ที่ตั้งไว้ด้านบน</option>
                  <option value="club_pro">Club Pro — ใช้ได้ทุกฟีเจอร์</option>
                  <option value="admin">Admin — ทุกฟีเจอร์ + จัดการระบบ</option>
                </select>
              </div>
              {addMsg && (
                <div className="mb-3" style={{ background:addMsg.type==='success'?'#f0fdf4':'#fef2f2', border:`1px solid ${addMsg.type==='success'?'#bbf7d0':'#fecaca'}`, borderRadius:8, padding:'10px 14px', fontSize:'0.875rem', color:addMsg.type==='success'?'#166534':'#991b1b' }}>
                  <i className={`bi bi-${addMsg.type==='success'?'check-circle':'exclamation-triangle'} me-2`}/>{addMsg.text}
                </div>
              )}
              <button type="submit" className="btn-primary w-100" disabled={saving} style={{ justifyContent:'center' }}>
                {saving ? <><span className="spinner-ring" style={{ width:18,height:18,borderWidth:2,margin:0 }}/> กำลังสร้าง...</> : <><i className="bi bi-plus-lg me-1"/>สร้างบัญชี</>}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModal && (
        <div className="modal-overlay open" onClick={e=>e.target===e.currentTarget&&setEditModal(null)}>
          <div className="modal-content" style={{ maxWidth:420 }}>
            <button className="modal-close" onClick={()=>setEditModal(null)}><i className="bi bi-x"/></button>
            <h5 style={{ fontWeight:800, marginBottom:4 }}>แก้ไขบัญชี</h5>
            <p style={{ fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:20 }}>
              <i className="bi bi-person-fill me-1"/><strong>{editModal.username}</strong>
            </p>
            <div className="mb-3">
              <label className="form-label">ชื่อที่แสดง</label>
              <input className="form-control" value={editModal.displayName} onChange={e=>setEditModal(m=>m?{...m,displayName:e.target.value}:null)} placeholder="ชื่อสโมสร หรือชื่อผู้ใช้"/>
            </div>
            <div className="mb-3">
              <label className="form-label">
                เปลี่ยน Password
                <span style={{ color:'var(--text-muted)', fontWeight:400, marginLeft:6 }}>(เว้นว่าง = ไม่เปลี่ยน)</span>
              </label>
              <input type="password" className="form-control" value={editModal.newPassword} onChange={e=>setEditModal(m=>m?{...m,newPassword:e.target.value}:null)} placeholder="รหัสผ่านใหม่..."/>
            </div>
            <div className="mb-4">
              <label className="form-label">Role</label>
              <select className="form-select" value={editModal.role} onChange={e=>setEditModal(m=>m?{...m,role:e.target.value}:null)}>
                <option value="club">Club — ใช้ตามสิทธิ์ที่ตั้งไว้</option>
                <option value="club_pro">Club Pro — ทุกฟีเจอร์</option>
                <option value="admin">Admin — ทุกฟีเจอร์ + จัดการระบบ</option>
              </select>
            </div>
            {editMsg && (
              <div className="mb-3" style={{ background:editMsg.type==='success'?'#f0fdf4':'#fef2f2', border:`1px solid ${editMsg.type==='success'?'#bbf7d0':'#fecaca'}`, borderRadius:8, padding:'10px 14px', fontSize:'0.85rem', color:editMsg.type==='success'?'#166534':'#991b1b' }}>
                <i className={`bi bi-${editMsg.type==='success'?'check-circle':'exclamation-triangle'} me-2`}/>{editMsg.text}
              </div>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn-outline" onClick={()=>setEditModal(null)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleEdit} disabled={editSaving}>
                {editSaving ? <><span className="spinner-ring" style={{ width:16,height:16,borderWidth:2,margin:0 }}/> บันทึก...</> : <><i className="bi bi-check-lg me-1"/>บันทึก</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
