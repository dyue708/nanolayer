import { db } from '../config/database.js';
import { ImageHistory, CreateImageHistoryParams } from '../models/ImageHistory.js';

export class DbService {
  /**
   * 创建图片历史记录
   */
  async createImageHistory(params: CreateImageHistoryParams): Promise<number> {
    const { user_id, prompt, model, image_url, thumbnail_url, cost, metadata } = params;
    
    return new Promise((resolve, reject) => {
      db.getDb().run(
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
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
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
    const totalResult = await new Promise<{ total: number } | undefined>((resolve, reject) => {
      db.getDb().get(
        `SELECT COUNT(*) as total FROM image_history ${whereClause}`,
        params,
        (err, row) => {
          if (err) reject(err);
          else resolve(row as { total: number } | undefined);
        }
      );
    });

    // 获取列表
    const images = await new Promise<ImageHistory[] | undefined>((resolve, reject) => {
      db.getDb().all(
        `SELECT * FROM image_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as ImageHistory[] | undefined);
        }
      );
    });

    return {
      images: (images || []).map(img => ({
        ...img,
        metadata: img.metadata ? JSON.parse(img.metadata as string) : null
      })),
      total: totalResult?.total || 0
    };
  }

  /**
   * 根据 ID 获取图片详情
   */
  async getImageById(id: number): Promise<ImageHistory | null> {
    const image = await new Promise<ImageHistory | undefined>((resolve, reject) => {
      db.getDb().get(
        'SELECT * FROM image_history WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row as ImageHistory | undefined);
        }
      );
    });

    if (!image) return null;

    return {
      ...image,
      metadata: image.metadata ? JSON.parse(image.metadata as string) : null
    };
  }
}

export const dbService = new DbService();

