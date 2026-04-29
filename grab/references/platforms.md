# 平台支持列表

## 当前支持的平台

### 小红书 (xiaohongshu.com) ✅ 

**支持状态：** 完全支持（MVP）

**特点：**
- 自动提取笔记标题、作者、内容
- 支持评论区数据提取
- 智能识别互动统计（赞、评论、分享）
- 自动识别发布时间和地点

**URL 示例：**
```
https://www.xiaohongshu.com/explore/69e3862c000000002102e9b6
https://www.xiaohongshu.com/explore/xxx?xsec_token=...
```

**已知限制：**
- 部分老帖子可能无法访问
- 需要 Chrome 已启用 remote debugging
- 大量图片的笔记加载可能较慢

**最佳实践：**
```bash
# 添加完整的 token 参数以增加成功率
grab "https://www.xiaohongshu.com/explore/xxx?xsec_token=..." --comments-limit 50
```

---

## 计划支持的平台

### Twitter/X (twitter.com, x.com) 🔜

**计划状态：** Phase 2

**预期特点：**
- 推文内容提取
- 评论和转发提取
- 互动数据（点赞、转发、回复）

### 知乎 (zhihu.com) 🔜

**计划状态：** Phase 2

**预期特点：**
- 问题和回答提取
- 高赞评论提取
- 数据完整性检查

### 微博 (weibo.com) 🔜

**计划状态：** Phase 3

---

## 通用平台支持

任何支持动态渲染的网站理论上都可以通过通用适配器访问，但效果可能不理想。

**已知兼容性：**
- ✅ 动态渲染网站（SPA）
- ✅ JavaScript 渲染页面
- ❌ 静态 HTML 页面（更适合用 WebFetch）
- ❌ 需要特殊登录的网站（如需完整登录流程）

---

## 平台检测

grab 会自动检测 URL 并选择合适的适配器：

```javascript
// 自动识别
grab "https://www.xiaohongshu.com/explore/xxx"  // → xiaohongshu
grab "https://twitter.com/user/status/123"      // → twitter
grab "https://example.com/article"              // → generic
```

---

## 为新平台添加支持

如果想为 grab 添加新平台支持，需要：

1. 在 `scripts/platform-adapters/` 创建新文件
2. 实现平台适配器接口：

```javascript
export const newPlatform = {
  name: 'newplatform',
  displayName: 'New Platform',
  match: (url) => url.includes('newplatform.com'),
  extractPostId: (url) => { /* ... */ },
  checkError: (pageText) => { /* ... */ },
  extractorScript: '(...)', // 返回 JavaScript
  scrollStrategy: { /* ... */ }
};
```

3. 在 `grab.mjs` 中注册平台

---

**最后更新：2026-04-20**
