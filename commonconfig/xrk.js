import ConfigBase from '../../../lib/commonconfig/commonconfig.js';

/**
 * 向日葵插件配置（单文件 data/xrkconfig/config.yaml）
 * 仅包含插件实际使用的字段，供 commonconfig 管理端展示与编辑。
 */
export default class XrkConfig extends ConfigBase {
  constructor() {
    super({
      name: 'xrk',
      displayName: '向日葵配置',
      description: '向日葵插件配置（data/xrkconfig/config.yaml）',
      filePath: 'data/xrkconfig/config.yaml',
      fileType: 'yaml',
      schema: {
        fields: {
          help_priority: { type: 'number', label: '帮助优先级', description: '帮助指令匹配优先级', default: 500, min: -99999, component: 'InputNumber' },
          sharing: { type: 'boolean', label: '资源分享', description: '是否在帮助中展示向日葵资源相关功能', default: true, component: 'Switch' },
          screen_shot_http: { type: 'boolean', label: '网页截图', description: '是否启用链接网页截图', default: false, component: 'Switch' },
          peopleai: { type: 'boolean', label: '人工AI', description: '是否开启向日葵人工AI', default: false, component: 'Switch' },
          signchecker: { type: 'boolean', label: '签名监测', default: false, component: 'Switch' },
          screen_shot_quality: { type: 'number', label: '渲染精度', description: '截图渲染精度 1–3', default: 1.5, min: 1, max: 3, component: 'InputNumber' },
          news_pushtime: { type: 'number', label: '早报推送时间', description: '每日推送早报的小时数', default: 8, min: 0, max: 23, component: 'InputNumber' },
          coremaster: { type: 'number', label: '核心主人QQ', description: '核心主人账号', default: 0, min: 0, component: 'InputNumber' },
          emoji_filename: { type: 'string', label: '全局表情目录', default: '孤独摇滚', component: 'Input' },
          time_groupss: { type: 'array', label: '整点报时白名单群', itemType: 'string', default: [], component: 'Tags' },
          news_groupss: { type: 'array', label: '早报推送白名单群', itemType: 'string', default: [], component: 'Tags' },
          thumwhiteList: { type: 'array', label: '骗赞白名单群', itemType: 'string', default: [], component: 'Tags' },
          poke_priority: { type: 'number', label: '戳一戳优先级', default: -5000, component: 'InputNumber' },
          corepoke_priority: { type: 'number', label: '戳一戳主人优先级', default: -5000, component: 'InputNumber' },
          chuomaster: { type: 'boolean', label: '戳一戳主人', description: '是否开启戳一戳主人相关', default: false, component: 'Switch' },
          poke: {
            type: 'object',
            label: '戳一戳',
            component: 'SubForm',
            fields: {
              enabled: { type: 'boolean', label: '启用戳一戳', default: true, component: 'Switch' },
              priority: { type: 'number', label: '优先级', default: -5000, component: 'InputNumber' },
              pokeback_enabled: { type: 'boolean', label: '戳回去', default: true, component: 'Switch' },
              image_chance: { type: 'number', label: '图片概率', default: 0.3, min: 0, max: 1, component: 'InputNumber' },
              voice_chance: { type: 'number', label: '语音概率', default: 0.2, min: 0, max: 1, component: 'InputNumber' },
              master_image: { type: 'boolean', label: '主人图片', default: true, component: 'Switch' },
              master_punishment: { type: 'boolean', label: '主人惩罚', default: true, component: 'Switch' },
              modules: {
                type: 'object',
                label: '模块开关',
                component: 'SubForm',
                fields: {
                  basic: { type: 'boolean', label: '基础', default: true, component: 'Switch' },
                  mood: { type: 'boolean', label: '心情', default: true, component: 'Switch' },
                  intimacy: { type: 'boolean', label: '亲密度', default: true, component: 'Switch' },
                  achievement: { type: 'boolean', label: '成就', default: true, component: 'Switch' },
                  special: { type: 'boolean', label: '特效', default: true, component: 'Switch' },
                  punishment: { type: 'boolean', label: '惩罚', default: true, component: 'Switch' },
                  pokeback: { type: 'boolean', label: '戳回去', default: true, component: 'Switch' },
                  image: { type: 'boolean', label: '图片', default: true, component: 'Switch' },
                  voice: { type: 'boolean', label: '语音', default: true, component: 'Switch' },
                  master: { type: 'boolean', label: '主人', default: true, component: 'Switch' }
                }
              },
              cooldowns: {
                type: 'object',
                label: '冷却(ms)',
                component: 'SubForm',
                fields: {
                  interaction: { type: 'number', label: '互动冷却', min: 0, default: 30000, component: 'InputNumber' },
                  special_effect: { type: 'number', label: '特效冷却', min: 0, default: 180000, component: 'InputNumber' },
                  punishment: { type: 'number', label: '惩罚冷却', min: 0, default: 60000, component: 'InputNumber' }
                }
              },
              chances: {
                type: 'object',
                label: '概率',
                component: 'SubForm',
                fields: {
                  mood_change: { type: 'number', label: '心情变化', min: 0, max: 1, default: 0.2, component: 'InputNumber' },
                  special_trigger: { type: 'number', label: '特效触发', min: 0, max: 1, default: 0.15, component: 'InputNumber' },
                  punishment: { type: 'number', label: '惩罚', min: 0, max: 1, default: 0.3, component: 'InputNumber' }
                }
              }
            }
          }
        }
      }
    });
  }
}
