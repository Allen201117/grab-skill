/**
 * platform-adapters/xiaohongshu.mjs - 小红书专用适配器
 */

export const xiaohongshu = {
  name: 'xiaohongshu',
  displayName: '小红书',

  // URL 匹配
  match: (url) => {
    return url.includes('xiaohongshu.com');
  },

  // 提取 Post ID
  extractPostId: (url) => {
    const match = url.match(/(?:explore|search_result)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : 'unknown';
  },

  // 判断是否搜索结果页
  isSearchResultPage: (url) => url.includes('search_result') && !url.match(/search_result\/[a-zA-Z0-9]+/),

  // 平台特定的错误检查
  checkError: (pageText) => {
    if (pageText.includes('当前笔记暂时无法浏览')) return 'NOT_FOUND';
    if (pageText.includes('需要登录')) return 'LOGIN_REQUIRED';
    if (pageText.includes('已删除')) return 'DELETED';
    return null;
  },

  // 平台特定的内容提取脚本
  extractorScript: `
    (() => {
      const data = {
        title: '',
        author: '',
        content: '',
        stats: { likes: 0, comments: 0, shares: 0 },
        publishTime: '',
        images: []
      };

      // 检测是否搜索结果页
      const isSearchPage = location.href.includes('search_result') && !location.href.match(/search_result\\/[a-zA-Z0-9]+/);

      if (isSearchPage) {
        // 搜索结果页：提取帖子列表
        const keyword = new URL(location.href).searchParams.get('keyword') || '搜索';
        data.title = keyword + ' - 搜索结果';
        data.author = '小红书搜索';

        const items = document.querySelectorAll('.feeds-container section');
        if (items.length > 0) {
          const posts = Array.from(items).map(el => {
            const titleSpan = el.querySelector('span:first-child') || el.querySelector('a[href*="search_result"] span, a[href*="explore"] span');
            const title = titleSpan?.innerText?.trim() || '';
            const authorLink = el.querySelector('a[href*="user/profile"]');
            const authorText = authorLink?.innerText?.trim() || '';
            const authorParts = authorText.split('\\n').map(s => s.trim()).filter(Boolean);
            const author = authorParts[0] || '';
            const date = authorParts[1] || '';
            const likeEl = el.querySelector('.count, [class*="like-wrapper"] .count, span.count');
            const likes = likeEl?.innerText?.trim() || el.querySelector('[class*="count"]')?.innerText?.trim() || '0';
            const href = el.querySelector('a[href*="search_result/"]')?.href || el.querySelector('a[href*="explore/"]')?.href || '';
            return { title, author, date, likes, href };
          }).filter(p => p.title && p.title.length > 1);

          data.content = posts.map((p, i) =>
            \`\\n### \${i + 1}. \${p.title}\\n作者: \${p.author} | 日期: \${p.date} | 点赞: \${p.likes}\\n链接: \${p.href}\`
          ).join('\\n');
          data.stats.likes = posts.length;
        } else {
          data.content = '搜索结果未加载，请稍后重试';
        }
        return data;
      }

      // 单篇笔记页
      data.title = document.querySelector('h1')?.innerText ||
                   document.body.innerText.split('\\n')[1] || '';

      // 作者
      const authorElements = Array.from(document.querySelectorAll('a, span'));
      const authorEl = authorElements.find(el =>
        el.innerText && el.innerText.includes('关注') && el.innerText.length < 50
      );
      if (authorEl) {
        data.author = authorEl.innerText.split('关注')[0].trim();
      }

      // 内容
      const content = document.body.innerText;
      const startIdx = content.indexOf(data.title) + data.title.length;
      const endIdx = content.indexOf('编辑于') > 0 ? content.indexOf('编辑于') : content.length;
      data.content = content.substring(startIdx, endIdx).trim();

      // 统计数据
      const statsMatch = document.body.innerText.match(/(\\d+)\\s*赞/);
      const commentsMatch = document.body.innerText.match(/(\\d+)\\s*条?评论/);
      if (statsMatch) data.stats.likes = parseInt(statsMatch[1]);
      if (commentsMatch) data.stats.comments = parseInt(commentsMatch[1]);

      // 发布时间
      const timeEl = Array.from(document.querySelectorAll('*')).find(el =>
        el.innerText && el.innerText.match(/(\\d+小时|昨天|\\d+天前)/)
      );
      if (timeEl) data.publishTime = timeEl.innerText.trim();

      // 图片
      const images = Array.from(document.querySelectorAll('img[src*="xhs"]')).map(img => img.src);
      data.images = images.slice(0, 20);

      return data;
    })()
  `,

  // 评论提取脚本（按点赞数排序，高赞优先）
  extractCommentsScript: `
    (() => {
      const comments = [];
      // 小红书评论DOM结构：.comment-item 包含作者、内容、点赞数
      const commentEls = document.querySelectorAll(
        '.comment-item, [class*="commentItem"], .feed-comment .comment'
      );

      Array.from(commentEls).slice(0, 60).forEach(el => {
        // 优先精确选择器，兜底取 innerText
        const authorEl = el.querySelector('.author-wrapper .name, .user-info .nickname, [class*="user-name"]');
        const author = authorEl?.innerText?.trim() || '';

        const contentEl = el.querySelector('.content, [class*="comment-content"], p');
        const text = (contentEl?.innerText || el.innerText)?.trim()?.substring(0, 500);
        if (!text || text.length < 5 || text.includes('输入评论')) return;

        // 点赞数
        const likeEl = el.querySelector('[class*="like"] span, .like-count, [class*="count"]');
        const likeText = likeEl?.innerText?.trim() || '0';
        const likes = parseInt(likeText.match(/\\d+/)?.[0] || '0');

        comments.push({ text, author, likes });
      });

      // 高赞优先
      comments.sort((a, b) => b.likes - a.likes);
      return comments.slice(0, 30);
    })()
  `,

  // 滚动策略
  scrollStrategy: {
    direction: 'bottom',
    step: 3000,
    delay: 800,
    maxScrolls: 5
  }
};

export default xiaohongshu;
