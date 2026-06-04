/**
 * 从聊天消息中提取可截图 URL（剥离 CQ 码、尾部标点）
 */

/** 插件 rule 用（无 g，避免 RegExp.lastIndex 干扰） */
export const URL_RULE_PATTERN = '(?:https?://|www\\.)[^\\s<>"\'\\[\\]（）【】]+';

/** 提取用 */
export const URL_EXTRACT_RE = /(?:https?:\/\/|www\.)[^\s<>"'[\]（）【】]+/gi;

const TRAILING_PUNCT = /[.,!?;:'"）】\]}>]+$/;
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

export function stripCqCodes(text) {
  return String(text ?? '').replace(/\[CQ:[^\]]+\]/gi, '');
}

export function trimUrlTail(raw) {
  return String(raw ?? '')
    .replace(ZERO_WIDTH, '')
    .replace(/\s+/g, '')
    .replace(TRAILING_PUNCT, '')
    .trim();
}

/** @returns {string[]} 原始匹配片段（未规范化） */
export function findUrlCandidates(message) {
  const text = stripCqCodes(message);
  if (!text) return [];
  const re = new RegExp(URL_EXTRACT_RE.source, URL_EXTRACT_RE.flags);
  return text.match(re) || [];
}

export function messageHasUrl(message) {
  const text = stripCqCodes(message);
  if (!text) return false;
  return new RegExp(URL_RULE_PATTERN, 'i').test(text);
}
