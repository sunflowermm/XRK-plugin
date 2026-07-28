/**
 * Zepp Life / 小米运动刷步数（私聊）
 * 主接口：steps.api.030101.xyz（原 api.mmp.cc 已停服）
 */
import crypto from 'crypto'
import path from 'path'
import plugin from '../../../lib/plugins/plugin.js'
import { FileUtils } from '../../../lib/utils/file-utils.js'

const ROOT_PATH = process.cwd()
const HIDDEN_DATA_DIR = path.join(ROOT_PATH, 'data', 'xrkconfig', '.xrk')
const ALGORITHM = 'aes-256-cbc'
const SECRET_KEY = '0123456789abcdef0123456789abcdef'
const IV = '0123456789abcdef'

/** 按优先级尝试；返回体字段不统一，统一归一化 */
const STEP_APIS = [
  {
    name: 'steps.api.030101.xyz',
    buildUrl: (user, pass, step) =>
      `https://steps.api.030101.xyz/api?account=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}&steps=${encodeURIComponent(step)}`,
    parse: (data, user, step) => {
      if (data?.status === 'success') {
        const m = String(data.message || '').match(/(\d+)/)
        return { ok: true, user, count: m ? Number(m[1]) : step }
      }
      return { ok: false, message: data?.message || data?.msg || '提交失败' }
    }
  },
  {
    name: 'api.mmp.cc',
    buildUrl: (user, pass, step) =>
      `https://api.mmp.cc/api/ZeppLife?user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}&count=${encodeURIComponent(step)}`,
    parse: (data, user, step) => {
      if (data?.code === 200) return { ok: true, user: data.user || user, count: data.count || step }
      return { ok: false, message: data?.msg || data?.message || data?.tip || '提交失败' }
    }
  }
]

function encrypt(text) {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV)
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

function decrypt(hex) {
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV)
  return decipher.update(hex, 'hex', 'utf8') + decipher.final('utf8')
}

function writeEncryptedJson(filePath, obj) {
  FileUtils.writeFileSync(filePath, encrypt(JSON.stringify(obj, null, 2)))
}

function readEncryptedJson(filePath) {
  if (!FileUtils.existsSync(filePath)) return null
  try {
    return JSON.parse(decrypt(FileUtils.readFileSync(filePath, 'utf8')))
  } catch (err) {
    logger.error(`[刷步数] 读取凭证失败: ${err.message}`)
    return null
  }
}

async function submitSteps(username, password, step) {
  let lastMessage = '步数提交失败，请稍后重试'
  for (const api of STEP_APIS) {
    try {
      const res = await fetch(api.buildUrl(username, password, step), {
        signal: AbortSignal.timeout(30000),
        headers: { 'User-Agent': 'XRK-plugin/刷步数' }
      })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        lastMessage = `${api.name} 返回非 JSON`
        continue
      }
      // 远梦站点整站停服提示
      if (data?.msg?.includes?.('已停止') || data?.tip) {
        lastMessage = data.tip || data.msg
        continue
      }
      const parsed = api.parse(data, username, step)
      if (parsed.ok) return { success: true, user: parsed.user, count: parsed.count }
      lastMessage = parsed.message
      // 账号/密码类错误不必再试下一个接口
      if (/密码|账号|格式|废物|登录|认证/i.test(String(lastMessage))) {
        return { success: false, message: lastMessage }
      }
    } catch (err) {
      lastMessage = `${api.name}: ${err.message}`
      logger.error(`[刷步数] ${api.name} 调用失败: ${err.message}`)
    }
  }
  return { success: false, message: lastMessage }
}

export class StepCounter extends plugin {
  constructor() {
    super({
      name: '刷步数',
      dsc: 'Zepp Life 刷步数',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: /^#刷步数.+[：:].+[：:].+$/, fnc: 'submitSteps' },
        { reg: /^#绑定步数.+[：:].+$/, fnc: 'bindAccount' },
        { reg: /^#刷步数\d+$/, fnc: 'submitBound' }
      ]
    })
    FileUtils.ensureDirSync(HIDDEN_DATA_DIR)
  }

  getUserDataPath(userId) {
    return path.join(HIDDEN_DATA_DIR, `${userId}.json`)
  }

  getCredentialsPath() {
    return path.join(HIDDEN_DATA_DIR, 'credentials.json')
  }

  getUserData(userId) {
    return readEncryptedJson(this.getUserDataPath(userId))
  }

  saveUserData(userId, data) {
    writeEncryptedJson(this.getUserDataPath(userId), data)
  }

  getAllCredentials() {
    return readEncryptedJson(this.getCredentialsPath()) || []
  }

  saveAllCredentials(list) {
    writeEncryptedJson(this.getCredentialsPath(), list)
  }

  isCredentialsUsed(username, password) {
    return this.getAllCredentials().some(
      (c) => c.username === username && c.password === password
    )
  }

  markCredentialsUsed(username, password) {
    const list = this.getAllCredentials()
    list.push({ username, password })
    this.saveAllCredentials(list)
  }

  isNewDay(lastUsed) {
    if (!lastUsed) return true
    const now = new Date()
    const prev = new Date(lastUsed)
    return (
      now.getFullYear() !== prev.getFullYear() ||
      now.getMonth() !== prev.getMonth() ||
      now.getDate() !== prev.getDate()
    )
  }

  ensurePrivate(e) {
    if (e.isPrivate) return true
    e.reply('该功能仅支持私聊使用')
    return false
  }

  async bindAccount(e) {
    if (!this.ensurePrivate(e)) return
    const raw = e.msg.replace('#绑定步数', '').trim()
    const [username, password] = raw.split(/[：:]/)
    if (!username || !password) {
      await this.reply('格式错误，请使用：#绑定步数账号：密码')
      return
    }
    if (this.isCredentialsUsed(username, password)) {
      await this.reply('该账号密码已被使用过，无法重复使用')
      return
    }
    let data = this.getUserData(e.user_id)
    if (data && !this.isNewDay(data.lastUsed)) {
      await this.reply('您今天已经使用过该功能，无法通过重复绑定来获取额外次数')
      return
    }
    if (data) {
      data.username = username
      data.password = password
    } else {
      data = { username, password, lastUsed: null }
    }
    this.saveUserData(e.user_id, data)
    await this.reply('账号绑定成功！您可以直接使用：#刷步数10000 来刷步数')
  }

  async submitBound(e) {
    if (!this.ensurePrivate(e)) return
    const data = this.getUserData(e.user_id)
    if (!data) {
      await this.reply('您还没有绑定账号，请先使用：#绑定步数账号：密码')
      return
    }
    if (!this.isNewDay(data.lastUsed)) {
      await this.reply('您今天已经使用过该功能，无法通过重复绑定来获取额外次数')
      return
    }
    const step = parseInt(e.msg.replace('#刷步数', ''), 10)
    if (isNaN(step) || step <= 0 || step > 98800) {
      await this.reply('步数必须在1-98800之间')
      return
    }
    if (this.isCredentialsUsed(data.username, data.password)) {
      await this.reply('该账号密码已被使用过，无法重复使用')
      return
    }
    const result = await submitSteps(data.username, data.password, step)
    if (result.success) {
      this.markCredentialsUsed(data.username, data.password)
      data.lastUsed = new Date().toISOString()
      this.saveUserData(e.user_id, data)
      await this.reply(`步数提交成功\n用户：${result.user}\n步数：${result.count}`)
    } else {
      await this.reply(`步数提交失败：${result.message}`)
    }
  }

  async submitSteps(e) {
    if (!this.ensurePrivate(e)) return
    const raw = e.msg.replace('#刷步数', '').trim()
    const [username, password, stepStr] = raw.split(/[：:]/)
    const step = parseInt(stepStr, 10)
    if (isNaN(step) || step <= 0 || step > 98800) {
      await this.reply('步数必须在1-98800之间')
      return
    }
    if (this.isCredentialsUsed(username, password)) {
      await this.reply('该账号密码已被使用过，无法重复使用')
      return
    }
    const existing = this.getUserData(e.user_id)
    if (existing && !this.isNewDay(existing.lastUsed)) {
      await this.reply('您今天已经使用过该功能，无法通过重复绑定来获取额外次数')
      return
    }
    const result = await submitSteps(username, password, step)
    if (result.success) {
      await this.reply(`步数提交成功\n用户：${result.user}\n步数：${result.count}`)
      this.markCredentialsUsed(username, password)
      if (!existing) {
        this.saveUserData(e.user_id, {
          username,
          password,
          lastUsed: new Date().toISOString()
        })
      } else {
        existing.lastUsed = new Date().toISOString()
        existing.username = username
        existing.password = password
        this.saveUserData(e.user_id, existing)
      }
    } else {
      await this.reply(`步数提交失败：${result.message}`)
    }
  }
}
