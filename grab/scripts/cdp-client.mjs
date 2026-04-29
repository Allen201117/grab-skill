/**
 * cdp-client.mjs - CDP (Chrome DevTools Protocol) 客户端
 * 管理与 web-access Proxy 的通信
 */

const CDP_PROXY = 'http://localhost:3456';

export async function openPage(url, profileDomain = null) {
  try {
    const params = `url=${encodeURIComponent(url)}${profileDomain ? `&profileDomain=${encodeURIComponent(profileDomain)}` : ''}`;
    const response = await fetch(`${CDP_PROXY}/new?${params}`);
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    const { targetId } = await response.json();
    return targetId;
  } catch (error) {
    throw new Error(`无法打开页面: ${error.message}`);
  }
}

export async function getPageInfo(targetId) {
  try {
    const response = await fetch(`${CDP_PROXY}/info?target=${targetId}`);
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`无法获取页面信息: ${error.message}`);
  }
}

export async function evalScript(targetId, script) {
  try {
    const response = await fetch(`${CDP_PROXY}/eval?target=${targetId}`, {
      method: 'POST',
      body: typeof script === 'function' ? script.toString() : script
    });
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    const result = await response.json();
    return result.value;
  } catch (error) {
    throw new Error(`执行脚本失败: ${error.message}`);
  }
}

export async function scrollPage(targetId, direction = 'bottom', amount = 3000) {
  try {
    const response = await fetch(
      `${CDP_PROXY}/scroll?target=${targetId}&direction=${direction}&y=${amount}`
    );
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`滚动失败: ${error.message}`);
  }
}

export async function screenshot(targetId, outputPath) {
  try {
    const response = await fetch(
      `${CDP_PROXY}/screenshot?target=${targetId}&file=${encodeURIComponent(outputPath)}`
    );
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`截图失败: ${error.message}`);
  }
}

export async function closePage(targetId) {
  try {
    const response = await fetch(`${CDP_PROXY}/close?target=${targetId}`);
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`关闭页面失败: ${error.message}`);
  }
}

export async function navigatePage(targetId, url) {
  try {
    const response = await fetch(`${CDP_PROXY}/navigate?target=${targetId}&url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`CDP 错误: ${response.status}`);
    return await response.json();
  } catch (error) {
    throw new Error(`导航失败: ${error.message}`);
  }
}

export async function waitForPageReady(targetId, timeout = 30000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const info = await getPageInfo(targetId);
      if (info.ready === 'complete') {
        return true;
      }
    } catch (e) {
      // 继续等待
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`页面加载超时（${timeout}ms）`);
}
