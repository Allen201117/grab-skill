# grab - 网页内容爬取与总结 Skill

轻量级的 Claude Code skill，用于快速爬取网页内容、提取评论、生成结构化 Markdown 总结文档。

## 快速开始

```bash
# 最简单的用法
grab "https://www.xiaohongshu.com/explore/xxx"
```

输出的 Markdown 文件自动保存到 `./outputs/` 目录。

## 功能特性

✨ **支持多个平台**
- 小红书（优先支持）
- 可扩展至 Twitter、知乎、微博等

⚡ **轻量级设计**
- 零 npm 依赖，使用纯 Node.js
- 快速部署，无兼容性问题

🎨 **智能提取**
- 自动识别和提取正文
- 智能提取评论区信息
- 自动生成高质量 Markdown

🔒 **本地化处理**
- 所有处理本地执行，不上传数据
- 临时文件自动清理

## 命令参数

```bash
grab <url> [options]

Options:
  --output <path>        输出目录（默认：./outputs/）
  --no-comments          只提取正文，不提取评论
  --comments-limit <n>   最多提取的评论条数（默认: 20）
  --verbose              输出详细日志
  --timeout <ms>         页面加载超时（默认: 30000ms）
```

## 环境要求

- Node.js ≥ 20.0
- Chrome/Chromium（已启用 remote debugging）
- web-access skill（CDP Proxy 运行中）

## 使用示例

### 基本用法
```bash
grab "https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6"
```

### 自定义输出目录
```bash
grab "https://..." --output ~/Documents/WebClips
```

### 只提取正文
```bash
grab "https://..." --no-comments
```

### 批量提取
```bash
for url in $(cat urls.txt); do
  grab "$url" --output ~/batch_results
done
```

## 输出格式

**标准返回值（JSON）：**
```json
{
  "success": true,
  "file_path": "/path/to/file.md",
  "stats": {
    "title": "...",
    "author": "...",
    "comments_count": 317,
    "extraction_time_ms": 8500
  }
}
```

**生成的 Markdown 文件包含：**
- 📌 帖子基本信息（标题、作者、发布时间）
- 📝 完整正文内容
- 💬 主要评论和讨论
- 📊 互动统计数据

## 文件结构

```
grab/
├── SKILL.md              # Skill 定义和文档
├── README.md             # 本文件
├── package.json          # npm 项目配置
├── scripts/
│   ├── grab.mjs          # 主脚本
│   ├── cdp-client.mjs    # CDP 客户端
│   ├── content-extractor.mjs
│   ├── markdown-generator.mjs
│   ├── platform-adapters/
│   │   └── xiaohongshu.mjs
│   └── utils.mjs
├── references/           # 详细文档
└── LICENSE               # MIT License
```

## 常见问题

### "无法连接到 Chrome"
1. 打开 Chrome 地址栏访问 `chrome://inspect/#remote-debugging`
2. 勾选"Allow remote debugging for this browser instance"
3. 重启浏览器

### "页面不存在"
检查 URL 是否正确，或在浏览器中验证链接是否仍可用。

### "超时"
检查网络连接，或尝试延长超时时间：`--timeout 60000`

## 许可证

MIT
