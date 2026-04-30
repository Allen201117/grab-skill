#!/usr/bin/env node

/**
 * grab.mjs - grab skill 的主脚本
 * 协调内容爬取、提取、生成的整个工作流
 */

// 🔧 自动修复Node.js环境（在其他模块加载前执行）
import envAutoFix from './env-auto-fix.mjs';
const envFixResult = await envAutoFix.loadPackageManagerEnv();
if (!envFixResult.success && process.version.split('.')[0].substring(1) < 20) {
  console.error(envFixResult.errorSteps);
  process.exit(1);
}
if (envFixResult.autoFixed) {
  process.stderr.write(`✓ ${envFixResult.packageManager.toUpperCase()} 环境已自动初始化\n`);
}

import { createInterface } from 'readline';
import * as cdpClient from './cdp-client.mjs';
import * as contentExtractor from './content-extractor.mjs';
import * as markdownGen from './markdown-generator.mjs';
import * as summarizer from './claude-summarizer.mjs';
import spaDetector from './spa-detector.mjs';
import xiaohongshuAdapter from './platform-adapters/xiaohongshu.mjs';
import {
  ConfigManager,
  parseArgs,
  translateError,
  formatJsonOutput,
  sleep,
  log,
  validateUrl,
  identifyPlatform,
  Timer,
  expandPath
} from './utils.mjs';

const PLATFORMS = { xiaohongshu: xiaohongshuAdapter };

/**
 * 等待用户在 Chrome 中完成登录，然后按 Enter 继续
 */
async function waitForUserLogin(platformName) {
  process.stderr.write(`\n⚠️  需要登录: 请在 Chrome 中登录 ${platformName}，完成后按 Enter 继续...\n`);
  await new Promise(resolve => {
    const rl = createInterface({ input: process.stdin });
    rl.once('line', () => { rl.close(); resolve(); });
  });
}

async function main() {
  const timer = new Timer();
  let result = { success: false, error: null, error_code: null };

  try {
    // 1. 参数解析和验证
    const args = process.argv.slice(2);
    const parsed = parseArgs(args);
    const config = new ConfigManager();

    // 覆盖配置
    if (parsed.verbose) log`Verbose mode enabled`, true;
    const outputDir = parsed.desktop
      ? expandPath('~/Desktop')
      : (parsed.output || config.get('output_dir', './outputs'));
    const commentsLimit = parsed.commentsLimit || config.get('default_comments_limit', 20);
    const includeComments = !parsed.noComments && config.get('include_comments', true);

    // 验证 URL
    if (!parsed.url) {
      throw new Error('必须提供 URL 参数\n用法: grab <url> [options]');
    }
    if (!validateUrl(parsed.url)) {
      throw new Error(`无效的 URL: ${parsed.url}`);
    }

    log(`📥 开始处理: ${parsed.url}`, parsed.verbose);

    // 2. 识别平台
    const platform = identifyPlatform(parsed.url);
    const platformAdapter = PLATFORMS[platform];
    if (!platformAdapter) {
      throw new Error(`暂不支持的平台: ${platform}`);
    }

    log(`🎯 平台: ${platformAdapter.displayName}`, parsed.verbose);

    // 🔧 检查是否为SPA平台，如是则优化参数
    const spaConfig = spaDetector.getSPAConfig(platform);
    if (spaConfig?.isSPA) {
      const optimizedTimeout = Math.max(parsed.timeout, spaConfig.minWaitTime * 1.5);
      log(`💬 ${spaConfig.displayName} 是 SPA 应用，优化超时时间: ${parsed.timeout}ms → ${Math.round(optimizedTimeout)}ms`, parsed.verbose);
      parsed.timeout = optimizedTimeout;
      parsed.isSPA = true;
    }

    // 3. 打开页面（CDP 浏览器，优先在同平台已登录的 profile 中开 tab）
    log(`🌐 打开页面...`, parsed.verbose);
    const profileDomain = new URL(parsed.url).hostname; // e.g. www.xiaohongshu.com
    const targetId = await cdpClient.openPage(parsed.url, profileDomain);
    log(`✅ 页面已打开 (target: ${targetId})`, parsed.verbose);

    try {
      // 4. 等待页面加载
      log(`⏳ 等待页面加载...`, parsed.verbose);
      await cdpClient.waitForPageReady(targetId, parsed.timeout);
      // SPA 需要额外等待 JS 渲染 feed 内容
      if (parsed.isSPA) {
        const spaWait = spaDetector.getSPAConfig(platform)?.minWaitTime || 3000;
        const readySelectors = spaDetector.getSPAConfig(platform)?.detectSelectors || [];
        log(`⏳ SPA 等待渲染（最多 ${spaWait}ms，内容就绪则提前退出）...`, parsed.verbose);
        await cdpClient.waitForContentReady(targetId, spaWait, readySelectors);
      }
      log(`✅ 页面加载完成`, parsed.verbose);

      // 5. 检查页面状态（支持登录重试）
      log(`🔍 检查页面状态...`, parsed.verbose);
      let status = await contentExtractor.checkPageStatus(targetId);
      if (status.status === 'login_required') {
        await waitForUserLogin(platformAdapter.displayName);
        log(`🔄 重新加载页面...`, parsed.verbose);
        await cdpClient.navigatePage(targetId, parsed.url);
        await cdpClient.waitForPageReady(targetId, parsed.timeout);
        status = await contentExtractor.checkPageStatus(targetId);
      }
      if (status.status !== 'ok') {
        const errorLookup = {
          not_found: '页面不存在或已被删除',
          login_required: '登录后仍无法访问此内容，请检查账号权限',
          deleted: '内容已删除',
          loading: '页面仍在加载中，请稍候'
        };
        throw new Error(errorLookup[status.status] || '页面加载失败');
      }
      log(`✅ 页面状态正常`, parsed.verbose);

      // 6. 提取正文内容
      log(`📄 提取正文内容...`, parsed.verbose);
      let rawData;
      if (platformAdapter.extractorScript) {
        // 使用平台专属提取脚本（支持平台特定逻辑，如搜索结果页）
        rawData = await cdpClient.evalScript(targetId, platformAdapter.extractorScript);
        if (!rawData || typeof rawData !== 'object') rawData = {};
        if (!rawData.stats) rawData.stats = { likes: 0, comments: 0, shares: 0 };
      } else {
        rawData = await contentExtractor.extractContent(targetId);
      }
      const normalizedData = contentExtractor.normalizeData(rawData);
      log(`✅ 正文内容已提取 (${normalizedData.content.length} 字符)`, parsed.verbose);

      // 6.5 广告检测（默认始终检测，--filter-ads 时跳过广告帖）
      const adResult = await contentExtractor.detectAdContent(targetId);
      if (adResult.isAd) {
        log(`⚠️  检测到广告内容，信号: [${adResult.signals.join(', ')}]`, true);
        if (parsed.filterAds) {
          const adErr = new Error(`跳过广告帖: ${adResult.signals.join(', ')}`);
          adErr.code = 'AD_FILTERED';
          adErr.isAdFilter = true;
          adErr.ad_signals = adResult.signals;
          throw adErr;
        }
      }
      normalizedData.is_ad = adResult.isAd;
      normalizedData.ad_signals = adResult.signals;

      // 7. 提取评论（如果需要）
      let comments = [];
      if (includeComments) {
        log(`💬 提取评论...`, parsed.verbose);
        // 滚动以加载更多评论
        if (platformAdapter.scrollStrategy) {
          for (let i = 0; i < platformAdapter.scrollStrategy.maxScrolls; i++) {
            log(`  滚动 ${i + 1}/${platformAdapter.scrollStrategy.maxScrolls}...`, parsed.verbose);
            await cdpClient.scrollPage(
              targetId,
              platformAdapter.scrollStrategy.direction,
              platformAdapter.scrollStrategy.step
            );
            await sleep(platformAdapter.scrollStrategy.delay);
          }
        }

        // 提取评论
        const commentData = await contentExtractor.extractComments(targetId, commentsLimit);
        comments = commentData.comments || [];
        log(`✅ 已提取 ${comments.length} 条评论`, parsed.verbose);
      }

      // 8. 如果启用总结模式，调用Claude API
      if (parsed.summarize) {
        log(`🤖 验证 Claude API...`, parsed.verbose);
        await summarizer.validateApiKey();

        log(`✨ 生成 AI 总结...`, parsed.verbose);
        const summary = await summarizer.summarizeContent(normalizedData, comments);
        log(`✅ 总结已生成`, parsed.verbose);

        // 根据模式决定内容
        if (parsed.summaryOnly) {
          normalizedData.summary_only = true;
          normalizedData.original_content = normalizedData.content;
          normalizedData.content = summary;
        } else {
          normalizedData.ai_summary = summary;
        }
      }

      // 9. 生成 Markdown
      log(`📝 生成 Markdown 文档...`, parsed.verbose);
      const markdown = markdownGen.generateMarkdown(normalizedData, platform, comments);

      // 10. 生成文件名和保存
      const postId = platformAdapter.extractPostId(parsed.url);
      const expandedOutput = expandPath(outputDir);
      const filePath = markdownGen.generateOutputFilename(platform, postId, expandedOutput);

      log(`💾 保存到: ${filePath}`, parsed.verbose);
      await markdownGen.saveMarkdownToFile(markdown, filePath);
      log(`✅ 文件已保存`, parsed.verbose);

      // 11. 返回成功结果
      result = {
        success: true,
        file_path: filePath,
        content: markdown,
        stats: {
          title: normalizedData.title,
          author: normalizedData.author,
          platform: platform,
          post_url: parsed.url,
          comments_count: comments.length,
          likes_count: normalizedData.stats.likes,
          extraction_time_ms: timer.elapsed(),
          content_length_chars: normalizedData.content.length,
          has_comments: comments.length > 0,
          has_summary: parsed.summarize,
          summary_mode: parsed.summaryOnly ? 'summary_only' : (parsed.summarize ? 'with_summary' : null),
          is_ad: normalizedData.is_ad || false,
          ad_signals: normalizedData.ad_signals || []
        },
        warnings: []
      };

      log(`✅ 全部完成 (耗时: ${timer.toString()})`, parsed.verbose);

    } finally {
      // 关闭页面
      try {
        log(`🔒 关闭页面...`, parsed.verbose);
        await cdpClient.closePage(targetId);
      } catch (e) {
        log(`⚠️  关闭页面时出错: ${e.message}`, parsed.verbose);
      }
    }

  } catch (error) {
    if (error.isAdFilter) {
      result = {
        success: false,
        error: error.message,
        error_code: 'AD_FILTERED',
        is_ad: true,
        ad_signals: error.ad_signals || []
      };
      log(`🚫 广告帖已过滤: ${error.ad_signals?.join(', ')}`, true);
    } else {
      const translated = translateError(error);
      result = {
        success: false,
        error: translated.message,
        error_code: translated.code,
        details: error.message
      };
      log(`❌ 错误: ${translated.message}`, true);
    }
  }

  // 输出结果
  console.log(formatJsonOutput(result, process.env.DEBUG === '1'));
  process.exit(result.success ? 0 : 1);
}

main();
