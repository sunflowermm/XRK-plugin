/**
 * 配置读写适配（控制台 / 锅巴共用，无 IO）
 */
import {
  normalizeAiRaw,
  normalizeTimeMessages,
  timeMessagesToFormRows,
  parseTimeConfig,
  parsePluginList,
  parseHelpSystem
} from './config-normalize.js';

export function aiDictToEntries(raw) {
  const dict = normalizeAiRaw(raw);
  return {
    entries: Object.entries(dict).map(([keyword, replies]) => ({
      keyword,
      replies: Array.isArray(replies) ? replies : []
    }))
  };
}

export function entriesToAiDict(data) {
  const obj = {};
  for (const { keyword, replies } of data?.entries || []) {
    const key = keyword != null ? String(keyword).trim() : '';
    if (!key) continue;
    obj[key] = Array.isArray(replies) ? replies : [];
  }
  return obj;
}

export function timeConfigToForm(raw) {
  const parsed = parseTimeConfig(raw);
  return {
    emojis: parsed.emojis,
    timeMessages: timeMessagesToFormRows(parsed.timeMessages)
  };
}

export function timeConfigFromForm(data) {
  return parseTimeConfig({
    emojis: Array.isArray(data?.emojis) ? data.emojis : [],
    timeMessages: normalizeTimeMessages(data?.timeMessages)
  });
}

export function normalizePluginListItems(list) {
  return (Array.isArray(list) ? list : [])
    .filter(item => item?.name != null && String(item.name).trim() !== '')
    .map(item => ({
      name: String(item.name).trim(),
      cn_name: String(item.cn_name ?? '').trim(),
      anothername: String(item.anothername ?? '').trim(),
      description: String(item.description ?? '').trim(),
      git: String(item.git ?? '').trim()
    }));
}

/** 控制台：{ list: [] } */
export function pluginListToForm(raw) {
  return { list: normalizePluginListItems(parsePluginList(raw)) };
}

/** 锅巴：裸数组；控制台：{ list } */
export function pluginListFromForm(data) {
  if (Array.isArray(data)) return normalizePluginListItems(data);
  return normalizePluginListItems(data?.list);
}

export function helpSystemToForm(raw) {
  const { cfg, list } = parseHelpSystem(raw);
  return { ...cfg, helpList: list };
}

export function formatPokeTimeSlotsForForm(config) {
  const out = structuredClone(config);
  const slots = out?.poke?.time_slots;
  if (!slots || typeof slots !== 'object') return out;
  for (const [k, v] of Object.entries(slots)) {
    if (Array.isArray(v)) slots[k] = v.join(',');
  }
  return out;
}

export function parsePokeTimeSlotsFromForm(patch) {
  const slots = patch?.poke?.time_slots;
  if (!slots || typeof slots !== 'object') return;
  for (const [k, v] of Object.entries(slots)) {
    if (typeof v === 'string' && v.includes(',')) {
      const parts = v.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => !Number.isNaN(n));
      if (parts.length >= 2) slots[k] = parts;
    }
  }
}

export function normalizeCoremaster(value) {
  if (value == null || value === '') return 0;
  if (Array.isArray(value)) {
    const n = parseInt(String(value[0]), 10);
    return Number.isNaN(n) ? 0 : n;
  }
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? 0 : n;
}

export function normalizeGroupList(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(v => String(v).trim()).filter(Boolean);
}
