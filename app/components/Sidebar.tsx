'use client';

import { Page, User } from '@/lib/types';
import { LOGO_URL } from '@/lib/devData';
import { useLang } from '@/lib/lang';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  onEditProfile: () => void;
  clubAllowedPages?: string[]; // global Club permissions from server
}

export default function Sidebar({ currentPage, onNavigate, user, onLogout, isOpen, onEditProfile, clubAllowedPages = [] }: Props) {
  const { t } = useLang();
  const canAccess = (page: Page): boolean => {
    if (user.role === 'admin') return true;
    if (user.role === 'club_pro') return page !== 'adminUsers' && page !== 'migrate';
    if (page === 'home' || page === 'help') return true;
    if (clubAllowedPages.length === 0) return true; // default while loading
    return clubAllowedPages.includes(page);
  };

  const link = (page: Page, icon: string, label: string) => {
    if (!canAccess(page)) return null;
    return (
      <button
        key={page}
        className={`nav-link${currentPage === page ? ' active' : ''}`}
        onClick={() => onNavigate(page)}
      >
        <i className={`bi ${icon}`} />
        {label}
      </button>
    );
  };

  const avatarChar = (user.displayName || user.username).charAt(0).toUpperCase();

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Brand — แสดง logo ของ team ถ้ามี */}
      <div className="sidebar-brand">
        {user.logoUrl ? (
          <img
            src={user.logoUrl}
            alt="Team Logo"
            style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'contain', marginBottom: 10, background: 'rgba(255,255,255,0.08)', padding: 4, border: '1px solid rgba(255,255,255,0.12)' }}
          />
        ) : (
          <img
            src={LOGO_URL}
            alt="ISP"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain', marginBottom: 14 }}
          />
        )}
        <div className="brand-title">ISP</div>
        <div className="brand-name">Sports Performance</div>
      </div>

      {/* User badge */}
      <div className="user-badge" style={{ cursor: 'default' }}>
        {/* Avatar */}
        <div
          className="user-avatar-sm"
          style={{ cursor: 'pointer', flexShrink: 0 }}
          onClick={onEditProfile}
          title="แก้ไขโปรไฟล์"
        >
          {user.logoUrl
            ? <img src={user.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', padding: 2 }} />
            : avatarChar}
        </div>
        {/* Name & role */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-badge-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.displayName || user.username}</div>
          <div className="user-badge-role">
            {user.role === 'admin' ? '⚡ ADMIN' : user.role === 'club_pro' ? '🌟 CLUB PRO' : '🏟️ CLUB'}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="logout-btn"
            onClick={onEditProfile}
            title="แก้ไขโปรไฟล์"
            style={{ fontSize: '0.75rem' }}
          >
            <i className="bi bi-gear-fill" />
          </button>
          <button
            className="logout-btn"
            onClick={onLogout}
            title="ออกจากระบบ"
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>

      <div className="nav-menu">
        <div className="nav-section">Main</div>
        {link('home', 'bi-house-fill', t('Home'))}
        {link('help', 'bi-book-fill', t('คู่มือการใช้งาน'))}

        <div className="nav-section">Overview</div>
        {link('dashboard', 'bi-grid-1x2', t('Dashboard'))}

        <div className="nav-section">Athletes</div>
        {link('roster',     'bi-people',           t('Roster'))}
        {link('scout',      'bi-person-vcard',      t('Scout Report'))}
        {link('skill',      'bi-bullseye',          t('Skill Assessment'))}
        {link('attendance', 'bi-check2-square',     t('เช็คชื่อซ้อม'))}
        {link('wellness',   'bi-heart-pulse-fill',  t('Wellness & Load'))}
        {link('ir',         'bi-clipboard2-check',  t('IDP'))}
        {link('compare',    'bi-intersect',         t('Compare'))}
        {link('lineup',     'bi-diagram-3-fill',    t('Line Up'))}

        <div className="nav-section">AI Tools</div>
        {link('aichat', 'bi-robot', 'AI Scout Chat')}

        <div className="nav-section">Training & Media</div>
        {link('training', 'bi-play-btn-fill', t('Video Training'))}

        <div className="nav-section">Data</div>
        {link('leaderboard','bi-trophy-fill',         t('Leaderboard'))}
        {link('teamreport', 'bi-bar-chart-line-fill', t('Team Report'))}
        {link('matchlog',   'bi-shield-check',        t('Match Log'))}
        {link('calendar',   'bi-calendar3',           t('ตารางซ้อม/แข่ง'))}
        {link('goals',      'bi-stars',               t('Training Program'))}
        {link('performance','bi-clipboard-data',       t('Update Results'))}
        {link('quicktest',  'bi-lightning-fill',       t('Quick Test'))}
        {link('register',   'bi-person-plus',          t('Add Athlete'))}

        {user.role === 'admin' && (
          <>
            <div className="nav-section">Admin</div>
            {link('adminUsers', 'bi-shield-lock',  'User Management')}
            {link('migrate',    'bi-database-up',  'Migrate Data')}
            {link('tester',     'bi-bug-fill',      'System Tester')}
          </>
        )}
      </div>

      {/* Profile shortcut at bottom */}
      <button
        onClick={onEditProfile}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 16px', marginTop: 8,
          background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)',
          borderRadius: 10, cursor: 'pointer', color: '#7dd3fc',
          fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
        }}
      >
        <i className="bi bi-person-gear" style={{ fontSize: '0.9rem' }}/>
        <span>แก้ไขโปรไฟล์ / โลโก้</span>
      </button>

      <div className="sidebar-footer">ISP v2.0</div>
    </nav>
  );
}
