'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, Athlete, Page } from '@/lib/types';
import { callGAS } from '@/lib/api';

import { parseClubPages, loadClubPagesLocal, saveClubPagesLocal } from '@/lib/clubSettings';
import LoginModal from './LoginModal';
import Sidebar from './Sidebar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import RosterPage from './pages/RosterPage';
import ScoutPage from './pages/ScoutPage';
import IRPage from './pages/IRPage';
import SkillPage from './pages/SkillPage';
import AttendancePage from './pages/AttendancePage';
import TrainingPage from './pages/TrainingPage';
import UpdateResultsPage from './pages/UpdateResultsPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import TeamReportPage from './pages/TeamReportPage';
import MigratePage from './pages/MigratePage';
import ComparePage from './pages/ComparePage';
import QuickTestPage from './pages/QuickTestPage';
import LineupPage from './pages/LineupPage';
import WellnessPage from './pages/WellnessPage';
import TesterPage from './pages/TesterPage';
import HelpPage from './pages/HelpPage';
import UserProfileModal from './UserProfileModal';
import ToastContainer from './ToastContainer';
import BottomNav from './BottomNav';
import LeaderboardPage from './pages/LeaderboardPage';
import BatchAddPage from './pages/BatchAddPage';
import MatchLogPage from './pages/MatchLogPage';
import CalendarPage from './pages/CalendarPage';
import TrainingProgramPage from './pages/TrainingProgramPage';
import MonitorPage from './pages/MonitorPage';
import NutritionPage from './pages/NutritionPage';
import { useLang } from '@/lib/lang';

export default function ScoutApp() {
  const { lang, toggle: toggleLang } = useLang();
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [scoutPlayerId, setScoutPlayerId] = useState('');
  const [showProfile, setShowProfile]   = useState(false);
  const [darkMode, setDarkMode]         = useState(false);
  // Global Club role permissions (loaded once on mount)
  const [clubAllowedPages, setClubAllowedPages] = useState<string[]>([]);

  // Dark mode init + sync to DOM
  useEffect(() => {
    const dm = localStorage.getItem('darkMode') === 'true';
    setDarkMode(dm);
    document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light');
  }, []);
  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', String(next));
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
  };

  const ALL_PAGE_IDS = ['dashboard','roster','scout','skill','attendance','wellness','nutrition','ir','compare','lineup','teamreport','performance','quicktest','register','training'];

  useEffect(() => {
    const saved = sessionStorage.getItem('scoutUser') || localStorage.getItem('scoutUser');
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { sessionStorage.removeItem('scoutUser'); }
    }
    // Load Club permissions from localStorage cache immediately (fast)
    const localPages = loadClubPagesLocal(ALL_PAGE_IDS);
    if (localPages && localPages.length > 0) setClubAllowedPages(localPages);
  }, []);

  // Refresh club settings from server after login (requires auth token)
  useEffect(() => {
    if (!user) return;
    callGAS('getClubSettings')
      .then(d => {
        const data = d as { pages?: string };
        const merged = parseClubPages(data.pages ?? null, ALL_PAGE_IDS);
        setClubAllowedPages(merged);
        saveClubPagesLocal(merged);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  const loadAthletes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Pass role+clubId → server filters by club_id for non-admin
      const data = await callGAS('getAthleteData', {
        role: user.role,
        clubId: user.clubId || '',
      }) as Athlete[] | { error: string }[];
      if (Array.isArray(data)) {
        setAthletes(data.filter((a): a is Athlete => !('error' in a)));
      }
    } catch (e) {
      if ((e as Error).message !== 'SESSION_EXPIRED') {
        console.error('Failed to load athletes', e);
      }
      // SESSION_EXPIRED handled by the event listener above
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadAthletes();
  }, [loadAthletes]);

  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
    sessionStorage.setItem('scoutUser', JSON.stringify(loggedUser));
    localStorage.setItem('scoutUser', JSON.stringify(loggedUser));
  };

  const handleUpdateUser = (updated: Partial<User>) => {
    const newUser = { ...user!, ...updated };
    setUser(newUser);
    sessionStorage.setItem('scoutUser', JSON.stringify(newUser));
    localStorage.setItem('scoutUser', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    setAthletes([]);
    sessionStorage.removeItem('scoutUser');
    localStorage.removeItem('scoutUser');
    sessionStorage.removeItem('scoutToken');
    localStorage.removeItem('scoutToken');
    setCurrentPage('home');
  };

  // Auto-logout when session expires (detected by callGAS)
  useEffect(() => {
    const handler = () => {
      handleLogout();
      // Brief delay so LoginModal re-renders, then show message
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const e = new CustomEvent('app-toast', { detail: { text: 'Session หมดอายุ — กรุณา Login ใหม่', type: 'error', duration: 5000 } });
          window.dispatchEvent(e);
        }
      }, 200);
    };
    window.addEventListener('session-expired', handler);
    return () => window.removeEventListener('session-expired', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAccess = (page: Page): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'club_pro') return page !== 'adminUsers' && page !== 'migrate';
    // club: use global settings (default allow all if settings not yet loaded)
    if (page === 'home') return true;
    if (clubAllowedPages.length === 0) return true; // default open while loading
    return clubAllowedPages.includes(page);
  };

  const navigate = (page: Page, playerId?: string) => {
    if (!canAccess(page)) return; // block unauthorized navigation
    if (page === 'scout' && playerId) setScoutPlayerId(playerId);
    setCurrentPage(page);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!user) return <LoginModal onLogin={handleLogin} />;

  return (
    <div>
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />
      <Sidebar currentPage={currentPage} onNavigate={navigate} user={user} onLogout={handleLogout} isOpen={sidebarOpen} onEditProfile={() => setShowProfile(true)} clubAllowedPages={clubAllowedPages} />

      <main className="main has-bottom-nav">
        <div className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="https://res.cloudinary.com/dkmi9kye7/image/upload/v1778663857/687674443_978558021239852_7124371302269064381_n_jzn6zg.jpg" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} alt="" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>ISP</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={toggleLang} title="Toggle Language" style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'var(--text-muted)', fontSize:'0.75rem', fontWeight:700, letterSpacing:0.5 }}>
              {lang === 'th' ? 'EN' : 'ไทย'}
            </button>
            <button onClick={toggleDark} title={darkMode?'Light Mode':'Dark Mode'} style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 8px', cursor:'pointer', color:'var(--text-muted)', fontSize:'1rem' }}>
              <i className={`bi bi-${darkMode?'sun-fill':'moon-fill'}`}/>
            </button>
            {user && currentPage !== 'home' && currentPage !== 'help' && (
              <button className="no-print" onClick={() => window.print()} title="Save PDF" style={{ background:'#dc2626', border:'none', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'white', fontSize:'0.75rem', fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
                <i className="bi bi-file-pdf-fill"/>PDF
              </button>
            )}
            <button className="btn-menu" onClick={() => setSidebarOpen(true)}><i className="bi bi-list" style={{ fontSize: '1.1rem' }} /></button>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner-ring" /></div>}

        {!loading && (
          <>
            {currentPage === 'home'        && <HomePage athletes={athletes} onNavigate={navigate} user={user} />}
            {currentPage === 'dashboard'   && <DashboardPage athletes={athletes} onNavigate={navigate} />}
            {currentPage === 'roster'      && <RosterPage athletes={athletes} onRefresh={loadAthletes} user={user} onNavigate={navigate} />}
            {currentPage === 'scout'       && <ScoutPage athletes={athletes} initialId={scoutPlayerId} onNavigate={navigate} onRefresh={loadAthletes} user={user} />}
            {currentPage === 'ir'          && <IRPage athletes={athletes} user={user} />}
            {currentPage === 'skill'       && <SkillPage athletes={athletes} user={user} onNavigate={navigate} />}
            {currentPage === 'attendance'  && <AttendancePage athletes={athletes} user={user} />}
            {currentPage === 'training'    && <TrainingPage athletes={athletes} onNavigate={navigate} user={user} />}
            {currentPage === 'performance' && <UpdateResultsPage athletes={athletes} onSuccess={loadAthletes} />}
            {currentPage === 'quicktest'   && <QuickTestPage athletes={athletes} onSuccess={loadAthletes} />}
            {currentPage === 'register'    && <RegisterPage onSuccess={async () => { navigate('roster'); loadAthletes(); setTimeout(loadAthletes, 3500); setTimeout(loadAthletes, 7000); }} user={user} />}
            {currentPage === 'teamreport'  && <TeamReportPage athletes={athletes} onNavigate={navigate} user={user} />}
            {currentPage === 'compare'     && <ComparePage athletes={athletes} onNavigate={navigate} />}
            {currentPage === 'lineup'       && <LineupPage athletes={athletes} onNavigate={navigate} user={user} />}
            {currentPage === 'wellness'     && <WellnessPage athletes={athletes} user={user} />}
            {currentPage === 'adminUsers'  && user.role === 'admin' && <AdminPage />}
            {currentPage === 'migrate'     && user.role === 'admin' && <MigratePage />}
            {currentPage === 'tester'      && user.role === 'admin' && <TesterPage athletes={athletes} user={user} onNavigate={navigate} />}
            {currentPage === 'help'         && <HelpPage onNavigate={navigate} />}
            {currentPage === 'leaderboard'  && <LeaderboardPage athletes={athletes} onNavigate={navigate} />}
            {currentPage === 'batchadd'     && <RegisterPage onSuccess={async () => { navigate('roster'); loadAthletes(); setTimeout(loadAthletes, 3500); }} user={user} />}
            {currentPage === 'matchlog'     && <MatchLogPage athletes={athletes} user={user} />}
            {currentPage === 'calendar'     && <CalendarPage athletes={athletes} user={user} onNavigate={navigate} />}
            {currentPage === 'goals'        && <TrainingProgramPage athletes={athletes} user={user} />}
            {currentPage === 'monitor'      && user.role === 'admin' && <MonitorPage />}
            {currentPage === 'nutrition'    && <NutritionPage athletes={athletes} user={user} />}
          </>
        )}
        <BottomNav currentPage={currentPage} onNavigate={navigate} onOpenMenu={() => setSidebarOpen(true)} />

        {/* ── Floating PDF button — shows on all data pages, hidden when printing ── */}
        {user && currentPage !== 'home' && currentPage !== 'help' && (
          <button
            className="no-print"
            onClick={() => window.print()}
            title="บันทึก PDF"
            style={{
              position: 'fixed',
              bottom: 'calc(66px + env(safe-area-inset-bottom, 0px) + 14px)',
              right: 20,
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 50,
              padding: '10px 16px',
              fontWeight: 700,
              cursor: 'pointer',
              zIndex: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.82rem',
              boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 22px rgba(220,38,38,0.5)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(220,38,38,0.4)'; }}
          >
            <i className="bi bi-file-pdf-fill" style={{ fontSize: '1rem' }} />
            Save PDF
          </button>
        )}
      </main>
      {showProfile && user && (
        <UserProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onSaved={updated => { handleUpdateUser(updated); setShowProfile(false); }}
        />
      )}
      <ToastContainer />
    </div>
  );
}
