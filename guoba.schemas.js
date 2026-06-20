/**
 * 向日葵锅巴表单（对齐 commonconfig/xrk.js，充分利用锅巴组件）
 *
 * Input | InputNumber | InputPassword | Switch | Select | RadioGroup | Slider
 * GTags | GSelectFriend | GSelectGroup | GSubForm | Divider
 * 不支持：Textarea | MultiSelect（用 Select mode:multiple 或 GTags）
 */

import { PLUGIN_REGISTRY } from './lib/config-registry.js'

function sw(field, label, help = '') {
  return { field, label, ...(help ? { bottomHelpMessage: help } : {}), component: 'Switch' }
}

function num(field, label, opts = {}) {
  return {
    field,
    label,
    ...(opts.help ? { bottomHelpMessage: opts.help } : {}),
    component: 'InputNumber',
    componentProps: { min: opts.min, max: opts.max, step: opts.step, placeholder: opts.placeholder },
  }
}

function inp(field, label, opts = {}) {
  return {
    field,
    label,
    ...(opts.help ? { bottomHelpMessage: opts.help } : {}),
    component: opts.password ? 'InputPassword' : 'Input',
    componentProps: { placeholder: opts.placeholder },
  }
}

function sel(field, label, options, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'Select',
    componentProps: {
      options: options.map(o => (typeof o === 'string' ? { label: o, value: o } : o)),
      placeholder: '请选择',
    },
  }
}

function tags(field, label, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'GTags',
    componentProps: { allowAdd: true, allowDel: true },
  }
}

function multiSelect(field, label, options, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'Select',
    componentProps: {
      mode: 'multiple',
      options: options.map(o => (typeof o === 'string' ? { label: o, value: o } : o)),
    },
  }
}

function slider(field, label, opts = {}) {
  return {
    field,
    label,
    ...(opts.help ? { bottomHelpMessage: opts.help } : {}),
    component: 'Slider',
    componentProps: {
      min: opts.min ?? 0,
      max: opts.max ?? 1,
      step: opts.step ?? 0.05,
      marks: opts.marks,
    },
  }
}

function radio(field, label, options, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'RadioGroup',
    componentProps: { options },
  }
}

function subform(field, label, itemSchemas, help = '', multiple = true) {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'GSubForm',
    componentProps: { multiple, schemas: itemSchemas },
  }
}

function objForm(field, label, itemSchemas, help = '') {
  return subform(field, label, itemSchemas, help, false)
}

function selectGroup(field, label, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'GSelectGroup',
    componentProps: { placeholder: '选择群号' },
  }
}

function selectFriend(field, label, help = '') {
  return {
    field,
    label,
    ...(help ? { bottomHelpMessage: help } : {}),
    component: 'GSelectFriend',
    componentProps: { placeholder: '选择 QQ' },
  }
}

function divider(label) {
  return { component: 'Divider', label, componentProps: { orientation: 'left', plain: true } }
}

const chance = (field, label) => slider(field, label, { min: 0, max: 1, step: 0.05, help: '0–1 概率' })

const pokeTimeSlotSchemas = [
  inp('dawn', '凌晨', { help: '开始,结束 如 3,5', placeholder: '3,5' }),
  inp('morning', '早晨', { placeholder: '5,9' }),
  inp('noon', '中午', { placeholder: '11,14' }),
  inp('afternoon', '下午', { placeholder: '14,17' }),
  inp('evening', '傍晚', { placeholder: '17,20' }),
  inp('night', '夜晚', { placeholder: '22,3' }),
]

const pokeModuleSchemas = [
  sw('daily_rewards', '每日奖励'),
  sw('festival', '节日效果'),
  sw('basic', '基础回复'),
  sw('mood', '心情系统'),
  sw('intimacy', '亲密度'),
  sw('achievement', '成就'),
  sw('special', '特效'),
  sw('punishment', '惩罚'),
  sw('pokeback', '戳回去'),
  sw('image', '图片'),
  sw('voice', '语音'),
  sw('master', '主人专属'),
]

const pokeCooldownSchemas = [
  num('interaction', '互动冷却(ms)', { min: 0 }),
  num('special_effect', '特效冷却(ms)', { min: 0 }),
  num('punishment', '惩罚冷却(ms)', { min: 0 }),
]

const pokeChanceSchemas = [
  chance('mood_change', '心情变化'),
  chance('mood_reply', '心情变化时回复'),
  chance('special_trigger', '时段特效'),
  chance('special_effect_extra', '幸运/暴击等'),
  chance('punishment', '惩罚'),
  chance('mute_chance', '惩罚时禁言'),
  chance('daily_first', '今日首戳'),
  chance('daily_continuous', '连续签到'),
  chance('festival', '节日效果'),
]

const pokeMasterChanceSchemas = [
  chance('mute', '禁言概率'),
  chance('pokeback', '反戳概率'),
]

const pokePathSchemas = [
  inp('image_dir', '图片目录'),
  inp('voice_dir', '语音目录'),
]

const pluginItemSchemas = [
  inp('name', '插件名', { placeholder: '目录名' }),
  inp('cn_name', '中文名'),
  inp('anothername', '别名/关键词', { help: '搜索用，空格分隔' }),
  inp('description', '描述'),
  inp('git', 'Git 地址'),
]

const aiEntrySchemas = [
  inp('keyword', '关键词', { help: '用户消息需完全一致才触发', placeholder: 'mua' }),
  tags('replies', '回复文案列表'),
]

const timeMessageItemSchemas = [
  inp('value', '文案', { help: '占位符 {hours}、{botName}' }),
]

const helpEntrySchemas = [
  num('icon', '图标', { min: 0 }),
  inp('title', '标题'),
  inp('desc', '描述'),
]

const helpGroupSchemas = [
  inp('group', '分组名'),
  subform('list', '条目列表', helpEntrySchemas, '该分组下的帮助项'),
]

const moodTagsSchemas = [
  tags('angry', '生气'),
  tags('sad', '难过'),
  tags('normal', '普通'),
  tags('happy', '开心'),
  tags('excited', '兴奋'),
]

const relationshipTagsSchemas = [
  tags('stranger', '陌生人'),
  tags('acquaintance', '熟人'),
  tags('friend', '朋友'),
  tags('close_friend', '密友'),
  tags('best_friend', '挚友'),
  tags('intimate', '亲密'),
  tags('soulmate', '灵魂伴侣'),
]

/** config.yaml */
export const configSchemas = [
  divider('主配置'),
  num('help_priority', '帮助优先级', { help: '数值越大越优先' }),
  sw('sharing', '资源分享'),
  sw('screen_shot_http', '网页截图（主配置开关）'),
  sw('peopleai', '词库 AI', '需 ai.json / 下方词条'),
  num('screen_shot_quality', '截图渲染精度', { min: 1, max: 3, step: 0.1 }),
  radio('news_pushtime', '早报推送时间(点)', Array.from({ length: 24 }, (_, i) => ({ label: `${i} 点`, value: i }))),
  num('news_push_delay', '早报群间间隔(ms)', { min: 0 }),
  selectFriend('coremaster', '核心主人 QQ', '从好友列表选择；0 表示未设置'),
  inp('emoji_filename', '全局表情目录名'),
  selectGroup('time_groupss', '整点报时群'),
  selectGroup('news_groupss', '早报推送群'),
  selectGroup('thumwhiteList', '骗赞白名单群'),
  num('poke_priority', '戳一戳优先级'),
  num('corepoke_priority', '戳一戳主人优先级'),
  sw('chuomaster', '戳一戳主人'),
  divider('戳一戳'),
  sw('poke.enabled', '启用戳一戳'),
  num('poke.priority', '戳一戳内优先级'),
  sw('poke.pokeback_enabled', '允许戳回去'),
  chance('poke.basic_reply_chance', '基础回复概率'),
  chance('poke.pokeback_base_chance', '反戳基准概率'),
  chance('poke.module_skip_chance', '模块成功后跳过'),
  chance('poke.image_chance', '图片回复概率'),
  chance('poke.voice_chance', '语音回复概率'),
  sw('poke.master_image', '主人可触发图片'),
  sw('poke.master_punishment', '主人可触发惩罚'),
  objForm('poke.master_chances', '主人惩罚概率', pokeMasterChanceSchemas),
  objForm('poke.paths', '资源路径', pokePathSchemas),
  objForm('poke.time_slots', '时段划分', pokeTimeSlotSchemas, '格式 开始,结束；night 可跨日 22,3'),
  objForm('poke.modules', '功能模块', pokeModuleSchemas),
  objForm('poke.cooldowns', '冷却时间', pokeCooldownSchemas),
  objForm('poke.chances', '触发概率', pokeChanceSchemas),
]

/** ai.json → entries */
export const aiSchemas = [
  divider('词库 AI'),
  subform('ai_cfg.entries', '词条列表', aiEntrySchemas, '关键词完全匹配后随机回复一条'),
]

/** time_config.json */
export const timeSchemas = [
  divider('整点报时文案'),
  tags('time_cfg.emojis', '随机表情'),
  subform('time_cfg.timeMessages', '时间文案', timeMessageItemSchemas, '支持 {hours}、{botName}'),
]

/** poke_responses.json 常用池（完整结构见 XRK 控制台） */
export const pokeResponsesSchemas = [
  divider('戳一戳文案（常用）'),
  objForm('poke_responses_cfg.relationship', '关系文案', relationshipTagsSchemas),
  objForm('poke_responses_cfg.mood', '心情文案', moodTagsSchemas),
  objForm('poke_responses_cfg.time_effects', '时段文案', [
    tags('dawn', '凌晨'),
    tags('morning', '早晨'),
    tags('noon', '中午'),
    tags('afternoon', '下午'),
    tags('evening', '傍晚'),
    tags('night', '夜晚'),
  ]),
  objForm('poke_responses_cfg.pokeback', '戳回去', [
    tags('normal', '普通'),
    tags('happy', '开心'),
    tags('angry', '生气'),
    tags('sad', '难过'),
    tags('excited', '兴奋'),
  ]),
  tags('poke_responses_cfg.special_identity.master', '主人身份文案'),
  tags('poke_responses_cfg.daily_rewards.first', '今日首戳文案'),
  tags('poke_responses_cfg.daily_rewards.continuous', '连续签到文案'),
]

/** help_system.yaml */
export const helpSystemSchemas = [
  divider('帮助系统'),
  inp('help_system_cfg.title', '帮助标题'),
  inp('help_system_cfg.subTitle', '副标题'),
  num('help_system_cfg.columnCount', '列数', { min: 1, max: 4 }),
  objForm('help_system_cfg.style', '样式', [
    inp('titleColor', '标题颜色'),
    inp('subTitleColor', '副标题颜色'),
    inp('groupColor', '分组标题色'),
    inp('accentColor', '分组强调色'),
    inp('fontColor', '条目标题色'),
    inp('descColor', '描述颜色'),
    inp('footerColor', '页脚颜色'),
    inp('contBgColor', '面板背景色'),
    inp('groupBgColor', '分组背景'),
    inp('rowBgColor1', '奇数行背景'),
    inp('rowBgColor2', '偶数行背景'),
  ]),
  subform('help_system_cfg.helpList', '帮助分组', helpGroupSchemas, '分组与条目；复杂项可在 XRK 控制台编辑'),
]

export const pluginListSchemas = [
  divider('安装插件列表'),
  ...PLUGIN_REGISTRY.map(({ guobaKey, label }) =>
    subform(guobaKey, label, pluginItemSchemas, '与 #安装插件 展示一致')
  ),
]

/** weather.yaml */
export const weatherSchemas = [
  divider('查天气'),
  sw('weather_cfg.enabled', '启用查天气'),
  num('weather_cfg.max_cities', '单次最多城市数', { min: 1, max: 10 }),
  num('weather_cfg.forecast_days', '预报天数', { min: 1, max: 7 }),
  num('weather_cfg.request_timeout_ms', '请求超时(ms)', { min: 3000 }),
  radio(
    'weather_cfg.reply_mode',
    '回复模式',
    [
      { label: '图片（官网截图）', value: 'image' },
      { label: '文本', value: 'text' },
    ]
  ),
  sw('weather_cfg.include_charts', '含预报曲线图'),
  sw('weather_cfg.include_climate', '含气候背景图'),
  inp('weather_cfg.user_agent', 'User-Agent'),
  objForm('weather_cfg.screenshot', '天气截图参数', [
    radio('mode', '模式', [
      { label: '官网 live', value: 'live' },
      { label: '离线 HTML', value: 'html' },
    ]),
    num('width', '视口宽', { min: 640, max: 2560 }),
    num('height', '视口高', { min: 400, max: 2000 }),
    slider('deviceScaleFactor', '清晰度', { min: 1, max: 3, step: 0.5 }),
    sel('waitUntil', '等待策略', ['domcontentloaded', 'load', 'networkidle0', 'networkidle2']),
    num('goto_timeout_ms', '打开超时(ms)', { min: 5000 }),
    num('imageWaitTimeout', '图片等待(ms)', { min: 0 }),
    num('fontWaitTimeout', '字体等待(ms)', { min: 0 }),
    num('delayBeforeScreenshot', '截图前等待(ms)', { min: 500, max: 20000 }),
    num('selectorTimeout', '选择器等待(ms)', { min: 1000 }),
    sw('wait_for_hour', '等待小时表'),
    sw('wait_for_charts', '等待图表'),
    radio('imgType', '输出格式', [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
    ]),
    num('quality', 'JPEG 质量', { min: 1, max: 100 }),
    objForm('clip', '裁切参数', [
      num('width', '输出宽度(px)', { min: 640 }),
      inp('anchor', '左对齐锚点'),
      inp('bottom_anchor', '底部锚点'),
      tags('selectors', '裁切区域选择器'),
      objForm('padding', '边距(px)', [
        num('top', '上', { min: 0 }),
        num('left', '左', { min: 0 }),
        num('right', '右', { min: 0 }),
        num('bottom', '下', { min: 0 }),
      ]),
    ]),
  ]),
]

/** screenshot.yaml */
export const screenshotSchemas = [
  divider('网页截图'),
  sw('screenshot_cfg.enabled', '启用网页截图'),
  num('screenshot_cfg.quality', '渲染精度', { min: 1, max: 3, step: 0.1 }),
  objForm('screenshot_cfg.viewport', '默认视口', [
    num('width', '宽度', { min: 320 }),
    num('height', '高度', { min: 240 }),
  ]),
  num('screenshot_cfg.maxFullPageHeight', '整页最大高度(px)', { min: 1000 }),
  sw('screenshot_cfg.lazyLoadScroll', '懒加载滚动'),
  num('screenshot_cfg.imageWaitTimeout', '图片等待(ms)', { min: 0 }),
  num('screenshot_cfg.fontWaitTimeout', '字体等待(ms)', { min: 0 }),
  num('screenshot_cfg.delayBeforeScreenshot', '截图前延迟(ms)', { min: 0 }),
  num('screenshot_cfg.pageGotoTimeout', '页面打开超时(ms)', { min: 5000 }),
  sel('screenshot_cfg.waitUntil', '等待策略', ['domcontentloaded', 'load', 'networkidle0', 'networkidle2']),
  objForm('screenshot_cfg.urlProcessing', 'URL 处理', [
    num('maxUrlsPerMessage', '每消息最多 URL', { min: 1 }),
    num('minUrlLength', 'URL 最小长度', { min: 1 }),
    num('maxUrlLength', 'URL 最大长度', { min: 16 }),
  ]),
  tags('screenshot_cfg.whitelistDomains', '域名白名单'),
  tags('screenshot_cfg.blacklistDomains', '域名黑名单'),
  tags('screenshot_cfg.blacklistIPs', 'IP 黑名单(CIDR)'),
  tags('screenshot_cfg.allowedLocalAddresses', '允许的本地地址'),
  tags('screenshot_cfg.filteredParams', '过滤的 URL 参数'),
  objForm('screenshot_cfg.blockedExtensions', '拦截扩展名', [
    tags('images', '图片'),
    tags('media', '媒体'),
    tags('documents', '文档'),
    tags('archives', '压缩包'),
    tags('executables', '可执行文件'),
    tags('code', '代码/脚本'),
    tags('fonts', '字体'),
  ]),
  objForm('screenshot_cfg.screenshotConfig', '截图参数', [
    num('width', '宽度', { min: 320 }),
    num('height', '高度', { min: 240 }),
    sel('waitUntil', '等待策略', ['domcontentloaded', 'load', 'networkidle0', 'networkidle2']),
    sw('fullPage', '整页截图'),
    num('maxFullPageHeight', '整页最大高度', { min: 1000 }),
    sw('lazyLoadScroll', '懒加载滚动'),
    num('imageWaitTimeout', '图片等待(ms)', { min: 0 }),
    num('delayBeforeScreenshot', '截图前延迟(ms)', { min: 0 }),
    radio('imgType', '输出格式', [
      { label: 'JPEG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
    ]),
    num('quality', 'JPEG 质量', { min: 0, max: 100 }),
  ]),
]

export const allGuobaSchemas = [
  ...configSchemas,
  ...aiSchemas,
  ...timeSchemas,
  ...pokeResponsesSchemas,
  ...helpSystemSchemas,
  ...pluginListSchemas,
  ...weatherSchemas,
  ...screenshotSchemas,
]
