export async function callGAS(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const res = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
