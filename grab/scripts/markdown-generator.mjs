/**
 * markdown-generator.mjs - Markdown 文档生成（零依赖版本）
 */

/**
 * 生成纯总结版 Markdown（仅包含 AI 总结内容）
 */
function generateSummaryMarkdown(data) {
  const timestamp = new Date().toLocaleString('zh-CN');

  return `# 📊 ${data.title || '内容总结'}

> **来源：** ${data.author || '未知'}
> **平台：** ${data.platform || '未知'}
> **生成时间：** ${timestamp}

---

## 🤖 AI 综合总结

${data.content || '（无总结内容）'}

---

## 📈 统计信息

| 指标 | 数据 |
|------|------|
| **互动数** | ${data.stats?.comments || 0} 条评论 |
| **赞数** | ${data.stats?.likes || 0} |
| **分析字数** | ${data.content ? data.content.length : 0} |

---

*本文档由 grab AI 总结服务自动生成*
*如需查看原始内容，请访问原链接*
`;
}

/**
 * 小红书专用 Markdown 模板生成器
 */
export function generateXiaohongshuMarkdown(data, comments = []) {
  const timestamp = new Date().toLocaleString('zh-CN');
  const commentTable = comments && comments.length > 0
    ? generateCommentTable(comments)
    : '\n（无评论数据）\n';

  return `# 📱 ${data.title || '小红书内容'}

> **作者：** ${data.author || '未知'}
> **发布时间：** ${data.publishTime || '未知'}
> **互动数据：** ${data.stats?.likes || 0} 赞 | ${data.stats?.comments || 0} 条评论
> **数据提取：** ${timestamp}

---

## 📝 正文内容

${data.content || '（无法获取内容）'}

${data.images && data.images.length > 0 ? `
## 📸 包含媒体

共 ${data.images.length} 张图片
${data.images.slice(0, 3).map((img, i) => `- [图片 ${i + 1}](${img})`).join('\n')}
${data.images.length > 3 ? `\n... 还有 ${data.images.length - 3} 张\n` : ''}
` : ''}

---

## 💬 评论区摘要

**总评论数：** ${data.stats?.comments || 0}
**提取评论数：** ${comments.length}

${commentTable}

---

## 📊 互动统计

| 指标 | 数据 |
|------|------|
| **点赞** | ${data.stats?.likes || 0} |
| **评论** | ${data.stats?.comments || 0} |
| **分享** | ${data.stats?.shares || 0} |

---

*本文档由 grab skill 自动生成*
`;
}

/**
 * 生成评论表格
 */
function generateCommentTable(comments) {
  if (!comments || comments.length === 0) {
    return '（无评论数据）';
  }

  const rows = comments.slice(0, 15).map((comment, idx) => {
    const isObj = typeof comment === 'object' && comment !== null;
    const text = isObj ? (comment.text || '') : String(comment || '');
    const author = isObj && comment.author ? comment.author : '';
    const likes = isObj && comment.likes > 0 ? `👍 ${comment.likes}` : '';

    const truncated = text.length > 100 ? text.substring(0, 100) + '...' : text;
    const escaped = truncated.replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const authorEsc = author.replace(/\|/g, '\\|');

    return `| ${idx + 1} | ${authorEsc} | ${escaped} | ${likes} |`;
  });

  return `
| # | 作者 | 评论摘要 | 点赞 |
|---|------|---------|------|
${rows.join('\n')}
`;
}

/**
 * 通用 Markdown 生成器（支持多平台）
 */
export function generateMarkdown(data, platform = 'generic', comments = []) {
  // 如果是纯总结模式，使用总结模板
  if (data.summary_only) {
    return generateSummaryMarkdown(data);
  }

  // 否则使用平台特定的模板
  switch (platform) {
    case 'xiaohongshu':
      const xiaohongshuMarkdown = generateXiaohongshuMarkdown(data, comments);
      // 如果有 AI 总结，在开头插入
      if (data.ai_summary) {
        return `## 🤖 AI 总结\n\n${data.ai_summary}\n\n---\n\n${xiaohongshuMarkdown}`;
      }
      return xiaohongshuMarkdown;
    default:
      return generateGenericMarkdown(data, comments);
  }
}

/**
 * 通用格式 Markdown
 */
function generateGenericMarkdown(data, comments = []) {
  const timestamp = new Date().toLocaleString('zh-CN');

  return `# ${data.title || '网页内容'}

**来源：** ${data.url || '未知'}
**作者：** ${data.author || '未知'}
**发布时间：** ${data.publishTime || '未知'}
**提取时间：** ${timestamp}

---

## 正文

${data.content || '（无法获取内容）'}

${data.images && data.images.length > 0
    ? `\n## 媒体\n\n共 ${data.images.length} 张图片\n`
    : ''}

${comments.length > 0
    ? `\n## 评论\n\n共 ${comments.length} 条\n\n${comments.slice(0, 10)
      .map((c, i) => `${i + 1}. ${typeof c === 'string' ? c : c.text || ''}`)
      .join('\n\n')}\n`
    : ''}

---

*自动生成的文档*
`;
}

/**
 * 将 Markdown 文档保存到文件
 */
export async function saveMarkdownToFile(markdown, filePath) {
  const fs = await import('fs/promises');
  const path = await import('path');

  // 创建目录
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  // 保存文件
  await fs.writeFile(filePath, markdown, 'utf-8');

  return filePath;
}

/**
 * 生成输出文件名
 */
export function generateOutputFilename(platform, postId, customDir = null) {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');

  const filename = `${platform}_${postId || 'unknown'}_${date}_${time}.md`;
  const dir = customDir || './outputs';

  return `${dir}/${filename}`;
}
