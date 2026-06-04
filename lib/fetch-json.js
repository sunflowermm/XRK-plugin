import fetch from 'node-fetch';

/** 请求 URL 并解析 JSON，失败返回空对象 */
export async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    return await res.json();
  } catch (e) {
    logger.error(`[XRK] fetchJson 失败: ${e.message}`);
    return {};
  }
}
