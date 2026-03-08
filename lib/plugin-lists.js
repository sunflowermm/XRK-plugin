/**
 * 插件列表路径与读取
 * 插件列表 JSON 已迁移至 config/default → data/xrkconfig/，由 ensureAllConfigsSync 初始化
 */
import path from 'path';
import { getConfigPath, readConfigSync } from './config-paths.js';

const ROOT = process.cwd();
const XRK_RESOURCES_PLUGINS = path.join(ROOT, 'plugins', 'XRK-plugin', 'resources', 'plugins');

/** 插件列表配置名（与 xrk commonconfig 子配置名一致） */
export const PLUGIN_LIST_NAMES = [
  'recommended_plugins',   // 推荐插件
  'entertainment_plugins', // 文娱插件
  'game_plugins',          // 游戏插件
  'ip_plugins',            // IP类插件
  'js_plugins'            // JS插件
];

/** 获取插件列表配置路径（data/xrkconfig/{name}.json） */
export function getPluginListPath(name) {
  return getConfigPath(name, 'json');
}

/** 同步读取插件列表，不存在返回 [] */
export function readPluginListSync(name) {
  const data = readConfigSync(name, 'json');
  return Array.isArray(data) ? data : [];
}

/** resources/plugins 目录（PNG 截图、plugin_screenshots_index.json、template.html） */
export function getResourcesPluginsDir() {
  return XRK_RESOURCES_PLUGINS;
}
