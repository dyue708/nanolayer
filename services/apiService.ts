const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export interface GenerateImageRequest {
  prompt: string;
  model: 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro';
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
  resolution?: '1K' | '2K' | '4K';
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

/**
 * 通用请求函数
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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

