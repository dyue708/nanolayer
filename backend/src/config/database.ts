import sqlite3 from 'sqlite3';
import { Pool, Client } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

// 确保环境变量已加载
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据库接口定义
export interface IDatabase {
  run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  close(): Promise<void>;
  getDbType(): 'sqlite' | 'postgres';
}

// SQLite 数据库实现
export class SQLiteDatabase implements IDatabase {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    const dataDir = path.join(__dirname, '../../data');
    this.dbPath = dbPath || path.join(dataDir, 'nanolayer.db');

    // 确保 data 目录存在
    if (!existsSync(path.dirname(this.dbPath))) {
      mkdirSync(path.dirname(this.dbPath), { recursive: true });
    }

    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
        throw err;
      } else {
        console.log('Connected to SQLite database:', this.dbPath);
        this.initTables();
      }
    });
  }

  getDbType(): 'sqlite' | 'postgres' {
    return 'sqlite';
  }

  private initTables() {
    // 创建 users 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feishu_user_id TEXT UNIQUE,
        name TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建 image_history 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS image_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        prompt TEXT NOT NULL,
        model TEXT NOT NULL,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        cost DECIMAL(10, 6) DEFAULT 0,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
  }

  async run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params || [], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params || [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T | undefined);
        }
      });
    });
  }

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params || [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // SQLite 特有的方法，保持向后兼容
  getDb(): sqlite3.Database {
    return this.db;
  }
}

// PostgreSQL 数据库实现
export class PostgreSQLDatabase implements IDatabase {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    const host = process.env.DB_HOST;
    const port = parseInt(process.env.DB_PORT || '5432');
    const database = process.env.DB_NAME;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

    if (!host || !database || !user || !password) {
      throw new Error('PostgreSQL configuration is missing. Please set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in .env file');
    }

    this.pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      ssl
    });

    // 测试连接并初始化表（异步，但不阻塞构造函数）
    this.initialize();
  }

  private async initialize() {
    try {
      await this.pool.query('SELECT 1');
      console.log('Connected to PostgreSQL database:', `${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME}`);
      await this.initTables();
      this.initialized = true;
    } catch (err: any) {
      console.error('Error connecting to PostgreSQL database:', err);
      
      // 提供更友好的错误提示
      if (err.code === '3D000') {
        // 数据库不存在
        console.error('\n❌ 数据库不存在！');
        console.error(`请先创建数据库 "${process.env.DB_NAME}"`);
        console.error('\n创建数据库的方法：');
        console.error('1. 使用 psql 命令行工具：');
        console.error(`   psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST}`);
        console.error(`   CREATE DATABASE ${process.env.DB_NAME};`);
        console.error('\n2. 或者使用 pgAdmin 图形界面创建数据库');
        console.error('\n3. 或者运行以下命令（如果 PostgreSQL 在本地）：');
        console.error(`   createdb -U ${process.env.DB_USER} ${process.env.DB_NAME}`);
      } else if (err.code === '28P01') {
        // 认证失败
        console.error('\n❌ 数据库认证失败！');
        console.error('请检查 .env 文件中的 DB_USER 和 DB_PASSWORD 是否正确');
      } else if (err.code === 'ECONNREFUSED') {
        // 连接被拒绝
        console.error('\n❌ 无法连接到 PostgreSQL 服务器！');
        console.error(`请检查 PostgreSQL 服务是否运行，以及 DB_HOST=${process.env.DB_HOST} 和 DB_PORT=${process.env.DB_PORT || '5432'} 是否正确`);
      }
      
      console.error('\n⚠️  PostgreSQL 连接失败。应用将继续运行，但数据库操作可能会失败。');
    }
  }

  getDbType(): 'sqlite' | 'postgres' {
    return 'postgres';
  }

  // 将 SQLite 风格的 SQL 转换为 PostgreSQL 兼容的 SQL
  private convertSQL(sql: string): string {
    // 替换 ? 占位符为 $1, $2, ...
    let paramIndex = 1;
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }

  private async initTables() {
    try {
      // 创建 users 表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          feishu_user_id TEXT UNIQUE,
          name TEXT,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建 image_history 表
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS image_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          prompt TEXT NOT NULL,
          model TEXT NOT NULL,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          cost DECIMAL(10, 6) DEFAULT 0,
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      console.log('PostgreSQL tables initialized successfully');
    } catch (err) {
      console.error('Error initializing PostgreSQL tables:', err);
      throw err;
    }
  }

  async run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }> {
    const convertedSQL = this.convertSQL(sql);
    
    // 如果是 INSERT 语句，添加 RETURNING id 子句以获取插入的 ID
    let finalSQL = convertedSQL;
    const sqlUpper = sql.trim().toUpperCase();
    if (sqlUpper.startsWith('INSERT')) {
      // 检查是否已经有 RETURNING 子句
      if (!/RETURNING/i.test(convertedSQL)) {
        // 移除末尾的分号（如果有），然后添加 RETURNING id
        finalSQL = convertedSQL.replace(/;\s*$/, '').trim() + ' RETURNING id';
      }
    }
    
    const result = await this.pool.query(finalSQL, params || []);
    
    // 对于 INSERT 语句，从 RETURNING 子句的结果中获取 id
    const lastID = sqlUpper.startsWith('INSERT') && result.rows[0]?.id 
      ? result.rows[0].id 
      : undefined;
    
    return {
      lastID,
      changes: result.rowCount || 0
    };
  }

  async get<T = any>(sql: string, params?: any[]): Promise<T | undefined> {
    const convertedSQL = this.convertSQL(sql);
    const result = await this.pool.query(convertedSQL, params || []);
    return result.rows[0] as T | undefined;
  }

  async all<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const convertedSQL = this.convertSQL(sql);
    const result = await this.pool.query(convertedSQL, params || []);
    return result.rows as T[];
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// 数据库工厂函数
export function createDatabase(): IDatabase {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase().trim();
  
  console.log(`Database type: ${dbType} (from DB_TYPE=${process.env.DB_TYPE || 'not set'})`);

  if (dbType === 'postgres' || dbType === 'postgresql') {
    return new PostgreSQLDatabase();
  } else {
    return new SQLiteDatabase();
  }
}

// 导出单例数据库实例
export const db = createDatabase();
