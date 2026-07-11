'use client';

import { useEffect, useState } from 'react';

interface Props {
  expiresAt: string | null;
  onLogout: () => void;
  onRecheck: () => Promise<boolean>;
}

export default function AccountExpiredModal({ expiresAt, onLogout, onRecheck }: Props) {
  const [checking, setChecking] = useState(false);
  const [lastCheckedFailed, setLastCheckedFailed] = useState(false);

  // Auto re-check periodically so the popup clears itself once admin renews — no user action needed
  useEffect(() => {
    const t = setInterval(() => {
      onRecheck();
    }, 30000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecheck = async () => {
    setChecking(true);
    setLastCheckedFailed(false);
    try {
      const ok = await onRecheck();
      if (!ok) setLastCheckedFailed(true);
    } finally {
      setChecking(false);
    }
  };

  const dateLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(4,10,25,0.88)',
        backdropFilter: 'blur(10px) saturate(160%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      // No backdrop-click dismiss and no ESC handling — intentionally unclosable
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 20, boxShadow: 'var(--shadow-xl)',
          padding: '32px 28px', textAlign: 'center',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
          background: 'rgba(239,68,68,0.12)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="bi bi-lock-fill" style={{ fontSize: '1.7rem', color: '#ef4444' }} />
        </div>

        <h4 style={{ fontWeight: 800, marginBottom: 8 }}>บัญชีของคุณหมดอายุการใช้งาน</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: dateLabel ? 6 : 18, lineHeight: 1.6 }}>
          กรุณาติดต่อแอดมินเพื่อต่ออายุการใช้งาน<br />ระบบจะปลดล็อกโดยอัตโนมัติทันทีที่แอดมินต่ออายุให้
        </p>
        {dateLabel && (
          <p style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 700, marginBottom: 18 }}>
            หมดอายุเมื่อ {dateLabel}
          </p>
        )}

        <button
          className="btn-primary w-100"
          onClick={handleRecheck}
          disabled={checking}
          style={{ justifyContent: 'center', marginBottom: 10 }}
        >
          {checking
            ? <><span className="spinner-ring" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} /> กำลังตรวจสอบ...</>
            : <><i className="bi bi-arrow-clockwise me-1" />ตรวจสอบอีกครั้ง</>}
        </button>
        {lastCheckedFailed && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            ยังไม่ได้รับการต่ออายุ — ลองใหม่อีกครั้งภายหลัง
          </p>
        )}

        <button
          onClick={onLogout}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
