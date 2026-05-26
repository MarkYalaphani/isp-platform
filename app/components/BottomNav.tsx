'use client';

import { Page } from '@/lib/types';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenMenu: () => void;
}

const tabs = [
  { page: 'home' as Page,      icon: 'bi-house-fill',        label: 'Home' },
  { page: 'roster' as Page,    icon: 'bi-people-fill',       label: 'Roster' },
  { page: 'scout' as Page,     icon: 'bi-person-badge-fill', label: 'Scout' },
  { page: 'aichat' as Page,    icon: 'bi-robot',             label: 'AI Chat' },
];

export default function BottomNav({ currentPage, onNavigate, onOpenMenu }: Props) {
  return (
    <>
      <style>{`
        .bottom-nav {
          display: none;
        }
        @media (max-width: 640px) {
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 1100;
            width: 100%;
            height: calc(56px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: #ffffff;
            border-top: 1px solid rgba(15,23,42,0.10);
            box-shadow: 0 -2px 12px rgba(15,23,42,0.07);
            align-items: stretch;
          }
          .bottom-nav-tab {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 6px 4px;
            font-family: inherit;
            transition: color 0.15s;
            color: #94a3b8;
          }
          .bottom-nav-tab.active {
            color: #38bdf8;
          }
          .bottom-nav-tab i {
            font-size: 1.2rem;
            line-height: 1;
          }
          .bottom-nav-tab span {
            font-size: 0.6rem;
            font-weight: 700;
            letter-spacing: 0.3px;
            line-height: 1;
          }
        }
      `}</style>
      <nav className="bottom-nav" role="navigation" aria-label="Bottom navigation">
        {tabs.map(({ page, icon, label }) => (
          <button
            key={page}
            className={`bottom-nav-tab${currentPage === page ? ' active' : ''}`}
            onClick={() => onNavigate(page)}
            aria-label={label}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            <i className={`bi ${icon}`} />
            <span>{label}</span>
          </button>
        ))}
        <button
          className="bottom-nav-tab"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <i className="bi bi-grid-fill" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}
