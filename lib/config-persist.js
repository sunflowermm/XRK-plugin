/**
 * 子配置读写持久化（控制台 / 锅巴共用，无重复 normalize）
 */
import lodash from 'lodash';
import yaml from 'yaml';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { getConfigPath } from './config-paths.js';
import {
  PLUGIN_LIST_NAMES,
  PLUGIN_GUOBA_KEYS,
  EXTRA_SUBCONFIG_MAP
} from './config-registry.js';
import {
  normalizeMainConfig,
  normalizeWeatherConfig,
  normalizeScreenshotConfig,
  sanitizeHelpSystemForDisk
} from './config-normalize.js';
import {
  aiDictToEntries,
  entriesToAiDict,
  timeConfigToForm,
  timeConfigFromForm,
  pluginListToForm,
  pluginListFromForm,
  helpSystemToForm
} from './config-adapters.js';

export const EXTRA_CFG_KEYS = Object.keys(EXTRA_SUBCONFIG_MAP);

/** 控制台 read：磁盘 → UI 表单 */
export function readSubconfigForUi(name, raw) {
  switch (name) {
    case 'ai':
      return aiDictToEntries(raw);
    case 'time_config':
      return timeConfigToForm(raw);
    case 'help_system':
      return helpSystemToForm(raw);
    case 'weather':
      return normalizeWeatherConfig(raw);
    case 'screenshot':
      return normalizeScreenshotConfig(raw);
    case 'config':
      return normalizeMainConfig(raw);
    default:
      if (PLUGIN_LIST_NAMES.includes(name)) return pluginListToForm(raw);
      return raw;
  }
}

/** 控制台 write：UI 表单 → 磁盘 */
export function writeSubconfigFromUi(name, data) {
  switch (name) {
    case 'config':
      return normalizeMainConfig(data);
    case 'weather':
      return normalizeWeatherConfig(data);
    case 'screenshot':
      return normalizeScreenshotConfig(data);
    case 'help_system':
      return sanitizeHelpSystemForDisk(data);
    case 'ai':
      if (data?.entries) return entriesToAiDict(data);
      return data;
    case 'time_config':
      if (data && typeof data === 'object') return timeConfigFromForm(data);
      return data;
    default:
      if (PLUGIN_LIST_NAMES.includes(name) && data?.list) return pluginListFromForm(data);
      return data;
  }
}

export function serializeGuobaExtra(cfgKey, data) {
  if (cfgKey === 'ai_cfg') return entriesToAiDict(data);
  if (cfgKey === 'time_cfg') return timeConfigFromForm(data);
  if (PLUGIN_GUOBA_KEYS.includes(cfgKey)) return pluginListFromForm(data);
  return data;
}

export function mergeGuobaExtra(cfgKey, payload, existing) {
  if (cfgKey === 'ai_cfg' || PLUGIN_GUOBA_KEYS.includes(cfgKey)) return payload;
  const merged = existing == null ? payload : lodash.merge({}, existing, payload);
  if (cfgKey === 'weather_cfg') return normalizeWeatherConfig(merged);
  if (cfgKey === 'screenshot_cfg') return normalizeScreenshotConfig(merged);
  if (cfgKey === 'help_system_cfg') return sanitizeHelpSystemForDisk(merged);
  return merged;
}

/** 锅巴 read：子配置 → 表单字段 */
export function readGuobaExtra(cfgKey, raw, hub) {
  if (cfgKey === 'weather_cfg') return hub.weather;
  if (cfgKey === 'screenshot_cfg') return hub.screenshot;
  if (cfgKey === 'help_system_cfg') return helpSystemToForm(raw);
  if (cfgKey === 'ai_cfg') return aiDictToEntries(raw);
  if (cfgKey === 'time_cfg') return timeConfigToForm(raw);
  if (PLUGIN_GUOBA_KEYS.includes(cfgKey)) return pluginListFromForm(raw);
  const meta = EXTRA_SUBCONFIG_MAP[cfgKey];
  return raw ?? (meta?.ext === 'json' && PLUGIN_GUOBA_KEYS.includes(cfgKey) ? [] : {});
}

export function writeConfigDisk(file, ext, data) {
  if (data == null) return;
  const filePath = getConfigPath(file, ext);
  const content = ext === 'json' ? JSON.stringify(data, null, 2) : yaml.stringify(data);
  FileUtils.writeFileSync(filePath, content, 'utf8');
}
