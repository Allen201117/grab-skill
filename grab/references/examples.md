# grab 使用示例

## 基础示例

### 最简单的用法

```bash
grab "https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6"
```

**输出：**
```json
{
  "success": true,
  "file_path": "/Users/xxx/outputs/xiaohongshu_69e3862c_2026-04-20_143022.md",
  "stats": {
    "title": "做出巨大屎山的经验分享",
    "author": "Xiki",
    "comments_count": 27,
    "likes_count": 459
  }
}
```

**生成的文件：** `outputs/xiaohongshu_69e3862c_2026-04-20_143022.md`

---

## 常用场景示例

### 场景 1: 快速提取正文（不要评论）

```bash
grab "https://www.xiaohongshu.com/explore/xxx" --no-comments
```

**优点：** 速度快（节省 30-50% 时间）

**适用：** 只关心帖子内容的情况

---

### 场景 2: 获取完整评论讨论

```bash
grab "https://www.xiaohongshu.com/explore/xxx" \
  --comments-limit 100 \
  --timeout 45000
```

**效果：** 
- 最多提取 100 条评论
- 给予更多时间来加载和滚动

**适用：** 需要了解用户讨论和反应

---

### 场景 3: 自定义输出目录

```bash
grab "https://www.xiaohongshu.com/explore/xxx" \
  --output ~/Documents/MyClips
```

**结果：** 文件保存到 `~/Documents/MyClips/`

---

### 场景 4: 批量提取多个帖子

```bash
#!/bin/bash

urls=(
  "https://www.xiaohongshu.com/explore/xxx1"
  "https://www.xiaohongshu.com/explore/xxx2"
  "https://www.xiaohongshu.com/explore/xxx3"
)

for url in "${urls[@]}"; do
  echo "提取: $url"
  grab "$url" --output ~/batch_results --comments-limit 20
  sleep 2  # 避免过快请求
done

echo "所有文件已保存到 ~/batch_results"
```

**使用：**
```bash
chmod +x batch_grab.sh
./batch_grab.sh
```

---

### 场景 5: 从文件读取 URL 列表

**urls.txt 内容：**
```
https://www.xiaohongshu.com/explore/xxx1
https://www.xiaohongshu.com/explore/xxx2
https://www.xiaohongshu.com/explore/xxx3
```

**处理脚本：**
```bash
while read url; do
  [ -z "$url" ] && continue
  grab "$url" --output ~/results
done < urls.txt
```

---

### 场景 6: 带调试信息的运行

```bash
grab "https://www.xiaohongshu.com/explore/xxx" --verbose
```

**输出示例：**
```
[grab] 🌐 打开页面...
[grab] ✅ 页面已打开 (target: DF347...)
[grab] ⏳ 等待页面加载...
[grab] ✅ 页面加载完成
[grab] 📄 提取正文内容...
[grab] ✅ 正文内容已提取 (12847 字符)
[grab] 💬 提取评论...
[grab] ✅ 已提取 27 条评论
```

---

## 高级用法

### 处理特殊 URL（带 token）

某些小红书链接包含 token 参数，使用完整 URL 增加成功率：

```bash
grab "https://www.xiaohongshu.com/explore/xxx?xsec_token=ABB00E6IvuRj..." \
  --comments-limit 50
```

---

### 配合其他工具

#### 生成内容总结（使用 claude）

```bash
# 提取内容
grab "url" > content.json

# 用 curl 调用 Claude API 生成总结
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d @- <<EOF | jq '.content[0].text'
{
  "model": "claude-opus-4-6",
  "messages": [{
    "role": "user",
    "content": "总结这篇文章的核心观点...\n\n$(cat content.json)"
  }]
}
EOF
```

#### 生成 HTML 版本

```bash
# 提取 Markdown
grab "url" > post.md

# 转换为 HTML（需要 pandoc）
pandoc post.md -o post.html
```

#### 上传到云存储

```bash
grab "url" && \
aws s3 cp outputs/*.md s3://my-bucket/clips/
```

---

### 监控和统计

```bash
# 统计已提取的文件数
find outputs/ -name "*.md" | wc -l

# 查看最近的 5 个文件
ls -lt outputs/*.md | head -5

# 计算总的提取内容大小
du -sh outputs/
```

---

## 出错处理示例

### 循环重试

```bash
#!/bin/bash

max_retries=3
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  grab "$1" && break
  retry_count=$((retry_count + 1))
  [ $retry_count -lt $max_retries ] && sleep 5
done

[ $retry_count -eq $max_retries ] && echo "提取失败" && exit 1
```

---

### 错误日志记录

```bash
grab "url" >> success.log 2>> error.log || {
  echo "$(date): 提取失败 - $url" >> grab.log
}
```

---

## 输出示例

### 生成的 Markdown 文件示例

**文件名：** `xiaohongshu_69e3862c_2026-04-20_143022.md`

**内容示例：**

```markdown
# 📱 做出巨大屎山的经验分享

> **作者：** Xiki
> **发布时间：** 昨天 12:25
> **互动数据：** 459 赞 | 317 条评论

---

## 📝 正文内容

先上结论，普通人无任何背景的话，想用vibe coding做点小工具的话完全没问题。
但只要涉及到产品级，难度系数暴涨。

[... 完整内容 ...]

---

## 💬 评论区摘要

**总评论数：** 317
**提取评论数：** 27

| # | 评论摘要 |
|---|---|
| 1 | 记住几个重要点，模块化组件化，高内聚低耦合... |
| 2 | 没啥用，上下文长了就废了，你说这些都是概念词... |
| 3 | 这是没有软件工程基本知识的问题 |
| ... | ... |

---

## 📊 互动统计

| 指标 | 数据 |
|------|------|
| **点赞** | 459 |
| **评论** | 317 |
| **分享** | - |

---

*本文档由 grab skill 自动生成*
```

---

**版本：** 1.0.0  
**最后更新：** 2026-04-20
