import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
import { FileUtils } from '../../../lib/utils/file-utils.js'

const ROOT_PATH = process.cwd()
const CONFIG_PATH = path.join(ROOT_PATH, 'data/xrkconfig/config.yaml')

/**
 * 向日葵插件运行时配置单例
 *
 * 读写 data/xrkconfig/config.yaml，供插件内各 app 通过 xrkconfig.xxx / get/set 使用。
 * 与 commonconfig/xrk.js（ConfigBase）共用同一文件：管理端通过 ConfigBase.write() 保存后，
 * 本模块的 watch 会检测到文件变更并自动 load()，无需额外同步。
 */
class XRKConfig {
  constructor() {
    this.config = {}
    this.watchers = new Map()
    /** 配置文件绝对路径，供 config.js、保存yaml 等判断是否写入 xrk 配置 */
    this.configPath = CONFIG_PATH
    this.load()
    this.watch()
  }

  /** 默认配置：字段与 commonconfig/xrk.js 的 schema.default 保持一致，供首次创建或兜底 */
  getDefaultConfig() {
    return {
      help_priority: 500,
      sharing: true,
      screen_shot_http: false,
      peopleai: false,
      signchecker: false,
      screen_shot_quality: 1.5,
      news_pushtime: 8,
      coremaster: 0,
      emoji_filename: '孤独摇滚',
      time_groupss: [],
      news_groupss: [],
      thumwhiteList: [],
      poke: {
        enabled: true,
        priority: -5000,
        modules: {
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
        master_image: true,
        master_punishment: true,
        cooldowns: { interaction: 30000, special_effect: 180000, punishment: 60000 },
        chances: { mood_change: 0.2, special_trigger: 0.15, punishment: 0.3 }
      },
      poke_priority: -5000,
      corepoke_priority: -5000,
      chuomaster: false
    }
  }

  load() {
    try {
      if (FileUtils.existsSync(CONFIG_PATH)) {
        const content = fs.readFileSync(CONFIG_PATH, 'utf8')
        this.config = yaml.parse(content) || {}
        logger.info('[XRKConfig] 配置文件加载成功')
      } else {
        logger.warn('[XRKConfig] 配置文件不存在，使用默认配置')
        this.config = this.getDefaultConfig()
        this.save()
      }
    } catch (e) {
      logger.error('[XRKConfig] 配置文件加载失败:', e)
      this.config = this.getDefaultConfig()
    }
  }

  save() {
    try {
      const dir = path.dirname(CONFIG_PATH)
      if (!FileUtils.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.config), 'utf8')
      logger.info('[XRKConfig] 配置文件保存成功')
    } catch (e) {
      logger.error('[XRKConfig] 配置文件保存失败:', e)
    }
  }

  watch() {
    if (FileUtils.existsSync(CONFIG_PATH)) {
      fs.watchFile(CONFIG_PATH, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          logger.info('[XRKConfig] 检测到配置文件变更，重新加载')
          this.load()
          this.emit('change')
        }
      })
    }
  }

  /**
   * 按点分路径读取配置项
   * @param {string} key - 如 'poke.priority'、'news_groupss'
   * @param {*} defaultValue - 键不存在时的返回值
   * @returns {*}
   */
  get(key, defaultValue = null) {
    const keys = key.split('.')
    let value = this.config

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return defaultValue
      }
    }

    return value
  }

  /**
   * 按点分路径写入配置项并立即落盘
   * @param {string} key - 如 'screen_shot_http'
   * @param {*} value
   */
  set(key, value) {
    const keys = key.split('.')
    let obj = this.config
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]
      if (!(k in obj) || typeof obj[k] !== 'object') {
        obj[k] = {}
      }
      obj = obj[k]
    }
    
    obj[keys[keys.length - 1]] = value
    this.save()
  }

  /** 监听配置变更（如文件被管理端修改后 load 完成时触发 'change'） */
  on(event, callback) {
    if (!this.watchers.has(event)) {
      this.watchers.set(event, [])
    }
    this.watchers.get(event).push(callback)
  }

  emit(event) {
    if (this.watchers.has(event)) {
      this.watchers.get(event).forEach(callback => callback(this.config))
    }
  }

  // 以下 getter 与 getDefaultConfig / commonconfig schema 对应，供插件通过 xrkconfig.xxx 读取
  get help_priority() { return this.config.help_priority ?? 500 }
  get sharing() { return this.config.sharing ?? true }
  get screen_shot_http() { return this.config.screen_shot_http ?? false }
  get peopleai() { return this.config.peopleai ?? false }
  get signchecker() { return this.config.signchecker ?? false }
  get screen_shot_quality() { return this.config.screen_shot_quality ?? 1.5 }
  get news_pushtime() { return this.config.news_pushtime ?? 8 }
  get coremaster() { return this.config.coremaster ?? 0 }
  get emoji_filename() { return this.config.emoji_filename ?? '孤独摇滚' }
  get time_groupss() { return this.config.time_groupss ?? [] }
  get news_groupss() { return this.config.news_groupss ?? [] }
  get thumwhiteList() { return this.config.thumwhiteList ?? this.config.thumbWhiteList ?? [] }
  get poke_priority() { return this.config.poke_priority ?? -5000 }
  get corepoke_priority() { return this.config.corepoke_priority ?? -5000 }
  get chuomaster() { return this.config.chuomaster ?? false }
  get poke() { return this.config.poke ?? {} }
  get master() { return this.config.master ?? null }
}

export default new XRKConfig()