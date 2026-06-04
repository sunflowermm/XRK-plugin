/**
 * 向日葵插件统一配置中心：加载、缓存、监听 data/xrkconfig
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import cfg from '../../../lib/config/config.js';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import {
  getConfigPath,
  ensureAllConfigsSync,
  XRK_CONFIG_DIR
} from './config-paths.js';
import {
  getDefaultMainConfig,
  normalizeAiRaw,
  parseHelpSystem,
  parsePokeResponses,
  parsePluginList,
  parseTimeConfig
} from './config-normalize.js';

const ROOT = process.cwd();

export const XRK_PLUGIN_ROOT = path.join(ROOT, 'plugins', 'XRK-plugin');
export const RESOURCES_PLUGINS_DIR = path.join(XRK_PLUGIN_ROOT, 'resources', 'plugins');

export const PLUGIN_LIST_NAMES = [
  'recommended_plugins',
  'entertainment_plugins',
  'game_plugins',
  'ip_plugins',
  'js_plugins'
];

/** 纳入统一监听的配置文件 */
export const WATCHED_CONFIGS = [
  { name: 'config', ext: 'yaml' },
  { name: 'help_system', ext: 'yaml' },
  { name: 'ai', ext: 'json' },
  { name: 'poke_responses', ext: 'json' },
  { name: 'time_config', ext: 'json' },
  { name: 'screenshot', ext: 'yaml' },
  { name: 'weather', ext: 'yaml' },
  ...PLUGIN_LIST_NAMES.map(name => ({ name, ext: 'json' }))
];

function readRaw(name, ext) {
  const p = getConfigPath(name, ext);
  if (!FileUtils.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8');
  if (ext === 'json') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  try { return yaml.parse(raw) || null; } catch { return null; }
}

class XRKHub {
  constructor() {
    this._cache = new Map();
    this._listeners = new Map();
    this._runtimeHooks = [];
    this._watchStarted = false;
    this.configPath = getConfigPath('config');
    ensureAllConfigsSync();
    this.reloadAll();
  }

  /** 启动文件监听（index 入口调用一次） */
  startWatch() {
    if (this._watchStarted) return;
    this._watchStarted = true;
    if (!FileUtils.existsSync(XRK_CONFIG_DIR)) return;

    for (const { name, ext } of WATCHED_CONFIGS) {
      const filePath = getConfigPath(name, ext);
      if (!FileUtils.existsSync(filePath)) continue;
      fs.watchFile(filePath, { interval: 500 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
          logger.info(`[XRK-Hub] 配置变更: ${name}.${ext}`);
          this.reload(name);
        }
      });
    }
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(callback);
  }

  emit(event, payload) {
    const list = this._listeners.get(event);
    if (list) list.forEach(cb => { try { cb(payload); } catch (e) { logger.error(`[XRK-Hub] 监听 ${event} 失败:`, e); } });
    this._notifyRuntime(event);
  }

  /** 插件注册：配置变更时自动刷新 priority / cron 等 */
  registerRuntime(hook) {
    this._runtimeHooks.push(hook);
    try { hook.apply?.(); } catch (e) { logger.error('[XRK-Hub] runtime hook 失败:', e); }
  }

  _notifyRuntime(event) {
    for (const hook of this._runtimeHooks) {
      const watch = hook.events;
      if (watch && !watch.includes(event) && !watch.includes('*')) continue;
      try { hook.apply?.(); } catch (e) { logger.error('[XRK-Hub] runtime hook 失败:', e); }
    }
  }

  _parse(name, raw) {
    switch (name) {
      case 'config': {
        const cfg = raw && typeof raw === 'object' ? raw : getDefaultMainConfig();
        this.syncPokePriorityFields(cfg);
        return cfg;
      }
      case 'help_system':
        return parseHelpSystem(raw);
      case 'ai':
        return normalizeAiRaw(raw);
      case 'poke_responses':
        return parsePokeResponses(raw);
      case 'time_config':
        return parseTimeConfig(raw);
      case 'screenshot':
      case 'weather':
        return raw && typeof raw === 'object' ? raw : {};
      default:
        if (PLUGIN_LIST_NAMES.includes(name)) return parsePluginList(raw);
        return raw;
    }
  }

  reload(name) {
    const meta = WATCHED_CONFIGS.find(c => c.name === name);
    if (!meta) return null;
    const raw = readRaw(name, meta.ext);
    let parsed = this._parse(name, raw);

    if (name === 'config' && raw == null) {
      parsed = getDefaultMainConfig();
      this.syncPokePriorityFields(parsed);
      this._writeMain(parsed);
    }

    this._cache.set(name, parsed);

    if (name === 'config') {
      this.emit('change', parsed);
    }
    this.emit(name, parsed);
    this.emit('*', { name, data: parsed });
    return parsed;
  }

  reloadAll() {
    for (const { name } of WATCHED_CONFIGS) this.reload(name);
  }

  get(name) {
    if (!this._cache.has(name)) this.reload(name);
    return this._cache.get(name);
  }

  // —— 主配置 config.yaml ——

  get config() {
    return this.get('config') || getDefaultMainConfig();
  }

  set config(value) {
    this._cache.set('config', value && typeof value === 'object' ? value : getDefaultMainConfig());
    this.syncPokePriorityFields(this._cache.get('config'));
  }

  /** 读取磁盘原始对象（未归一化，锅巴合并用） */
  readDisk(name) {
    const meta = WATCHED_CONFIGS.find(c => c.name === name);
    if (!meta) return null;
    return readRaw(name, meta.ext);
  }

  syncPokePriorityFields(cfg = this.config) {
    const p = cfg.poke_priority ?? cfg.poke?.priority ?? -5000;
    if (!cfg.poke || typeof cfg.poke !== 'object') cfg.poke = {};
    cfg.poke.priority = p;
    cfg.poke_priority = p;
  }

  _writeMain(data) {
    const dir = path.dirname(this.configPath);
    if (!FileUtils.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, yaml.stringify(data), 'utf8');
  }

  save() {
    try {
      this._writeMain(this.config);
      logger.info('[XRK-Hub] 主配置已保存');
      this.reload('config');
    } catch (e) {
      logger.error('[XRK-Hub] 主配置保存失败:', e);
    }
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in obj) || typeof obj[k] !== 'object') obj[k] = {};
      obj = obj[k];
    }
    obj[keys[keys.length - 1]] = value;
    if (key === 'poke_priority' || key === 'poke.priority') {
      this.syncPokePriorityFields();
    }
    this.save();
  }

  // —— 子配置快捷访问 ——

  get helpSystem() { return this.get('help_system') || parseHelpSystem(null); }
  get helpCfg() { return this.helpSystem.cfg; }
  get helpList() { return this.helpSystem.list; }
  get aiDict() { return this.get('ai') || {}; }
  get pokeResponses() { return this.get('poke_responses') || parsePokeResponses(null); }
  get timeConfig() { return this.get('time_config') || parseTimeConfig(null); }
  get screenshot() { return this.get('screenshot') || {}; }
  get weather() { return this.get('weather') || {}; }

  getPluginList(name) {
    return this.get(name) || [];
  }

  /** 网页截图：合并 screenshot.yaml + 主配置精度/开关 */
  getScreenshotRuntime() {
    const cfg = this.screenshot;
    const main = this.config;
    const viewportWidth = cfg.viewport?.width ?? 1280;
    const viewportHeight = cfg.viewport?.height ?? 900;
    const scale = cfg.quality ?? main.screen_shot_quality ?? cfg.screenshotConfig?.deviceScaleFactor ?? 1.5;
    const shot = cfg.screenshotConfig || {};
    return {
      enabled: !!(main.screen_shot_http || cfg.enabled === true),
      urlRules: {
        blacklistDomains: cfg.blacklistDomains || [],
        whitelistDomains: cfg.whitelistDomains || [],
        blacklistIPs: cfg.blacklistIPs || [],
        allowedLocalAddresses: cfg.allowedLocalAddresses || ['localhost', '127.0.0.1'],
        blockedExtensions: cfg.blockedExtensions || {},
        filteredParams: cfg.filteredParams || [],
        urlProcessing: {
          maxUrlsPerMessage: cfg.urlProcessing?.maxUrlsPerMessage ?? 5,
          minUrlLength: cfg.urlProcessing?.minUrlLength ?? 4,
          maxUrlLength: cfg.urlProcessing?.maxUrlLength ?? 2083
        }
      },
      screenshotConfig: {
        width: shot.width ?? viewportWidth,
        height: shot.height ?? viewportHeight,
        deviceScaleFactor: shot.deviceScaleFactor ?? scale,
        waitUntil: cfg.waitUntil ?? shot.waitUntil ?? 'networkidle2',
        imgType: shot.imgType ?? 'jpeg',
        fullPage: shot.fullPage ?? false,
        maxFullPageHeight: shot.maxFullPageHeight ?? cfg.maxFullPageHeight ?? 6000,
        lazyLoadScroll: shot.lazyLoadScroll ?? cfg.lazyLoadScroll ?? true,
        imageWaitTimeout: shot.imageWaitTimeout ?? cfg.imageWaitTimeout ?? 3000,
        fontWaitTimeout: shot.fontWaitTimeout ?? cfg.fontWaitTimeout ?? 800,
        delayBeforeScreenshot: shot.delayBeforeScreenshot ?? cfg.delayBeforeScreenshot ?? 2000,
        pageGotoTimeout: shot.pageGotoTimeout ?? cfg.pageGotoTimeout ?? 60000,
        quality: shot.quality ?? 85
      }
    };
  }

  /** other.yaml masterQQ + config.yaml coremaster */
  getMasterQQs() {
    const set = new Set((cfg.masterQQ || []).map(String).filter(Boolean));
    const core = this.coremaster;
    if (core && Number(core) > 0) set.add(String(core));
    return [...set];
  }

  get help_priority() { return this.config.help_priority ?? 500; }
  get sharing() { return this.config.sharing ?? true; }
  get screen_shot_http() { return this.config.screen_shot_http ?? false; }
  get peopleai() { return this.config.peopleai ?? false; }
  get screen_shot_quality() { return this.config.screen_shot_quality ?? 1.5; }
  get news_pushtime() { return this.config.news_pushtime ?? 8; }
  get news() { return this.config.news ?? { delay: 1000 }; }
  get coremaster() { return this.config.coremaster ?? 0; }
  get emoji_filename() { return this.config.emoji_filename ?? '孤独摇滚'; }
  get time_groupss() { return this.config.time_groupss ?? []; }
  get news_groupss() { return this.config.news_groupss ?? []; }
  get thumwhiteList() { return this.config.thumwhiteList ?? this.config.thumbWhiteList ?? []; }
  get poke_priority() { return this.config.poke_priority ?? -5000; }
  get corepoke_priority() { return this.config.corepoke_priority ?? -5000; }
  get chuomaster() { return this.config.chuomaster ?? false; }
  get poke() { return this.config.poke ?? {}; }
  get master() { return this.config.master ?? null; }
}

const hub = new XRKHub();
export default hub;
