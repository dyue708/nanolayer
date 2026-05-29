import type { RequestHandler } from 'express';
import {
  authFailureMessage,
  isExpectedAuthFailure,
  resolveAuthBearerToken,
} from '../services/authTokenResolver.js';
import {
  FeishuTenantDeniedError,
  isFeishuTenantRestrictionEnabled,
  type FeishuAuthenUserInfo,
} from '../services/feishuTenantService.js';

declare global {
  namespace Express {
    interface Request {
      /** 校验通过后的飞书用户信息（仅当启用 FEISHU_ALLOWED_TENANT_KEY 且请求合法时存在） */
      feishuUser?: FeishuAuthenUserInfo;
      /** 与 feishuUser 对应的本地 users.id */
      feishuDbUserId?: number;
    }
  }
}

function extractBearerToken(authorization: string | undefined): string | null {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice(7).trim();
  return token || null;
}

/**
 * 当配置了 FEISHU_ALLOWED_TENANT_KEY 时：要求 Authorization: Bearer <应用会话 token>（默认 24h）。
 * 未配置时：不拦截（兼容本地开发）。
 *
 * 注意：不含 GET /proxy（img 标签无法带 Bearer），需在路由中把 proxy 注册在本中间件之前。
 */
export const requireFeishuTenantWhenConfigured: RequestHandler = async (req, res, next) => {
  if (!isFeishuTenantRestrictionEnabled()) {
    next();
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({
      error: '需要登录：请在 Authorization 头携带 Bearer <应用会话 token>',
    });
    return;
  }

  try {
    const { feishuUser, dbUserId } = await resolveAuthBearerToken(token);
    req.feishuUser = feishuUser;
    req.feishuDbUserId = dbUserId;
    next();
  } catch (e: unknown) {
    if (e instanceof FeishuTenantDeniedError) {
      res.status(403).json({ error: e.message });
      return;
    }
    if (!isExpectedAuthFailure(e)) {
      console.error('Feishu tenant auth failed:', e);
    }
    res.status(401).json({ error: authFailureMessage(e) });
  }
};
