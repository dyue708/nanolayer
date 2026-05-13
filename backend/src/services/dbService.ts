import { db } from '../config/database.js';
import { ImageHistory, CreateImageHistoryParams } from '../models/ImageHistory.js';
import type { FeishuAuthenUserInfo } from './feishuTenantService.js';
import type { User } from '../models/User.js';

export class DbService {
  /**
   * 根据飞书 open_id / union_id / user_id 查找本地用户
   */
  async getUserByFeishuUserId(feishuUserId: string): Promise<User | null> {
    const user = await db.get<User>(
      'SELECT * FROM users WHERE feishu_user_id = ?',
      [feishuUserId]
    );
    return user ?? null;
  }

  /**
   * 将飞书用户信息写入 users 表（存在则更新 name / email）
   */
  async upsertUserFromFeishu(feishuUser: FeishuAuthenUserInfo): Promise<number> {
    const feishuUserId = (feishuUser.open_id || feishuUser.union_id || feishuUser.user_id || '').trim();
    if (!feishuUserId) {
      throw new Error('飞书用户信息缺少唯一标识');
    }

    const name = (feishuUser.name || feishuUser.en_name || '').trim() || null;
    const email = (feishuUser.enterprise_email || feishuUser.email || '').trim() || null;

    if (db.getDbType() === 'postgres') {
      const row = await db.get<{ id: number }>(
        `INSERT INTO users (feishu_user_id, name, email, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT (feishu_user_id) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, users.name),
           email = COALESCE(EXCLUDED.email, users.email),
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [feishuUserId, name, email]
      );
      if (!row?.id) {
        throw new Error('写入用户表失败');
      }
      return row.id;
    }

    const existing = await this.getUserByFeishuUserId(feishuUserId);
    if (existing) {
      await db.run(
        `UPDATE users
         SET name = COALESCE(?, name),
             email = COALESCE(?, email),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, email, existing.id]
      );
      return existing.id;
    }

    const result = await db.run(
      'INSERT INTO users (feishu_user_id, name, email) VALUES (?, ?, ?)',
      [feishuUserId, name, email]
    );
    if (!result.lastID) {
      throw new Error('写入用户表失败');
    }
    return result.lastID;
  }

  /**
   * 创建图片历史记录
   */
  async createImageHistory(params: CreateImageHistoryParams): Promise<number> {
    const { user_id, prompt, model, image_url, thumbnail_url, cost, metadata } = params;
    
    const result = await db.run(
      `INSERT INTO image_history (user_id, prompt, model, image_url, thumbnail_url, cost, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id || null,
        prompt,
        model,
        image_url,
        thumbnail_url || null,
        cost,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    
    // lastID 现在应该已经通过 RETURNING 子句返回
    return result.lastID || 0;
  }

  /**
   * 获取图片历史记录
   */
  async getImageHistory(userId?: number, page: number = 1, limit: number = 20): Promise<{ images: ImageHistory[], total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (userId) {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    }

    // 获取总数
    const totalResult = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM image_history ${whereClause}`,
      params
    );

    // 获取列表
    const images = await db.all<ImageHistory>(
      `SELECT * FROM image_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      images: (images || []).map(img => ({
        ...img,
        cost: typeof img.cost === 'string' ? parseFloat(img.cost) : (img.cost || 0),
        metadata: img.metadata ? JSON.parse(img.metadata as string) : null
      })),
      total: totalResult?.total || 0
    };
  }

  /**
   * 根据 ID 获取图片详情
   */
  async getImageById(id: number): Promise<ImageHistory | null> {
    const image = await db.get<ImageHistory>(
      'SELECT * FROM image_history WHERE id = ?',
      [id]
    );

    if (!image) return null;

    return {
      ...image,
      cost: typeof image.cost === 'string' ? parseFloat(image.cost) : (image.cost || 0),
      metadata: image.metadata ? JSON.parse(image.metadata as string) : null
    };
  }
}

export const dbService = new DbService();

