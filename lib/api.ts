const TOKEN_KEY = 'scoutToken';
const USER_KEY  = 'scoutUser';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_KEY);
}

// Singleton refresh promise to avoid parallel refresh calls
let refreshingPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = (async () => {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action: 'refreshToken', params: {} }),
      });
      if (!res.ok) return false;
      const d = await res.json() as { status: string; token?: string };
      if (d.status === 'success' && d.token) { storeToken(d.token); return true; }
      return false;
    } catch { return false; }
    finally { refreshingPromise = null; }
  })();
  return refreshingPromise;
}

export async function callGAS(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/db', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, params }),
  });

  // Store refreshed token if server sent one
  const refreshed = res.headers.get('X-Refreshed-Token');
  if (refreshed) storeToken(refreshed);

  if (res.status === 401) {
    // Try to refresh once, then retry the original call
    const ok = await tryRefreshToken();
    if (ok) {
      const retry = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ action, params }),
      });
      if (retry.ok) return retry.json();
    }
    // Refresh failed → session is truly expired
    clearSession();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('session-expired'));
    }
    throw new Error('SESSION_EXPIRED');
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
