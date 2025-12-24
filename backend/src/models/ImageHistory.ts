export interface ImageHistory {
  id: number;
  user_id: number | null;
  prompt: string;
  model: string;
  image_url: string;
  thumbnail_url: string | null;
  cost: number;
  metadata: string | null;
  created_at: string;
}

export interface CreateImageHistoryParams {
  user_id?: number | null;
  prompt: string;
  model: string;
  image_url: string;
  thumbnail_url?: string | null;
  cost: number;
  metadata?: any;
}

