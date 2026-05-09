import { Client, withUserAccessToken } from '@larksuiteoapi/node-sdk';

/** authen.v1 user_info.get 返回的 data 结构（与开放平台文档一致） */
export interface FeishuAuthenUserInfo {
  name?: string;
  en_name?: string;
  avatar_url?: string;
  avatar_thumb?: string;
  avatar_middle?: string;
  avatar_big?: string;
  open_id?: string;
  union_id?: string;
  email?: string;
  enterprise_email?: string;
  user_id?: string;
  mobile?: string;
  tenant_key?: string;
  employee_no?: string;
}

export class FeishuTenantDeniedError extends Error {
  constructor(message = '租户不在允许列表中') {
    super(message);
    this.name = 'FeishuTenantDeniedError';
  }
}

let cachedClient: Client | null = null;

function getFeishuClient(): Client {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('启用租户校验时需配置 FEISHU_APP_ID 与 FEISHU_APP_SECRET');
  }
  if (!cachedClient) {
    cachedClient = new Client({ appId, appSecret });
  }
  return cachedClient;
}

/** 支持逗号分隔配置多个 tenant_key */
export function parseAllowedFeishuTenantKeys(): Set<string> {
  const raw = process.env.FEISHU_ALLOWED_TENANT_KEY ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isFeishuTenantRestrictionEnabled(): boolean {
  return parseAllowedFeishuTenantKeys().size > 0;
}

/**
 * OAuth 换票必填 redirect_uri，须与授权页、飞书后台「重定向 URL」完全一致。
 * 优先 FEISHU_REDIRECT_URI；未配置时用 FRONTEND_URL 并补一层末尾 `/`（与前端默认 origin+/ 对齐）。
 */
export function resolveFeishuOAuthRedirectUri(): string {
  const explicit = process.env.FEISHU_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const front = process.env.FRONTEND_URL?.trim();
  if (front) {
    return `${front.replace(/\/+$/, '')}/`;
  }

  throw new Error(
    '缺少 OAuth redirect_uri：请在 backend/.env 配置 FEISHU_REDIRECT_URI，或与前端一致的 FRONTEND_URL（例如 http://localhost:5173）'
  );
}

/**
 * OAuth 授权码换取 user_access_token（服务端持有 app secret）。
 * 使用官方 v2 接口；redirect_uri 须与授权页、前端配置完全一致，否则会报 20071。
 * @see https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/authentication-management/access-token/get-user-access-token
 */
export async function exchangeAuthorizationCodeForUserAccessToken(code: string): Promise<{
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
}> {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  const redirectUri = resolveFeishuOAuthRedirectUri();

  if (!appId || !appSecret) {
    throw new Error('启用租户校验时需配置 FEISHU_APP_ID 与 FEISHU_APP_SECRET');
  }

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    client_id: appId,
    client_secret: appSecret,
    code,
    redirect_uri: redirectUri,
  };

  const res = await fetch('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    code?: number;
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    msg?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || data.code !== 0 || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.msg ||
        data.error ||
        `换取 user_access_token 失败 (${data.code ?? res.status})`
    );
  }

  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
    refresh_expires_in: data.refresh_token_expires_in,
  };
}

/**
 * 使用用户 user_access_token 拉取用户信息，并校验 tenant_key 是否在允许列表中。
 * @see https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/server-side-sdk/nodejs-sdk/preparation-before-development
 */
export async function verifyFeishuUserAccessToken(
  userAccessToken: string
): Promise<FeishuAuthenUserInfo> {
  const allowed = parseAllowedFeishuTenantKeys();
  if (allowed.size === 0) {
    throw new Error('FEISHU_ALLOWED_TENANT_KEY 未配置');
  }

  const client = getFeishuClient();
  const res = await client.authen.v1.userInfo.get({}, withUserAccessToken(userAccessToken));

  if (res.code !== 0 || !res.data) {
    throw new Error(res.msg || '获取飞书用户信息失败');
  }

  const tk = res.data.tenant_key;
  if (!tk || !allowed.has(tk)) {
    throw new FeishuTenantDeniedError();
  }

  return res.data;
}
