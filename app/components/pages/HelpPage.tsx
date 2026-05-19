'use client';

import { useState } from 'react';
import { Page } from '@/lib/types';

interface Props { onNavigate: (page: Page) => void; }

interface Section {
  id: string;
  icon: string;
  color: string;
  title: string;
  titleTH: string;
  steps: { title: string; desc: string; tip?: string; roles?: string[] }[];
  page?: Page;
  roles?: string[];
}

const SECTIONS: Section[] = [
  {
    id: 'start', icon: 'bi-play-circle-fill', color: '#38bdf8',
    title: 'เริ่มต้นใช้งาน', titleTH: 'Getting Started',
    steps: [
      { title: 'เข้าสู่ระบบ', desc: 'ใช้ Username และ Password ที่ได้รับจากผู้ดูแลระบบ กด "เข้าสู่ระบบ" เพื่อเริ่มใช้งาน' },
      { title: 'หน้า Home', desc: 'หน้าแรกแสดงสถิติทีมแบบ Live — จำนวนนักกีฬา, ทีม, ครั้งทดสอบ และ Rating เฉลี่ย พร้อมลิงก์ไปทุกฟีเจอร์' },
      { title: 'การนำทาง', desc: 'บนมือถือ: กดปุ่มเมนู (☰) ที่มุมขวาบน หรือใช้แถบล่าง (Bottom Nav) เพื่อเปลี่ยนหน้า บน PC: ใช้ Sidebar ด้านซ้าย', tip: 'แถบล่างบนมือถือมี: Home, Roster, Dashboard, Scout, เมนูเพิ่มเติม' },
      { title: 'แก้ไขโปรไฟล์', desc: 'กดที่ชื่อผู้ใช้หรือไอคอน ⚙️ ใน Sidebar เพื่อเปลี่ยนชื่อ, รหัสผ่าน หรืออัปโหลดโลโก้ทีม' },
    ],
  },
  {
    id: 'athlete', icon: 'bi-person-plus-fill', color: '#34d399',
    title: 'เพิ่มและจัดการนักกีฬา', titleTH: 'Athletes',
    page: 'register',
    steps: [
      { title: 'เพิ่มนักกีฬาใหม่', desc: 'ไปที่เมนู "Add Athlete" กรอกชื่อ-นามสกุล, วันเกิด, ตำแหน่ง, ทีม แล้วกด "บันทึก"', tip: 'ต้องกรอกชื่อ-นามสกุลอย่างน้อย ข้อมูลอื่นเพิ่มทีหลังได้' },
      { title: 'Roster — ดูรายชื่อทั้งหมด', desc: 'เมนู "Roster" แสดงนักกีฬาทั้งหมด มีระบบค้นหา กรองทีม/ตำแหน่ง และเรียงลำดับตามคอลัมน์ต่างๆ' },
      { title: 'กดที่ชื่อนักกีฬา', desc: 'กดที่ชื่อใน Roster เพื่อเปิด Scout Report ของนักกีฬาคนนั้นทันที' },
      { title: 'แก้ไขข้อมูลนักกีฬา', desc: 'ใน Scout Report กด "แก้ไขข้อมูล" เพื่อเปลี่ยนชื่อ, ตำแหน่ง, รูปภาพ และข้อมูลส่วนตัวอื่นๆ' },
    ],
  },
  {
    id: 'test', icon: 'bi-lightning-fill', color: '#f59e0b',
    title: 'บันทึกผลทดสอบ', titleTH: 'Physical Test',
    page: 'quicktest',
    steps: [
      { title: 'Quick Test (แนะนำ)', desc: 'เมนู "Quick Test" เหมาะสำหรับบันทึกผลระหว่างการทดสอบจริง — เลือกนักกีฬา → กรอกผลทีละขั้น → ระบบคำนวณคะแนนให้อัตโนมัติ' },
      { title: 'Update Results (กรอกทีละคน)', desc: 'เมนู "Update Results" สำหรับกรอกผลทีละคน หรือนำเข้า CSV ทั้งทีมพร้อมกัน' },
      { title: 'ตัวชี้วัดทั้ง 8 รายการ', desc: 'Speed 30m · CMJ · Agility · Sit-up · Long Jump · Yo-Yo · Push-up · Sit & Reach' },
      { title: 'คะแนนอัตโนมัติ', desc: 'ระบบแปลงผลดิบเป็นคะแนน 1-5 ตามช่วงอายุ (U13/U15/U17/U20) โดยอัตโนมัติ และคำนวณ Rating รวม 0-100', tip: 'Rating สูงกว่า 80 = ยอดเยี่ยม, 60-79 = ดี, 40-59 = ปานกลาง, ต่ำกว่า 40 = ต้องพัฒนา' },
    ],
  },
  {
    id: 'scout', icon: 'bi-person-badge-fill', color: '#818cf8',
    title: 'Scout Report', titleTH: 'รายงานรายบุคคล',
    page: 'scout',
    steps: [
      { title: 'เปิด Scout Report', desc: 'เมนู "Scout Report" → เลือกชื่อนักกีฬา จากนั้นระบบโหลดข้อมูลทั้งหมด' },
      { title: 'FC26 Card', desc: 'การ์ดผู้เล่นสไตล์ FIFA แสดง Rating, สถิติ 6 ด้าน และรูปภาพนักกีฬา กดที่รูปเพื่ออัปโหลดรูปใหม่' },
      { title: 'ประวัติพัฒนาการ', desc: 'กราฟแสดงพัฒนาการตามเวลา กรองดูได้ 3 เดือน / 6 เดือน / 1 ปี / ทั้งหมด' },
      { title: 'พิมพ์/ส่งออก PDF', desc: 'กดปุ่ม "Print" มุมขวาบน แล้วเลือก "Save as PDF" ในหน้าต่าง Print ได้เลย', tip: 'PDF จะรวมทุกส่วน: Card, ผลทดสอบ, Skill, IDP, Attendance, Wellness' },
      { title: 'ดาวน์โหลด FC26 Card', desc: 'กดปุ่ม "ดาวน์โหลดการ์ด" เพื่อบันทึกเป็นรูปภาพ แชร์ได้ทันที' },
    ],
  },
  {
    id: 'skill', icon: 'bi-bullseye', color: '#f59e0b',
    title: 'Skill Assessment', titleTH: 'ประเมินทักษะฟุตบอล',
    page: 'skill',
    steps: [
      { title: 'เข้าหน้า Skill Assessment', desc: 'เลือกนักกีฬาจาก dropdown ด้านบน จากนั้นระบบโหลดประวัติการประเมินที่ผ่านมา' },
      { title: '27 ทักษะ ใน 5 หมวด', desc: 'Ball Control · Passing · Dribbling · Shooting · Tactical IQ — ให้คะแนน 1-5 ดาวต่อทักษะ' },
      { title: 'บันทึกการประเมิน', desc: 'ให้คะแนนครบแล้วกด "บันทึก" ระบบบันทึก Session พร้อมวันที่และชื่อโค้ชอัตโนมัติ', tip: 'ไม่ต้องกรอกครบทุกทักษะ — กรอกเฉพาะที่ประเมินได้วันนั้นก็ได้' },
      { title: 'ดูประวัติ', desc: 'เลื่อนลงดูประวัติการประเมินเก่า กดที่ Session เพื่อโหลดมาแก้ไข' },
    ],
  },
  {
    id: 'idp', icon: 'bi-clipboard2-check-fill', color: '#a78bfa',
    title: 'IDP — แผนพัฒนารายบุคคล', titleTH: 'Individual Development Plan',
    page: 'ir',
    steps: [
      { title: 'เลือกนักกีฬา', desc: 'เมนู "IDP" → เลือกนักกีฬาจาก dropdown — ระบบโหลดประวัติ IDP และแสดง Radar Chart สรุป' },
      { title: '8 หมวดประเมิน', desc: '① ข้อมูลทั่วไป ② สรุปคะแนน ③ พฤติกรรม ④ วิถีชีวิต ⑤ เทคนิค ⑥ บาดเจ็บ ⑦ ความเห็น ⑧ แผนพัฒนา' },
      { title: 'QR Self-Fill', desc: 'กด "QR Code" เพื่อให้นักกีฬากรอกข้อมูลด้วยตัวเองผ่านมือถือ — ไม่ต้องติดตั้งแอป', tip: 'QR code ใช้ได้ครั้งละ 1 Session ไม่หมดอายุ สามารถแชร์ผ่าน LINE ได้เลย' },
      { title: 'บันทึกแผนพัฒนา', desc: 'กรอกเป้าหมายระยะสั้น/ยาว, แผนของโค้ช และความฝันของนักกีฬา แล้วกด "บันทึก IDP"' },
    ],
  },
  {
    id: 'attendance', icon: 'bi-check2-square', color: '#4ade80',
    title: 'Attendance — เช็คชื่อซ้อม', titleTH: 'Attendance Tracking',
    page: 'attendance',
    steps: [
      { title: 'สร้าง Session ซ้อม', desc: 'เมนู "Attendance" → ตั้งวันที่, ชื่อ Session (เช่น "ซ้อมเช้า"), ประเภท (ซ้อม/แข่ง/กายภาพ)' },
      { title: 'เช็คชื่อรายคน', desc: 'กดปุ่มสีต่างๆ หน้าชื่อนักกีฬา: 🟢 มา · 🔴 ขาด · 🟡 สาย · 🔵 ลา', tip: 'กดปุ่ม "มาทุกคน" เพื่อ mark ทั้งทีมก่อน แล้วแก้เฉพาะคนที่ขาด/สาย' },
      { title: 'บันทึก', desc: 'กด "บันทึก" มุมขวาบน ระบบบันทึกทุกคนพร้อมกัน' },
      { title: 'สถิติ Attendance', desc: 'เลื่อนลงดูกราฟสถิติการมา/ขาด และอัตราการมาซ้อมต่อนักกีฬา' },
    ],
  },
  {
    id: 'wellness', icon: 'bi-heart-pulse-fill', color: '#f472b6',
    title: 'Wellness & Training Load', titleTH: 'สภาพก่อนซ้อม + ความหนัก',
    page: 'wellness',
    steps: [
      { title: 'Wellness ก่อนซ้อม', desc: 'เมนู "Wellness & Load" แท็บแรก — ให้นักกีฬาให้คะแนน 5 ด้าน: ความสดชื่น · การนอน · ปวดเมื่อย · เครียด · อารมณ์ (1-5)', tip: 'ทำก่อนซ้อมทุกวัน ใช้เวลาไม่ถึง 1 นาที กดเลขที่ต้องการในแต่ละคอลัมน์' },
      { title: 'Training Load (RPE)', desc: 'แท็บ "Training Load" — หลังซ้อมเสร็จ กดตัวเลข RPE 1-10 ต่อนักกีฬา RPE × เวลา (นาที) = Training Load อัตโนมัติ' },
      { title: 'RPE คืออะไร', desc: '1-2 = เบามาก · 3-4 = เบา · 5-6 = ปานกลาง · 7-8 = หนัก · 9-10 = หนักสุด' },
      { title: 'ประวัติรายบุคคล', desc: 'แท็บ "ประวัติรายบุคคล" เลือกนักกีฬาเพื่อดูกราฟ Wellness และ Load ย้อนหลัง' },
    ],
  },
  {
    id: 'dashboard', icon: 'bi-grid-1x2-fill', color: '#38bdf8',
    title: 'Dashboard', titleTH: 'ภาพรวมทีม',
    page: 'dashboard',
    steps: [
      { title: 'Overview', desc: '8 KPI หลัก, กราฟกระจาย Rating, สัดส่วนตามตำแหน่งและอายุ, League Leaders' },
      { title: 'Rankings', desc: 'ตารางจัดอันดับนักกีฬาทุกคน กรองทีม เรียงตามเมตริกต่างๆ' },
      { title: 'Heatmap', desc: 'ตารางสีแสดงระดับของนักกีฬาแต่ละคนในแต่ละด้าน มองเห็นจุดแข็ง/อ่อนของทีมในมุมกว้าง' },
      { title: 'H2H เปรียบเทียบ', desc: 'เลือก 2 คน กดปุ่มเมนู → เปรียบเทียบ Radar Chart และค่าทุกด้านแบบ Side-by-Side' },
    ],
  },
  {
    id: 'lineup', icon: 'bi-diagram-3-fill', color: '#60a5fa',
    title: 'Line-Up Builder', titleTH: 'จัดทีม Formation',
    page: 'lineup',
    steps: [
      { title: 'เลือก Formation', desc: 'เมนู "Line Up" → เลือก Formation (4-3-3, 4-4-2, 3-5-2 ฯลฯ) ระบบแสดงสนามอัตโนมัติ' },
      { title: 'ลากนักกีฬาลงสนาม', desc: 'เลือกนักกีฬาจากรายชื่อทางขวา แล้วลากวางในตำแหน่งที่ต้องการบนสนาม', tip: 'กดที่ตำแหน่งบนสนามเพื่อเลือกนักกีฬาจากรายชื่อแทนการลากก็ได้' },
      { title: 'พิมพ์/ส่งออก', desc: 'กด "Print" เพื่อบันทึกเป็น PDF หรือรูปภาพ ส่งให้ทีมผ่าน LINE ได้ทันที' },
    ],
  },
  {
    id: 'compare', icon: 'bi-intersect', color: '#fb923c',
    title: 'Compare — เปรียบเทียบ', titleTH: 'Head-to-Head',
    page: 'compare',
    steps: [
      { title: 'เลือก 2 คน', desc: 'เมนู "Compare" → เลือกนักกีฬาคนที่ 1 (ฝั่งน้ำเงิน) และคนที่ 2 (ฝั่งชมพู)' },
      { title: 'Radar Chart', desc: 'กราฟ Radar แสดงเปรียบเทียบ 8 ด้านพร้อมกัน มองเห็นจุดแข็ง/อ่อนของแต่ละคนชัดเจน' },
      { title: 'ตารางเปรียบเทียบ', desc: 'ด้านล่างแสดงค่าทุกด้านเคียงกัน พร้อมไฮไลท์ว่าใครชนะในแต่ละด้าน' },
    ],
  },
  {
    id: 'video', icon: 'bi-play-btn-fill', color: '#ef4444',
    title: 'Video Training', titleTH: 'วิดีโอฝึกซ้อม',
    page: 'training',
    steps: [
      { title: 'ดูวิดีโอ', desc: 'เมนู "Video Training" แสดงวิดีโอแยกตามหมวด: Speed · Jump · Agility · Endurance · Strength · Technical · Yo-Yo · Flexibility' },
      { title: 'กดเล่น', desc: 'กดที่ thumbnail เพื่อเล่นวิดีโอ YouTube โดยตรง ไม่ต้องออกจากแอป' },
      { title: 'Admin: จัดการวิดีโอ', desc: 'Admin กด "จัดการวิดีโอ" เพื่อเพิ่ม/ลบ/แก้ไขลิงก์วิดีโอ — วางลิงก์ YouTube แล้วระบบดึงข้อมูลให้อัตโนมัติ', roles: ['admin'] },
    ],
  },
  {
    id: 'admin', icon: 'bi-shield-lock-fill', color: '#94a3b8',
    title: 'จัดการระบบ', titleTH: 'Admin Only',
    page: 'adminUsers',
    roles: ['admin'],
    steps: [
      { title: 'สร้างบัญชีใหม่', desc: 'เมนู "User Management" → กรอก Username, Password, ชื่อ, Club ID (สร้างอัตโนมัติ) → เลือก Role → กด "สร้างบัญชี"' },
      { title: 'Role มี 3 ระดับ', desc: '👑 Admin — ทุกฟีเจอร์ + จัดการระบบ · 🌟 Club Pro — ทุกฟีเจอร์ยกเว้นจัดการระบบ · 🏟️ Club — ใช้ตามสิทธิ์ที่ตั้งไว้' },
      { title: 'สิทธิ์ฟีเจอร์ Club', desc: 'กำหนดว่า Club จะเห็นฟีเจอร์ไหนบ้าง เปิด/ปิดได้ทีละหมวด มีผลทันทีกับทุกบัญชี Club', tip: 'Admin และ Club Pro ไม่ได้รับผลกระทบจากการตั้งค่านี้ — ใช้ได้ทุกฟีเจอร์เสมอ' },
      { title: 'Club ID คืออะไร', desc: 'ใช้กรองว่านักกีฬาคนไหนอยู่ในทีมของ Club นั้น — ต้องตรงกับ ClubID ในข้อมูลนักกีฬา' },
    ],
  },
];

export default function HelpPage({ onNavigate }: Props) {
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>('start');

  const filtered = SECTIONS.filter(s =>
    !search || [s.title, s.titleTH, ...s.steps.map(st => st.title + st.desc)].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title"><i className="bi bi-book-fill me-2" style={{ color:'#38bdf8' }}/>คู่มือการใช้งาน</h2>
          <p className="page-subtitle">ISP Improve Sports Performance · User Guide</p>
        </div>
      </div>

      {/* Quick cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, marginBottom:20 }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => { setOpenId(s.id); setSearch(''); setTimeout(() => document.getElementById(`help-${s.id}`)?.scrollIntoView({ behavior:'smooth', block:'start' }), 50); }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'12px 8px', borderRadius:12, background:'var(--surface)', border:`1.5px solid ${s.color}33`, cursor:'pointer', transition:'all 0.15s', textAlign:'center' }}
            onMouseEnter={e=>{ e.currentTarget.style.background = s.color+'10'; e.currentTarget.style.borderColor = s.color+'66'; }}
            onMouseLeave={e=>{ e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = s.color+'33'; }}>
            <div style={{ width:36, height:36, borderRadius:10, background: s.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize:'1rem' }}/>
            </div>
            <span style={{ fontSize:'0.7rem', fontWeight:700, color:'var(--text-main)', lineHeight:1.3 }}>{s.title}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-wrap mb-4" style={{ marginBottom:16 }}>
        <i className="bi bi-search"/>
        <input className="form-control" placeholder="ค้นหาคำสั่งหรือฟีเจอร์..." value={search} onChange={e => { setSearch(e.target.value); setOpenId(null); }} style={{ fontSize:'0.9rem' }}/>
        {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'1rem' }}>✕</button>}
      </div>

      {/* Sections */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(s => {
          const isOpen = openId === s.id || !!search;
          return (
            <div key={s.id} id={`help-${s.id}`} className="surface" style={{ padding:0, overflow:'hidden', border:`1px solid ${isOpen ? s.color+'44' : 'var(--border)'}`, transition:'border-color 0.2s' }}>
              {/* Header */}
              <button onClick={() => setOpenId(isOpen && !search ? null : s.id)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background: isOpen ? s.color+'08' : 'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.15s' }}>
                <div style={{ width:38, height:38, borderRadius:10, background: s.color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`bi ${s.icon}`} style={{ color: s.color, fontSize:'1.05rem' }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:'0.9rem', color:'var(--text-main)' }}>{s.title}</div>
                  <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:1 }}>{s.titleTH} · {s.steps.length} ขั้นตอน</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  {s.roles?.includes('admin') && (
                    <span style={{ fontSize:'0.6rem', fontWeight:800, background:'#fef3c7', color:'#92400e', borderRadius:5, padding:'2px 7px' }}>ADMIN</span>
                  )}
                  {s.page && (
                    <button onClick={e => { e.stopPropagation(); onNavigate(s.page!); }}
                      style={{ background: s.color+'18', border:`1px solid ${s.color}44`, color: s.color, borderRadius:7, padding:'5px 10px', fontSize:'0.68rem', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:4 }}>
                      <i className="bi bi-arrow-right"/>ไปหน้านั้น
                    </button>
                  )}
                  <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ color:'#94a3b8', fontSize:'0.8rem' }}/>
                </div>
              </button>

              {/* Steps */}
              {isOpen && (
                <div style={{ padding:'0 18px 18px', borderTop:`1px solid ${s.color}22` }}>
                  {s.steps.map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:12, paddingTop:14, paddingBottom: i < s.steps.length-1 ? 14 : 0, borderBottom: i < s.steps.length-1 ? '1px solid var(--border)' : 'none' }}>
                      {/* Step number */}
                      <div style={{ width:26, height:26, borderRadius:'50%', background: s.color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', fontWeight:900, flexShrink:0, marginTop:2 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-main)', marginBottom:4 }}>{step.title}</div>
                        <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', lineHeight:1.6 }}>{step.desc}</div>
                        {step.tip && (
                          <div style={{ marginTop:8, padding:'7px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, fontSize:'0.75rem', color:'#92400e', display:'flex', gap:6 }}>
                            <i className="bi bi-lightbulb-fill" style={{ color:'#f59e0b', flexShrink:0, marginTop:1 }}/>
                            <span>{step.tip}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--text-muted)' }}>
            <i className="bi bi-search" style={{ fontSize:'2.5rem', display:'block', marginBottom:12, color:'#e2e8f0' }}/>
            ไม่พบผลลัพธ์สำหรับ "<strong>{search}</strong>"
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop:24, padding:'16px 20px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <i className="bi bi-headset" style={{ color:'#38bdf8', fontSize:'1.2rem', flexShrink:0 }}/>
        <div>
          <div style={{ fontWeight:700, fontSize:'0.85rem' }}>ต้องการความช่วยเหลือเพิ่มเติม?</div>
          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2 }}>ติดต่อผู้ดูแลระบบของทีม หรือ Admin ของสโมสร</div>
        </div>
        <div style={{ marginLeft:'auto', fontSize:'0.65rem', color:'var(--text-muted)' }}>ISP v2.1 · 2026</div>
      </div>
    </div>
  );
}
