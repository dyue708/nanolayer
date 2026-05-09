// 使用相对路径，通过 Vite 代理访问后端，避免 CORS 问题
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface GenerateImageRequest {
  prompt: string;
  model:
    | 'fal-ai/nano-banana'
    | 'fal-ai/nano-banana-pro'
    | 'fal-ai/gpt-image-1.5'
    | 'fal-ai/nano-banana-2'
    | 'fal-ai/gpt-image-2';
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
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
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

/** 飞书网页授权拿到的 user_access_token；启用后端 FEISHU_ALLOWED_TENANT_KEY 后由登录流程写入 */
export const FEISHU_TOKEN_STORAGE_KEY = 'nanolayer_feishu_user_access_token';

export function clearFeishuAccessToken() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(FEISHU_TOKEN_STORAGE_KEY);
}

export async function getFeishuAuthStatus(): Promise<{
  authRequired: boolean;
  appId?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/auth/feishu/status`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
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
  refresh_token?: string;
  refresh_expires_in?: number;
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
  return body as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
  };
}

export async function getFeishuMe(): Promise<{
  code: number;
  data: Record<string, unknown>;
  msg: string;
}> {
  return request('/auth/feishu/me', { method: 'GET' });
}

function feishuAuthHeaders(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem(FEISHU_TOKEN_STORAGE_KEY);
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
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
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
  userId?: number,
  page: number = 1,
  limit: number = 20
): Promise<ImageHistoryResponse> {
  const params = new URLSearchParams();
  if (userId) params.append('userId', userId.toString());
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

