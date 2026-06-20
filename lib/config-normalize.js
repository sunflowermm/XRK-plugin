/** 各子配置解析与归一化（无 IO，供 xrk-hub 使用） */

import { stripCqCodes } from './url-detect.js';

export function normalizeMessage(msg) {
  return stripCqCodes(msg).trim();
}

/** 词库命中：精确或归一化后匹配 keyword */
export function findMatchInDict(msg, dict) {
  const text = normalizeMessage(msg);
  if (!text || !dict || typeof dict !== 'object') return null;
  if (dict[text]) return text;
  return Object.keys(dict).find(k => normalizeMessage(k) === text) || null;
}

export function normalizeAiRaw(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  if (Array.isArray(raw.entries)) {
    const out = {};
    for (const row of raw.entries) {
      if (!row || typeof row !== 'object') continue;
      const key = normalizeMessage(row.keyword ?? row.key);
      if (!key) continue;
      const replies = row.replies ?? row.reply ?? row.values;
      if (Array.isArray(replies) && replies.length) out[key] = replies.map(String);
    }
    return out;
  }
  const out = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'entries') continue;
    const k = normalizeMessage(key);
    if (!k) continue;
    if (Array.isArray(val) && val.length) out[k] = val.map(String);
  }
  return out;
}

export function normalizeTimeMessages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        return String(item.value ?? item.message ?? item.text ?? '').trim();
      }
      return '';
    })
    .filter(Boolean);
}

export function parseTimeConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { emojis: [], timeMessages: ['{hours}点'] };
  }
  const messages = normalizeTimeMessages(raw.timeMessages);
  return {
    emojis: Array.isArray(raw.emojis) ? raw.emojis : [],
    timeMessages: messages.length ? messages : ['{hours}点']
  };
}

export function timeMessagesToFormRows(messages) {
  return normalizeTimeMessages(messages).map(value => ({ value }));
}

/** 已从帮助模板移除的废弃键（加载/保存时剔除） */
export const DEPRECATED_HELP_KEYS = [
  'theme', 'bgBlur', 'contBgBlur', 'colWidth', 'bgTheme', 'bgbg', 'bgLayer', 'injectBackground'
];

const DEPRECATED_HELP_STYLE_KEYS = ['contBgBlur', 'bgBlur'];

export const DEFAULT_HELP_CFG = {
  title: '向日葵帮助',
  subTitle: 'xrk-bot && XRK',
  columnCount: 2,
  style: {
    titleColor: '#f8fafc',
    subTitleColor: 'rgba(248,250,252,0.88)',
    groupColor: '#0f172a',
    accentColor: '#5eead4',
    fontColor: '#1e293b',
    descColor: '#475569',
    footerColor: 'rgba(248,250,252,0.72)',
    contBgColor: 'rgba(255, 255, 255, 0.08)',
    groupBgColor: 'linear-gradient(90deg, rgba(94, 234, 212, 0.04), rgba(255, 255, 255, 0.03))',
    rowBgColor1: 'rgba(255, 255, 255, 0.01)',
    rowBgColor2: 'rgba(255, 255, 255, 0.03)'
  }
};

export const HELP_STYLE_DEFAULTS = DEFAULT_HELP_CFG.style;

/** 戳一戳优先级双字段同步（poke_priority ↔ poke.priority） */
export function syncPokePriorityFields(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  const p = cfg.poke_priority ?? cfg.poke?.priority ?? -5000;
  if (!cfg.poke || typeof cfg.poke !== 'object') cfg.poke = {};
  cfg.poke.priority = p;
  cfg.poke_priority = p;
  return cfg;
}

function pickHelpStyle(style) {
  if (!style || typeof style !== 'object') return { ...DEFAULT_HELP_CFG.style };
  const out = { ...DEFAULT_HELP_CFG.style };
  for (const [k, v] of Object.entries(style)) {
    if (DEPRECATED_HELP_STYLE_KEYS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** 旧版 help_system（深色半透明 + theme/colWidth） */
export function isLegacyHelpRaw(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.theme != null || raw.colWidth != null || raw.bgBlur != null) return true;
  const s = raw.style;
  if (!s || typeof s !== 'object') return false;
  if (/rgba\s*\(\s*6\s*,\s*21\s*,\s*31/i.test(String(s.contBgColor || ''))) return true;
  if (String(s.fontColor || '').toLowerCase() === '#ceb78b') return true;
  return false;
}

export function parseHelpSystem(raw) {
  if (!raw || typeof raw !== 'object') {
    return { cfg: { ...DEFAULT_HELP_CFG }, list: [] };
  }
  const legacy = isLegacyHelpRaw(raw);
  const { helpList: hl, style, ...rest } = raw;
  const cfg = { ...DEFAULT_HELP_CFG };
  for (const [k, v] of Object.entries(rest)) {
    if (DEPRECATED_HELP_KEYS.includes(k)) continue;
    cfg[k] = v;
  }
  if (legacy) {
    cfg.columnCount = DEFAULT_HELP_CFG.columnCount;
    cfg.style = { ...DEFAULT_HELP_CFG.style };
  } else {
    cfg.style = pickHelpStyle(style);
  }
  return {
    cfg,
    list: Array.isArray(hl) ? hl : []
  };
}

/** 写入 help_system.yaml 前净化（剔除废弃键） */
export function sanitizeHelpSystemForDisk(raw) {
  const { cfg, list } = parseHelpSystem(raw);
  return { ...cfg, helpList: list };
}

export const DEFAULT_POKE_RESPONSES = {
  relationship: { stranger: ['戳什么戳！'] },
  mood: {},
  achievements: {},
  master_protection: {
    normal: ['不许戳主人！'],
    owner_warning: ['群主也不许戳主人！'],
    admin_warning: ['管理也不许戳主人！'],
    repeat_offender: ['再戳主人试试？'],
    punishments: {
      mute: ['禁言！'],
      mute_fail: ['禁言失败...'],
      poke: ['反击！']
    }
  }
};

export function parsePokeResponses(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  return DEFAULT_POKE_RESPONSES;
}

export function parsePluginList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.list)) return raw.list;
  return [];
}

/** 主配置归一化（迁移旧字段并剔除废弃键） */
export function normalizeMainConfig(raw) {
  const base = raw && typeof raw === 'object' ? { ...raw } : {};
  if (base.news?.delay != null && base.news_push_delay == null) {
    base.news_push_delay = base.news.delay;
  }
  delete base.news;
  if (base.thumbWhiteList != null && (!Array.isArray(base.thumwhiteList) || !base.thumwhiteList.length)) {
    base.thumwhiteList = base.thumbWhiteList;
  }
  delete base.thumbWhiteList;
  const merged = { ...getDefaultMainConfig(), ...base };
  if (merged.poke && typeof merged.poke === 'object') {
    merged.poke = { ...getDefaultMainConfig().poke, ...merged.poke };
  }
  return syncPokePriorityFields(merged);
}

export function getDefaultWeatherConfig() {
  return {
    enabled: true,
    max_cities: 5,
    forecast_days: 7,
    request_timeout_ms: 20000,
    reply_mode: 'image',
    include_charts: true,
    include_climate: true,
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    screenshot: {
      mode: 'live',
      width: 1500,
      height: 1000,
      deviceScaleFactor: 2,
      waitUntil: 'networkidle2',
      goto_timeout_ms: 45000,
      imageWaitTimeout: 10000,
      fontWaitTimeout: 4000,
      delayBeforeScreenshot: 3500,
      selectorTimeout: 25000,
      wait_for_hour: true,
      wait_for_charts: true,
      imgType: 'jpeg',
      quality: 92,
      clip: {
        width: 1240,
        x: null,
        anchor: '.weather-header .container',
        bottom_anchor: '#climateDiv .hb',
        selectors: [
          '.weather-header',
          '#realWarn',
          '#realChart',
          '#climateDiv'
        ],
        padding: { top: 52, left: 0, right: 0, bottom: 0 }
      }
    }
  };
}

/** 迁移 weather 旧 clip_padding / clip_selectors → screenshot.clip */
function migrateWeatherScreenshot(rawShot = {}) {
  const shot = { ...rawShot };
  const legacyPad = shot.clip_padding || {};
  const clip = { ...(shot.clip || {}) };
  if (shot.clip_selectors?.length && !clip.selectors?.length) {
    clip.selectors = shot.clip_selectors;
  }
  if (legacyPad.anchor != null && clip.anchor == null) clip.anchor = legacyPad.anchor;
  if (legacyPad.bottomAnchor != null && clip.bottom_anchor == null) clip.bottom_anchor = legacyPad.bottomAnchor;
  if (legacyPad.width != null && clip.width == null) clip.width = legacyPad.width;
  if (legacyPad.x != null && clip.x == null) clip.x = legacyPad.x;
  clip.padding = {
    ...(clip.padding || {}),
    ...(legacyPad.left != null ? { left: legacyPad.left } : {}),
    ...(legacyPad.right != null ? { right: legacyPad.right } : {}),
    ...(legacyPad.top != null ? { top: legacyPad.top } : {}),
    ...(legacyPad.bottom != null ? { bottom: legacyPad.bottom } : {})
  };
  delete shot.clip_padding;
  delete shot.clip_selectors;
  shot.clip = clip;
  return shot;
}

export function normalizeWeatherConfig(raw) {
  const def = getDefaultWeatherConfig();
  if (!raw || typeof raw !== 'object') return def;
  const rawShot = migrateWeatherScreenshot(raw.screenshot || {});
  return {
    ...def,
    ...raw,
    screenshot: {
      ...def.screenshot,
      ...rawShot,
      clip: {
        ...def.screenshot.clip,
        ...(rawShot.clip || {}),
        padding: {
          ...def.screenshot.clip.padding,
          ...(rawShot.clip?.padding || {})
        }
      }
    }
  };
}

export function getDefaultScreenshotConfig() {
  return {
    enabled: false,
    quality: 1.5,
    viewport: { width: 1280, height: 900 },
    maxFullPageHeight: 6000,
    lazyLoadScroll: true,
    imageWaitTimeout: 3000,
    fontWaitTimeout: 800,
    delayBeforeScreenshot: 2000,
    pageGotoTimeout: 60000,
    waitUntil: 'networkidle2',
    urlProcessing: {
      maxUrlsPerMessage: 5,
      minUrlLength: 4,
      maxUrlLength: 2083
    },
    whitelistDomains: [
      'github.com', 'gitee.com', 'gitlab.com', 'stackoverflow.com',
      'microsoft.com', 'google.com', 'npmjs.com', 'nodejs.org'
    ],
    blacklistDomains: [
      'bilibili.com', 'douyin.com', 'tiktok.com', 'twitter.com',
      'facebook.com', 'instagram.com', 'weibo.com', 'xiaohongshu.com',
      'porn', 'adult', 'xxx', 'sex', 'hentai', 'nsfw'
    ],
    blacklistIPs: [
      '127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'
    ],
    allowedLocalAddresses: ['localhost', '127.0.0.1'],
    filteredParams: [
      'utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid', 'ref', 'token'
    ],
    blockedExtensions: {
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'],
      media: ['mp4', 'webm', 'ogg', 'mp3', 'wav', 'flv', 'avi', 'mov'],
      documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
      archives: ['zip', 'rar', '7z', 'tar', 'gz'],
      executables: ['exe', 'msi', 'apk', 'dmg', 'deb'],
      code: ['js', 'css', 'py', 'php', 'bat', 'cmd'],
      fonts: ['ttf', 'otf', 'woff', 'woff2']
    },
    screenshotConfig: {
      width: 1280,
      height: 900,
      waitUntil: 'networkidle2',
      fullPage: false,
      maxFullPageHeight: 6000,
      lazyLoadScroll: true,
      imageWaitTimeout: 3000,
      delayBeforeScreenshot: 2000,
      imgType: 'jpeg',
      quality: 85
    }
  };
}

export function normalizeScreenshotConfig(raw) {
  const def = getDefaultScreenshotConfig();
  if (!raw || typeof raw !== 'object') return def;
  return {
    ...def,
    ...raw,
    viewport: { ...def.viewport, ...(raw.viewport || {}) },
    urlProcessing: { ...def.urlProcessing, ...(raw.urlProcessing || {}) },
    blockedExtensions: { ...def.blockedExtensions, ...(raw.blockedExtensions || {}) },
    screenshotConfig: { ...def.screenshotConfig, ...(raw.screenshotConfig || {}) }
  };
}

export function getDefaultMainConfig() {
  return {
    help_priority: 500,
    sharing: true,
    screen_shot_http: false,
    peopleai: false,
    screen_shot_quality: 1.5,
    news_pushtime: 8,
    news_push_delay: 1000,
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
      time_slots: {
        morning: [5, 9], noon: [11, 14], afternoon: [14, 17],
        evening: [17, 20], night: [22, 3], dawn: [3, 5]
      },
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

/** 天气截图默认裁切（与 weather.yaml screenshot.clip 一致） */
export function getDefaultNmcClip() {
  const clip = getDefaultWeatherConfig().screenshot.clip;
  return {
    selectors: [...clip.selectors],
    anchor: clip.anchor,
    bottom_anchor: clip.bottom_anchor,
    width: clip.width,
    x: clip.x,
    padding: { ...clip.padding }
  };
}

/** 网页截图运行时参数（screenshot.yaml + 主配置） */
export function buildScreenshotRuntime(screenshotCfg, mainCfg) {
  const cfg = normalizeScreenshotConfig(screenshotCfg);
  const main = normalizeMainConfig(mainCfg);
  const viewportWidth = cfg.viewport.width;
  const viewportHeight = cfg.viewport.height;
  const scale = cfg.quality ?? main.screen_shot_quality ?? cfg.screenshotConfig.deviceScaleFactor;
  const shot = cfg.screenshotConfig;
  return {
    enabled: !!(main.screen_shot_http || cfg.enabled === true),
    urlRules: {
      blacklistDomains: cfg.blacklistDomains,
      whitelistDomains: cfg.whitelistDomains,
      blacklistIPs: cfg.blacklistIPs,
      allowedLocalAddresses: cfg.allowedLocalAddresses,
      blockedExtensions: cfg.blockedExtensions,
      filteredParams: cfg.filteredParams,
      urlProcessing: { ...cfg.urlProcessing }
    },
    screenshotConfig: {
      width: shot.width ?? viewportWidth,
      height: shot.height ?? viewportHeight,
      deviceScaleFactor: shot.deviceScaleFactor ?? scale,
      waitUntil: cfg.waitUntil ?? shot.waitUntil,
      imgType: shot.imgType,
      fullPage: shot.fullPage,
      maxFullPageHeight: shot.maxFullPageHeight ?? cfg.maxFullPageHeight,
      lazyLoadScroll: shot.lazyLoadScroll ?? cfg.lazyLoadScroll,
      imageWaitTimeout: shot.imageWaitTimeout ?? cfg.imageWaitTimeout,
      fontWaitTimeout: cfg.fontWaitTimeout,
      delayBeforeScreenshot: shot.delayBeforeScreenshot ?? cfg.delayBeforeScreenshot,
      pageGotoTimeout: cfg.pageGotoTimeout,
      quality: shot.quality
    }
  };
}
