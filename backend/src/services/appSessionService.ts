import { createHmac, timingSafeEqual } from 'crypto';
import type { FeishuAuthenUserInfo } from './feishuTenantService.js';

const SESSION_PREFIX = 'nl1.';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

export interface AppSessionClaims {
  dbUserId: number;
  user: FeishuAuthenUserInfo;
  exp: number;
  iat: number;
}

function sessionSecret(): string {
  const secret =
    process.env.FEISHU_SESSION_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.FEISHU_APP_SECRET?.trim();
  if (!secret) {
    throw new Error(
      '缺少会话签名密钥：请配置 FEISHU_SESSION_SECRET（或 JWT_SECRET / FEISHU_APP_SECRET）'
    );
  }
  return secret;
}

export function getAppSessionTtlSeconds(): number {
  const raw = process.env.FEISHU_SESSION_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_TTL_SECONDS;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_SECONDS;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLen), 'base64');
}

function signPayload(encodedPayload: string): string {
  return base64UrlEncode(createHmac('sha256', sessionSecret()).update(encodedPayload).digest());
}

/**
 * 签发应用会话 token（默认 24h）。前端以 Bearer 携带，后端不再依赖飞书 token 有效期。
 */
export function createAppSessionToken(
  feishuUser: FeishuAuthenUserInfo,
  dbUserId: number
): { access_token: string; expires_in: number } {
  const ttl = getAppSessionTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    db_user_id: dbUserId,
    user: feishuUser,
    iat: now,
    exp: now + ttl,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return {
    access_token: `${SESSION_PREFIX}${encodedPayload}.${signature}`,
    expires_in: ttl,
  };
}

export function isAppSessionToken(token: string): boolean {
  return token.startsWith(SESSION_PREFIX);
}

export function verifyAppSessionToken(token: string): AppSessionClaims {
  if (!isAppSessionToken(token)) {
    throw new Error('无效的会话 token');
  }

  const body = token.slice(SESSION_PREFIX.length);
  const dot = body.lastIndexOf('.');
  if (dot <= 0) {
    throw new Error('无效的会话 token');
  }

  const encodedPayload = body.slice(0, dot);
  const signature = body.slice(dot + 1);
  const expected = signPayload(encodedPayload);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('无效的会话 token');
  }

  let parsed: {
    v?: number;
    db_user_id?: number;
    user?: FeishuAuthenUserInfo;
    exp?: number;
    iat?: number;
  };
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as typeof parsed;
  } catch {
    throw new Error('无效的会话 token');
  }

  if (parsed.v !== 1 || !parsed.user || typeof parsed.db_user_id !== 'number') {
    throw new Error('无效的会话 token');
  }

  const now = Math.floor(Date.now() / 1000);
  if (!parsed.exp || parsed.exp <= now) {
    throw new Error('登录已过期，请重新登录');
  }

  return {
    dbUserId: parsed.db_user_id,
    user: parsed.user,
    exp: parsed.exp,
    iat: parsed.iat ?? 0,
  };
}

export function isAppSessionExpiredError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes('登录已过期') || msg.includes('无效的会话 token');
}
