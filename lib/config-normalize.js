/** 各子配置解析与归一化（无 IO，供 xrk-hub 使用） */

export function normalizeMessage(msg) {
  if (msg == null) return '';
  return String(msg).replace(/\[CQ:[^\]]+\]/gi, '').trim();
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

const DEFAULT_HELP_CFG = {
  title: '向日葵帮助',
  subTitle: 'xrk-bot && XRK',
  columnCount: 3,
  colWidth: 265,
  theme: 'all',
  themeExclude: ['default'],
  style: {
    fontColor: '#ceb78b',
    descColor: '#eee',
    contBgColor: 'rgba(6, 21, 31, .5)',
    contBgBlur: 4,
    headerBgColor: 'rgba(6, 21, 31, .4)',
    rowBgColor1: 'rgba(6, 21, 31, .2)',
    rowBgColor2: 'rgba(6, 21, 31, .35)'
  },
  bgBlur: false
};

export function parseHelpSystem(raw) {
  if (!raw || typeof raw !== 'object') {
    return { cfg: { ...DEFAULT_HELP_CFG }, list: [] };
  }
  const { helpList: hl, ...cfg } = raw;
  return {
    cfg: { ...DEFAULT_HELP_CFG, ...cfg },
    list: Array.isArray(hl) ? hl : []
  };
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

export function getDefaultMainConfig() {
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
