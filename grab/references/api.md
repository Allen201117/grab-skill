# grab Skill 详细 API 文档

## 命令行接口 (CLI)

### 基本语法

```bash
grab <url> [options]
```

### 命令参数详解

#### url (必需)

网页链接，支持的格式：

| 平台 | URL 格式 | 示例 |
|------|---------|------|
| 小红书 | `xiaohongshu.com/explore/{id}` | `https://www.xiaohongshu.com/explore/xxx` |
| 小红书+ | 带 token 参数 | `https://www.xiaohongshu.com/explore/xxx?xsec_token=...` |

**重要：** 完整的 URL 包括所有参数应该被完整复制。

---

#### --output `<path>`

指定输出目录。

**默认值：** `./outputs/`

**示例：**
```bash
grab "url" --output ~/Documents/Clips
grab "url" --output /tmp/grab_output
grab "url" --output "~/My Folder"  # 路径包含空格需要引号
```

**行为：**
- 目录不存在时会自动创建
- 指定路径会覆盖 metadata.json 中的配置
- 支持 `~/` 扩展（主目录）

---

#### --no-comments

仅提取正文，不提取评论。

**示例：**
```bash
grab "url" --no-comments
```

**效果：**
- 跳过评论区提取，加快速度
- 生成的 Markdown 不包含评论部分
- 适合只关心内容的场景

---

#### --comments-limit `<n>`

最多提取的评论条数。

**默认值：** 20

**范围：** 1-200 建议

**示例：**
```bash
grab "url" --comments-limit 50     # 提取 50 条评论
grab "url" --comments-limit 100    # 提取 100 条（需要更多滚动）
grab "url" --comments-limit 5      # 快速模式：只提取 5 条
```

**注意：**
- 数值更大 = 需要更多页面滚动 = 执行时间更长
- 页面可能没有这么多可加载的评论

---

#### --format `<format>`

输出格式（目前仅支持 Markdown）。

**可选值：**
- `md` (默认) - Markdown 格式
- `json` - 结构化 JSON（预留）

**示例：**
```bash
grab "url" --format md
```

---

#### --save-html

同时保存原始 HTML（调试用）。

**示例：**
```bash
grab "url" --save-html
```

**文件输出：**
```
outputs/xiaohongshu_xxx_2026-04-20_143022.md
outputs/xiaohongshu_xxx_2026-04-20_143022.html
```

---

#### --verbose

启用详细日志模式。

**示例：**
```bash
grab "url" --verbose
```

**输出内容：**
- 每一步的执行时间
- 提取的字符数、图片数等
- CDP 通信细节

---

#### --timeout `<ms>`

页面加载超时时间（毫秒）。

**默认值：** 30000 (30 秒)

**示例：**
```bash
grab "url" --timeout 60000         # 60 秒
grab "url" --timeout 15000         # 15 秒（快速模式）
```

**注意：**
- 过短可能导致内容未完全加载
- 过长会浪费时间
- 推荐 30-45 秒

---

## 返回值格式

### 成功返回 (exit code: 0)

```json
{
  "success": true,
  "file_path": "/Users/xxx/outputs/xiaohongshu_69e3862c_2026-04-20_143022.md",
  "content": "# 做出巨大屎山的经验分享\n\n...",
  "stats": {
    "title": "做出巨大屎山的经验分享",
    "author": "Xiki",
    "platform": "xiaohongshu",
    "post_url": "https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6",
    "comments_count": 50,
    "likes_count": 459,
    "extraction_time_ms": 8500,
    "content_length_chars": 12847,
    "has_comments": true
  },
  "warnings": []
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 是否成功 |
| `file_path` | string | 生成文件的绝对路径 |
| `content` | string | Markdown 文档内容 |
| `stats.title` | string | 帖子标题 |
| `stats.author` | string | 作者名称 |
| `stats.platform` | string | 识别的平台 |
| `stats.post_url` | string | 原始帖子 URL |
| `stats.comments_count` | number | 提取的评论数 |
| `stats.likes_count` | number | 点赞数 |
| `stats.extraction_time_ms` | number | 执行耗时（毫秒） |
| `stats.content_length_chars` | number | 正文长度 |
| `stats.has_comments` | boolean | 是否包含评论 |
| `warnings` | array | 警告信息列表 |

---

### 失败返回 (exit code: 1)

```json
{
  "success": false,
  "error": "页面不存在或已被删除",
  "error_code": "PAGE_NOT_FOUND",
  "details": "当前笔记暂时无法浏览"
}
```

### 错误代码参考

| 代码 | 含义 | 原因 |
|------|------|------|
| `PAGE_NOT_FOUND` | 页面不存在 | 帖子已删除或URL无效 |
| `LOGIN_REQUIRED` | 需要登录 | 内容需要登录访问 |
| `TIMEOUT` | 加载超时 | 页面加载耗时过长 |
| `CHROME_ERROR` | Chrome 连接失败 | 未启用 remote debugging |
| `PROXY_ERROR` | Proxy 连接失败 | CDP Proxy 未运行 |
| `UNKNOWN_ERROR` | 未知错误 | 见 details 字段 |

---

## 配置文件 (metadata.json)

**位置：** `~/.claude/skills/grab/metadata.json`

**格式：**
```json
{
  "output_dir": "./outputs",
  "include_comments": true,
  "default_comments_limit": 20,
  "verbose": false,
  "created_at": "2026-04-20T10:00:00.000Z"
}
```

**使用场景：**
- 首次运行时自动创建
- 存储用户的默认偏好
- 命令行参数会覆盖这些设置

**修改配置：**
```bash
# 直接编辑
nano ~/.claude/skills/grab/metadata.json

# 或者删除后重新配置
rm ~/.claude/skills/grab/metadata.json
grab "url"  # 会要求重新配置
```

---

## 环境变量

### DEBUG

启用调试模式（等同于 --verbose）：

```bash
DEBUG=1 grab "url"
```

---

## 批量处理示例

### 从文件中批量提取

```bash
#!/bin/bash
# grab_batch.sh

while read url; do
  echo "处理: $url"
  grab "$url" --output ~/batch_results --comments-limit 30
done < urls.txt
```

使用：
```bash
chmod +x grab_batch.sh
./grab_batch.sh
```

### 并行处理（xargs）

```bash
cat urls.txt | xargs -I {} grab {} --output ~/results --no-comments
```

---

**API 版本：** 1.0.0  
**最后更新：** 2026-04-20
