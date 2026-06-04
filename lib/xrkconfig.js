/**
 * 向日葵插件主配置单例
 * 读写 data/xrkconfig/config.yaml，与 commonconfig/xrk.js 共用；启动时 ensureAllConfigsSync 复制 config/default/*。
 */
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { getConfigPath, ensureAllConfigsSync } from './config-paths.js';

const CONFIG_PATH = getConfigPath('config');

class XRKConfig {
  constructor() {
    this.config = {};
    this.watchers = new Map();
    this.configPath = CONFIG_PATH;
    ensureAllConfigsSync();
    this.load();
    this.watch();
  }

  getDefaultConfig() {
    return {
      help_priority: 500,
      sharing: true,
      screen_shot_http: false,
      peopleai: false,
      screen_shot_quality: 1.5,
      news_pushtime: 8,
      news: { delay: 1000 },
      coremaster: 0,
      emoji_filename: '孤独摇滚',
      time_groupss: [],
      news_groupss: [],
      thumwhiteList: [],
      poke: {
        enabled: true,
        priority: -5000,
        modules: {
          daily_rewards: true,
          festival: true,
          basic: true,
          mood: true,
          intimacy: true,
          achievement: true,
          special: true,
          punishment: true,
          pokeback: true,
          image: true,
          voice: true,
          master: true
        },
        pokeback_enabled: true,
        image_chance: 0.3,
        voice_chance: 0.2,
        basic_reply_chance: 0.6,
        pokeback_base_chance: 0.3,
        module_skip_chance: 0.3,
        paths: { image_dir: '', voice_dir: '' },
        time_slots: { morning: [5, 9], noon: [11, 14], afternoon: [14, 17], evening: [17, 20], night: [22, 3], dawn: [3, 5] },
        master_image: true,
        master_punishment: true,
        master_chances: { mute: 0.5, pokeback: 0.7 },
        cooldowns: { interaction: 30000, special_effect: 180000, punishment: 60000 },
        chances: {
          mood_change: 0.2, mood_reply: 0.5, special_trigger: 0.15, special_effect_extra: 0.1,
          punishment: 0.3, mute_chance: 0.5, daily_first: 0.6, daily_continuous: 0.25, festival: 0.15
        }
      },
      poke_priority: -5000,
      corepoke_priority: -5000,
      chuomaster: false
    };
  }

  load() {
    try {
      if (FileUtils.existsSync(CONFIG_PATH)) {
        const content = fs.readFileSync(CONFIG_PATH, 'utf8');
        this.config = yaml.parse(content) || {};
        this.syncPokePriorityFields();
        logger.info('[XRKConfig] 配置文件加载成功');
      } else {
        logger.warn('[XRKConfig] 配置文件不存在，使用默认配置');
        this.config = this.getDefaultConfig();
        this.syncPokePriorityFields();
        this.save();
      }
    } catch (e) {
      logger.error('[XRKConfig] 配置文件加载失败:', e);
      this.config = this.getDefaultConfig();
    }
  }

  save() {
    try {
      const dir = path.dirname(CONFIG_PATH);
      if (!FileUtils.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.config), 'utf8');
      logger.info('[XRKConfig] 配置文件保存成功');
    } catch (e) {
      logger.error('[XRKConfig] 配置文件保存失败:', e);
    }
  }

  watch() {
    if (FileUtils.existsSync(CONFIG_PATH)) {
      fs.watchFile(CONFIG_PATH, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          logger.info('[XRKConfig] 检测到配置文件变更，重新加载');
          this.load();
          this.emit('change');
        }
      });
    }
  }

  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    return value;
  }

  set(key, value) {
    const keys = key.split('.');
    let obj = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in obj) || typeof obj[k] !== 'object') {
        obj[k] = {};
      }
      obj = obj[k];
    }
    obj[keys[keys.length - 1]] = value;
    if (key === 'poke_priority' || key === 'poke.priority') {
      this.syncPokePriorityFields();
    }
    this.save();
  }

  /** 顶层 poke_priority 与 poke.priority 保持一致（戳一戳插件读取后者） */
  syncPokePriorityFields() {
    const top = this.config.poke_priority;
    const nested = this.config.poke?.priority;
    const p = top ?? nested ?? -5000;
    if (!this.config.poke || typeof this.config.poke !== 'object') {
      this.config.poke = {};
    }
    this.config.poke.priority = p;
    this.config.poke_priority = p;
  }

  on(event, callback) {
    if (!this.watchers.has(event)) {
      this.watchers.set(event, []);
    }
    this.watchers.get(event).push(callback);
  }

  emit(event) {
    if (this.watchers.has(event)) {
      this.watchers.get(event).forEach((cb) => cb(this.config));
    }
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

export default new XRKConfig();
