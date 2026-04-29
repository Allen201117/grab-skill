# 常见问题与故障排除

## 环境相关

### Q: "找不到 Node.js"

**错误信息：**
```
/bin/bash: node: command not found
```

**解决方案：**
1. 确认已安装 Node.js ≥ 20.0：
   ```bash
   node --version
   ```
2. 如果未安装或版本过低：
   - macOS: `brew install node@20`
   - 或访问 https://nodejs.org

3. 重新检查：
   ```bash
   bash scripts/check-env.sh
   ```

---

### Q: "Chrome remote debugging 连接失败"

**错误信息：**
```
❌ Chrome remote debugging 未启用
```

**解决方案：**
1. 打开 Chrome 浏览器
2. 地址栏访问：`chrome://inspect/#remote-debugging`
3. 勾选"Allow remote debugging for this browser instance"
4. 重启浏览器（重要！）
5. 重新运行 grab

---

### Q: "CDP Proxy 连接失败"

**错误信息：**
```
❌ CDP Proxy 未运行
```

**解决方案：**
1. 确保 web-access skill 已运行
2. 检查 Proxy 是否监听端口 3456：
   ```bash
   curl http://localhost:3456/targets
   ```
3. 如果失败，启动 web-access skill 的 Proxy

---

## 内容提取问题

### Q: "页面不存在或已被删除"

**错误代码：** `PAGE_NOT_FOUND`

**原因：**
- 帖子已被作者删除
- 帖子因违规被下架
- URL 已失效
- 帖子权限已改变

**解决方案：**
1. 在浏览器中验证链接是否仍可用
2. 检查 URL 是否正确
3. 如果链接包含 token，确保完整复制

---

### Q: "页面加载超时"

**错误代码：** `TIMEOUT`

**原因：**
- 网络连接慢
- 目标网站过载
- 浏览器资源不足

**解决方案：**
1. 检查网络连接
2. 尝试延长超时时间：
   ```bash
   grab "url" --timeout 60000
   ```
3. 稍后重试
4. 关闭其他浏览器标签页

---

### Q: "提取不到评论"

**可能原因：**
- 页面未完全加载
- 评论区需要额外滚动才能加载
- 平台的 DOM 结构已变化

**解决方案：**
1. 增加评论数量限制以强制更多滚动：
   ```bash
   grab "url" --comments-limit 100
   ```
2. 增加等待时间：
   ```bash
   grab "url" --timeout 45000
   ```
3. 检查平台是否对 DOM 做了更新

---

## 输出和文件问题

### Q: "权限拒绝 - 无法创建输出目录"

**错误信息：**
```
创建输出目录失败
```

**解决方案：**
1. 检查指定的输出目录是否存在且可写
2. 重新配置输出目录：
   ```bash
   # 运行不带参数触发重新配置
   grab
   ```
3. 或指定有效的输出路径：
   ```bash
   grab "url" --output ~/Documents
   ```

---

### Q: "文件已存在，会被覆盖吗？"

**行为：**
grab 会生成包含时间戳的文件名，因此不会覆盖现有文件。

**文件名格式：**
```
xiaohongshu_69e3862c_2026-04-20_143022.md
                           ↑ 日期和时间
```

每次运行都会生成新文件。

---

## 数据提取问题

### Q: "某些内容被截断了"

**原因：**
为了性能，grab 对某些字段有长度限制：
- 正文：最多 5000 字符
- 每条评论：最多 500 字符
- 图片：最多 20 张

**解决方案：**
这些是 MVP 的合理限制。如需更详细的内容，可以：
1. 在浏览器中手动查看
2. 提出功能请求扩大限制

---

### Q: "图片链接无效"

**原因：**
某些平台的图片链接会过期或需要特殊认证。

**解决方案：**
1. 立即下载/查看（链接可能短期有效）
2. 在生成的 Markdown 中，图片高度压缩和处理过
3. 如需原始图片，在浏览器中单独下载

---

## 性能问题

### Q: "运行很慢"

**可能原因：**
- 页面内容丰富，加载时间长
- 需要大量滚动来加载评论
- 网络连接慢

**优化建议：**
```bash
# 1. 不需要评论时，使用 --no-comments 加快速度
grab "url" --no-comments

# 2. 减少评论数量
grab "url" --comments-limit 10

# 3. 减少超时时间（如果可接受）
grab "url" --timeout 20000
```

---

## 重置和调试

### Q: "如何重置配置？"

```bash
# 删除配置文件
rm ~/.claude/skills/grab/metadata.json

# 下次运行时会要求重新配置
grab "url"
```

---

### Q: "如何启用详细日志用于调试？"

```bash
grab "url" --verbose
```

这会输出详细的执行步骤和时间信息。

---

### Q: "脚本出错后如何清理？"

grab 会自动关闭浏览器标签页。如果手动中断（Ctrl+C），可能需要：

```bash
# 检查是否有孤立的浏览器标签
curl http://localhost:3456/targets

# 查看列表，可以手动关闭
```

---

## 联系和报告

如果以上都无法解决问题：
1. 运行 `grab --verbose` 获取完整日志
2. 记录完整的错误信息和使用命令
3. 检查 web-access skill 的状态

---

**最后更新：2026-04-20**
