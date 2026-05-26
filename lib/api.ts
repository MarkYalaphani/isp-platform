export async function callGAS(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('scoutToken') || localStorage.getItem('scoutToken'))
    : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/db', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
