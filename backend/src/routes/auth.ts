import express from 'express';
import { createAppSessionToken, isAppSessionToken } from '../services/appSessionService.js';
import {
  authFailureMessage,
  isExpectedAuthFailure,
  resolveAuthBearerToken,
} from '../services/authTokenResolver.js';
import {
  FeishuTenantDeniedError,
  exchangeAuthorizationCodeForUserAccessToken,
  isFeishuTenantRestrictionEnabled,
  verifyFeishuUserAccessToken,
} from '../services/feishuTenantService.js';
import { dbService } from '../services/dbService.js';

const router = express.Router();

router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/**
 * GET /api/auth/feishu/status
 * 前端用于判断是否必须登录；仅在启用租户校验时返回 appId（用于拼接授权链接）。
 */
router.get('/feishu/status', (_req, res) => {
  const authRequired = isFeishuTenantRestrictionEnabled();
  res.json({
    authRequired,
    ...(authRequired ? { appId: process.env.FEISHU_APP_ID || '' } : {}),
  });
});

/**
 * POST /api/auth/feishu/exchange
 * Body: { code } — OAuth 换票并校验租户后，签发应用会话 token（默认 24h 有效）。
 */
router.post('/feishu/exchange', async (req, res) => {
  try {
    if (!isFeishuTenantRestrictionEnabled()) {
      return res.status(400).json({ error: '未启用租户校验，无需交换登录凭证' });
    }
    const code = req.body?.code;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: '缺少有效的 code' });
    }

    const tokenPayload = await exchangeAuthorizationCodeForUserAccessToken(code.trim());
    const accessToken = tokenPayload.access_token;
    if (!accessToken) {
      return res.status(502).json({ error: '飞书未返回 access_token' });
    }

    const feishuUser = await verifyFeishuUserAccessToken(accessToken);
    const dbUserId = await dbService.upsertUserFromFeishu(feishuUser);
    const session = createAppSessionToken(feishuUser, dbUserId);

    res.json({
      access_token: session.access_token,
      expires_in: session.expires_in,
      db_user_id: dbUserId,
    });
  } catch (error: unknown) {
    console.error('feishu/exchange:', error);
    if (error instanceof FeishuTenantDeniedError) {
      res.status(403).json({ error: error.message });
      return;
    }
    const msg = error instanceof Error ? error.message : '登录交换失败';
    res.status(400).json({ error: msg });
  }
});

/**
 * GET /api/auth/feishu/me
 * 使用 Authorization: Bearer <应用会话 token>，返回用户信息（供前端探测登录态）。
 * 若仍携带旧版飞书 user_access_token，校验通过后会附带 session_token 供前端升级存储。
 */
router.get('/feishu/me', async (req, res) => {
  try {
    if (!isFeishuTenantRestrictionEnabled()) {
      return res.status(400).json({
        error: '未启用租户校验：请在 .env 配置 FEISHU_ALLOWED_TENANT_KEY（及 FEISHU_APP_ID / FEISHU_APP_SECRET）',
      });
    }
    const auth = req.headers.authorization;
    const token =
      auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({
        error: '缺少 Authorization: Bearer <应用会话 token>',
      });
    }
    const { feishuUser, dbUserId } = await resolveAuthBearerToken(token);
    const legacyToken = !isAppSessionToken(token);
    const sessionUpgrade = legacyToken
      ? createAppSessionToken(feishuUser, dbUserId)
      : null;
    res.json({
      code: 0,
      data: { ...feishuUser, db_user_id: dbUserId },
      msg: 'success',
      ...(sessionUpgrade
        ? { session_token: sessionUpgrade.access_token, expires_in: sessionUpgrade.expires_in }
        : {}),
    });
  } catch (error: unknown) {
    if (!isExpectedAuthFailure(error)) {
      console.error('feishu/me:', error);
    }
    if (error instanceof FeishuTenantDeniedError) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(401).json({ error: authFailureMessage(error) });
  }
});

export default router;

