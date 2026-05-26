export async function callAI(task: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('scoutToken') || localStorage.getItem('scoutToken'))
    : null;

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ task, payload }),
  });
  if (!res.ok) throw new Error(`AI error: ${res.status}`);
  return res.json();
}
