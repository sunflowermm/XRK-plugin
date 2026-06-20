import fetch from 'node-fetch';

const BLOCKED_URL = /image\.baidu\.com|baidu\.com\/search\/down/i;

export function isBlockedMediaUrl(url) {
  return !url || typeof url !== 'string' || !/^https?:\/\//i.test(url) || BLOCKED_URL.test(url);
}

/** 下载图片为 Buffer（跳过百度跳转等 Bot 无法直链的 URL） */
export async function fetchImageBuffer(url, timeoutMs = 15000) {
  if (isBlockedMediaUrl(url)) return null;
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('image')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch (err) {
    Bot.makeLog('debug', `[XRK] fetchImageBuffer 失败: ${url} | ${err.message}`, 'XRK-plugin');
    return null;
  }
}

/** 按优先级尝试多个源，返回首个可下载的图片 Buffer */
export async function resolveImageBuffer(sources) {
  for (const src of sources) {
    const url = typeof src === 'function' ? await src() : src;
    if (!url) continue;
    const buf = await fetchImageBuffer(url);
    if (buf) return buf;
  }
  return null;
}
