import {
  isAppSessionExpiredError,
  isAppSessionToken,
  verifyAppSessionToken,
} from './appSessionService.js';
import {
  FeishuTenantDeniedError,
  isExpectedFeishuAccessTokenFailure,
  verifyFeishuUserAccessToken,
  type FeishuAuthenUserInfo,
} from './feishuTenantService.js';

export interface ResolvedAuthContext {
  feishuUser: FeishuAuthenUserInfo;
  dbUserId: number;
}

/**
 * 解析 Authorization Bearer：优先应用会话 token；兼容旧版飞书 user_access_token（将逐步废弃）。
 */
export async function resolveAuthBearerToken(token: string): Promise<ResolvedAuthContext> {
  if (isAppSessionToken(token)) {
    const claims = verifyAppSessionToken(token);
    return { feishuUser: claims.user, dbUserId: claims.dbUserId };
  }

  const feishuUser = await verifyFeishuUserAccessToken(token);
  const { dbService } = await import('./dbService.js');
  const dbUserId = await dbService.upsertUserFromFeishu(feishuUser);
  return { feishuUser, dbUserId };
}

export function isExpectedAuthFailure(error: unknown): boolean {
  return isAppSessionExpiredError(error) || isExpectedFeishuAccessTokenFailure(error);
}

export function authFailureMessage(error: unknown): string {
  if (error instanceof FeishuTenantDeniedError) {
    return error.message;
  }
  const msg = error instanceof Error ? error.message : String(error);
  if (isAppSessionExpiredError(error)) {
    return msg;
  }
  if (isExpectedFeishuAccessTokenFailure(error)) {
    return '登录已过期，请重新登录';
  }
  if (msg.includes('配置')) {
    return msg;
  }
  return '登录无效或已过期，请重新登录';
}
