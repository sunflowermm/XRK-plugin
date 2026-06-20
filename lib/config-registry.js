/**
 * 向日葵子配置注册表（单一来源）
 * key: data/xrkconfig 文件名；guobaKey: 锅巴表单前缀
 */
export const PLUGIN_REGISTRY = [
  { key: 'recommended_plugins', label: '推荐插件', guobaKey: 'recommended_plugins_cfg', ext: 'json' },
  { key: 'entertainment_plugins', label: '文娱插件', guobaKey: 'entertainment_plugins_cfg', ext: 'json' },
  { key: 'game_plugins', label: '游戏插件', guobaKey: 'game_plugins_cfg', ext: 'json' },
  { key: 'ip_plugins', label: 'IP类插件', guobaKey: 'ip_plugins_cfg', ext: 'json' },
  { key: 'js_plugins', label: 'JS插件', guobaKey: 'js_plugins_cfg', ext: 'json' }
];

export const PLUGIN_LIST_NAMES = PLUGIN_REGISTRY.map(r => r.key);

export const PLUGIN_CATEGORIES = PLUGIN_REGISTRY.map(({ label, key }) => ({
  name: label,
  key
}));

export const PLUGIN_GUOBA_KEYS = PLUGIN_REGISTRY.map(r => r.guobaKey);

export const EXTRA_SUBCONFIG_MAP = {
  weather_cfg: { file: 'weather', ext: 'yaml' },
  screenshot_cfg: { file: 'screenshot', ext: 'yaml' },
  help_system_cfg: { file: 'help_system', ext: 'yaml' },
  ai_cfg: { file: 'ai', ext: 'json' },
  time_cfg: { file: 'time_config', ext: 'json' },
  poke_responses_cfg: { file: 'poke_responses', ext: 'json' },
  ...Object.fromEntries(
    PLUGIN_REGISTRY.map(r => [r.guobaKey, { file: r.key, ext: r.ext }])
  )
};
