export async function callDB<T = unknown>(action: string, params?: Record<string, unknown>): Promise<T> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('scoutToken') || localStorage.getItem('scoutToken'))
    : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/db', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, params: params ?? {} }),
  });
  if (!res.ok) throw new Error(`DB error ${res.status}`);
  return res.json() as Promise<T>;
}
