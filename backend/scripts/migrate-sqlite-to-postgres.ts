import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SQLiteUser {
  id: number;
  feishu_user_id: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface SQLiteImageHistory {
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

async function migrate() {
  console.log('开始迁移 SQLite 数据到 PostgreSQL...\n');

  // 1. 连接 SQLite 数据库
  const sqlitePath = path.join(__dirname, '../data/nanolayer.db');
  
  if (!existsSync(sqlitePath)) {
    console.error(`❌ SQLite 数据库文件不存在: ${sqlitePath}`);
    process.exit(1);
  }

  console.log(`📂 读取 SQLite 数据库: ${sqlitePath}`);
  const sqliteDb = new sqlite3.Database(sqlitePath);

  // 2. 连接 PostgreSQL 数据库
  const pgHost = process.env.DB_HOST || 'localhost';
  const pgPort = parseInt(process.env.DB_PORT || '5432');
  const pgDatabase = process.env.DB_NAME || 'nanolayer';
  const pgUser = process.env.DB_USER || 'postgres';
  const pgPassword = process.env.DB_PASSWORD;
  const pgSSL = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  if (!pgPassword) {
    console.error('❌ 请设置 PostgreSQL 环境变量：DB_HOST, DB_NAME, DB_USER, DB_PASSWORD');
    sqliteDb.close();
    process.exit(1);
  }

  console.log(`🔌 连接 PostgreSQL 数据库: ${pgUser}@${pgHost}:${pgPort}/${pgDatabase}`);
  const pgPool = new Pool({
    host: pgHost,
    port: pgPort,
    database: pgDatabase,
    user: pgUser,
    password: pgPassword,
    ssl: pgSSL
  });

  try {
    // 测试 PostgreSQL 连接
    await pgPool.query('SELECT 1');
    console.log('✅ PostgreSQL 连接成功\n');

    // 3. 读取 SQLite 数据
    console.log('📖 读取 SQLite 数据...');
    
    // 读取 users 表
    const users = await new Promise<SQLiteUser[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SQLiteUser[]);
      });
    });
    console.log(`   找到 ${users.length} 个用户记录`);

    // 读取 image_history 表
    const imageHistory = await new Promise<SQLiteImageHistory[]>((resolve, reject) => {
      sqliteDb.all('SELECT * FROM image_history ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as SQLiteImageHistory[]);
      });
    });
    console.log(`   找到 ${imageHistory.length} 个图片历史记录\n`);

    // 4. 迁移 users 表数据
    if (users.length > 0) {
      console.log('📝 迁移 users 表数据...');
      
      // 检查 PostgreSQL 中是否已有数据
      const existingUsers = await pgPool.query('SELECT COUNT(*) as count FROM users');
      const existingCount = parseInt(existingUsers.rows[0].count);
      
      if (existingCount > 0) {
        console.log(`   ⚠️  PostgreSQL 中已有 ${existingCount} 条用户记录`);
        const overwrite = process.argv.includes('--overwrite');
        if (!overwrite) {
          console.log('   ⏭️  跳过 users 表迁移（使用 --overwrite 参数可覆盖现有数据）');
        } else {
          console.log('   🗑️  清空现有 users 表...');
          await pgPool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
          await migrateUsers(users, pgPool);
        }
      } else {
        await migrateUsers(users, pgPool);
      }
    } else {
      console.log('📝 users 表为空，跳过迁移');
    }

    // 5. 迁移 image_history 表数据
    if (imageHistory.length > 0) {
      console.log('\n📝 迁移 image_history 表数据...');
      
      // 检查 PostgreSQL 中是否已有数据
      const existingImages = await pgPool.query('SELECT COUNT(*) as count FROM image_history');
      const existingCount = parseInt(existingImages.rows[0].count);
      
      if (existingCount > 0) {
        console.log(`   ⚠️  PostgreSQL 中已有 ${existingCount} 条图片记录`);
        const overwrite = process.argv.includes('--overwrite');
        if (!overwrite) {
          console.log('   ⏭️  跳过 image_history 表迁移（使用 --overwrite 参数可覆盖现有数据）');
        } else {
          console.log('   🗑️  清空现有 image_history 表...');
          await pgPool.query('TRUNCATE TABLE image_history RESTART IDENTITY');
          await migrateImageHistory(imageHistory, pgPool);
        }
      } else {
        await migrateImageHistory(imageHistory, pgPool);
      }
    } else {
      console.log('\n📝 image_history 表为空，跳过迁移');
    }

    console.log('\n✅ 迁移完成！');
    console.log(`   - 用户记录: ${users.length} 条`);
    console.log(`   - 图片记录: ${imageHistory.length} 条`);

  } catch (error) {
    console.error('\n❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

async function migrateUsers(users: SQLiteUser[], pgPool: Pool) {
  if (users.length === 0) return;
  
  let migrated = 0;
  
  // 先重置序列，确保可以插入自定义 ID
  const maxId = Math.max(...users.map(u => u.id), 0);
  if (maxId > 0) {
    await pgPool.query(`SELECT setval('users_id_seq', $1, true)`, [maxId]);
  }
  
  for (const user of users) {
    try {
      await pgPool.query(
        `INSERT INTO users (id, feishu_user_id, name, email, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           feishu_user_id = EXCLUDED.feishu_user_id,
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           updated_at = EXCLUDED.updated_at`,
        [
          user.id,
          user.feishu_user_id,
          user.name,
          user.email,
          user.created_at,
          user.updated_at
        ]
      );
      migrated++;
    } catch (error: any) {
      console.error(`   ❌ 迁移用户 ID ${user.id} 失败:`, error.message);
    }
  }
  console.log(`   ✅ 成功迁移 ${migrated}/${users.length} 条用户记录`);
}

async function migrateImageHistory(images: SQLiteImageHistory[], pgPool: Pool) {
  if (images.length === 0) return;
  
  let migrated = 0;
  
  // 先重置序列，确保可以插入自定义 ID
  const maxId = Math.max(...images.map(img => img.id), 0);
  if (maxId > 0) {
    await pgPool.query(`SELECT setval('image_history_id_seq', $1, true)`, [maxId]);
  }
  
  for (const image of images) {
    try {
      await pgPool.query(
        `INSERT INTO image_history (id, user_id, prompt, model, image_url, thumbnail_url, cost, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           user_id = EXCLUDED.user_id,
           prompt = EXCLUDED.prompt,
           model = EXCLUDED.model,
           image_url = EXCLUDED.image_url,
           thumbnail_url = EXCLUDED.thumbnail_url,
           cost = EXCLUDED.cost,
           metadata = EXCLUDED.metadata,
           created_at = EXCLUDED.created_at`,
        [
          image.id,
          image.user_id,
          image.prompt,
          image.model,
          image.image_url,
          image.thumbnail_url,
          image.cost,
          image.metadata,
          image.created_at
        ]
      );
      migrated++;
    } catch (error: any) {
      console.error(`   ❌ 迁移图片 ID ${image.id} 失败:`, error.message);
    }
  }
  console.log(`   ✅ 成功迁移 ${migrated}/${images.length} 条图片记录`);
}

// 运行迁移
migrate().catch(console.error);

