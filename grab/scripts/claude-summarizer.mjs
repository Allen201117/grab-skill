#!/usr/bin/env node

/**
 * claude-summarizer.mjs - Claude API 集成模块
 * 用于生成内容的 AI 总结
 */

/**
 * 验证 API Key 配置
 */
export async function validateApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      '❌ ANTHROPIC_API_KEY 环境变量未设置\n' +
      '请设置：export ANTHROPIC_API_KEY="your-api-key"'
    );
  }
}

/**
 * 调用 Claude API 生成总结
 */
export async function summarizeContent(extractedData, comments = []) {
  const prompt = buildSummaryPrompt(extractedData, comments);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Claude API 错误 (${response.status}): ${error.error?.message || '未知错误'}`
      );
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Claude API 返回数据格式异常');
    }

    return data.content[0].text;
  } catch (error) {
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      throw error;
    }
    throw new Error(`生成总结失败: ${error.message}`);
  }
}

/**
 * 构建总结提示词
 */
function buildSummaryPrompt(extractedData, comments = []) {
  let commentsSection = '';

  if (comments && comments.length > 0) {
    const topComments = comments.slice(0, 15);
    const commentTexts = topComments
      .map((c, i) => {
        const text = typeof c === 'string' ? c : (c.text || c.comment || '');
        return `${i + 1}. ${text}`;
      })
      .join('\n');

    commentsSection = `
【评论区主要观点】（共 ${comments.length} 条评论，展示前 15 条）
${commentTexts}
`;
  }

  return `请对以下内容进行深度分析和总结：

【原文信息】
标题：${extractedData.title || '无标题'}
作者：${extractedData.author || '未知作者'}
发布时间：${extractedData.publishTime || '未知'}

【正文内容】
${extractedData.content || '（无内容）'}

${commentsSection}

请按以下格式提供总结：

## 📌 核心观点
总结原文的 2-3 个主要观点，用精炼的语言表述。

## 💬 评论区热点
总结评论中的主要讨论方向、支持观点和反对意见。（如无评论可省略）

## 🔍 综合分析
结合原文和评论，分析这个话题反映的趋势、问题或现象。

## 📊 讨论热度
评估讨论的活跃度、共识程度和分歧点。

---

总结字数根据内容复杂度自动调整（通常 300-1000 字）。保持专业、客观的语气。`;
}

/**
 * 估算内容复杂度
 */
export function estimateContentComplexity(extractedData, comments = []) {
  const contentLength = (extractedData.content || '').length;
  const commentCount = comments ? comments.length : 0;

  // 简单启发式评估
  if (contentLength < 200 && commentCount < 5) {
    return 'low';
  }
  if (contentLength < 500 && commentCount < 10) {
    return 'medium';
  }
  return 'high';
}

export default {
  validateApiKey,
  summarizeContent,
  estimateContentComplexity
};
