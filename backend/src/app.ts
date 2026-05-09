import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import imagesRouter from './routes/images.js';
import analysisRouter from './routes/analysis.js';
import authRouter from './routes/auth.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, '../logs');
const APP_LOG_FILE = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_FILE = path.join(LOG_DIR, 'error.log');

function initFileLogging() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  const appStream = fs.createWriteStream(APP_LOG_FILE, { flags: 'a' });
  const errorStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: 'a' });

  const rawLog = console.log.bind(console);
  const rawWarn = console.warn.bind(console);
  const rawError = console.error.bind(console);

  const formatArgs = (args: any[]) =>
    args
      .map((arg) => {
        if (arg instanceof Error) return arg.stack || arg.message;
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');

  const writeLine = (level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const line = `[${new Date().toISOString()}] [${level}] ${message}\n`;
    appStream.write(line);
    if (level === 'ERROR') {
      errorStream.write(line);
    }
  };

  console.log = (...args: any[]) => {
    rawLog(...args);
    writeLine('INFO', formatArgs(args));
  };

  console.warn = (...args: any[]) => {
    rawWarn(...args);
    writeLine('WARN', formatArgs(args));
  };

  console.error = (...args: any[]) => {
    rawError(...args);
    writeLine('ERROR', formatArgs(args));
  };

  rawLog(`[Logger] File logging enabled: ${APP_LOG_FILE}`);
}

initFileLogging();

const app = express();
const PORT = process.env.PORT || 3000;

// 避免 JSON API 默认 ETag 触发浏览器 304，导致 fetch 拿到空体或过期的 auth 策略
app.set('etag', false);

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/images', imagesRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/auth', authRouter);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

