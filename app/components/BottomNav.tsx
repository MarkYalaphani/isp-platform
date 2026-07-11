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
  { page: 'quicktest' as Page,  icon: 'bi-lightning-charge-fill', label: 'Test' },
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
            bottom: 0; left: 0; right: 0;
            z-index: 1100;
            width: 100%;
            height: calc(56px + env(safe-area-inset-bottom, 0px));
            padding-bottom: env(safe-area-inset-bottom, 0px);
            background: rgba(255,255,255,0.88);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            backdrop-filter: blur(20px) saturate(180%);
            border-top: 0.5px solid rgba(0,0,0,0.12);
            align-items: stretch;
          }
          @media (prefers-color-scheme: dark) {
            .bottom-nav {
              background: rgba(28,28,30,0.90);
              border-top-color: rgba(255,255,255,0.08);
            }
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
            color: #8e8e93;
            min-height: 44px;
          }
          .bottom-nav-tab.active {
            color: #0066cc;
          }
          .bottom-nav-tab i {
            font-size: 1.22rem;
            line-height: 1;
          }
          .bottom-nav-tab span {
            font-size: 0.58rem;
            font-weight: 600;
            letter-spacing: 0.01em;
            line-height: 1;
          }
          @media (prefers-color-scheme: dark) {
            .bottom-nav-tab { color: #636366; }
            .bottom-nav-tab.active { color: #2997ff; }
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
