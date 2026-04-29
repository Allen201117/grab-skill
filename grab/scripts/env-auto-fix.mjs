/**
 * env-auto-fix.mjs - Node.js环境自动检测和修复
 * 解决"Node not in PATH"问题，自动从nvm/fnm等包管理器加载
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME_DIR = os.homedir();

/**
 * 检测Node.js版本是否满足要求
 */
function checkNodeVersion(minVersion = 20) {
  const version = parseInt(process.version.split('.')[0].substring(1));
  return version >= minVersion;
}

/**
 * 查找nvm并加载环境
 */
function loadNvmEnv() {
  const nvmPath = path.join(HOME_DIR, '.nvm', 'nvm.sh');
  if (fs.existsSync(nvmPath)) {
    try {
      // 通过执行shell脚本来获取nvm初始化后的PATH
      const cmd = `source ${nvmPath} && nvm use 20 2>/dev/null || nvm use stable 2>/dev/null && echo "$PATH"`;
      const newPath = execSync(`bash -c "${cmd}"`, { encoding: 'utf-8' }).trim();
      if (newPath) {
        process.env.PATH = newPath;
        return { success: true, manager: 'nvm', message: 'nvm已初始化' };
      }
    } catch (e) {
      // nvm加载失败，继续尝试其他方式
    }
  }
  return { success: false, manager: 'nvm' };
}

/**
 * 查找fnm并加载环境
 */
function loadFnmEnv() {
  const fnmBinary = [
    path.join(HOME_DIR, '.fnm', 'fnm'),
    '/usr/local/bin/fnm',
    '/opt/fnm/fnm'
  ].find(p => fs.existsSync(p));

  if (fnmBinary) {
    try {
      const cmd = `eval "$(${fnmBinary} env)" && echo "$PATH"`;
      const newPath = execSync(`bash -c "${cmd}"`, { encoding: 'utf-8' }).trim();
      if (newPath) {
        process.env.PATH = newPath;
        return { success: true, manager: 'fnm', message: 'fnm已初始化' };
      }
    } catch (e) {
      // fnm加载失败
    }
  }
  return { success: false, manager: 'fnm' };
}

/**
 * 查找asdf并加载环境
 */
function loadAsdfEnv() {
  const asdfPath = path.join(HOME_DIR, '.asdf', 'asdf.sh');
  if (fs.existsSync(asdfPath)) {
    try {
      const cmd = `source ${asdfPath} && echo "$PATH"`;
      const newPath = execSync(`bash -c "${cmd}"`, { encoding: 'utf-8' }).trim();
      if (newPath) {
        process.env.PATH = newPath;
        return { success: true, manager: 'asdf', message: 'asdf已初始化' };
      }
    } catch (e) {
      // asdf加载失败
    }
  }
  return { success: false, manager: 'asdf' };
}

/**
 * 尝试检查安装的Node.js位置
 */
function findNodeBinary() {
  const possiblePaths = [
    path.join(HOME_DIR, '.nvm', 'versions', 'node'),
    path.join(HOME_DIR, '.fnm', 'node-versions'),
    '/usr/local/opt/node/bin/node',
    '/opt/homebrew/bin/node',
    '/usr/bin/node',
    // Windows paths
    path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'nodejs', 'node.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'nodejs', 'node.exe'),
    path.join(process.env['APPDATA'] || '', 'nvm', 'use', 'node.exe'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * 生成修复建议步骤
 */
function getAutoFixSteps() {
  if (os.platform() === 'win32') {
    return `
❌ Node.js 不在 PATH 中，自动修复失败

Windows 修复步骤：

【方案A】安装 nvm-windows（推荐）
1. 下载 nvm-windows：https://github.com/coreybutler/nvm-windows/releases
2. 安装后在命令提示符运行：nvm install 20 && nvm use 20
3. 重新运行此脚本

【方案B】直接安装 Node.js
1. 下载 Node.js 安装包：https://nodejs.org/
2. 安装后重新打开命令提示符
3. 验证：node --version
4. 重新运行此脚本
`;
  }
  return `
❌ Node.js 不在 PATH 中，自动修复失败

修复步骤（请选择一种）：

【方案A】如果你使用 nvm（推荐）
1. 打开终端，运行：source ~/.nvm/nvm.sh
2. 验证：node --version
3. 重新运行此脚本

【方案B】如果你使用 fnm
1. 打开终端，运行：eval "$(fnm env)"
2. 验证：node --version
3. 重新运行此脚本

【方案C】如果你使用 Homebrew
1. 安装 Node.js：brew install node
2. 验证：node --version
3. 重新运行此脚本

【方案D】手动配置 PATH
export PATH=你的node所在目录:$PATH

常见 Node.js 位置：
- ~/.nvm/versions/node/v*/bin/node
- ~/.fnm/node-versions/node-v*/bin/node
- /usr/local/opt/node/bin/node
- /opt/homebrew/bin/node
`;
}

/**
 * 主修复流程
 */
export async function loadPackageManagerEnv() {
  // 如果Node已经在PATH中且版本满足，无需修复
  if (checkNodeVersion()) {
    return { success: true, nodeVersion: process.version, autoFixed: false };
  }

  // 依次尝试各个包管理器
  const managers = [loadNvmEnv, loadFnmEnv, loadAsdfEnv];
  for (const manager of managers) {
    const result = manager();
    if (result.success) {
      // 再次验证版本
      if (checkNodeVersion()) {
        return {
          success: true,
          nodeVersion: process.version,
          autoFixed: true,
          packageManager: result.manager,
          message: result.message
        };
      }
    }
  }

  // 所有自动修复都失败了
  return {
    success: false,
    nodeVersion: process.version,
    autoFixed: false,
    errorSteps: getAutoFixSteps()
  };
}

/**
 * 检查Node.js是否可用
 */
export function isNodeAvailable() {
  try {
    return checkNodeVersion();
  } catch {
    return false;
  }
}

/**
 * 获取Node二进制路径
 */
export function getNodeBinary() {
  try {
    const cmd = os.platform() === 'win32' ? 'where node' : 'which node';
    return execSync(cmd, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    return findNodeBinary();
  }
}

export default {
  loadPackageManagerEnv,
  isNodeAvailable,
  getNodeBinary,
  checkNodeVersion,
  getAutoFixSteps
};
