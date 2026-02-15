import ConfigBase from '../../../lib/commonconfig/commonconfig.js';

/**
 * 向日葵插件配置（ConfigBase 子类，供底层 commonconfig 管理端使用）
 *
 * 与底层结合方式：
 * - 由 lib/commonconfig/loader.js 扫描 plugins/XRK-plugin/commonconfig 自动加载；
 * - 在管理端中的配置 key 为「插件目录名_文件名」，即 XRK-plugin_xrk；
 * - 实际读写文件为 data/xrkconfig/config.yaml，与 components/xrkconfig.js 共用同一文件；
 * - 管理端通过 ConfigBase.read()/write() 读写后，xrkconfig 的 fs.watch 会检测到变更并自动重载，无需额外同步。
 *
 * schema 仅包含插件实际使用的字段，与 components/xrkconfig.js 的 getDefaultConfig() 保持一致。
 */
export default class XrkConfig extends ConfigBase {
  constructor() {
    super({
      name: 'xrk',
      displayName: '向日葵配置',
      description: '向日葵插件配置（data/xrkconfig/config.yaml），与 components/xrkconfig 共用',
      filePath: 'data/xrkconfig/config.yaml',
      fileType: 'yaml',
      schema: {
        fields: {
          help_priority: { type: 'number', label: '帮助优先级', description: '帮助指令在匹配时的优先级，数值越大越优先响应', default: 500, min: -99999, component: 'InputNumber' },
          sharing: { type: 'boolean', label: '资源分享', description: '开启后，帮助菜单中会显示「向日葵资源相关功能」入口', default: true, component: 'Switch' },
          screen_shot_http: { type: 'boolean', label: '网页截图', description: '开启后，发送消息中的链接可自动识别并生成网页截图', default: false, component: 'Switch' },
          peopleai: { type: 'boolean', label: '人工AI', description: '开启后启用向日葵人工AI相关功能', default: false, component: 'Switch' },
          signchecker: { type: 'boolean', label: '签名监测', description: '开启后对签名等行为进行检测', default: false, component: 'Switch' },
          screen_shot_quality: { type: 'number', label: '网页截图渲染精度', description: '网页截图时的渲染精度，1–3，数值越大越清晰但越耗性能', default: 1.5, min: 1, max: 3, component: 'InputNumber' },
          news_pushtime: { type: 'number', label: '早报推送时间（点）', description: '每日早报推送的小时数，0–23，如 8 表示早上 8 点', default: 8, min: 0, max: 23, component: 'InputNumber' },
          coremaster: { type: 'number', label: '核心主人QQ', description: '填主人QQ号，用于核心主人相关权限判断', default: 0, min: 0, component: 'InputNumber' },
          emoji_filename: { type: 'string', label: '全局表情目录名', description: '全局表情使用的资源目录名，需与 resources 下目录一致', default: '孤独摇滚', component: 'Input' },
          time_groupss: { type: 'array', label: '整点报时群号', itemType: 'string', default: [], component: 'Tags', description: '在此列表中的群会收到整点报时，每项填群号' },
          news_groupss: { type: 'array', label: '早报推送群号', itemType: 'string', default: [], component: 'Tags', description: '在此列表中的群会收到每日早报，每项填群号' },
          thumwhiteList: { type: 'array', label: '骗赞白名单群号', itemType: 'string', default: [], component: 'Tags', description: '在此列表中的群启用骗赞相关功能，每项填群号' },
          poke_priority: { type: 'number', label: '戳一戳优先级', description: '戳一戳功能在匹配时的优先级，负数表示较低优先级', default: -5000, component: 'InputNumber' },
          corepoke_priority: { type: 'number', label: '戳一戳主人优先级', description: '戳主人时的优先级，一般与戳一戳保持一致', default: -5000, component: 'InputNumber' },
          chuomaster: { type: 'boolean', label: '戳一戳主人', description: '开启后，主人被戳会触发专属戳一戳逻辑', default: false, component: 'Switch' },
          poke: {
            type: 'object',
            label: '戳一戳详细设置',
            description: '戳一戳回复的开关、冷却时间与触发概率',
            component: 'SubForm',
            fields: {
              enabled: { type: 'boolean', label: '启用戳一戳', description: '总开关，关闭后戳一戳不响应', default: true, component: 'Switch' },
              priority: { type: 'number', label: '优先级', description: '与根配置中的戳一戳优先级一致时可优先使用此处', default: -5000, component: 'InputNumber' },
              pokeback_enabled: { type: 'boolean', label: '允许戳回去', description: '开启后机器人会随机「戳回去」', default: true, component: 'Switch' },
              image_chance: { type: 'number', label: '图片回复概率', description: '0–1，戳一戳时回复图片的概率', default: 0.3, min: 0, max: 1, component: 'InputNumber' },
              voice_chance: { type: 'number', label: '语音回复概率', description: '0–1，戳一戳时回复语音的概率', default: 0.2, min: 0, max: 1, component: 'InputNumber' },
              master_image: { type: 'boolean', label: '主人可触发图片', description: '主人被戳时是否参与图片回复', default: true, component: 'Switch' },
              master_punishment: { type: 'boolean', label: '主人可触发惩罚', description: '主人被戳时是否参与惩罚逻辑', default: true, component: 'Switch' },
              modules: {
                type: 'object',
                label: '功能模块开关',
                description: '勾选即启用对应戳一戳子功能',
                component: 'SubForm',
                fields: {
                  basic: { type: 'boolean', label: '基础回复', default: true, component: 'Switch' },
                  mood: { type: 'boolean', label: '心情系统', default: true, component: 'Switch' },
                  intimacy: { type: 'boolean', label: '亲密度', default: true, component: 'Switch' },
                  achievement: { type: 'boolean', label: '成就', default: true, component: 'Switch' },
                  special: { type: 'boolean', label: '特效', default: true, component: 'Switch' },
                  punishment: { type: 'boolean', label: '惩罚', default: true, component: 'Switch' },
                  pokeback: { type: 'boolean', label: '戳回去', default: true, component: 'Switch' },
                  image: { type: 'boolean', label: '图片回复', default: true, component: 'Switch' },
                  voice: { type: 'boolean', label: '语音回复', default: true, component: 'Switch' },
                  master: { type: 'boolean', label: '主人专属', default: true, component: 'Switch' }
                }
              },
              cooldowns: {
                type: 'object',
                label: '冷却时间（毫秒）',
                description: '同一用户触发后，在此时间内不会再次触发',
                component: 'SubForm',
                fields: {
                  interaction: { type: 'number', label: '互动冷却', description: '同一用户两次互动之间的最小间隔（毫秒）', min: 0, default: 30000, component: 'InputNumber' },
                  special_effect: { type: 'number', label: '特效冷却', description: '特效类回复的冷却时间（毫秒）', min: 0, default: 180000, component: 'InputNumber' },
                  punishment: { type: 'number', label: '惩罚冷却', description: '惩罚类回复的冷却时间（毫秒）', min: 0, default: 60000, component: 'InputNumber' }
                }
              },
              chances: {
                type: 'object',
                label: '触发概率（0–1）',
                description: '各项随机事件发生的概率，0 为不触发，1 为必触发',
                component: 'SubForm',
                fields: {
                  mood_change: { type: 'number', label: '心情变化概率', min: 0, max: 1, default: 0.2, component: 'InputNumber' },
                  special_trigger: { type: 'number', label: '特效触发概率', min: 0, max: 1, default: 0.15, component: 'InputNumber' },
                  punishment: { type: 'number', label: '惩罚触发概率', min: 0, max: 1, default: 0.3, component: 'InputNumber' }
                }
              }
            }
          }
        }
      }
    });
  }

  /** 默认配置（由 schema 生成），供 ConfigBase.reset() 及管理端「恢复默认」使用 */
  get defaultConfig() {
    return this.buildDefaultFromSchema();
  }
}
