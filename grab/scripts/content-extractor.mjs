/**
 * content-extractor.mjs - 内容提取和数据处理
 */

import { evalScript } from './cdp-client.mjs';

/**
 * 从 DOM 中提取所有文本内容（小红书优化版本）
 */
export async function extractContent(targetId) {
  const extractorScript = `
    (() => {
      const result = {
        title: '',
        author: '',
        authorAvatar: '',
        content: '',
        stats: {
          likes: 0,
          comments: 0,
          shares: 0
        },
        images: [],
        publishTime: '',
        location: ''
      };

      // 尝试多种选择器组合来找到标题
      const titleElement =
        document.querySelector('h1') ||
        document.querySelector('[class*="title"]') ||
        document.querySelector('.xhsuc-note-title');
      result.title = titleElement?.innerText?.trim() || '';

      // 提取作者信息
      const authorElements = Array.from(document.querySelectorAll('a, span')).filter(el =>
        el.innerText && el.innerText.length < 50 && el.innerText.includes('关注') === false
      );

      // 获取第一个最相关的作者名
      if (authorElements.length > 0) {
        result.author = authorElements[0].innerText.split('关注')[0].trim();
      }

      // 提取主要内容
      const contentElement =
        document.querySelector('[class*="content"]') ||
        document.querySelector('[class*="description"]') ||
        document.querySelector('[class*="desc"]');

      if (contentElement) {
        const text = contentElement.innerText;
        result.content = text.substring(0, 5000); // 限制长度
      }

      // 提取图片
      const images = Array.from(document.querySelectorAll('img[src*="xhs"]')).map(img => img.src);
      result.images = images.slice(0, 20); // 最多 20 张图片

      // 尝试提取统计数据
      const statsText = document.body.innerText;
      const likesMatch = statsText.match(/(\\d+)\\s*赞/);
      const commentsMatch = statsText.match(/(\\d+)\\s*条?评论/);

      if (likesMatch) result.stats.likes = parseInt(likesMatch[1]) || 0;
      if (commentsMatch) result.stats.comments = parseInt(commentsMatch[1]) || 0;

      // 提取发布时间
      const timeElement = document.querySelector('[class*="time"]');
      result.publishTime = timeElement?.innerText?.trim() || '';

      return result;
    })()
  `;

  return await evalScript(targetId, extractorScript);
}

/**
 * 提取评论区信息（含作者、点赞数，高赞评论优先）
 */
export async function extractComments(targetId, limit = 20) {
  const extractorScript = `
    (() => {
      const comments = [];
      // 尝试多种可能的评论容器选择器
      const commentElements = document.querySelectorAll(
        '.comment-item, [class*="commentItem"], [class*="comment-item"], ' +
        '[data-testid*="comment"], .note-comment .comment-content'
      );

      for (const el of commentElements) {
        if (comments.length >= ${limit * 2}) break; // 多采集再筛选

        const text = el.innerText?.trim();
        if (!text || text.length < 5 || text.includes('输入评论') || text.includes('发布')) continue;

        // 提取作者名
        const authorEl = el.querySelector('[class*="author"], [class*="nick"], .name, .username');
        const author = authorEl?.innerText?.trim() || '';

        // 提取点赞数（匹配数字）
        const likeEl = el.querySelector('[class*="like"], [class*="count"], .like-count');
        const likeText = likeEl?.innerText?.trim() || '';
        const likeMatch = likeText.match(/\\d+/);
        const likes = likeMatch ? parseInt(likeMatch[0]) : 0;

        // 提取纯评论文本（去除作者名和点赞数部分）
        const commentTextEl = el.querySelector('[class*="content"], [class*="text"], p');
        const commentText = (commentTextEl?.innerText || text).trim().substring(0, 500);

        if (commentText.length > 5) {
          comments.push({ text: commentText, author, likes });
        }
      }

      // 按点赞数降序排列，高赞评论优先
      comments.sort((a, b) => b.likes - a.likes);

      return {
        total: commentElements.length,
        extracted: Math.min(comments.length, ${limit}),
        comments: comments.slice(0, ${limit})
      };
    })()
  `;

  return await evalScript(targetId, extractorScript);
}

/**
 * 规范化和清理数据
 */
export function normalizeData(rawData) {
  return {
    title: (rawData.title || '').trim().replace(/\\s+/g, ' '),
    author: (rawData.author || '').trim().replace(/\\s+/g, ' '),
    content: (rawData.content || '').trim(),
    stats: {
      likes: rawData.stats?.likes || 0,
      comments: rawData.stats?.comments || 0,
      shares: rawData.stats?.shares || 0
    },
    images: Array.isArray(rawData.images) ? rawData.images.filter(Boolean) : [],
    publishTime: (rawData.publishTime || '').trim(),
    location: (rawData.location || '').trim()
  };
}

/**
 * 检查页面是否存在错误状态
 */
export async function checkPageStatus(targetId) {
  const statusScript = `
    (() => {
      const bodyText = document.body.innerText;

      // 检查常见错误信息
      if (bodyText.includes('页面不存在') || bodyText.includes('不见了') || bodyText.includes('当前笔记暂时无法浏览')) {
        return { status: 'not_found' };
      }
      if (bodyText.includes('需要登录') || bodyText.includes('登录后') || bodyText.includes('请登录') || bodyText.includes('登录小红书')) {
        return { status: 'login_required' };
      }
      if (bodyText.includes('已删除') || bodyText.includes('被删除')) {
        return { status: 'deleted' };
      }
      if (bodyText.includes('加载中') || bodyText.includes('loading')) {
        return { status: 'loading' };
      }

      // 检查是否有有效的内容
      const hasContent = bodyText.length > 100 && !bodyText.includes('404');
      return { status: hasContent ? 'ok' : 'unknown' };
    })()
  `;

  return await evalScript(targetId, statusScript);
}

/**
 * 检测帖子是否为广告/商业推广内容
 * 返回 { isAd: boolean, signals: string[] }
 */
export async function detectAdContent(targetId) {
  const adScript = `
    (() => {
      const signals = [];
      const bodyText = document.body.innerText;
      const html = document.body.innerHTML;

      // 1. DOM 层面的广告标签（最可靠）
      const adLabels = document.querySelectorAll(
        '[class*="ad-label"], [class*="sponsored"], [class*="商业"], ' +
        '.feed-tag-ad, [data-ad], [class*="promote"]'
      );
      if (adLabels.length > 0) signals.push('DOM广告标签');

      // 2. 小红书"商业推广"话题标签
      if (bodyText.includes('#商业推广') || bodyText.includes('商业推广')) signals.push('#商业推广话题');

      // 3. 明确的合作声明
      const cooperationKws = ['品牌合作', '恰饭', '品牌方提供', '品牌赠送', '已获赠', '合作博主', '品牌方合作'];
      cooperationKws.forEach(kw => { if (bodyText.includes(kw)) signals.push(kw); });

      // 4. 促销/引流行为
      const promoKws = ['优惠码', '折扣码', '限时折', '点击链接购买', '评论区有链接', '私信获取', '关注主页', '下单链接'];
      promoKws.forEach(kw => { if (bodyText.includes(kw)) signals.push(kw); });

      // 5. 带货标志词 + 产品词（轻量，避免误判）
      const hasSponsorMarker = bodyText.includes('[广告]') || bodyText.includes('（广告）') || bodyText.includes('赞助商');
      if (hasSponsorMarker) signals.push('广告/赞助商标记');

      return { isAd: signals.length > 0, signals };
    })()
  `;

  return await evalScript(targetId, adScript);
}
