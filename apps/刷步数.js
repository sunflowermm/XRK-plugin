/**
 * Zepp Life / 小米运动刷步数
 * 群聊可用已绑定账号刷步；绑定账密 / 带密码直刷仅私聊
 * 接口：https://steps.api.030101.xyz
 */
import crypto from 'crypto'
import path from 'path'
import plugin from '../../../lib/plugins/plugin.js'
import { FileUtils } from '../../../lib/utils/file-utils.js'

const HIDDEN_DATA_DIR = path.join(process.cwd(), 'data', 'xrkconfig', '.xrk')
const ALGORITHM = 'aes-256-cbc'
const SECRET_KEY = '0123456789abcdef0123456789abcdef'
const IV = '0123456789abcdef'
const STEP_API = 'https://steps.api.030101.xyz/api'

function encrypt(text) {
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, IV)
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

function decrypt(hex) {
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, IV)
  return decipher.update(hex, 'hex', 'utf8') + decipher.final('utf8')
}

function userPath(userId) {
  return path.join(HIDDEN_DATA_DIR, `${userId}.json`)
}

function readUser(userId) {
  const p = userPath(userId)
  if (!FileUtils.existsSync(p)) return null
  try {
    return JSON.parse(decrypt(FileUtils.readFileSync(p, 'utf8')))
  } catch (err) {
    logger.error(`[刷步数] 读取凭证失败: ${err.message}`)
    return null
  }
}

function saveUser(userId, data) {
  FileUtils.writeFileSync(userPath(userId), encrypt(JSON.stringify(data)))
}

function parseStep(n) {
  const step = parseInt(n, 10)
  if (isNaN(step) || step <= 0 || step > 98800) return null
  return step
}

async function submitSteps(username, password, step) {
  const url =
    `${STEP_API}?account=${encodeURIComponent(username)}` +
    `&password=${encodeURIComponent(password)}` +
    `&steps=${encodeURIComponent(step)}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'XRK-plugin/zepp-steps' }
    })
    const data = await res.json().catch(() => null)
    if (!data) return { success: false, message: '接口返回非 JSON' }
    if (data.status === 'success') {
      const m = String(data.message || '').match(/(\d+)/)
      return { success: true, user: username, count: m ? Number(m[1]) : step }
    }
    return { success: false, message: data.message || data.msg || '提交失败' }
  } catch (err) {
    logger.error(`[刷步数] 调用失败: ${err.message}`)
    return { success: false, message: err.message }
  }
}

export class StepCounter extends plugin {
  constructor() {
    super({
      name: '刷步数',
      dsc: 'Zepp Life 刷步数',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: /^#刷步数.+[：:].+[：:].+$/, fnc: 'submitOnce' },
        { reg: /^#绑定步数.+[：:].+$/, fnc: 'bindAccount' },
        { reg: /^#刷步数\d+$/, fnc: 'submitBound' }
      ]
    })
    FileUtils.ensureDirSync(HIDDEN_DATA_DIR)
  }

  /** 涉及账密的指令仅私聊 */
  ensurePrivateCreds(e) {
    if (e.isPrivate) return true
    e.reply('账密相关请私聊发送，群内勿发密码。已绑定可用：#刷步数10000')
    return false
  }

  async bindAccount(e) {
    if (!this.ensurePrivateCreds(e)) return
    const raw = e.msg.replace('#绑定步数', '').trim()
    const [username, password] = raw.split(/[：:]/)
    if (!username || !password) {
      await this.reply('格式错误，请使用：#绑定步数账号：密码')
      return
    }
    saveUser(e.user_id, { username, password })
    await this.reply('账号绑定成功！群聊/私聊均可：#刷步数10000')
  }

  async submitBound(e) {
    const data = readUser(e.user_id)
    if (!data?.username || !data?.password) {
      await this.reply('尚未绑定账号，请先私聊：#绑定步数账号：密码')
      return
    }
    const step = parseStep(e.msg.replace('#刷步数', ''))
    if (step == null) {
      await this.reply('步数必须在1-98800之间')
      return
    }
    const result = await submitSteps(data.username, data.password, step)
    if (result.success) {
      await this.reply(`步数提交成功\n用户：${result.user}\n步数：${result.count}`)
    } else {
      await this.reply(`步数提交失败：${result.message}`)
    }
  }

  async submitOnce(e) {
    if (!this.ensurePrivateCreds(e)) return
    const raw = e.msg.replace('#刷步数', '').trim()
    const [username, password, stepStr] = raw.split(/[：:]/)
    const step = parseStep(stepStr)
    if (!username || !password || step == null) {
      await this.reply('格式：#刷步数账号：密码：步数（步数1-98800）')
      return
    }
    const result = await submitSteps(username, password, step)
    if (result.success) {
      saveUser(e.user_id, { username, password })
      await this.reply(`步数提交成功\n用户：${result.user}\n步数：${result.count}`)
    } else {
      await this.reply(`步数提交失败：${result.message}`)
    }
  }
}
