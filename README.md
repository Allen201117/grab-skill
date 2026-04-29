# grab-skill

> Claude Code 轻量级网页内容爬取 Skill，支持小红书、社交媒体帖子等平台，使用 Chrome DevTools Protocol (CDP) 控制真实浏览器爬取，自动生成结构化 Markdown 文档。

## 功能特性

- **跨平台**：支持 macOS 和 Windows
- **登录态保留**：复用 Chrome 已登录的 session，无需重复登录
- **SPA 支持**：自动等待动态渲染内容（小红书、微博等）
- **搜索结果提取**：支持小红书搜索结果页批量提取帖子列表
- **广告过滤**：自动检测并跳过广告内容 (`--filter-ads`)
- **高赞评论提取**：提取热门评论
- **AI 内容总结**：可选接入 Claude API 生成摘要
- **自动启动 Chrome**：首次运行自动检测并启动 Chrome（含指定 Profile）

## 目录结构

```
grab-skill/
├── grab/               # 主爬取 skill
│   ├── scripts/
│   │   ├── grab.mjs           # 主入口
│   │   ├── platform-adapters/ # 平台适配器（小红书等）
│   │   ├── content-extractor.mjs
│   │   ├── markdown-generator.mjs
│   │   ├── claude-summarizer.mjs
│   │   └── check-env.mjs      # 环境检查
│   └── references/
│       └── chrome-remote-debugging-setup.md
│
└── web-access/         # CDP Proxy 基础设施
    └── scripts/
        ├── cdp-proxy.mjs      # CDP 代理服务（端口 3456）
        └── check-deps.mjs     # 依赖检查 + Chrome 自动启动
```

## 快速开始

### 1. 安装

```bash
# 把 grab 和 web-access 目录放到 ~/.claude/skills/
cp -r grab web-access ~/.claude/skills/
```

### 2. 检查环境

```bash
node ~/.claude/skills/grab/scripts/check-env.mjs
```

### 3. 使用

在 Claude Code 中直接说：

```
抓取这个页面：https://example.com
```

或命令行调用：

```bash
node ~/.claude/skills/grab/scripts/grab.mjs "https://www.xiaohongshu.com/..." --desktop
```

## 常用参数

| 参数 | 说明 |
|------|------|
| `--desktop` | 使用桌面浏览器打开（用于需要登录的页面） |
| `--no-comments` | 不提取评论区 |
| `--filter-ads` | 过滤广告内容 |
| `--summarize` | 使用 Claude API 生成摘要（需配置 ANTHROPIC_API_KEY） |
| `--output <dir>` | 指定输出目录（默认桌面） |
| `--verbose` | 显示详细日志 |

## 版本历史

- **v1.7** — 跨平台支持（macOS + Windows Chrome 路径、`where node`、check-env 跨平台）
- **v1.6** — 修复 XHS 搜索结果提取（platformAdapter.extractorScript + SPA 等待）
- **v1.5** — 自动启动 Chrome（Yifan Profile）
- **v1.4** — Profile 优先逻辑（继承已登录 tab 的 browserContextId）
- **v1.3** — 广告过滤（detectAdContent）
- **v1.2** — 登录检测重试 + 高赞评论提取
- **v1.1** — SPA 检测、降级策略、环境自检
- **v1.0** — 内容提取 + AI 总结集成

## 依赖

- Node.js ≥ 20
- Google Chrome（开启 remote debugging，或由 skill 自动启动）

## 许可

MIT
