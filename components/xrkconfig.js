import fs from 'fs'
import path from 'path'
import yaml from 'yaml'
const ROOT_PATH = process.cwd()
const CONFIG_PATH = path.join(ROOT_PATH, 'data/xrkconfig/config.yaml')

class XRKConfig {
  constructor() {
    this.config = {}
    this.watchers = new Map()
    /** 配置文件绝对路径，供 config.js 等判断是否写入 xrk 配置 */
    this.configPath = CONFIG_PATH
    this.load()
    this.watch()
  }

  /** 默认配置：仅包含插件实际读取的字段，与 commonconfig/xrk.js schema 一致 */
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
      if (fs.existsSync(CONFIG_PATH)) {
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
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.config), 'utf8')
      logger.info('[XRKConfig] 配置文件保存成功')
    } catch (e) {
      logger.error('[XRKConfig] 配置文件保存失败:', e)
    }
  }

  watch() {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.watchFile(CONFIG_PATH, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
          logger.info('[XRKConfig] 检测到配置文件变更，重新加载')
          this.load()
          this.emit('change')
        }
      })
    }
  }

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

  // 以下 getter 与 getDefaultConfig 字段一一对应，供插件统一通过 xrkconfig.xxx 读取，避免直接读 config
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