import cfg from '../../../lib/config/config.js'
import common from '../../../lib/common/common.js'
import xrkcfg from '../lib/xrkconfig.js';
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import { FileUtils } from '../../../lib/utils/file-utils.js'
import { getConfigPath, readConfigSync } from '../lib/config-paths.js'
const ROOT_PATH = process.cwd()
const DEFAULT_IMAGE_DIR = path.join(ROOT_PATH, 'plugins/XRK-plugin/resources/emoji/戳一戳表情')
const DEFAULT_VOICE_DIR = path.join(ROOT_PATH, 'plugins/XRK-plugin/resources/voice')

/** 获取戳一戳图片目录（支持配置覆盖） */
function getImageDir() {
  const cfg = xrkcfg?.poke?.paths?.image_dir
  return cfg ? path.isAbsolute(cfg) ? cfg : path.join(ROOT_PATH, cfg) : DEFAULT_IMAGE_DIR
}

/** 获取戳一戳语音目录（支持配置覆盖） */
function getVoiceDir() {
  const cfg = xrkcfg?.poke?.paths?.voice_dir
  return cfg ? path.isAbsolute(cfg) ? cfg : path.join(ROOT_PATH, cfg) : DEFAULT_VOICE_DIR
}

// 加载响应配置（data/xrkconfig/poke_responses.json）
const responses = (() => {
  const raw = readConfigSync('poke_responses', 'json')
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw
  logger.warn('[戳一戳] 未找到 data/xrkconfig/poke_responses.json，使用默认响应')
  return { relationship: { stranger: ["戳什么戳！"] }, mood: {}, achievements: {} }
})()

// 内存存储实现
const memoryStorage = {
  data: new Map(),
  
  async get(key) {
    const item = this.data.get(key)
    if (item) {
      if (item.expiry && Date.now() > item.expiry) {
        this.data.delete(key)
        return null
      }
      return item.value
    }
    return null
  },
  
  async set(key, value) {
    this.data.set(key, { value, expiry: null })
  },
  
  async setEx(key, seconds, value) {
    this.data.set(key, { 
      value, 
      expiry: Date.now() + (seconds * 1000) 
    })
  },
  
  async incr(key) {
    const val = await this.get(key)
    const newVal = (parseInt(val) || 0) + 1
    await this.set(key, newVal.toString())
    return newVal
  },
  
  async expire(key, seconds) {
    const item = this.data.get(key)
    if (item) {
      item.expiry = Date.now() + (seconds * 1000)
    }
  },
  
  async del(key) {
    this.data.delete(key)
  },
  
  async keys(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'))
    return Array.from(this.data.keys()).filter(k => regex.test(k))
  },
  
  async ttl(key) {
    const item = this.data.get(key)
    if (item && item.expiry) {
      return Math.floor((item.expiry - Date.now()) / 1000)
    }
    return -1
  }
}

const storage = global.redis || memoryStorage

// Redis键前缀
const REDIS_PREFIX = {
  USER_STATE: 'xrk:poke:user:',
  DAILY_COUNT: 'xrk:poke:daily:',
  MASTER_RECORD: 'xrk:poke:master:',
  COOLDOWN: 'xrk:poke:cd:'
}

const DEFAULT_USER_STATE = {
  intimacy: 0,
  lastInteraction: 0,
  consecutivePokes: 0,
  mood: 'normal',
  moodValue: 50,
  moodExpiry: null,
  lastSpecialEffect: {},
  lastPokeDate: '',
  consecutiveDays: 0,
  totalPokes: 0,
  achievements: [],
  relationship: 'stranger'
}

const MOOD_RANGES = { angry: 20, sad: 40, normal: 60, happy: 80, excited: 100 }

export class UniversalPoke extends plugin {
  constructor() {
    super({
      name: '向日葵超级戳一戳',
      dsc: '模块化的戳一戳系统',
      event: 'notice.group.poke',
      priority: xrkcfg.poke?.priority || -5000,
      rule: [{ fnc: 'handlePoke', log: false }]
    })
    this.init()
  }

  /** 初始化模块系统 */
  init() {
    const config = xrkcfg.poke || {}
    const modules = config.modules || {}
    
    this.modules = {
      daily_rewards: {
        enabled: modules.daily_rewards ?? true,
        execute: this.dailyRewardsSystem.bind(this)
      },
      festival: {
        enabled: modules.festival ?? true,
        execute: this.festivalEffects.bind(this)
      },
      basic: {
        enabled: modules.basic ?? true,
        execute: this.basicResponse.bind(this)
      },
      mood: {
        enabled: modules.mood ?? true,
        execute: this.moodSystem.bind(this)
      },
      intimacy: {
        enabled: modules.intimacy ?? true,
        execute: this.intimacySystem.bind(this)
      },
      achievement: {
        enabled: modules.achievement ?? true,
        execute: this.achievementSystem.bind(this)
      },
      special: {
        enabled: modules.special ?? true,
        execute: this.specialEffects.bind(this)
      },
      punishment: {
        enabled: modules.punishment ?? true,
        execute: this.punishmentSystem.bind(this)
      },
      pokeback: {
        enabled: modules.pokeback ?? false,
        execute: this.pokebackSystem.bind(this)
      },
      image: {
        enabled: modules.image ?? true,
        execute: this.sendImage.bind(this)
      },
      voice: {
        enabled: modules.voice ?? false,
        execute: this.sendVoice.bind(this)
      },
      master: {
        enabled: modules.master ?? true,
        execute: this.masterProtection.bind(this)
      }
    }

    this.startScheduledTasks()
  }

  /** 主处理函数 */
  async handlePoke(e) {
    try {
      // 全局开关
      if (!xrkcfg.poke?.enabled) return false

      // 忽略自己戳自己
      if (e.operator_id === e.target_id) return true

      // 获取身份信息
      const identities = await this.getIdentities(e)
      
      // 检查是否戳主人
      const masterQQs = cfg.masterQQ || []
      const targetIsMaster = masterQQs.includes(String(e.target_id))
      const operatorIsMaster = masterQQs.includes(String(e.operator_id))
      
      // 处理戳主人的情况（非主人戳主人时触发保护）
      if (targetIsMaster && !operatorIsMaster && this.modules.master.enabled) {
        return await this.handleMasterPoke(e, identities)
      }

      // 只处理戳机器人的情况
      if (e.target_id !== e.self_id) return false

      // 检查冷却时间
      if (!await this.checkCooldown(e.operator_id, 'interaction')) {
        return true
      }

      // 获取用户状态
      const userState = await this.getUserState(e.operator_id)
      
      // 更新基础信息
      await this.updateBasicInfo(e, userState)

      // 执行启用的模块
      const moduleResults = await this.executeModules(e, userState, identities)

      // 保存用户状态
      await this.saveUserState(e.operator_id, userState)

      return true
    } catch (err) {
      logger.error('[戳一戳] 处理失败:', err)
      return false
    }
  }

  /** 主人保护模块 */
  async masterProtection(e, userState, identities) {
    // 这个模块在executeModules中不会被调用，因为主人保护在handleMasterPoke中处理
    // 但保留这个函数以保持模块结构完整性
    return false
  }

  /** 处理戳主人 */
  async handleMasterPoke(e, identities) {
    try {
      const record = await this.getMasterPokeRecord(e.group_id, e.operator_id)
      record.count++
      await this.saveMasterPokeRecord(e.group_id, e.operator_id, record)
      
      let replyPool = responses.master_protection?.normal || ["不许戳主人！"]
      
      if (identities.operatorIsOwner) {
        replyPool = responses.master_protection?.owner_warning || replyPool
      } else if (identities.operatorIsAdmin) {
        replyPool = responses.master_protection?.admin_warning || replyPool
      } else if (record.count > 5) {
        replyPool = responses.master_protection?.repeat_offender || replyPool
      }
      
      const reply = replyPool[Math.floor(Math.random() * replyPool.length)]
      const formattedReply = reply
        .replace(/{count}/g, record.count)
        .replace(/{name}/g, e.sender?.card || e.sender?.nickname || '你')
      
      // 发送文字回复
      await e.reply([
        segment.at(e.operator_id),
        `\n${formattedReply}`
      ])
      
      // 如果启用了主人保护图片
      if (xrkcfg.poke?.master_image) {
        try {
          const response = await fetch("https://api.xingdream.top/API/poke.php")
          const data = await response.json()
          if (data?.status == 200 && data?.link) {
            await e.reply(segment.image(data.link))
          }
        } catch (err) {
          logger.error('[戳主人] 图片获取失败:', err)
        }
      }
      
      // 如果启用了主人保护惩罚
      if (xrkcfg.poke?.master_punishment) {
        await this.punishMasterPoker(e, identities, record)
      }
      
      return true
    } catch (err) {
      logger.error('[戳主人] 处理失败:', err)
      return false
    }
  }

  /** 惩罚戳主人的人 */
  async punishMasterPoker(e, identities, record) {
    try {
      // 根据戳戳次数决定惩罚等级
      let punishLevel = 1
      if (record.count > 3) punishLevel = 2
      if (record.count > 10) punishLevel = 3
      
      // 尝试禁言（概率从配置 master_chances.mute 读取）
      const muteChance = (xrkcfg.poke?.master_chances?.mute ?? 0.5) * punishLevel
      if (this.canMute(identities) && Math.random() < muteChance) {
        const muteTime = Math.min(300 * punishLevel * record.count, 86400) // 最多禁言24小时
        
        try {
          await e.group.muteMember(e.operator_id, muteTime)
          const muteReplies = responses.master_protection?.punishments?.mute || ["禁言！"]
          const reply = muteReplies[Math.floor(Math.random() * muteReplies.length)]
          await e.reply(reply.replace(/{time}/g, Math.floor(muteTime / 60)))
        } catch (err) {
          const failReplies = responses.master_protection?.punishments?.mute_fail || ["禁言失败..."]
          const reply = failReplies[Math.floor(Math.random() * failReplies.length)]
          await e.reply(reply)
        }
      }
      
      // 反戳惩罚（概率从配置 master_chances.pokeback 读取）
      const pokebackChance = xrkcfg.poke?.master_chances?.pokeback ?? 0.7
      if (xrkcfg.poke?.pokeback_enabled && Math.random() < pokebackChance) {
        const pokeReplies = responses.master_protection?.punishments?.poke || ["反击！"]
        const reply = pokeReplies[Math.floor(Math.random() * pokeReplies.length)]
        await e.reply(reply)
        
        // 连续戳回
        const pokeCount = Math.min(5 * punishLevel, 20)
        for (let i = 0; i < pokeCount; i++) {
          await common.sleep(800)
          await this.pokeMember(e, e.operator_id)
        }
      }
    } catch (err) {
      logger.error('[戳主人] 惩罚执行失败:', err)
    }
  }

  /** 检查冷却时间 */
  async checkCooldown(userId, type) {
    const cooldowns = xrkcfg.poke?.cooldowns || {}
    const cooldownTime = cooldowns[type] || 3000
    
    const key = `${REDIS_PREFIX.COOLDOWN}${type}:${userId}`
    const lastTime = await storage.get(key)
    
    if (lastTime && Date.now() - parseInt(lastTime) < cooldownTime) {
      return false
    }
    
    await storage.setEx(key, Math.ceil(cooldownTime / 1000), Date.now().toString())
    return true
  }

  /** 获取身份信息 */
  async getIdentities(e) {
    const masterQQs = cfg.masterQQ || []
    const operatorMember = e.group.pickMember(e.operator_id)
    const botMember = e.group.pickMember(e.self_id)
    
    return {
      operatorIsMaster: e.isMaster || masterQQs.includes(String(e.operator_id)),
      targetIsMaster: masterQQs.includes(String(e.target_id)),
      operatorIsOwner: operatorMember?.is_owner || false,
      operatorIsAdmin: operatorMember?.is_admin || false,
      botIsOwner: botMember?.is_owner || false,
      botIsAdmin: botMember?.is_admin || false,
      operatorRole: operatorMember?.is_owner ? 'owner' : 
                   operatorMember?.is_admin ? 'admin' : 'member',
      botRole: botMember?.is_owner ? 'owner' : 
              botMember?.is_admin ? 'admin' : 'member'
    }
  }

  /** 更新基础信息 */
  async updateBasicInfo(e, userState) {
    const now = Date.now()
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(now - 86400000).toISOString().slice(0, 10)

    userState.lastPokeInterval = now - userState.lastInteraction
    if (now - userState.lastInteraction < 30000) userState.consecutivePokes++
    else userState.consecutivePokes = 1

    if (userState.lastPokeDate === yesterday) userState.consecutiveDays = (userState.consecutiveDays || 0) + 1
    else if (userState.lastPokeDate !== today) userState.consecutiveDays = 1
    userState.lastPokeDate = today

    userState.lastInteraction = now
    userState.totalPokes++
    await this.incrementDailyCount(e.operator_id)
  }

  /** 从文案池随机发送（统一抽回复逻辑） */
  async sendFromPool(e, pool, userState, prefix = '') {
    if (!Array.isArray(pool) || pool.length === 0) return false
    const reply = pool[Math.floor(Math.random() * pool.length)]
    await e.reply([segment.at(e.operator_id), `\n${prefix}${this.formatReply(reply, e, userState)}`])
    return true
  }

  /** 根据当前小时获取时段（支持配置覆盖，兼容数组 [5,9] 与字符串 "5,9"） */
  getTimeEffect(hour) {
    const slots = xrkcfg.poke?.time_slots || {}
    const parseRange = (v) => {
      if (Array.isArray(v) && v.length >= 2) return v.map(Number)
      if (typeof v === 'string') {
        const parts = v.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => !isNaN(n))
        return parts.length >= 2 ? parts : null
      }
      return null
    }
    const check = (name, [start, end]) => {
      if (end > start) return hour >= start && hour < end
      return hour >= start || hour < end // 跨日如 night: [22, 3]
    }
    for (const [name, range] of Object.entries(slots)) {
      const parsed = parseRange(range)
      if (parsed && check(name, parsed)) return name
    }
    // 默认时段
    if (hour >= 3 && hour < 5) return 'dawn'
    if (hour >= 5 && hour < 9) return 'morning'
    if (hour >= 11 && hour < 14) return 'noon'
    if (hour >= 14 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 20) return 'evening'
    if (hour >= 22 || hour < 3) return 'night'
    return null
  }

  /** 执行模块 */
  async executeModules(e, userState, identities) {
    const results = {}
    const moduleOrder = ['daily_rewards', 'festival', 'mood', 'intimacy', 'achievement', 'special', 'basic', 'punishment', 'image', 'voice', 'pokeback']
    
    for (const name of moduleOrder) {
      const module = this.modules[name]
      if (module && module.enabled) {
        try {
          results[name] = await module.execute(e, userState, identities)
          
          // 如果某个模块处理成功，有一定概率跳过后续模块（可配置）
          const skipChance = xrkcfg.poke?.module_skip_chance ?? 0.3
          if (results[name] && Math.random() < skipChance) {
            break
          }
        } catch (err) {
          logger.error(`[戳一戳] 模块${name}执行失败:`, err)
        }
      }
    }
    
    return results
  }

  /** 基础回复模块 */
  async basicResponse(e, userState, identities) {
    const pool = this.getReplyPool(userState, identities)
    const chance = this.calculateReplyChance(userState, identities)
    return pool.length && Math.random() < chance ? this.sendFromPool(e, pool, userState) : false
  }

  /** 每日奖励模块 */
  async dailyRewardsSystem(e, userState) {
    const dailyCount = await this.getDailyCount(e.operator_id)
    const rewards = responses.daily_rewards || {}
    const p = xrkcfg.poke?.chances || {}

    if (dailyCount === 1 && rewards.first?.length && Math.random() < (p.daily_first ?? 0.6)) {
      return this.sendFromPool(e, rewards.first, userState, '🎁 ')
    }
    if ((userState.consecutiveDays || 0) >= 2 && rewards.continuous?.length && Math.random() < (p.daily_continuous ?? 0.25)) {
      const txt = String(rewards.continuous[Math.floor(Math.random() * rewards.continuous.length)]).replace(/{days}/g, userState.consecutiveDays)
      await e.reply([segment.at(e.operator_id), `\n📅 ${this.formatReply(txt, e, userState)}`])
      return true
    }
    return false
  }

  /** 节日效果模块 */
  async festivalEffects(e, userState) {
    const festival = this.getCurrentFestival()
    if (!festival) return false
    const replies = responses.festival_effects?.[festival]
    const chance = xrkcfg.poke?.chances?.festival ?? 0.15
    if (!replies?.length || Math.random() > chance) return false
    return this.sendFromPool(e, replies, userState, '🎉 ')
  }

  getCurrentFestival() {
    const d = new Date()
    const m = d.getMonth() + 1
    const day = d.getDate()
    if (m === 1 && day === 1) return 'new_year'
    if (m === 2 && day === 14) return 'valentine'
    if (m === 5 && day === 1) return 'labor_day'
    if (m === 6 && day === 1) return 'children_day'
    if (m === 10 && day === 1) return 'national_day'
    if (m === 10 && day === 31) return 'halloween'
    if (m === 12 && day === 25) return 'christmas'
    // 七夕（农历七月初七，约公历8月中旬）
    if (m === 8 && day >= 14 && day <= 22) return 'qixi'
    // 端午（农历五月初五，约公历6月上旬）
    if (m === 6 && day >= 5 && day <= 15) return 'dragon_boat'
    // 中秋（农历八月十五，约公历9月中旬）
    if (m === 9 && day >= 13 && day <= 22) return 'midautumn'
    // 春节（农历正月初一，约公历1月下旬-2月中旬）
    if ((m === 1 && day >= 20) || (m === 2 && day <= 20)) return 'spring_festival'
    return null
  }

  /** 心情系统模块 */
  async moodSystem(e, userState, identities) {
    const p = xrkcfg.poke?.chances || {}
    if (Math.random() >= (p.mood_change ?? 0.2)) return false

    const moodChange = this.calculateMoodChange(userState, identities)
    userState.moodValue = Math.max(0, Math.min(100, userState.moodValue + moodChange))
    userState.mood = Object.entries(MOOD_RANGES).find(([, v]) => userState.moodValue < v)?.[0] || 'excited'

    if (Math.abs(moodChange) > 10 && Math.random() < (p.mood_reply ?? 0.5)) {
      return this.sendFromPool(e, responses.mood?.[userState.mood], userState)
    }
    return false
  }

  /** 亲密度系统模块 */
  async intimacySystem(e, userState, identities) {
    let intimacyChange = 1
    
    if (identities.operatorIsMaster) intimacyChange += 3
    if (userState.mood === 'happy') intimacyChange += 1
    if (userState.mood === 'angry') intimacyChange -= 1
    if (userState.consecutivePokes > 10) intimacyChange -= 2
    
    userState.intimacy = Math.max(0, userState.intimacy + intimacyChange)
    
    const oldRelationship = userState.relationship
    userState.relationship = this.getRelationshipLevel(userState.intimacy)
    
    if (oldRelationship !== userState.relationship) {
      const upgradeReplies = responses.relationship?.upgrade?.[userState.relationship]
      if (upgradeReplies && upgradeReplies.length > 0) {
        const reply = upgradeReplies[Math.floor(Math.random() * upgradeReplies.length)]
        await e.reply([
          segment.at(e.operator_id),
          `\n🎉 关系升级！\n${this.formatReply(reply, e, userState)}`
        ])
        return true
      }
    }
    
    return false
  }

  /** 成就系统模块 */
  async achievementSystem(e, userState) {
    const hour = new Date().getHours()
    const interval = userState.lastPokeInterval ?? 0

    const checks = [
      { id: 'first_poke', condition: userState.totalPokes === 1, name: '初次见面' },
      { id: 'poke_10', condition: userState.totalPokes === 10, name: '戳戳新手' },
      { id: 'poke_100', condition: userState.totalPokes === 100, name: '戳戳达人' },
      { id: 'poke_1000', condition: userState.totalPokes === 1000, name: '戳戳大师' },
      { id: 'poke_5000', condition: userState.totalPokes === 5000, name: '戳戳之神' },
      { id: 'consecutive_10', condition: userState.consecutivePokes === 10, name: '连击达人' },
      { id: 'intimate_100', condition: userState.intimacy >= 100, name: '亲密好友' },
      { id: 'intimate_500', condition: userState.intimacy >= 500, name: '至交挚友' },
      { id: 'mood_master', condition: userState.moodValue >= 90, name: '心情调节大师' },
      { id: 'night_owl', condition: hour >= 23 || hour < 5, name: '夜猫子' },
      { id: 'early_bird', condition: hour >= 5 && hour < 8, name: '早起鸟' },
      { id: 'speed_poke', condition: userState.totalPokes > 1 && interval > 0 && interval < 5000, name: '光速戳戳' },
      { id: 'gentle_touch', condition: userState.totalPokes > 1 && interval >= 300000, name: '温柔触碰' }
    ]

    for (const c of checks) {
      if (c.condition && !userState.achievements.includes(c.id)) {
        userState.achievements.push(c.id)
        const pool = responses.achievements?.[c.id] || responses.achievements?.default || ['成就达成！']
        await this.sendFromPool(e, pool, userState, `🏆 获得成就【${c.name}】\n`)
        return true
      }
    }
    return false
  }

  /** 特殊效果模块 */
  async specialEffects(e, userState) {
    const p = xrkcfg.poke?.chances || {}
    if (!(await this.checkCooldown(e.operator_id, 'special_effect'))) return false

    if (Math.random() < (p.special_trigger ?? 0.15)) {
      const timeEffect = this.getTimeEffect(new Date().getHours())
      if (timeEffect && responses.time_effects?.[timeEffect]) {
        return this.sendFromPool(e, responses.time_effects[timeEffect], userState)
      }
    }
    if (Math.random() < (p.special_effect_extra ?? 0.1) && userState.intimacy > 50) {
      const effects = Object.keys(responses.special_effects || {})
      if (effects.length) {
        const effect = effects[Math.floor(Math.random() * effects.length)]
        return this.sendFromPool(e, responses.special_effects[effect], userState, '✨ ')
      }
    }
    return false
  }

  /** 惩罚系统模块 */
  async punishmentSystem(e, userState, identities) {
    if (userState.consecutivePokes <= 5) return false
    const p = xrkcfg.poke?.chances || {}
    if (!(await this.checkCooldown(e.operator_id, 'punishment'))) return false
    if (Math.random() >= (p.punishment ?? 0.3)) {
      userState.moodValue = Math.max(0, userState.moodValue - userState.consecutivePokes * 2)
      return false
    }

    const muteChance = p.mute_chance ?? 0.5
    if (this.canMute(identities) && Math.random() < muteChance) {
      try {
        await e.group.muteMember(e.operator_id, Math.min(60 * userState.consecutivePokes, 1800))
        return this.sendFromPool(e, responses.punishments?.mute?.success || ['禁言成功！'], userState)
      } catch {
        return this.sendFromPool(e, responses.punishments?.mute?.fail || ['禁言失败...'], userState)
      }
    }
    const reduction = Math.min(userState.consecutivePokes * 2, 20)
    userState.intimacy = Math.max(0, userState.intimacy - reduction)
    const pool = (responses.punishments?.intimacy_reduction || ['亲密度下降了...']).map(r => r.replace(/{reduction}/g, reduction))
    return this.sendFromPool(e, pool, userState)
  }

  /** 反戳系统模块（基准概率从配置 pokeback_base_chance 读取） */
  async pokebackSystem(e, userState, identities) {
    if (!xrkcfg.poke?.pokeback_enabled) return false
    let chance = xrkcfg.poke?.pokeback_base_chance ?? 0.3
    if (userState.mood === 'angry') chance += 0.3
    if (userState.consecutivePokes > 5) chance += 0.2
    if (identities.operatorIsMaster) chance -= 0.2
    if (Math.random() >= chance) return false

    const pool = responses.pokeback?.[userState.mood] || responses.pokeback?.normal || ['戳回去！']
    if (!(await this.sendFromPool(e, pool, userState))) return false
    const pokeCount = Math.min(Math.floor(userState.consecutivePokes / 2), 5)
    for (let i = 0; i < pokeCount; i++) {
      await common.sleep(1000)
      await this.pokeMember(e, e.operator_id)
    }
    return true
  }

  /** 发送图片模块 */
  async sendImage(e, userState, identities) {
    let imageChance = xrkcfg.poke?.image_chance || 0.3
    
    if (userState.mood === 'happy') imageChance += 0.1
    if (userState.intimacy > 100) imageChance += 0.1
    
    if (Math.random() < imageChance) {
      try {
        const imgDir = getImageDir()
        if (FileUtils.existsSync(imgDir)) {
          const files = (FileUtils.readDirSync(imgDir) || []).filter(file =>
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
          )
          
          if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)]
            await e.reply(segment.image(`file://${path.join(imgDir, randomFile)}`))
            return true
          }
        }
      } catch (err) {
        logger.error('[戳一戳] 发送图片失败:', err)
      }
    }
    
    return false
  }

  /** 发送语音模块 */
  async sendVoice(e, userState, identities) {
    let voiceChance = xrkcfg.poke?.voice_chance || 0.2
    
    if (userState.mood === 'excited') voiceChance += 0.1
    if (userState.intimacy > 200) voiceChance += 0.1
    
    if (Math.random() < voiceChance) {
      try {
        const voiceDir = getVoiceDir()
        if (FileUtils.existsSync(voiceDir)) {
          const files = (FileUtils.readDirSync(voiceDir) || []).filter(file =>
            /\.(mp3|wav|ogg|silk|amr)$/i.test(file)
          )
          
          if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)]
            await e.reply(segment.record(`file://${path.join(voiceDir, randomFile)}`))
            return true
          }
        }
      } catch (err) {
        logger.error('[戳一戳] 发送语音失败:', err)
      }
    }
    
    return false
  }

  // ========== 工具函数 ==========

  /** 获取回复池 */
  getReplyPool(userState, identities) {
    let pool = []

    const relationshipReplies = responses.relationship?.[userState.relationship] || responses.relationship?.stranger || []
    pool = [...relationshipReplies]

    if (responses.mood?.[userState.mood]) {
      pool = [...pool, ...responses.mood[userState.mood]]
    }

    const si = responses.special_identity || {}
    if (identities.operatorIsMaster && si.master?.length) pool = [...pool, ...si.master]
    else if (identities.operatorIsOwner && si.owner?.length) pool = [...pool, ...si.owner]
    else if (identities.operatorIsAdmin && si.admin?.length) pool = [...pool, ...si.admin]
    if (userState.totalPokes <= 10 && si.newbie?.length) pool = [...pool, ...si.newbie]
    if (identities.operatorRole === 'vip' && si.vip?.length) pool = [...pool, ...si.vip]

    return pool
  }

  /** 计算回复概率（基准从配置 basic_reply_chance 读取） */
  calculateReplyChance(userState, identities) {
    let chance = xrkcfg.poke?.basic_reply_chance ?? 0.6
    
    chance += Math.min(0.2, userState.intimacy / 1000)
    
    if (userState.mood === 'happy') chance += 0.1
    if (userState.mood === 'angry') chance -= 0.2
    
    if (userState.consecutivePokes > 5) chance -= 0.3
    
    if (identities.operatorIsMaster) chance += 0.2
    
    return Math.max(0.1, Math.min(1, chance))
  }

  /** 计算心情变化 */
  calculateMoodChange(userState, identities) {
    let change = 0
    
    if (userState.consecutivePokes <= 3) {
      change = Math.random() * 5
    } else if (userState.consecutivePokes <= 10) {
      change = -Math.random() * 5
    } else {
      change = -Math.random() * 10
    }
    
    if (identities.operatorIsMaster) change += 5
    
    const hour = new Date().getHours()
    if (hour >= 22 || hour < 6) change -= 3
    
    return change
  }

  /** 获取关系等级 */
  getRelationshipLevel(intimacy) {
    if (intimacy < 10) return 'stranger'
    if (intimacy < 50) return 'acquaintance'
    if (intimacy < 100) return 'friend'
    if (intimacy < 300) return 'close_friend'
    if (intimacy < 500) return 'best_friend'
    if (intimacy < 1000) return 'intimate'
    return 'soulmate'
  }

  /** 格式化回复 */
  formatReply(reply, e, userState) {
    const nickname = e.sender?.card || e.sender?.nickname || '你'
    return String(reply)
      .replace(/{name}/g, nickname)
      .replace(/{intimacy}/g, userState.intimacy)
      .replace(/{mood}/g, this.getMoodName(userState.mood))
      .replace(/{consecutive}/g, userState.consecutivePokes)
      .replace(/{total}/g, userState.totalPokes)
      .replace(/{count}/g, userState.consecutivePokes)
      .replace(/{days}/g, userState.consecutiveDays || 1)
  }

  /** 获取心情名称 */
  getMoodName(mood) {
    const moodNames = {
      angry: '生气',
      sad: '难过',
      normal: '普通',
      happy: '开心',
      excited: '兴奋'
    }
    return moodNames[mood] || mood
  }

  /** 判断是否可以禁言 */
  canMute(identities) {
    if (identities.botIsOwner) return true
    
    if (identities.botIsAdmin) {
      if (identities.operatorIsOwner || identities.operatorIsAdmin) return false
      return true
    }
    
    return false
  }

  /** 戳群成员 */
  async pokeMember(e, userId) {
    if (!xrkcfg.poke?.pokeback_enabled) return
    
    try {
      if (e.group?.pokeMember) {
        await e.group.pokeMember(userId)
      } else {
        await e.reply([
          segment.at(userId),
          '\n👉 戳你一下！'
        ])
      }
    } catch (err) {
      logger.error('[戳一戳] 戳成员失败:', err)
    }
  }

  /** 定时任务 */
  startScheduledTasks() {
    // 每日重置
    setInterval(() => {
      const hour = new Date().getHours()
      if (hour === 0) {
        this.resetDailyData()
      }
    }, 3600000)
    
    // 清理过期数据
    setInterval(() => {
      this.cleanExpiredData()
    }, 3600000)
  }

  /** 重置每日数据 */
  async resetDailyData() {
    try {
      const keys = await storage.keys(`${REDIS_PREFIX.DAILY_COUNT}*`)
      for (const key of keys) {
        await storage.del(key)
      }
      logger.info('[戳一戳] 每日数据已重置')
    } catch (err) {
      logger.error('[戳一戳] 重置每日数据失败:', err)
    }
  }

  /** 清理过期数据 */
  async cleanExpiredData() {
    try {
      const patterns = [
        `${REDIS_PREFIX.USER_STATE}*`,
        `${REDIS_PREFIX.MASTER_RECORD}*`,
        `${REDIS_PREFIX.COOLDOWN}*`
      ]
      
      for (const pattern of patterns) {
        const keys = await storage.keys(pattern)
        for (const key of keys) {
          const ttl = await storage.ttl(key)
          if (ttl === 0) {
            await storage.del(key)
          }
        }
      }
    } catch (err) {
      logger.error('[戳一戳] 清理过期数据失败:', err)
    }
  }

  // ========== Storage 操作 ==========

  /** 获取用户状态 */
  async getUserState(userId) {
    try {
      const key = `${REDIS_PREFIX.USER_STATE}${userId}`
      const data = await storage.get(key)
      
      if (data) {
        const state = JSON.parse(data)
        return { ...DEFAULT_USER_STATE, ...state }
      }
      
      return { ...DEFAULT_USER_STATE }
    } catch (err) {
      logger.error('[戳一戳] 获取用户状态失败:', err)
      return { ...DEFAULT_USER_STATE }
    }
  }

  /** 保存用户状态 */
  async saveUserState(userId, userState) {
    try {
      const key = `${REDIS_PREFIX.USER_STATE}${userId}`
      await storage.setEx(key, 604800, JSON.stringify(userState))
    } catch (err) {
      logger.error('[戳一戳] 保存用户状态失败:', err)
    }
  }

  /** 获取每日戳戳次数 */
  async getDailyCount(userId) {
    try {
      const key = `${REDIS_PREFIX.DAILY_COUNT}${userId}`
      const count = await storage.get(key)
      return count ? parseInt(count) : 0
    } catch (err) {
      logger.error('[戳一戳] 获取每日次数失败:', err)
      return 0
    }
  }

  /** 增加每日戳戳次数 */
  async incrementDailyCount(userId) {
    try {
      const key = `${REDIS_PREFIX.DAILY_COUNT}${userId}`
      await storage.incr(key)
      
      const now = new Date()
      const endOfDay = new Date(now)
      endOfDay.setHours(23, 59, 59, 999)
      const ttl = Math.floor((endOfDay - now) / 1000)
      await storage.expire(key, ttl)
    } catch (err) {
      logger.error('[戳一戳] 增加每日次数失败:', err)
    }
  }

  /** 获取戳主人记录 */
  async getMasterPokeRecord(groupId, userId) {
    try {
      const key = `${REDIS_PREFIX.MASTER_RECORD}${groupId}:${userId}`
      const data = await storage.get(key)
      
      if (data) {
        return JSON.parse(data)
      }
      
      return { count: 0, lastPoke: Date.now() }
    } catch (err) {
      logger.error('[戳一戳] 获取主人戳戳记录失败:', err)
      return { count: 0, lastPoke: Date.now() }
    }
  }

  /** 保存戳主人记录 */
  async saveMasterPokeRecord(groupId, userId, record) {
    try {
      const key = `${REDIS_PREFIX.MASTER_RECORD}${groupId}:${userId}`
      record.lastPoke = Date.now()
      await storage.setEx(key, 86400, JSON.stringify(record))
    } catch (err) {
      logger.error('[戳一戳] 保存主人戳戳记录失败:', err)
    }
  }
}