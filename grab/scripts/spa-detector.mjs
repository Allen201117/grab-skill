/**
 * spa-detector.mjs - SPA平台检测和优化配置
 * 检测单页应用平台，自动调整爬取策略
 */

/**
 * 已知的SPA平台配置
 */
const SPA_PLATFORMS = {
  xiaohongshu: {
    name: 'xiaohongshu',
    isSPA: true,
    displayName: '小红书',
    minWaitTime: 2500,
    requiresScrollLoading: true,
    detectSelectors: ['section.note-item', '.note-detail', 'h1', '.note-feed__item', '[data-xhs-post]', '.feed'],
    errorPatterns: ['当前笔记暂时无法浏览', '该笔记已删除', '此笔记暂无法显示'],
    waitForNetworkIdle: true,
    waitForDOMStable: true,
    domStableCheckDuration: 2000
  },
  weixin: {
    name: 'weixin',
    isSPA: true,
    displayName: '微信公众号',
    minWaitTime: 6000,
    requiresScrollLoading: false,
    detectSelectors: ['.rich_media', '#js_content'],
    errorPatterns: [],
    waitForNetworkIdle: true,
    waitForDOMStable: true,
    domStableCheckDuration: 2000
  },
  douyin: {
    name: 'douyin',
    isSPA: true,
    displayName: '抖音',
    minWaitTime: 4000,
    requiresScrollLoading: true,
    detectSelectors: ['.feed-item', '[data-feed-id]'],
    errorPatterns: ['该视频不存在', '内容已删除'],
    waitForNetworkIdle: true,
    waitForDOMStable: true,
    domStableCheckDuration: 1500
  },
  zhihu: {
    name: 'zhihu',
    isSPA: true,
    displayName: '知乎',
    minWaitTime: 4000,
    requiresScrollLoading: true,
    detectSelectors: ['.Post', '.RichText'],
    errorPatterns: ['页面不存在', '内容已删除'],
    waitForNetworkIdle: true,
    waitForDOMStable: true,
    domStableCheckDuration: 1500
  },
  weibo: {
    name: 'weibo',
    isSPA: true,
    displayName: '微博',
    minWaitTime: 4000,
    requiresScrollLoading: true,
    detectSelectors: ['.Feed', '.feed-item'],
    errorPatterns: ['微博已删除', '该微博不存在'],
    waitForNetworkIdle: true,
    waitForDOMStable: true,
    domStableCheckDuration: 1500
  }
};

/**
 * 通过URL快速检查是否为已知SPA平台
 */
export function isSPAPlatform(urlString) {
  if (!urlString) return false;
  const url = urlString.toLowerCase();

  for (const [key, config] of Object.entries(SPA_PLATFORMS)) {
    if (config.isSPA) {
      // 简单的域名匹配
      const domain = key === 'xiaohongshu' ? 'xiaohongshu.com' :
                     key === 'douyin' ? 'douyin.com' :
                     key === 'weixin' ? 'mp.weixin.qq.com' :
                     key === 'zhihu' ? 'zhihu.com' :
                     key === 'weibo' ? 'weibo.com' : '';

      if (domain && url.includes(domain)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 通过DOM内容检测SPA框架（React, Vue, Angular等）
 * 返回检测到的框架列表
 */
export async function detectSPAFramework(pageText) {
  const frameworks = [];

  // 检查常见SPA框架的迹象
  if (pageText?.includes('__REACT_DEVTOOLS_GLOBAL_HOOK__') ||
      pageText?.includes('_react_root')) {
    frameworks.push('React');
  }

  if (pageText?.includes('__VUE_DEVTOOLS__') ||
      pageText?.includes('__vue__')) {
    frameworks.push('Vue');
  }

  if (pageText?.includes('angular')) {
    frameworks.push('Angular');
  }

  if (pageText?.includes('__NUXT__')) {
    frameworks.push('Nuxt.js');
  }

  if (pageText?.includes('Next.js')) {
    frameworks.push('Next.js');
  }

  // 检查<noscript>标签，通常SPA都有
  if (pageText?.includes('<noscript>')) {
    frameworks.push('SPA-indicator');
  }

  return frameworks;
}

/**
 * 为给定平台获取SPA配置
 * 如果是已知平台，返回优化的配置
 */
export function getSPAConfig(platform) {
  return SPA_PLATFORMS[platform] || null;
}

/**
 * 根据URL识别平台类型
 */
export function identifySPAPlatformByUrl(urlString) {
  if (!urlString) return null;
  const url = urlString.toLowerCase();

  for (const [key, config] of Object.entries(SPA_PLATFORMS)) {
    if (config.isSPA) {
      const domain = key === 'xiaohongshu' ? 'xiaohongshu.com' :
                     key === 'douyin' ? 'douyin.com' :
                     key === 'weixin' ? 'mp.weixin.qq.com' :
                     key === 'zhihu' ? 'zhihu.com' :
                     key === 'weibo' ? 'weibo.com' : '';

      if (domain && url.includes(domain)) {
        return key;
      }
    }
  }
  return null;
}

/**
 * 获取优化的等待配置（基于是否为SPA平台）
 */
export function getOptimizedWaitConfig(platform, baseTimeout = 30000) {
  const spaConfig = getSPAConfig(platform);

  if (spaConfig?.isSPA) {
    return {
      timeout: Math.max(baseTimeout, spaConfig.minWaitTime * 1.5),
      waitForSelectors: spaConfig.detectSelectors,
      waitForNetworkIdle: spaConfig.waitForNetworkIdle,
      waitForDOMStable: spaConfig.waitForDOMStable,
      domStableCheckDuration: spaConfig.domStableCheckDuration,
      isSPA: true
    };
  }

  return {
    timeout: baseTimeout,
    waitForSelectors: [],
    waitForNetworkIdle: false,
    waitForDOMStable: false,
    isSPA: false
  };
}

/**
 * 检查页面文本是否包含平台特定的错误信息
 */
export function checkForPlatformErrors(platform, pageText) {
  const spaConfig = getSPAConfig(platform);
  if (!spaConfig) return null;

  for (const errorPattern of spaConfig.errorPatterns) {
    if (pageText?.includes(errorPattern)) {
      return {
        hasError: true,
        errorPattern: errorPattern,
        errorType: 'platform_error'
      };
    }
  }

  return null;
}

export default {
  isSPAPlatform,
  detectSPAFramework,
  getSPAConfig,
  identifySPAPlatformByUrl,
  getOptimizedWaitConfig,
  checkForPlatformErrors,
  SPA_PLATFORMS
};
