import { NextRequest } from 'next/server';

const GAS_URL = process.env.GAS_WEB_APP_URL;
const PLACEHOLDER = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

export async function GET() {
  const configured = !!(GAS_URL && GAS_URL !== PLACEHOLDER);
  return Response.json({ configured, url: configured ? '✓ set' : 'not set' });
}

export async function POST(req: NextRequest) {
  if (!GAS_URL) {
    return Response.json({ status: 'error', message: 'GAS_WEB_APP_URL not configured' }, { status: 500 });
  }
  try {
    const body = await req.json();
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: 'error', message: 'Invalid response from GAS: ' + text.slice(0, 200) };
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ status: 'error', message: String(err) }, { status: 500 });
  }
}
