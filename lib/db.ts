export async function callDB<T = unknown>(action: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) throw new Error(`DB error ${res.status}`);
  return res.json() as Promise<T>;
}
