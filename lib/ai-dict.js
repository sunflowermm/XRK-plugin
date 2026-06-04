import { readConfigSync } from './config-paths.js';

/** 去除 CQ 码与首尾空白，便于群消息精确匹配 */
export function normalizeMessage(msg) {
  if (msg == null) return '';
  return String(msg).replace(/\[CQ:[^\]]+\]/gi, '').trim();
}

/** 控制台 entries 数组或 { keyword, replies }[] → { key: replies[] } */
export function normalizeAiRaw(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  if (Array.isArray(raw.entries)) {
    const out = {};
    for (const row of raw.entries) {
      if (!row || typeof row !== 'object') continue;
      const key = normalizeMessage(row.keyword ?? row.key);
      if (!key) continue;
      const replies = row.replies ?? row.reply ?? row.values;
      if (Array.isArray(replies) && replies.length) out[key] = replies.map(String);
    }
    return out;
  }
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'entries') continue;
    const k = normalizeMessage(key);
    if (!k) continue;
    if (Array.isArray(val) && val.length) out[k] = val.map(String);
  }
  return out;
}

/** 每次匹配时读取，保存 ai.json 后无需重启 */
export function loadAiDict() {
  const raw = readConfigSync('ai', 'json');
  return normalizeAiRaw(raw);
}

export function findMatchInDict(msg, dict) {
  const text = normalizeMessage(msg);
  if (!text || !dict || typeof dict !== 'object') return null;
  if (dict[text]) return text;
  const hit = Object.keys(dict).find(k => normalizeMessage(k) === text);
  return hit || null;
}
