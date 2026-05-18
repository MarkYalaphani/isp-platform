'use client';

import { useState } from 'react';

export default function MigratePage() {
  const [status, setStatus] = useState<'idle'|'running'|'done'|'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ athletes: number; tests: number; irs: number; users: number } | null>(null);

  const handleMigrate = async () => {
    if (!confirm('เริ่ม migrate ข้อมูลจาก Google Sheets → Supabase?\n\nข้อมูลเดิมใน Supabase จะไม่ถูกลบ (เพิ่มเข้าไป)')) return;
    setStatus('running');
    setLog(['⏳ กำลัง migrate...']);
    setResult(null);

    try {
      const res = await fetch('/api/migrate', { method: 'POST' });
      const data = await res.json();
      setLog(data.log || []);
      if (data.ok) {
        setStatus('done');
        setResult({ athletes: data.athletes, tests: data.tests, irs: data.irs, users: data.users });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
      setLog(l => [...l, '✗ Network error']);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h2 className="page-title">Migrate Data</h2>
          <p className="page-subtitle">ย้ายข้อมูลจาก Google Sheets → Supabase</p>
        </div>
      </div>

      {/* Info card */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ fontWeight: 700, color: '#1d4ed8', marginBottom: 8 }}><i className="bi bi-info-circle-fill me-2" />สิ่งที่จะ migrate</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#1e40af', fontSize: '0.875rem', lineHeight: 2 }}>
          <li>นักกีฬาทั้งหมด + รูปภาพ (ใช้ URL เดิม)</li>
          <li>ประวัติการทดสอบทั้งหมด</li>
          <li>Individual Reports (IR) ทั้งหมด</li>
          <li>Users / บัญชีผู้ใช้ (รหัสผ่านชั่วคราว: Welcome123!)</li>
        </ul>
      </div>

      {status === 'idle' && (
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: '1rem' }} onClick={handleMigrate}>
          <i className="bi bi-arrow-right-circle-fill me-2" />เริ่ม Migrate ข้อมูล
        </button>
      )}

      {status === 'running' && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner-ring" style={{ width: 48, height: 48, borderWidth: 4, margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>กำลัง migrate... อาจใช้เวลา 1-5 นาที</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>ห้ามปิดหน้าต่าง</div>
        </div>
      )}

      {status === 'done' && result && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#166534', marginBottom: 16 }}>Migrate สำเร็จ!</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'Athletes', val: result.athletes, icon: 'bi-people-fill', color: '#38bdf8' },
              { label: 'Tests',    val: result.tests,    icon: 'bi-activity',    color: '#34d399' },
              { label: 'IR Reports',val: result.irs,     icon: 'bi-clipboard2-check', color: '#818cf8' },
              { label: 'Users',    val: result.users,    icon: 'bi-shield-lock', color: '#f472b6' },
            ].map(x => (
              <div key={x.label} style={{ background: 'white', borderRadius: 10, padding: 14, border: `1px solid ${x.color}30` }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: x.color }}>{x.val}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>{x.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: '0.85rem', color: '#92400e', textAlign: 'left' }}>
            <i className="bi bi-exclamation-triangle-fill me-2" />
            <strong>หมายเหตุ:</strong> Users ที่ migrate มา รหัสผ่านถูก reset เป็น <code>Welcome123!</code> แจ้ง user ให้เปลี่ยนรหัสผ่าน
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}><i className="bi bi-x-circle-fill me-2" />เกิดข้อผิดพลาด</div>
          <button className="btn-outline" onClick={() => setStatus('idle')} style={{ marginTop: 8 }}>ลองใหม่</button>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 20px', marginTop: 16 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>Migration Log</div>
          {log.map((line, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: line.startsWith('✓') ? '#4ade80' : line.startsWith('✗') ? '#f87171' : line.startsWith('⚠') ? '#facc15' : '#94a3b8', padding: '2px 0', fontFamily: 'monospace' }}>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
