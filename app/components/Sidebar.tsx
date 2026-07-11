'use client';

import { useRef } from 'react';
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
  clubAllowedPages?: string[];
}

const SECTIONS = [
  {
    label: 'Overview',
    items: [
      { page: 'home'      as Page, icon: 'bi-house-fill',              label: 'หน้าหลัก' },
      { page: 'dashboard' as Page, icon: 'bi-grid-1x2-fill',           label: 'Dashboard' },
      { page: 'help'      as Page, icon: 'bi-book-fill',               label: 'คู่มือ' },
    ],
  },
  {
    label: 'Athletes',
    items: [
      { page: 'roster'           as Page, icon: 'bi-people-fill',           label: 'Roster' },
      { page: 'scout'            as Page, icon: 'bi-person-badge-fill',     label: 'Scout Report' },
      { page: 'skill'            as Page, icon: 'bi-bullseye',              label: 'Skill Assessment' },
      { page: 'ir'               as Page, icon: 'bi-clipboard2-check-fill', label: 'IDP Report' },
      { page: 'compare'          as Page, icon: 'bi-intersect',             label: 'Compare' },
      { page: 'lineup'           as Page, icon: 'bi-diagram-3-fill',        label: 'Line Up' },
    ],
  },
  {
    label: 'Training',
    items: [
      { page: 'attendance'       as Page, icon: 'bi-check2-square',         label: 'เช็คชื่อซ้อม' },
      { page: 'wellness'         as Page, icon: 'bi-heart-pulse-fill',      label: 'Wellness & Load' },
      { page: 'nutrition'        as Page, icon: 'bi-egg-fried',             label: 'Nutrition Check-in' },
      { page: 'nutritionPlanner' as Page, icon: 'bi-calculator-fill',       label: 'Nutrition Planner' },
      { page: 'training'         as Page, icon: 'bi-play-btn-fill',         label: 'Video Training' },
    ],
  },
  {
    label: 'Data',
    items: [
      { page: 'leaderboard' as Page, icon: 'bi-trophy-fill',            label: 'Leaderboard' },
      { page: 'teamreport'  as Page, icon: 'bi-bar-chart-line-fill',    label: 'Team Report' },
      { page: 'matchlog'    as Page, icon: 'bi-shield-check',           label: 'Match Log' },
      { page: 'calendar'    as Page, icon: 'bi-calendar3',              label: 'ตารางซ้อม/แข่ง' },
      { page: 'goals'       as Page, icon: 'bi-stars',                  label: 'Training Program' },
      { page: 'performance' as Page, icon: 'bi-clipboard-data-fill',    label: 'Update Results' },
      { page: 'quicktest'   as Page, icon: 'bi-lightning-fill',         label: 'Quick Test' },
      { page: 'register'    as Page, icon: 'bi-person-plus-fill',       label: 'Add Athlete' },
    ],
  },
];

const ADMIN_ITEMS = [
  { page: 'monitor'    as Page, icon: 'bi-display-fill',    label: 'System Monitor' },
  { page: 'adminUsers' as Page, icon: 'bi-shield-lock',     label: 'User Management' },
  { page: 'migrate'    as Page, icon: 'bi-database-up',     label: 'Migrate Data' },
  { page: 'tester'     as Page, icon: 'bi-bug-fill',        label: 'System Tester' },
];

export default function Sidebar({ currentPage, onNavigate, user, onLogout, isOpen, onEditProfile, clubAllowedPages = [] }: Props) {
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd  = (e: React.TouchEvent) => {
    if (e.changedTouches[0].clientX - touchStartX.current < -50) onNavigate(currentPage);
  };

  const canAccess = (page: Page): boolean => {
    if (user.role === 'admin') return true;
    if (user.role === 'club_pro') return page !== 'adminUsers' && page !== 'migrate';
    if (page === 'home' || page === 'help') return true;
    if (clubAllowedPages.length === 0) return true;
    return clubAllowedPages.includes(page);
  };

  const avatarChar = (user.displayName || user.username).charAt(0).toUpperCase();

  return (
    <nav className={`sidebar${isOpen ? ' open' : ''}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Brand */}
      <div className="sidebar-brand">
        {user.logoUrl ? (
          <img src={user.logoUrl} alt="Team Logo" className="sidebar-logo" />
        ) : (
          <img src={LOGO_URL} alt="ISP" className="sidebar-logo-default" />
        )}
        <div className="brand-title">ISP Platform</div>
        <div className="brand-name">Sports Performance</div>
      </div>

      {/* User */}
      <div className="user-badge" onClick={onEditProfile}>
        <div className="user-avatar-sm">
          {user.logoUrl
            ? <img src={user.logoUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:'50%', padding:2 }} />
            : avatarChar}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="user-badge-name">{user.displayName || user.username}</div>
          <div className="user-badge-role">
            {user.role === 'admin' ? 'Administrator' : user.role === 'club_pro' ? 'Club Pro' : 'Club'}
          </div>
        </div>
        <button className="logout-btn" onClick={e => { e.stopPropagation(); onLogout(); }} title="ออกจากระบบ">
          <i className="bi bi-box-arrow-right" />
        </button>
      </div>

      {/* Nav */}
      <div className="nav-menu">
        {SECTIONS.map(section => {
          const visible = section.items.filter(i => canAccess(i.page));
          if (!visible.length) return null;
          return (
            <div key={section.label}>
              <div className="nav-section">{section.label}</div>
              {visible.map(item => (
                <button
                  key={item.page}
                  className={`nav-link${currentPage === item.page ? ' active' : ''}`}
                  onClick={() => onNavigate(item.page)}
                >
                  <i className={`bi ${item.icon}`} />
                  {item.label}
                </button>
              ))}
            </div>
          );
        })}

        {user.role === 'admin' && (
          <div>
            <div className="nav-section">Admin</div>
            {ADMIN_ITEMS.map(item => (
              <button
                key={item.page}
                className={`nav-link${currentPage === item.page ? ' active' : ''}`}
                onClick={() => onNavigate(item.page)}
              >
                <i className={`bi ${item.icon}`} />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-footer">ISP v3.0 · Performance Intelligence</div>
    </nav>
  );
}
