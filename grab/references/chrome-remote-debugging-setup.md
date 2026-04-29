# Chrome Remote Debugging 开启指南

> grab skill 依赖 Chrome DevTools Protocol (CDP) 来控制浏览器。Chrome **默认不开启**远程调试，需要按以下步骤操作。

---

## 快速判断：你的 Chrome 是否已开启？

**macOS / Linux** — 打开终端，运行：

```bash
ps aux | grep -i 'remote-debugging-port' | grep -v grep
```

**Windows** — 打开 PowerShell 或 cmd，运行：

```powershell
netstat -an | findstr "9222"
```

- **有输出** → 已开启，可直接使用 grab ✅
- **无输出** → 未开启，请按下方步骤操作 ❌

---

## macOS

### 方式一：让 grab 自动启动（推荐）

**前提：Chrome 完全关闭（Cmd+Q 退出）**

只要 Chrome 完全关闭，下次运行 grab 时它会自动启动带 remote debugging 的 Chrome。

```bash
# 先完全退出 Chrome（Cmd+Q）
node "/Users/USER/.claude/skills/grab/scripts/grab.mjs" "URL"
```

### 方式二：手动启动脚本

```bash
cat > ~/launch-chrome-debug.sh << 'EOF'
#!/bin/bash
osascript -e 'quit app "Google Chrome"' 2>/dev/null
sleep 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --profile-directory="Profile 1" \
  --no-first-run \
  --no-default-browser-check &
echo "Chrome 已启动（调试端口 9222）"
EOF
chmod +x ~/launch-chrome-debug.sh
~/launch-chrome-debug.sh
```

---

## Windows

### 方式一：让 grab 自动启动（推荐）

**前提：Chrome 完全关闭（任务栏托盘中右键退出）**

grab 会自动查找 Chrome 并启动它。直接运行：

```cmd
node "C:\Users\你的用户名\.claude\skills\grab\scripts\grab.mjs" "URL"
```

### 方式二：手动创建快捷方式

1. 右键桌面 → 新建快捷方式
2. 目标位置填写（注意替换用户名和 profile 目录）：

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --profile-directory="Profile 1" --no-first-run
```

3. 每次需要使用 grab 时，双击此快捷方式启动 Chrome

### 方式三：PowerShell 脚本

```powershell
# 保存为 launch-chrome-debug.ps1
Stop-Process -Name "chrome" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  -ArgumentList "--remote-debugging-port=9222", "--profile-directory=Profile 1", "--no-first-run"
Write-Host "Chrome 已启动（调试端口 9222）"
```

运行：`powershell -ExecutionPolicy Bypass -File launch-chrome-debug.ps1`

---

## 常见问题

### Q: Chrome 有多个 profile，会互相影响吗？

**不影响。** 调试端口开启后，所有 profile 共享同一端口（9222），通过 `browserContextId` 区分，互不干扰。

### Q: 调试端口会不会有安全风险？

端口 9222 只监听 `127.0.0.1`（本机），外部网络无法访问，安全风险极低。

### Q: Windows 上 Chrome 启动路径不对怎么办？

Chrome 可能安装在以下位置之一：
- `C:\Program Files\Google\Chrome\Application\chrome.exe`（64位系统标准安装）
- `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`（32位）
- `C:\Users\你的用户名\AppData\Local\Google\Chrome\Application\chrome.exe`（用户级安装）

grab 会自动按上面顺序查找，找到第一个存在的路径。
