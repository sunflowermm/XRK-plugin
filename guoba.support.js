/**
 * 锅巴面板：读写 data/xrkconfig/*，表单见 guoba.schemas.js
 */
import lodash from 'lodash'
import yaml from 'yaml'
import xrkconfig from './lib/xrkconfig.js'
import { readConfigSync, getConfigPath } from './lib/config-paths.js'
import { FileUtils } from '../../lib/utils/file-utils.js'
import { allGuobaSchemas } from './guoba.schemas.js'

const PLUGIN_CFG_KEYS = [
  'recommended_plugins_cfg',
  'entertainment_plugins_cfg',
  'game_plugins_cfg',
  'ip_plugins_cfg',
  'js_plugins_cfg',
]

const EXTRA_CFG_KEYS = [
  'weather_cfg',
  'screenshot_cfg',
  'help_system_cfg',
  'ai_cfg',
  'time_cfg',
  'poke_responses_cfg',
  ...PLUGIN_CFG_KEYS,
]

const EXTRA_FILE_MAP = {
  weather_cfg: { file: 'weather', ext: 'yaml' },
  screenshot_cfg: { file: 'screenshot', ext: 'yaml' },
  help_system_cfg: { file: 'help_system', ext: 'yaml' },
  ai_cfg: { file: 'ai', ext: 'json' },
  time_cfg: { file: 'time_config', ext: 'json' },
  poke_responses_cfg: { file: 'poke_responses', ext: 'json' },
  recommended_plugins_cfg: { file: 'recommended_plugins', ext: 'json' },
  entertainment_plugins_cfg: { file: 'entertainment_plugins', ext: 'json' },
  game_plugins_cfg: { file: 'game_plugins', ext: 'json' },
  ip_plugins_cfg: { file: 'ip_plugins', ext: 'json' },
  js_plugins_cfg: { file: 'js_plugins', ext: 'json' },
}

function formatTimeSlotsForGuoba(config) {
  const out = lodash.cloneDeep(config)
  const slots = out?.poke?.time_slots
  if (!slots || typeof slots !== 'object') return out
  for (const [k, v] of Object.entries(slots)) {
    if (Array.isArray(v)) slots[k] = v.join(',')
  }
  return out
}

function parseTimeSlotsFromGuoba(patch) {
  const slots = patch?.poke?.time_slots
  if (!slots || typeof slots !== 'object') return
  for (const [k, v] of Object.entries(slots)) {
    if (typeof v === 'string' && v.includes(',')) {
      const parts = v.split(',').map(s => parseInt(String(s).trim(), 10)).filter(n => !Number.isNaN(n))
      if (parts.length >= 2) slots[k] = parts
    }
  }
}

function normalizeCoremaster(value) {
  if (value == null || value === '') return 0
  if (Array.isArray(value)) {
    const first = value[0]
    const n = parseInt(String(first), 10)
    return Number.isNaN(n) ? 0 : n
  }
  const n = parseInt(String(value), 10)
  return Number.isNaN(n) ? 0 : n
}

function normalizeGroupList(value) {
  if (!value) return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map(v => String(v).trim()).filter(Boolean)
}

function aiToGuoba(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { entries: [] }
  return {
    entries: Object.entries(raw).map(([keyword, replies]) => ({
      keyword,
      replies: Array.isArray(replies) ? replies : [],
    })),
  }
}

function aiFromGuoba(cfg) {
  const obj = {}
  for (const row of cfg?.entries || []) {
    const keyword = row?.keyword
    if (keyword == null || String(keyword).trim() === '') continue
    obj[String(keyword).trim()] = Array.isArray(row.replies) ? row.replies : []
  }
  return obj
}

function timeToGuoba(raw) {
  if (!raw || typeof raw !== 'object') return { emojis: [], timeMessages: [] }
  const msgs = Array.isArray(raw.timeMessages) ? raw.timeMessages : []
  return {
    emojis: Array.isArray(raw.emojis) ? raw.emojis : [],
    timeMessages: msgs.map(m => (typeof m === 'string' ? { value: m } : m)),
  }
}

function timeFromGuoba(cfg) {
  return {
    emojis: Array.isArray(cfg?.emojis) ? cfg.emojis : [],
    timeMessages: (cfg?.timeMessages || [])
      .map(item => (typeof item === 'string' ? item : item?.value))
      .filter(v => v != null && String(v).trim() !== ''),
  }
}

function pluginListToGuoba(raw) {
  return Array.isArray(raw) ? raw : []
}

function pluginListFromGuoba(list) {
  return (Array.isArray(list) ? list : [])
    .filter(item => item && item.name != null && String(item.name).trim() !== '')
    .map(item => ({
      name: String(item.name).trim(),
      cn_name: item.cn_name ?? '',
      anothername: item.anothername ?? '',
      description: item.description ?? '',
      git: item.git ?? '',
    }))
}

function stripExtraFromPatch(patch) {
  const extra = {}
  for (const key of EXTRA_CFG_KEYS) {
    if (patch[key] !== undefined) {
      extra[key] = patch[key]
      delete patch[key]
    }
  }
  delete patch._guoba_hint
  delete patch._xrk_console_hint
  return extra
}

function writeConfigFile(file, ext, data) {
  if (data == null) return
  const filePath = getConfigPath(file, ext)
  const content = ext === 'json' ? JSON.stringify(data, null, 2) : yaml.stringify(data)
  FileUtils.writeFileSync(filePath, content, 'utf8')
}

function serializeExtra(key, data) {
  if (key === 'ai_cfg') return aiFromGuoba(data)
  if (key === 'time_cfg') return timeFromGuoba(data)
  if (PLUGIN_CFG_KEYS.includes(key)) return pluginListFromGuoba(data)
  return data
}

/** 锅巴只提交部分字段时，与磁盘已有配置合并后再写入 */
function mergeWithExisting(cfgKey, payload) {
  const meta = EXTRA_FILE_MAP[cfgKey]
  if (!meta) return payload
  if (cfgKey === 'ai_cfg' || PLUGIN_CFG_KEYS.includes(cfgKey)) return payload
  const existing = readConfigSync(meta.file, meta.ext)
  if (existing == null) return payload
  return lodash.merge({}, existing, payload)
}

function loadExtraForGuoba(key) {
  const meta = EXTRA_FILE_MAP[key]
  if (!meta) return null
  const raw = readConfigSync(meta.file, meta.ext)
  if (key === 'ai_cfg') return aiToGuoba(raw)
  if (key === 'time_cfg') return timeToGuoba(raw)
  if (PLUGIN_CFG_KEYS.includes(key)) return pluginListToGuoba(raw)
  return raw || (meta.ext === 'json' ? (PLUGIN_CFG_KEYS.includes(key) ? [] : {}) : {})
}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'xrk-plugin',
      title: '向日葵插件',
      author: '@Xrkseek',
      authorLink: 'https://gitcode.com/Xrkseek/XRK-plugin',
      link: 'https://github.com/sunflowermm/XRK-plugin',
      isV3: true,
      isV2: false,
      description:
        '锅巴可编辑主配置、词库、报时、戳文案常用池、帮助分组、插件列表、查天气与网页截图；深层 JSON 仍可用 XRK 控制台。',
      icon: 'mdi:flower',
      iconColor: '#e8a317',
    },
    configInfo: {
      schemas: allGuobaSchemas,
      getConfigData() {
        const base = formatTimeSlotsForGuoba(lodash.cloneDeep(xrkconfig.config))
        const extra = {}
        for (const key of EXTRA_CFG_KEYS) {
          extra[key] = loadExtraForGuoba(key)
        }
        return { ...base, ...extra }
      },
      setConfigData(data, { Result }) {
        const patch = lodash.cloneDeep(data)
        const extra = stripExtraFromPatch(patch)

        if (patch.coremaster !== undefined) patch.coremaster = normalizeCoremaster(patch.coremaster)
        for (const f of ['time_groupss', 'news_groupss', 'thumwhiteList']) {
          if (patch[f] !== undefined) patch[f] = normalizeGroupList(patch[f])
        }

        parseTimeSlotsFromGuoba(patch)

        const merged = lodash.merge({}, xrkconfig.getDefaultConfig(), xrkconfig.config, patch)
        xrkconfig.config = merged
        xrkconfig.save()
        xrkconfig.emit('change')

        for (const [cfgKey, meta] of Object.entries(EXTRA_FILE_MAP)) {
          if (extra[cfgKey] == null) continue
          const payload = mergeWithExisting(cfgKey, serializeExtra(cfgKey, extra[cfgKey]))
          writeConfigFile(meta.file, meta.ext, payload)
        }

        return Result.ok({}, '向日葵配置已保存~')
      },
    },
  }
}
