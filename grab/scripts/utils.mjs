/**
 * utils.mjs - 工具函数库
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * 配置文件管理
 */
export class ConfigManager {
  constructor() {
    this.skillDir = join(homedir(), '.claude', 'skills', 'grab');
    this.configPath = join(this.skillDir, 'metadata.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    if (existsSync(this.configPath)) {
      try {
        const data = readFileSync(this.configPath, 'utf-8');
        return JSON.parse(data);
      } catch (e) {
        return this.getDefaultConfig();
      }
    }
    return this.getDefaultConfig();
  }

  saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.error('保存配置失败:', e.message);
    }
  }

  getDefaultConfig() {
    return {
      output_dir: './outputs',
      include_comments: true,
      default_comments_limit: 20,
      verbose: false,
      created_at: new Date().toISOString()
    };
  }

  get(key, defaultValue = null) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  set(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }
}

/**
 * 参数解析
 */
export function parseArgs(args) {
  const result = {
    url: null,
    output: null,
    desktop: false,
    noComments: false,
    commentsLimit: 20,
    format: 'md',
    saveHtml: false,
    verbose: false,
    timeout: 30000,
    summarize: false,
    summaryOnly: false,
    filterAds: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('http')) {
      result.url = arg;
    } else if (arg === '--output' && i + 1 < args.length) {
      result.output = args[++i];
    } else if (arg === '--desktop') {
      result.desktop = true;
    } else if (arg === '--no-comments') {
      result.noComments = true;
    } else if (arg === '--comments-limit' && i + 1 < args.length) {
      result.commentsLimit = parseInt(args[++i]) || 20;
    } else if (arg === '--format' && i + 1 < args.length) {
      result.format = args[++i];
    } else if (arg === '--save-html') {
      result.saveHtml = true;
    } else if (arg === '--verbose') {
      result.verbose = true;
    } else if (arg === '--timeout' && i + 1 < args.length) {
      result.timeout = parseInt(args[++i]) || 30000;
    } else if (arg === '--summarize' || arg === '--summary') {
      result.summarize = true;
    } else if (arg === '--summary-only') {
      result.summarize = true;
      result.summaryOnly = true;
    } else if (arg === '--filter-ads') {
      result.filterAds = true;
    }

    i++;
  }

  return result;
}

/**
 * 错误翻译
 */
export function translateError(error) {
  const msg = error?.message || '';

  if (msg.includes('404') || msg.includes('不存在')) {
    return { code: 'PAGE_NOT_FOUND', message: '页面不存在或已被删除' };
  }
  if (msg.includes('timeout')) {
    return { code: 'TIMEOUT', message: '页面加载超时，请检查网络连接' };
  }
  if (msg.includes('登录')) {
    return { code: 'LOGIN_REQUIRED', message: '需要登录后才能访问' };
  }
  if (msg.includes('Chrome')) {
    return { code: 'CHROME_ERROR', message: 'Chrome 连接失败，请检查是否已启用 remote debugging' };
  }
  if (msg.includes('Proxy')) {
    return { code: 'PROXY_ERROR', message: 'CDP Proxy 连接失败，请检查 web-access skill 是否运行' };
  }

  return { code: 'UNKNOWN_ERROR', message: msg || '未知错误' };
}

/**
 * JSON 输出格式化
 */
export function formatJsonOutput(data, prettify = false) {
  const json = prettify
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  return json;
}

/**
 * 睡眠函数
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 日志记录
 */
export function log(message, verbose = false) {
  if (!verbose && typeof verbose !== 'undefined') return;
  console.error(`[grab] ${message}`);
}

/**
 * 验证 URL
 */
export function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 平台识别
 */
export function identifyPlatform(url) {
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('zhihu.com')) return 'zhihu';
  if (url.includes('weibo.com')) return 'weibo';
  return 'generic';
}

/**
 * 性能计时
 */
export class Timer {
  constructor(name = 'timer') {
    this.name = name;
    this.start = Date.now();
  }

  elapsed() {
    return Date.now() - this.start;
  }

  toString() {
    const ms = this.elapsed();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }
}

/**
 * 展开路径（~/ 替换为 home）
 */
export function expandPath(filePath) {
  if (filePath.startsWith('~/')) {
    return join(homedir(), filePath.slice(2));
  }
  return filePath;
}
