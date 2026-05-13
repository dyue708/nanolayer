export interface User {
  id: number;
  feishu_user_id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertUserParams {
  feishu_user_id: string;
  name?: string | null;
  email?: string | null;
}
