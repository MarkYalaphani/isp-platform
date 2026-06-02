import { createHmac } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-please-set-SESSION_SECRET-in-env';
const TTL_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_MS = 2 * 60 * 60 * 1000;    // refresh when < 2 hours remain

export interface SessionPayload {
  username: string;
  role: string;
  clubId: string;
  iat: number;
}

export function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = createHmac('sha256', SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

/** Returns true when the token is still valid but should be refreshed */
export function needsRefresh(payload: SessionPayload): boolean {
  const age = Date.now() - payload.iat;
  return age > TTL_MS - REFRESH_MS;
}

export function verifyToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  try {
    const dot = token.lastIndexOf('.');
    if (dot < 1) return null;
    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = createHmac('sha256', SECRET).update(data).digest('hex');
    // Constant-time comparison to prevent timing attacks
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload;
    if (Date.now() - payload.iat > TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
