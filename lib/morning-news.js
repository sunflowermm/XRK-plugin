/** 60s 社区 API（vikiboss/60s），image-proxy 直出 PNG */
import { fetchImageBuffer } from './fetch-media.js';

const API = 'https://60s.viki.moe/v2/60s';
const TIMEOUT_MS = 15000;
const DEFAULT_INTRO = '早安！这是今天的早报\n';

export async function fetchMorningNewsImageUrl() {
  try {
    const res = await fetch(`${API}?encoding=image-proxy`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      return `${API}?encoding=image-proxy`;
    }
  } catch (err) {
    logger.warn(`[早报] image-proxy 不可用: ${err.message}`);
  }

  const res = await fetch(`${API}?encoding=json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const url = json?.data?.image;
  if (url) return url;
  throw new Error(json?.message || '早报接口未返回图片');
}

export function morningNewsCronExpr(hour) {
  return `0 0 ${hour} * * ?`;
}

export async function buildMorningNewsReply(intro = DEFAULT_INTRO) {
  const url = await fetchMorningNewsImageUrl();
  const buf = await fetchImageBuffer(url, TIMEOUT_MS);
  if (buf) return [intro, segment.image(buf)];
  return [intro, segment.image(url)];
}

export async function pushMorningNewsToGroups(groups, delayMs = 0, intro = DEFAULT_INTRO) {
  if (!groups?.length) return;

  let reply;
  try {
    reply = await buildMorningNewsReply(intro);
  } catch (err) {
    logger.error('[早报] 获取图片失败:', err);
    return;
  }

  for (const groupId of groups) {
    try {
      const group = Bot.pickGroup(groupId);
      if (!group) {
        logger.error(`[早报] 群 ${groupId} 不存在`);
        continue;
      }
      await group.sendMsg(reply);
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      logger.error(`[早报] 群 ${groupId} 推送失败:`, err);
    }
  }
}
