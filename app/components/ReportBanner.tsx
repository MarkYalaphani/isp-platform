'use client';

import { User } from '@/lib/types';

interface Props {
  user: User;
  subtitle?: string;
}

export default function ReportBanner({ user, subtitle }: Props) {
  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const name  = user.displayName || user.username;

  return (
    <div
      className="report-banner no-print"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '10px 18px', marginBottom: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, flexWrap: 'wrap',
      }}
    >
      {/* Left: team logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user.logoUrl ? (
          <img
            src={user.logoUrl}
            alt="logo"
            style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.06)', padding: 4, border: '1px solid var(--border)' }}
          />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="bi bi-shield-fill" style={{ color: '#38bdf8', fontSize: '1.2rem' }} />
          </div>
        )}
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)' }}>{name}</div>
          {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>

      {/* Right: app brand + date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#38bdf8' }}>ISP</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 1 }}>{today}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Print-only header (always rendered, hidden on screen) ── */
export function PrintHeader({ user, title, subtitle }: { user: User; title: string; subtitle?: string }) {
  const today = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
  const name  = user.displayName || user.username;

  return (
    <div
      className="print-only"
      style={{
        display: 'none',
        fontFamily: 'sans-serif',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: '3px solid #0f172a',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Left: logo + team name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user.logoUrl && (
            <img src={user.logoUrl} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 10 }} />
          )}
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{name}</div>
            {subtitle && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 3 }}>{subtitle}</div>}
          </div>
        </div>
        {/* Right: title + date */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#38bdf8', marginBottom: 4 }}>ISP</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{today}</div>
        </div>
      </div>
    </div>
  );
}
