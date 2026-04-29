/**
 * fallback-handler.mjs - Web-access降级协作和错误恢复
 * 当CDP操作失败时，自动尝试web-access降级或重试
 */

import http from 'http';

const PROXY_HEALTH_URL = 'http://localhost:3456/health';
const PROXY_TIMEOUT = 5000;

/**
 * 错误分类
 */
const ERROR_CATEGORIES = {
  RETRYABLE: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', '连接断开', 'socket hang up'],
  CRITICAL: ['404', 'PAGE_NOT_FOUND', 'LOGIN_REQUIRED', '需要登录'],
  TRANSIENT: ['超时', '网络错误', 'Proxy不可用', '临时故障']
};

/**
 * 判断错误是否应该重试
 */
export function shouldRetry(error, attemptCount = 0, maxAttempts = 3) {
  if (attemptCount >= maxAttempts) return false;

  const errorStr = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  // 检查重试列表
  for (const pattern of ERROR_CATEGORIES.RETRYABLE) {
    if (errorStr.includes(pattern.toLowerCase()) || errorCode.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  // 检查临时错误列表
  for (const pattern of ERROR_CATEGORIES.TRANSIENT) {
    if (errorStr.includes(pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * 分类错误为critical/transient/other
 */
export function classifyError(error) {
  const errorStr = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  for (const pattern of ERROR_CATEGORIES.CRITICAL) {
    if (errorStr.includes(pattern.toLowerCase()) || errorCode.includes(pattern.toLowerCase())) {
      return 'critical';
    }
  }

  for (const pattern of ERROR_CATEGORIES.TRANSIENT) {
    if (errorStr.includes(pattern.toLowerCase())) {
      return 'transient';
    }
  }

  return 'unknown';
}

/**
 * 检查Proxy是否可用
 */
export async function checkProxyHealth() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3456,
      path: '/targets',
      method: 'GET',
      timeout: PROXY_TIMEOUT
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * 调用web-access Proxy的fallback端点
 * 如果web-access可用，尝试用它爬取内容
 */
export async function callWebAccessFallback(url, options = {}) {
  try {
    // 检查Proxy是否可用
    const isHealthy = await checkProxyHealth();
    if (!isHealthy) {
      return { success: false, reason: 'proxy_unavailable' };
    }

    // 注：实际的web-access集成需要在grab.mjs中处理
    // 这里只是演示降级调用的框架
    // 如果Proxy健康，可以通过HTTP向http://localhost:3456/new等端点发送请求

    return {
      success: false,
      reason: 'fallback_not_integrated_yet',
      message: '降级功能已框架化，可通过grab.mjs中的try-catch块触发'
    };
  } catch (e) {
    return {
      success: false,
      reason: 'fetch_error',
      error: e.message
    };
  }
}

/**
 * 转换web-access结果为grab的统一格式
 */
export function transformFallbackResult(rawResult, platform = 'generic') {
  if (!rawResult?.success) {
    return null;
  }

  const data = rawResult.data;
  return {
    success: true,
    content: data.content || data.text || '',
    title: data.title || '',
    author: data.author || '',
    stats: {
      likes: data.likes || 0,
      comments: data.comments || 0,
      shares: data.shares || 0
    },
    source: 'fallback'
  };
}

/**
 * 生成包含修复建议的错误信息
 */
export function generateFallbackError(error, errorType = 'unknown') {
  const suggestions = {
    proxy_down: `
❌ CDP Proxy 连接失败，且 web-access 也不可用

修复步骤：
1. 确保 Chrome 启用了 remote debugging:
   - 打开 Chrome 地址栏
   - 访问 chrome://inspect/#remote-debugging
   - 勾选 "Allow remote debugging for this browser instance"

2. 检查 web-access skill 是否正在运行:
   - 在 Chrome 中运行命令：
   - 或手动启动 web-access Proxy

3. 检查 localhost:3456 是否可访问:
   curl http://localhost:3456/targets
`,
    network_error: `
❌ 网络连接出现暂时性错误

修复步骤：
1. 检查网络连接
2. 稍候几秒后重试
3. 如果问题持续，检查是否需要代理配置
`,
    unknown: `
❌ 发生了预期外的错误

修复步骤：
1. 查看完整的错误信息
2. 在 verbose 模式下重试: grab <url> --verbose
3. 如果问题持续，请报告问题
`
  };

  return suggestions[errorType] || suggestions.unknown;
}

/**
 * 执行带降级的异步操作
 * 如果主操作失败，自动尝试降级方案
 */
export async function executeWithFallback(
  mainOperation,
  { url, platform = 'generic', timeout = 30000, maxRetries = 3 } = {}
) {
  let lastError = null;
  let attemptCount = 0;

  // 第一阶段：尝试原始操作（含重试）
  while (attemptCount < maxRetries) {
    try {
      return await mainOperation();
    } catch (error) {
      lastError = error;
      attemptCount++;

      const errorType = classifyError(error);
      if (errorType === 'critical') {
        // 重大错误，直接失败，不重试也不降级
        throw error;
      }

      if (shouldRetry(error, attemptCount, maxRetries)) {
        // 可重试的错误，等待后重试
        await new Promise(r => setTimeout(r, Math.pow(2, attemptCount) * 1000));
        continue;
      }

      // 不可重试，退出循环进入降级
      break;
    }
  }

  // 第二阶段：尝试web-access降级
  try {
    const fallbackResult = await callWebAccessFallback(url, { timeout });
    if (fallbackResult.success) {
      const transformed = transformFallbackResult(fallbackResult, platform);
      if (transformed) {
        return transformed;
      }
    }
  } catch (e) {
    // 降级也失败了
  }

  // 第三阶段：返回最终错误
  const errorType = classifyError(lastError);
  const errorSuggestions = generateFallbackError(lastError, errorType);

  const error = new Error(`${lastError.message}\n\n${errorSuggestions}`);
  error.code = lastError.code || 'OPERATION_FAILED';
  error.fallback_attempted = true;
  throw error;
}

export default {
  shouldRetry,
  classifyError,
  checkProxyHealth,
  callWebAccessFallback,
  transformFallbackResult,
  generateFallbackError,
  executeWithFallback,
  ERROR_CATEGORIES
};
