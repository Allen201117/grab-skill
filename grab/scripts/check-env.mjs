#!/usr/bin/env node

/**
 * check-env.mjs - grab skill 的环境检查脚本
 * 检查：Node.js 版本、Chrome remote debugging、CDP Proxy 状态
 */

import { execSync } from 'child_process';
import http from 'http';
import os from 'node:os';

async function checkNodeVersion() {
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);

  if (majorVersion < 20) {
    return {
      ok: false,
      message: `❌ Node.js 版本过低：${version}（需要 ≥ 20.0）`,
      fix: 'brew install node@20 或访问 https://nodejs.org'
    };
  }

  return { ok: true, message: `✅ Node.js ${version}` };
}

async function checkChrome() {
  try {
    let result = '';
    if (os.platform() === 'win32') {
      result = execSync('tasklist /fi "imagename eq chrome.exe" /fo csv /nh 2>nul', { encoding: 'utf-8' });
      // Windows 不容易直接检查参数，改用 TCP 探测端口
    } else {
      result = execSync('ps aux | grep -i chrome | grep -v grep', { encoding: 'utf-8' });
    }
    if (result.includes('--remote-debugging-port')) {
      return { ok: true, message: '✅ Chrome 已启用 remote debugging' };
    }
  } catch (e) {
    // Chrome 未运行或未启用 remote debugging
  }

  // 退一步：直接探测 9222 端口
  try {
    const { default: net } = await import('node:net');
    const portOpen = await new Promise(resolve => {
      const s = net.createConnection(9222, '127.0.0.1');
      s.once('connect', () => { s.destroy(); resolve(true); });
      s.once('error', () => resolve(false));
      setTimeout(() => { s.destroy(); resolve(false); }, 1000);
    });
    if (portOpen) return { ok: true, message: '✅ Chrome remote debugging 端口 9222 已开放' };
  } catch (_) {}

  const quitCmd = os.platform() === 'win32' ? 'Alt+F4 关闭所有 Chrome 窗口' : 'Cmd+Q 完全退出 Chrome';
  return {
    ok: false,
    message: '⚠️  Chrome remote debugging 未启用',
    fix: `请参考以下指南开启 Chrome 远程调试：
      📄 ~/.claude/skills/grab/references/chrome-remote-debugging-setup.md

      最简单方式：
      1. 完全退出 Chrome（${quitCmd}）
      2. 重新运行 grab（会自动启动带调试的 Chrome）`
  };
}

async function checkCDPProxy() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3456/targets', { timeout: 2000 }, (res) => {
      res.on('data', () => {}); // 消费数据
      res.on('end', () => {
        resolve({ ok: true, message: '✅ CDP Proxy 运行中（端口 3456）' });
      });
    });

    req.on('error', () => {
      resolve({
        ok: false,
        message: '❌ CDP Proxy 未运行',
        fix: '需要 web-access skill 的 Proxy。请确保它已启动。'
      });
    });
  });
}

async function main() {
  console.log('\n🔧 grab skill 环境检查\n' + '='.repeat(40));

  const checks = [
    { name: 'Node.js', check: checkNodeVersion },
    { name: 'Chrome', check: checkChrome },
    { name: 'CDP Proxy', check: checkCDPProxy }
  ];

  let allOk = true;

  for (const { name, check } of checks) {
    const result = await check();
    console.log(`\n${name}:`);
    console.log('  ' + result.message);

    if (!result.ok) {
      allOk = false;
      if (result.fix) {
        console.log('\n  💡 修复方法：');
        console.log(result.fix.split('\n').map(line => '     ' + line).join('\n'));
      }
    }
  }

  console.log('\n' + '='.repeat(40));

  if (allOk) {
    console.log('\n✅ 所有检查通过！可以运行 grab 了。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  存在未满足的要求，请按上述建议修复。\n');
    process.exit(1);
  }
}

main();
