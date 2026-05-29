// 使用相对路径，通过 Vite 代理访问后端，避免 CORS 问题
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface GenerateImageRequest {
  prompt: string;
  model:
    | 'fal-ai/nano-banana'
    | 'fal-ai/nano-banana-pro'
    | 'fal-ai/gpt-image-1.5'
    | 'fal-ai/nano-banana-2'
    | 'fal-ai/gpt-image-2'
    | 'fal-ai/bytedance/seedream/v5/lite';
  /** AI 调用源：'fal'（默认）或 'vertex'（Vertex AI，仅 nano-banana 系列） */
  aiSource?: 'fal' | 'vertex';
  imageBase64?: string;
  selection?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  referenceImages?: string[];
  systemInstruction?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:1' | '1:3';
  resolution?: '0.5K' | '1K' | '2K' | '4K';
  userId?: string;
}

export interface GenerateImageResponse {
  imageUrl: string;
  thumbnailUrl: string;
  requestId: string;
  imageId: string;
  width: number;
  height: number;
  cost: number;
  imageBase64?: string; // 可选的 base64 数据，用于避免 CORS 问题
}

export interface AnalyzeImageRequest {
  imageBase64: string;
  prompt?: string;
}

export interface AnalyzeImageResponse {
  description: string;
  model?: string;
}

export interface ImageHistoryItem {
  id: number;
  user_id: number | null;
  prompt: string;
  model: string;
  image_url: string;
  thumbnail_url: string | null;
  cost: number;
  metadata: any;
  created_at: string;
}

export interface ImageHistoryResponse {
  images: ImageHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

/** 后端签发的应用会话 token（默认 24h）；OAuth 交换后写入 */
export const APP_SESSION_STORAGE_KEY = 'nanolayer_app_session_token';
/** @deprecated 旧版存飞书 user_access_token，启动时会尝试迁移 */
const LEGACY_FEISHU_TOKEN_STORAGE_KEY = 'nanolayer_feishu_user_access_token';
/** 与 APP_SESSION_STORAGE_KEY 相同，保留给现有引用 */
export const FEISHU_TOKEN_STORAGE_KEY = APP_SESSION_STORAGE_KEY;

function abortAfter(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function requestTimeoutSignal(ms: number): AbortSignal {
  const anySig = AbortSignal as typeof AbortSignal & { timeout?: (n: number) => AbortSignal };
  if (typeof anySig.timeout === 'function') {
    return anySig.timeout(ms);
  }
  return abortAfter(ms);
}

export function getStoredAppSessionToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return (
    localStorage.getItem(APP_SESSION_STORAGE_KEY) ||
    localStorage.getItem(LEGACY_FEISHU_TOKEN_STORAGE_KEY)
  );
}

export function persistAppSessionToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(APP_SESSION_STORAGE_KEY, token);
  localStorage.removeItem(LEGACY_FEISHU_TOKEN_STORAGE_KEY);
}

export function clearFeishuAccessToken() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(APP_SESSION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_FEISHU_TOKEN_STORAGE_KEY);
}

let feishuSessionReloading = false;

function hasStoredAppSessionToken(): boolean {
  return Boolean(getStoredAppSessionToken());
}

/** 应用会话失效时清本地凭证并整页刷新，由登录门重新拉起授权。 */
export function forceFeishuReLogin(): void {
  if (feishuSessionReloading || typeof window === 'undefined') return;
  feishuSessionReloading = true;
  clearFeishuAccessToken();
  window.location.reload();
}

export async function getFeishuAuthStatus(): Promise<{
  authRequired: boolean;
  appId?: string;
  /** 与后端 OAuth 换票一致的回调地址（由 FRONTEND_URL 推导，或 FEISHU_REDIRECT_URI 覆盖） */
  redirectUri?: string;
}> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/feishu/status`, {
      cache: 'no-store',
      signal: requestTimeoutSignal(15000),
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('获取登录策略超时，请确认能访问本站 /api 或稍后重试');
    }
    throw e;
  }
  if (!res.ok) {
    const hint =
      res.status === 304
        ? '接口返回 304（缓存），请强制刷新（Ctrl+Shift+R）或清空缓存'
        : `HTTP ${res.status}`;
    throw new Error(`无法获取登录策略: ${hint}`);
  }
  return res.json();
}

export async function exchangeFeishuOAuthCode(code: string): Promise<{
  access_token: string;
  expires_in?: number;
}> {
  const res = await fetch(`${API_BASE_URL}/auth/feishu/exchange`, {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({ code }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `登录交换失败: ${res.status}`);
  }
  return body as { access_token: string; expires_in?: number };
}

type FeishuMeResponse = {
  code: number;
  data: Record<string, unknown>;
  msg: string;
  session_token?: string;
  expires_in?: number;
};

export async function getFeishuMe(timeoutMs = 15000): Promise<FeishuMeResponse> {
  try {
    const result = await request<FeishuMeResponse>('/auth/feishu/me', {
      method: 'GET',
      signal: requestTimeoutSignal(timeoutMs),
    });
    if (result.session_token) {
      persistAppSessionToken(result.session_token);
    }
    return result;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('校验登录状态超时，请稍后重试');
    }
    throw e;
  }
}

function feishuAuthHeaders(): Record<string, string> {
  const token = getStoredAppSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * 通用请求函数
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...feishuAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    const message = error.error || `HTTP error! status: ${response.status}`;
    if (
      response.status === 401 &&
      hasStoredAppSessionToken() &&
      !endpoint.startsWith('/auth/feishu/exchange')
    ) {
      forceFeishuReLogin();
      return await new Promise<T>(() => {});
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * 生成或编辑图片
 */
export async function generateImage(params: GenerateImageRequest): Promise<GenerateImageResponse> {
  return request<GenerateImageResponse>('/images/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 分析图片
 */
export async function analyzeImage(params: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
  return request<AnalyzeImageResponse>('/analysis/analyze', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * 获取历史图片列表
 */
export async function getImageHistory(
  page: number = 1,
  limit: number = 20,
  options?: { onlyMine?: boolean }
): Promise<ImageHistoryResponse> {
  const params = new URLSearchParams();
  if (options?.onlyMine) params.append('onlyMine', '1');
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  return request<ImageHistoryResponse>(`/images/history?${params.toString()}`);
}

/**
 * 获取图片详情
 */
export async function getImageDetail(id: number): Promise<ImageHistoryItem> {
  return request<ImageHistoryItem>(`/images/${id}`);
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return request<{ status: string; timestamp: string }>('/health');
}

