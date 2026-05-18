const LS_KEY = 'isp_club_pages';

/* Pages that existed before skill/attendance/wellness were added.
   Any page NOT in this list is "new" and defaults to ON when missing from saved data. */
const LEGACY_PAGES = new Set([
  'dashboard','roster','scout','teamreport','compare',
  'lineup','ir','performance','quicktest','register','training',
]);

export function parseClubPages(raw: string | null | undefined, allIds: string[]): string[] {
  if (!raw) return allIds; // nothing saved → all ON
  const saved = raw.split(',').filter(Boolean);
  if (saved.length === 0) return allIds;
  // Merge: saved pages + any new page not in legacy set (default ON)
  const merged = allIds.filter(id => saved.includes(id) || !LEGACY_PAGES.has(id));
  return merged;
}

export function loadClubPagesLocal(allIds: string[]): string[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  return parseClubPages(raw, allIds);
}

export function saveClubPagesLocal(pages: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, pages.join(','));
}
