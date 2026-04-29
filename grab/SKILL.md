---
name: grab
description: >-
  轻量级内容爬取和总结工具。用于快速获取网页内容（特别是小红书、社交媒体帖子等）、提取评论区信息，并自动生成结构化 Markdown 总结文档。
  Triggers on: "grab", "抓取", "获取内容", "内容提取", "fetch content", "download content summary", "小红书", "帖子总结", "batch grab"
license: MIT
metadata:
  author: Claude Code User
  version: "1.0.0"
  status: MVP
  platform_support: ["xiaohongshu"]
---

# grab - 网页内容爬取与总结工具

## 🎯 概述

**grab** 是一个为 Claude Code 设计的轻量级 skill，用于快速爬取网页内容并生成结构化总结。特别适合处理：
- 🔴 **小红书**（笔记、评论提取）
- 📝 **社交媒体帖子**（Twitter、微博等）
- 📰 **文章和博客**（内容 + 评论）
- 🎬 **视频平台**（标题、描述、评论）

## ✨ 快速开始

### 最简单的用法
```bash
grab "https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6"
```

**输出：** 文件保存到 `./outputs/`

## 直接输出到桌面
```bash
grab "https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6" --desktop
```

**输出：** 文件直接保存到 **桌面**（最方便！）

### 自定义选项
```bash
grab "https://www.xiaohongshu.com/explore/xxx" \
  --output ~/Documents/WebClips \
  --no-comments \
  --comments-limit 50 \
  --verbose
```

## 🤖 AI 总结功能

使用 Claude AI 生成内容的智能总结（需要配置 `ANTHROPIC_API_KEY` 环境变量）

### 启用 AI 总结
```bash
grab "https://www.xiaohongshu.com/explore/xxx" --desktop --summary-only
```

**输出：** 纯总结版本，仅包含 AI 分析的核心要点和讨论点

### 总结模式对比

| 模式 | 命令 | 输出内容 | 使用场景 |
|------|------|--------|--------|
| 原始提取 | `grab url --desktop` | 原始内容 + 评论 | 需要完整原文 |
| 混合模式 | `grab url --desktop --summarize` | 原文 + AI总结 + 评论 | 快速了解 + 查证 |
| **纯总结** | `grab url --desktop --summary-only` | 仅 AI 总结 | 快速浏览核心观点 |

### 环境配置

```bash
# 设置 Claude API Key
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# 验证配置
grab "url" --summary-only --verbose
```

## 📋 命令参数

```
grab <url> [options]
```

### 必需参数
- **url**: 网页链接
  - 示例：`https://www.xiaohongshu.com/explore/xxx`
  - 支持的域名见 [平台支持](references/platforms.md)

### 可选参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--output <path>` | `./outputs/` | 输出目录（支持绝对路径） |
| `--desktop` | - | 直接输出到桌面（快捷方式） |
| `--no-comments` | - | 仅提取正文，不获取评论 |
| `--comments-limit <n>` | 20 | 最多提取的评论条数 |
| `--format [md\|json]` | md | 输出格式（目前仅 md） |
| `--save-html` | - | 同时保存原始 HTML |
| `--verbose` | - | 输出详细日志 |
| `--timeout <ms>` | 30000 | 页面加载超时时间（毫秒） |
| `--summarize` 或 `--summary` | - | 启用 AI 总结模式，包含 Claude AI 生成的内容分析 |
| `--summary-only` | - | 纯总结模式：仅输出 AI 生成的总结，不含原始提取内容 |

---

## 🔧 环境要求

### 前置依赖
- ✅ **Node.js** ≥ 20.0
- ✅ **Chrome/Chromium** （已启用 remote debugging）
- ✅ **web-access skill** （CDP Proxy 需要运行）

### 依赖检查
grab 会在首次运行时自动检查环境。如果缺失依赖，会获得详细的修复指导。

**手动检查：**
```bash
bash scripts/check-env.sh
```

---

## 💾 配置管理

### 首次运行
第一次执行 grab 时，会进入交互式配置模式：

```
🔧 首次设置 grab
================

Q1. 输出目录在哪里？(默认：./outputs/)
A:  ~/Documents/WebClips
    ✓ 已保存

Q2. 是否始终在输出中包含评论？(y/n)
A:  y
    ✓ 已保存

配置已保存到 ~/.claude/skills/grab/metadata.json
```

### 配置文件
用户配置存储在：`~/.claude/skills/grab/metadata.json`

```json
{
  "output_dir": "~/Documents/WebClips",
  "include_comments": true,
  "default_comments_limit": 20,
  "verbose": false,
  "last_used_platform": "xiaohongshu",
  "cache_dir": "/tmp/grab-cache",
  "created_at": "2026-04-20T10:00:00.000Z"
}
```

**覆盖配置：** 命令行参数优先级最高，总是会覆盖配置文件。

---

## 🎬 工作流示例

### 场景 1：快速获取小红书内容
```bash
grab "https://www.xiaohongshu.com/explore/xxx"
```
→ 自动生成 Markdown 文档到 `./outputs/`

### 场景 2：批量获取多条链接
```bash
for url in $(cat urls.txt); do
  grab "$url" --output ~/batch_grab
done
```

### 场景 3：提取内容但不要评论
```bash
grab "https://www.xiaohongshu.com/explore/xxx" --no-comments
```

### 场景 4：自定义评论数量
```bash
grab "https://www.xiaohongshu.com/explore/xxx" \
  --comments-limit 100
```

---

## 📤 输出格式

### 返回值（stdout JSON）

```json
{
  "success": true,
  "file_path": "/path/to/output.md",
  "content": "# 做出巨大屎山的经验分享\n\n...",
  "stats": {
    "title": "做出巨大屎山的经验分享",
    "author": "Xiki",
    "platform": "xiaohongshu",
    "post_url": "https://www.xiaohongshu.com/explore/xxx",
    "comments_count": 317,
    "likes_count": 459,
    "extraction_time_ms": 8500,
    "content_length_chars": 12847,
    "has_comments": true
  },
  "warnings": []
}
```

### 失败返回值

```json
{
  "success": false,
  "error": "页面不存在或已被删除",
  "error_code": "PAGE_NOT_FOUND",
  "details": "HTTP 404 - 当前笔记暂时无法浏览"
}
```

### 生成的 Markdown 文件

文件名格式：`{platform}_{post_id}_{date}_{time}.md`

示例：`xiaohongshu_69e3862c_2026-04-20_143022.md`

文件内容包含：
- 📌 **帖子基本信息**：标题、作者、发布时间、互动数据
- 📝 **正文内容**：完整的帖子文本
- 💬 **评论区总结**：置顶评论、高赞评论、关键讨论点
- 📊 **数据表格**：统计信息、参与度指标

---

## ⚠️ 常见错误和解决方案

### "找不到 Chrome"
```
❌ 错误：无法连接到 Chrome remote debugging 端口 9222
✓ 解决：
  1. 打开 Chrome 地址栏
  2. 访问 chrome://inspect/#remote-debugging
  3. 勾选"Allow remote debugging for this browser instance"
  4. 重启浏览器
```

### "页面不存在"
```
❌ 错误：页面不存在或已被删除（HTTP 404）
✓ 解决：
  - 检查 URL 是否正确
  - 在浏览器中验证链接是否仍然可用
  - 某些内容可能需要登录
```

### "超时"
```
❌ 错误：页面加载超时（30 秒）
✓ 解决：
  - 检查网络连接
  - 尝试延长超时时间：--timeout 60000
  - 目标网站可能过载，稍后重试
```

### "权限拒绝"
```
❌ 错误：创建输出目录失败
✓ 解决：
  - 检查 ~/.claude/skills/grab/metadata.json 中的 output_dir
  - 确保该目录存在且可写入
  - 运行不带参数的 grab 重新配置
```

---

## 🔐 隐私与安全

### 数据处理
- ✓ 所有数据处理本地化进行，不上传任何内容
- ✓ 临时文件保存在系统 `/tmp` 目录，任务结束自动清理
- ✓ 配置文件（metadata.json）只包含用户偏好，不包含爬取内容

### 使用建议
- ✓ 仅用于学习研究和个人整理
- ✓ 尊重网站的 robots.txt 和服务条款
- ✓ 不要恶意爬取或频繁请求

---

## 📚 更多信息

- [详细 API 文档](references/api.md)
- [平台支持列表](references/platforms.md)
- [使用示例](references/examples.md)
- [故障排除](references/troubleshooting.md)

---

## 🐛 报告问题

如果遇到 bug 或有功能建议，请：
1. 检查 [故障排除指南](references/troubleshooting.md)
2. 运行 `grab --verbose` 获取详细日志
3. 记录错误信息和使用命令

---

**版本：1.0.0 MVP | 最后更新：2026-04-20**
