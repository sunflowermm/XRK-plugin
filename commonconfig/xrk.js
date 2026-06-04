/**
 * 向日葵插件配置（多文件，对齐 system.js）
 * 子配置：config、help_system、ai、poke_responses、time_config、screenshot、weather、安装插件列表(5)
 * 读写 data/xrkconfig/*，变更后由 lib/xrk-hub.js 统一 reload
 */
import path from 'path';
import ConfigBase from '../../../lib/commonconfig/commonconfig.js';
import { normalizeTimeMessages, timeMessagesToFormRows } from '../lib/config-normalize.js';
import hub from '../lib/xrk-hub.js';
// 使用相对路径，交由 ConfigBase 基类基于项目根目录进行拼接，
// 避免出现「cwd + 绝对路径」导致的路径重复问题。
const XRK_CONFIG_DIR = path.join('data', 'xrkconfig');
const getXrkPath = (name, ext = 'yaml') => () => path.join(XRK_CONFIG_DIR, `${name}.${ext}`);

const PLUGIN_LIST_NAMES = ['recommended_plugins', 'entertainment_plugins', 'game_plugins', 'ip_plugins', 'js_plugins'];

export default class XrkConfig extends ConfigBase {
  constructor() {
    super({
      name: 'xrk',
      displayName: '向日葵配置',
      description: '向日葵插件配置管理（主配置、帮助系统、戳一戳文案、网页截图等）',
      filePath: '',
      fileType: 'yaml'
    });

    this.configFiles = {
      config: {
        name: 'config',
        displayName: '主配置',
        description: '帮助优先级、资源分享、网页截图开关、早报/报时群号、戳一戳开关等',
        filePath: getXrkPath('config'),
        fileType: 'yaml',
        schema: {
          fields: {
            help_priority: { type: 'number', label: '帮助优先级', default: 500, min: -99999, component: 'InputNumber' },
            sharing: { type: 'boolean', label: '资源分享', default: true, component: 'Switch' },
            screen_shot_http: { type: 'boolean', label: '网页截图', default: false, component: 'Switch' },
            peopleai: { type: 'boolean', label: '人工AI', default: false, component: 'Switch' },
            screen_shot_quality: { type: 'number', label: '网页截图渲染精度', default: 1.5, min: 1, max: 3, component: 'InputNumber' },
            news_pushtime: { type: 'number', label: '早报推送时间（点）', default: 8, min: 0, max: 23, component: 'InputNumber' },
            news: {
              type: 'object',
              label: '早报扩展',
              description: '早报推送群间间隔等（apps/早报相关.js）',
              component: 'SubForm',
              fields: {
                delay: { type: 'number', label: '群间推送间隔（毫秒）', min: 0, default: 1000, component: 'InputNumber' }
              }
            },
            coremaster: { type: 'number', label: '核心主人QQ', default: 0, min: 0, component: 'InputNumber' },
            emoji_filename: { type: 'string', label: '全局表情目录名', default: '孤独摇滚', component: 'Input' },
            time_groupss: { type: 'array', label: '整点报时群号', itemType: 'string', default: [], component: 'Tags' },
            news_groupss: { type: 'array', label: '早报推送群号', itemType: 'string', default: [], component: 'Tags' },
            thumwhiteList: { type: 'array', label: '骗赞白名单群号', itemType: 'string', default: [], component: 'Tags' },
            poke_priority: { type: 'number', label: '戳一戳优先级', default: -5000, component: 'InputNumber' },
            corepoke_priority: { type: 'number', label: '戳一戳主人优先级', default: -5000, component: 'InputNumber' },
            chuomaster: { type: 'boolean', label: '戳一戳主人', default: false, component: 'Switch' },
            poke: {
              type: 'object',
              label: '戳一戳详细设置',
              component: 'SubForm',
              fields: {
                enabled: { type: 'boolean', label: '启用戳一戳', default: true, component: 'Switch' },
                priority: { type: 'number', label: '优先级', default: -5000, component: 'InputNumber' },
                pokeback_enabled: { type: 'boolean', label: '允许戳回去', default: true, component: 'Switch' },
                basic_reply_chance: { type: 'number', label: '基础回复概率', default: 0.6, min: 0, max: 1, component: 'InputNumber' },
                pokeback_base_chance: { type: 'number', label: '反戳基准概率', default: 0.3, min: 0, max: 1, component: 'InputNumber' },
                module_skip_chance: { type: 'number', label: '模块成功后跳过概率', default: 0.3, min: 0, max: 1, component: 'InputNumber' },
                paths: {
                  type: 'object',
                  label: '资源路径',
                  component: 'SubForm',
                  fields: {
                    image_dir: { type: 'string', label: '图片目录', default: '', component: 'Input' },
                    voice_dir: { type: 'string', label: '语音目录', default: '', component: 'Input' }
                  }
                },
                image_chance: { type: 'number', label: '图片回复概率', default: 0.3, min: 0, max: 1, component: 'InputNumber' },
                voice_chance: { type: 'number', label: '语音回复概率', default: 0.2, min: 0, max: 1, component: 'InputNumber' },
                master_image: { type: 'boolean', label: '主人可触发图片', default: true, component: 'Switch' },
                master_punishment: { type: 'boolean', label: '主人可触发惩罚', default: true, component: 'Switch' },
                master_chances: {
                  type: 'object',
                  label: '主人惩罚概率',
                  component: 'SubForm',
                  fields: {
                    mute: { type: 'number', label: '禁言基准概率', min: 0, max: 1, default: 0.5, component: 'InputNumber' },
                    pokeback: { type: 'number', label: '反戳概率', min: 0, max: 1, default: 0.7, component: 'InputNumber' }
                  }
                },
                time_slots: {
                  type: 'object',
                  label: '时段划分',
                  description: '各时段格式: 开始,结束 小时。night 可跨日如 22,3',
                  component: 'SubForm',
                  fields: {
                    dawn: { type: 'string', label: '凌晨', default: '3,5', component: 'Input' },
                    morning: { type: 'string', label: '早晨', default: '5,9', component: 'Input' },
                    noon: { type: 'string', label: '中午', default: '11,14', component: 'Input' },
                    afternoon: { type: 'string', label: '下午', default: '14,17', component: 'Input' },
                    evening: { type: 'string', label: '傍晚', default: '17,20', component: 'Input' },
                    night: { type: 'string', label: '夜晚', default: '22,3', component: 'Input' }
                  }
                },
                modules: {
                  type: 'object',
                  label: '功能模块开关',
                  component: 'SubForm',
                  fields: {
                    daily_rewards: { type: 'boolean', label: '每日奖励', default: true, component: 'Switch' },
                    festival: { type: 'boolean', label: '节日效果', default: true, component: 'Switch' },
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
                  component: 'SubForm',
                  fields: {
                    interaction: { type: 'number', label: '互动冷却', min: 0, default: 30000, component: 'InputNumber' },
                    special_effect: { type: 'number', label: '特效冷却', min: 0, default: 180000, component: 'InputNumber' },
                    punishment: { type: 'number', label: '惩罚冷却', min: 0, default: 60000, component: 'InputNumber' }
                  }
                },
                chances: {
                  type: 'object',
                  label: '触发概率（0–1）',
                  component: 'SubForm',
                  fields: {
                    mood_change: { type: 'number', label: '心情变化', min: 0, max: 1, default: 0.2, component: 'InputNumber' },
                    mood_reply: { type: 'number', label: '心情变化时回复', min: 0, max: 1, default: 0.5, component: 'InputNumber' },
                    special_trigger: { type: 'number', label: '时段特效', min: 0, max: 1, default: 0.15, component: 'InputNumber' },
                    special_effect_extra: { type: 'number', label: '幸运/暴击等', min: 0, max: 1, default: 0.1, component: 'InputNumber' },
                    punishment: { type: 'number', label: '惩罚', min: 0, max: 1, default: 0.3, component: 'InputNumber' },
                    mute_chance: { type: 'number', label: '惩罚时禁言概率', min: 0, max: 1, default: 0.5, component: 'InputNumber' },
                    daily_first: { type: 'number', label: '今日首戳', min: 0, max: 1, default: 0.6, component: 'InputNumber' },
                    daily_continuous: { type: 'number', label: '连续签到', min: 0, max: 1, default: 0.25, component: 'InputNumber' },
                    festival: { type: 'number', label: '节日效果', min: 0, max: 1, default: 0.15, component: 'InputNumber' }
                  }
                }
              }
            }
          }
        }
      },

      help_system: {
        name: 'help_system',
        displayName: '帮助系统',
        description: '帮助菜单标题、主题、样式与分组列表',
        filePath: getXrkPath('help_system'),
        fileType: 'yaml',
        schema: {
          fields: {
            title: { type: 'string', label: '帮助标题', default: '向日葵帮助', component: 'Input' },
            subTitle: { type: 'string', label: '副标题', default: 'xrk-bot && XRK', component: 'Input' },
            columnCount: { type: 'number', label: '列数', min: 1, default: 3, component: 'InputNumber' },
            colWidth: { type: 'number', label: '列宽', min: 1, default: 265, component: 'InputNumber' },
            theme: { type: 'string', label: '主题', default: 'all', component: 'Input' },
            themeExclude: { type: 'array', label: '排除主题', itemType: 'string', default: ['default'], component: 'Tags' },
            bgBlur: { type: 'boolean', label: '背景模糊', default: false, component: 'Switch' },
            style: {
              type: 'object',
              label: '样式',
              component: 'SubForm',
              fields: {
                fontColor: { type: 'string', label: '字体颜色', default: '#ceb78b', component: 'Input' },
                descColor: { type: 'string', label: '描述颜色', default: '#eee', component: 'Input' },
                contBgColor: { type: 'string', label: '内容背景色', default: 'rgba(6, 21, 31, .5)', component: 'Input' },
                contBgBlur: { type: 'number', label: '内容背景模糊', default: 4, component: 'InputNumber' },
                headerBgColor: { type: 'string', label: '头部背景色', default: 'rgba(6, 21, 31, .4)', component: 'Input' },
                rowBgColor1: { type: 'string', label: '行背景色1', default: 'rgba(6, 21, 31, .2)', component: 'Input' },
                rowBgColor2: { type: 'string', label: '行背景色2', default: 'rgba(6, 21, 31, .35)', component: 'Input' }
              }
            },
            helpList: {
              type: 'array',
              label: '帮助分组列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                group: { type: 'string', label: '分组名', component: 'Input', required: true },
                list: {
                  type: 'array',
                  label: '条目列表',
                  component: 'ArrayForm',
                  itemType: 'object',
                  fields: {
                    icon: { type: 'number', label: '图标', component: 'InputNumber', default: 0 },
                    title: { type: 'string', label: '标题', component: 'Input', required: true },
                    desc: { type: 'string', label: '描述', component: 'Input', default: '' }
                  }
                }
              }
            }
          }
        }
      },

      ai: {
        name: 'ai',
        displayName: '词库 AI',
        description: '向日葵词库AI：触发词 → 回复列表，每条为「关键词」+「回复文案」列表',
        filePath: getXrkPath('ai', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            entries: {
              type: 'array',
              label: '词条列表',
              description: '每个词条：匹配到的消息关键词 → 随机回复其中一条',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                keyword: {
                  type: 'string',
                  label: '关键词',
                  description: '用户发送的完整消息需与此完全一致才会触发',
                  component: 'Input',
                  required: true
                },
                replies: {
                  type: 'array',
                  label: '回复文案列表',
                  description: '随机选一条回复',
                  itemType: 'string',
                  default: [],
                  component: 'Tags'
                }
              }
            }
          }
        }
      },

      poke_responses: {
        name: 'poke_responses',
        displayName: '戳一戳文案',
        description: '戳一戳各场景文案池：关系、心情、时段、成就等（可展开子项编辑）',
        filePath: getXrkPath('poke_responses', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            relationship: {
              type: 'object',
              label: '关系文案',
              component: 'SubForm',
              fields: {
                stranger: { type: 'array', label: '陌生人', itemType: 'string', default: [], component: 'Tags' },
                acquaintance: { type: 'array', label: '熟人', itemType: 'string', default: [], component: 'Tags' },
                friend: { type: 'array', label: '朋友', itemType: 'string', default: [], component: 'Tags' },
                close_friend: { type: 'array', label: '密友', itemType: 'string', default: [], component: 'Tags' },
                best_friend: { type: 'array', label: '挚友', itemType: 'string', default: [], component: 'Tags' },
                intimate: { type: 'array', label: '亲密', itemType: 'string', default: [], component: 'Tags' },
                soulmate: { type: 'array', label: '灵魂伴侣', itemType: 'string', default: [], component: 'Tags' },
                upgrade: {
                  type: 'object',
                  label: '关系升级文案',
                  description: '亲密度提升时的祝贺文案',
                  component: 'SubForm',
                  fields: {
                    acquaintance: { type: 'array', label: '→熟人', itemType: 'string', default: [], component: 'Tags' },
                    friend: { type: 'array', label: '→朋友', itemType: 'string', default: [], component: 'Tags' },
                    close_friend: { type: 'array', label: '→密友', itemType: 'string', default: [], component: 'Tags' },
                    best_friend: { type: 'array', label: '→挚友', itemType: 'string', default: [], component: 'Tags' },
                    intimate: { type: 'array', label: '→亲密', itemType: 'string', default: [], component: 'Tags' },
                    soulmate: { type: 'array', label: '→灵魂伴侣', itemType: 'string', default: [], component: 'Tags' }
                  }
                }
              }
            },
            mood: {
              type: 'object',
              label: '心情文案',
              component: 'SubForm',
              fields: {
                angry: { type: 'array', label: '生气', itemType: 'string', default: [], component: 'Tags' },
                sad: { type: 'array', label: '难过', itemType: 'string', default: [], component: 'Tags' },
                normal: { type: 'array', label: '普通', itemType: 'string', default: [], component: 'Tags' },
                happy: { type: 'array', label: '开心', itemType: 'string', default: [], component: 'Tags' },
                excited: { type: 'array', label: '兴奋', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            time_effects: {
              type: 'object',
              label: '时段文案',
              component: 'SubForm',
              fields: {
                dawn: { type: 'array', label: '凌晨', itemType: 'string', default: [], component: 'Tags' },
                morning: { type: 'array', label: '早晨', itemType: 'string', default: [], component: 'Tags' },
                noon: { type: 'array', label: '中午', itemType: 'string', default: [], component: 'Tags' },
                afternoon: { type: 'array', label: '下午', itemType: 'string', default: [], component: 'Tags' },
                evening: { type: 'array', label: '傍晚', itemType: 'string', default: [], component: 'Tags' },
                night: { type: 'array', label: '夜晚', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            special_effects: {
              type: 'object',
              label: '特效文案',
              component: 'SubForm',
              fields: {
                lucky: { type: 'array', label: '幸运', itemType: 'string', default: [], component: 'Tags' },
                critical: { type: 'array', label: '暴击', itemType: 'string', default: [], component: 'Tags' },
                combo: { type: 'array', label: '连击', itemType: 'string', default: [], component: 'Tags' },
                special: { type: 'array', label: '特殊', itemType: 'string', default: [], component: 'Tags' },
                buff: { type: 'array', label: '增益', itemType: 'string', default: [], component: 'Tags' },
                debuff: { type: 'array', label: '减益', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            pokeback: {
              type: 'object',
              label: '戳回去文案',
              component: 'SubForm',
              fields: {
                normal: { type: 'array', label: '普通', itemType: 'string', default: [], component: 'Tags' },
                happy: { type: 'array', label: '开心', itemType: 'string', default: [], component: 'Tags' },
                angry: { type: 'array', label: '生气', itemType: 'string', default: [], component: 'Tags' },
                sad: { type: 'array', label: '难过', itemType: 'string', default: [], component: 'Tags' },
                excited: { type: 'array', label: '兴奋', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            special_identity: {
              type: 'object',
              label: '特殊身份文案',
              component: 'SubForm',
              fields: {
                master: { type: 'array', label: '主人', itemType: 'string', default: [], component: 'Tags' },
                admin: { type: 'array', label: '管理', itemType: 'string', default: [], component: 'Tags' },
                owner: { type: 'array', label: '群主', itemType: 'string', default: [], component: 'Tags' },
                vip: { type: 'array', label: 'VIP', itemType: 'string', default: [], component: 'Tags' },
                newbie: { type: 'array', label: '新人', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            achievements: {
              type: 'object',
              label: '成就文案',
              description: '达成成就时的回复，支持 {name} {intimacy} {consecutive}',
              component: 'SubForm',
              fields: {
                first_poke: { type: 'array', label: '初次见面', itemType: 'string', default: [], component: 'Tags' },
                poke_10: { type: 'array', label: '戳戳新手', itemType: 'string', default: [], component: 'Tags' },
                poke_100: { type: 'array', label: '戳戳达人', itemType: 'string', default: [], component: 'Tags' },
                poke_1000: { type: 'array', label: '戳戳大师', itemType: 'string', default: [], component: 'Tags' },
                poke_5000: { type: 'array', label: '戳戳之神', itemType: 'string', default: [], component: 'Tags' },
                consecutive_10: { type: 'array', label: '连击达人', itemType: 'string', default: [], component: 'Tags' },
                intimate_100: { type: 'array', label: '亲密好友', itemType: 'string', default: [], component: 'Tags' },
                intimate_500: { type: 'array', label: '至交挚友', itemType: 'string', default: [], component: 'Tags' },
                mood_master: { type: 'array', label: '心情大师', itemType: 'string', default: [], component: 'Tags' },
                night_owl: { type: 'array', label: '夜猫子', itemType: 'string', default: [], component: 'Tags' },
                early_bird: { type: 'array', label: '早起鸟', itemType: 'string', default: [], component: 'Tags' },
                speed_poke: { type: 'array', label: '光速戳戳', itemType: 'string', default: [], component: 'Tags' },
                gentle_touch: { type: 'array', label: '温柔触碰', itemType: 'string', default: [], component: 'Tags' },
                default: { type: 'array', label: '默认成就', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            master_protection: {
              type: 'object',
              label: '主人保护文案',
              component: 'SubForm',
              fields: {
                normal: { type: 'array', label: '普通警告', itemType: 'string', default: [], component: 'Tags' },
                owner_warning: { type: 'array', label: '群主警告', itemType: 'string', default: [], component: 'Tags' },
                admin_warning: { type: 'array', label: '管理警告', itemType: 'string', default: [], component: 'Tags' },
                repeat_offender: { type: 'array', label: '惯犯警告', itemType: 'string', default: [], component: 'Tags' },
                punishments: {
                  type: 'object',
                  label: '惩罚文案',
                  component: 'SubForm',
                  fields: {
                    mute: { type: 'array', label: '禁言成功', itemType: 'string', default: [], component: 'Tags' },
                    mute_fail: { type: 'array', label: '禁言失败', itemType: 'string', default: [], component: 'Tags' },
                    poke: { type: 'array', label: '戳回去', itemType: 'string', default: [], component: 'Tags' }
                  }
                }
              }
            },
            punishments: {
              type: 'object',
              label: '惩罚系统文案',
              component: 'SubForm',
              fields: {
                mute: {
                  type: 'object',
                  label: '禁言',
                  component: 'SubForm',
                  fields: {
                    success: { type: 'array', label: '成功', itemType: 'string', default: [], component: 'Tags' },
                    fail: { type: 'array', label: '失败', itemType: 'string', default: [], component: 'Tags' }
                  }
                },
                intimacy_reduction: { type: 'array', label: '亲密度下降', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            daily_rewards: {
              type: 'object',
              label: '每日奖励文案',
              description: '支持 {days} 连续天数',
              component: 'SubForm',
              fields: {
                first: { type: 'array', label: '今日首戳', itemType: 'string', default: [], component: 'Tags' },
                continuous: { type: 'array', label: '连续签到', itemType: 'string', default: [], component: 'Tags' }
              }
            },
            festival_effects: {
              type: 'object',
              label: '节日效果文案',
              component: 'SubForm',
              fields: {
                new_year: { type: 'array', label: '元旦', itemType: 'string', default: [], component: 'Tags' },
                spring_festival: { type: 'array', label: '春节', itemType: 'string', default: [], component: 'Tags' },
                valentine: { type: 'array', label: '情人节', itemType: 'string', default: [], component: 'Tags' },
                labor_day: { type: 'array', label: '劳动节', itemType: 'string', default: [], component: 'Tags' },
                children_day: { type: 'array', label: '儿童节', itemType: 'string', default: [], component: 'Tags' },
                dragon_boat: { type: 'array', label: '端午', itemType: 'string', default: [], component: 'Tags' },
                midautumn: { type: 'array', label: '中秋', itemType: 'string', default: [], component: 'Tags' },
                qixi: { type: 'array', label: '七夕', itemType: 'string', default: [], component: 'Tags' },
                national_day: { type: 'array', label: '国庆节', itemType: 'string', default: [], component: 'Tags' },
                halloween: { type: 'array', label: '万圣节', itemType: 'string', default: [], component: 'Tags' },
                christmas: { type: 'array', label: '圣诞', itemType: 'string', default: [], component: 'Tags' }
              }
            }
          }
        }
      },

      time_config: {
        name: 'time_config',
        displayName: '整点报时文案',
        description: '整点报时使用的表情与时间文案列表（无需手写 JSON）',
        filePath: getXrkPath('time_config', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            emojis: {
              type: 'array',
              label: '随机表情列表',
              description: '用于整点报时时追加在文案后面的表情符号',
              itemType: 'string',
              default: [],
              component: 'Tags'
            },
            timeMessages: {
              type: 'array',
              label: '时间文案列表',
              description: '支持 {hours}（当前小时）、{botName}（机器人昵称）占位符',
              component: 'ArrayForm',
              itemType: 'string',
              fields: {
                value: {
                  type: 'string',
                  label: '文案',
                  component: 'Input',
                  required: true
                }
              }
            }
          }
        }
      },

      weather: {
        name: 'weather',
        displayName: '查天气',
        description: '中央气象台 nmc.cn 7 天预报爬取（apps/查天气.js），非网页截图',
        filePath: getXrkPath('weather'),
        fileType: 'yaml',
        schema: {
          fields: {
            enabled: { type: 'boolean', label: '启用查天气', default: true, component: 'Switch' },
            max_cities: {
              type: 'number',
              label: '单次最多城市数',
              description: '#查天气 一次指令最多查询几个城市',
              min: 1,
              max: 10,
              default: 5,
              component: 'InputNumber'
            },
            forecast_days: {
              type: 'number',
              label: '预报天数',
              description: '从页面 7 天预报区截取的天数（1-7）',
              min: 1,
              max: 7,
              default: 7,
              component: 'InputNumber'
            },
            request_timeout_ms: {
              type: 'number',
              label: '请求超时(ms)',
              min: 3000,
              default: 15000,
              component: 'InputNumber'
            },
            reply_mode: {
              type: 'string',
              label: '回复形式',
              description: 'text 为文字卡片，image 为官网预报区截图',
              enum: ['text', 'image'],
              default: 'image',
              component: 'Select'
            },
            user_agent: {
              type: 'string',
              label: 'User-Agent',
              description: '访问 nmc.cn 时使用的浏览器标识',
              default: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              component: 'Input'
            },
            include_charts: { type: 'boolean', label: '截图含预报图表', default: true, component: 'Switch' },
            include_climate: { type: 'boolean', label: '截图含气候曲线', default: true, component: 'Switch' },
            screenshot: {
              type: 'object',
              label: '截图参数',
              component: 'SubForm',
              fields: {
                mode: { type: 'string', label: '模式', enum: ['live', 'html'], default: 'live', component: 'Select' },
                width: { type: 'number', label: '宽度', min: 800, default: 1500, component: 'InputNumber' },
                height: { type: 'number', label: '高度', min: 600, default: 1000, component: 'InputNumber' },
                deviceScaleFactor: { type: 'number', label: '渲染精度', min: 1, max: 3, default: 2, component: 'InputNumber' },
                waitUntil: { type: 'string', label: '等待策略', enum: ['domcontentloaded', 'load', 'networkidle0', 'networkidle2'], default: 'networkidle2', component: 'Select' },
                goto_timeout_ms: { type: 'number', label: '页面加载超时(ms)', min: 5000, default: 45000, component: 'InputNumber' },
                delayBeforeScreenshot: { type: 'number', label: '截图前延迟(ms)', min: 0, default: 3500, component: 'InputNumber' },
                imgType: { type: 'string', label: '输出格式', enum: ['jpeg', 'png'], default: 'jpeg', component: 'Select' },
                quality: { type: 'number', label: 'JPEG质量', min: 1, max: 100, default: 92, component: 'InputNumber' }
              }
            }
          }
        }
      },

      screenshot: {
        name: 'screenshot',
        displayName: '网页截图',
        description: '网页截图：URL 过滤策略与截图参数（apps/web_screenshot.js）',
        filePath: getXrkPath('screenshot'),
        fileType: 'yaml',
        schema: {
          fields: {
            enabled: { type: 'boolean', label: '启用网页截图', default: false, component: 'Switch' },
            quality: { type: 'number', label: '渲染精度', description: '映射到 deviceScaleFactor', min: 1, max: 3, default: 2, component: 'InputNumber' },
            viewport: {
              type: 'object',
              label: '默认视口',
              component: 'SubForm',
              fields: {
                width: { type: 'number', label: '宽度', min: 320, default: 1536, component: 'InputNumber' },
                height: { type: 'number', label: '高度', min: 240, default: 2138, component: 'InputNumber' }
              }
            },
            waitUntil: {
              type: 'string',
              label: '等待策略',
              description: '渲染等待策略',
              enum: ['domcontentloaded', 'load', 'networkidle0', 'networkidle2'],
              default: 'networkidle2',
              component: 'Select'
            },
            urlProcessing: {
              type: 'object',
              label: 'URL处理',
              component: 'SubForm',
              fields: {
                maxUrlsPerMessage: { type: 'number', label: '每条消息最多截图URL数', min: 1, default: 5, component: 'InputNumber' },
                minUrlLength: { type: 'number', label: 'URL最小长度', min: 1, default: 4, component: 'InputNumber' },
                maxUrlLength: { type: 'number', label: 'URL最大长度', min: 16, default: 2083, component: 'InputNumber' }
              }
            },
            whitelistDomains: { type: 'array', label: '域名白名单', itemType: 'string', default: [], component: 'Tags' },
            blacklistDomains: { type: 'array', label: '域名黑名单', itemType: 'string', default: [], component: 'Tags' },
            blacklistIPs: { type: 'array', label: 'IP黑名单(CIDR)', itemType: 'string', default: [], component: 'Tags' },
            allowedLocalAddresses: { type: 'array', label: '允许的本地地址', itemType: 'string', default: ['localhost', '127.0.0.1'], component: 'Tags' },
            filteredParams: { type: 'array', label: '过滤的URL参数', itemType: 'string', default: [], component: 'Tags' },
            blockedExtensions: {
              type: 'object',
              label: '拦截的文件扩展名',
              description: '键为分类名，值为扩展名数组',
              component: 'SubForm',
              fields: {
                media: { type: 'array', label: '媒体', itemType: 'string', default: ['mp4', 'mp3', 'avi'], component: 'Tags' },
                archive: { type: 'array', label: '压缩包', itemType: 'string', default: ['zip', 'rar', '7z'], component: 'Tags' }
              }
            },
            screenshotConfig: {
              type: 'object',
              label: '截图参数',
              description: '透传给渲染器 screenshot() 的参数（高级）',
              component: 'SubForm',
              fields: {
                width: { type: 'number', label: '宽度', min: 320, default: 1536, component: 'InputNumber' },
                height: { type: 'number', label: '高度', min: 240, default: 2138, component: 'InputNumber' },
                waitUntil: { type: 'string', label: '等待策略', enum: ['domcontentloaded', 'load', 'networkidle0', 'networkidle2'], default: 'networkidle2', component: 'Select' },
                fullPage: { type: 'boolean', label: '整页截图', default: true, component: 'Switch' },
                imgType: { type: 'string', label: '输出格式', enum: ['jpeg', 'png'], default: 'jpeg', component: 'Select' },
                quality: { type: 'number', label: 'JPEG质量', min: 0, max: 100, default: 100, component: 'InputNumber' }
              }
            }
          }
        }
      },

      recommended_plugins: {
        name: 'recommended_plugins',
        displayName: '推荐插件',
        description: '安装插件：推荐插件列表，可增删改每条插件信息',
        filePath: getXrkPath('recommended_plugins', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            list: {
              type: 'array',
              label: '插件列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                name: { type: 'string', label: '插件名', component: 'Input', required: true },
                cn_name: { type: 'string', label: '中文名', component: 'Input', required: true },
                anothername: { type: 'string', label: '别名/关键词', description: '搜索用，空格分隔', component: 'Input', default: '' },
                description: { type: 'string', label: '描述', component: 'Input', default: '' },
                git: { type: 'string', label: 'Git 地址', component: 'Input', required: true }
              }
            }
          }
        }
      },
      entertainment_plugins: {
        name: 'entertainment_plugins',
        displayName: '文娱插件',
        description: '安装插件：文娱类插件列表',
        filePath: getXrkPath('entertainment_plugins', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            list: {
              type: 'array',
              label: '插件列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                name: { type: 'string', label: '插件名', component: 'Input', required: true },
                cn_name: { type: 'string', label: '中文名', component: 'Input', required: true },
                anothername: { type: 'string', label: '别名/关键词', component: 'Input', default: '' },
                description: { type: 'string', label: '描述', component: 'Input', default: '' },
                git: { type: 'string', label: 'Git 地址', component: 'Input', required: true }
              }
            }
          }
        }
      },
      game_plugins: {
        name: 'game_plugins',
        displayName: '游戏插件',
        description: '安装插件：游戏类插件列表',
        filePath: getXrkPath('game_plugins', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            list: {
              type: 'array',
              label: '插件列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                name: { type: 'string', label: '插件名', component: 'Input', required: true },
                cn_name: { type: 'string', label: '中文名', component: 'Input', required: true },
                anothername: { type: 'string', label: '别名/关键词', component: 'Input', default: '' },
                description: { type: 'string', label: '描述', component: 'Input', default: '' },
                git: { type: 'string', label: 'Git 地址', component: 'Input', required: true }
              }
            }
          }
        }
      },
      ip_plugins: {
        name: 'ip_plugins',
        displayName: 'IP类插件',
        description: '安装插件：IP相关插件列表',
        filePath: getXrkPath('ip_plugins', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            list: {
              type: 'array',
              label: '插件列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                name: { type: 'string', label: '插件名', component: 'Input', required: true },
                cn_name: { type: 'string', label: '中文名', component: 'Input', required: true },
                anothername: { type: 'string', label: '别名/关键词', component: 'Input', default: '' },
                description: { type: 'string', label: '描述', component: 'Input', default: '' },
                git: { type: 'string', label: 'Git 地址', component: 'Input', required: true }
              }
            }
          }
        }
      },
      js_plugins: {
        name: 'js_plugins',
        displayName: 'JS插件',
        description: '安装插件：单文件JS插件列表（git 指向 .js 直链）',
        filePath: getXrkPath('js_plugins', 'json'),
        fileType: 'json',
        schema: {
          fields: {
            list: {
              type: 'array',
              label: '插件列表',
              component: 'ArrayForm',
              itemType: 'object',
              default: [],
              fields: {
                name: { type: 'string', label: '插件名', component: 'Input', required: true },
                cn_name: { type: 'string', label: '中文名', component: 'Input', required: true },
                anothername: { type: 'string', label: '别名/关键词', component: 'Input', default: '' },
                description: { type: 'string', label: '描述', component: 'Input', default: '' },
                git: { type: 'string', label: 'Git 地址', component: 'Input', required: true }
              }
            }
          }
        }
      }
    };
  }

  getConfigInstance(name) {
    const configMeta = this.configFiles[name];
    if (!configMeta) throw new Error(`未知的配置: ${name}`);
    return new ConfigBase(configMeta);
  }

  _invoke(name, method, ...args) {
    return this.getConfigInstance(name)[method](...args);
  }

  async read(name) {
    if (!name) {
      return { name: this.name, displayName: this.displayName, description: this.description, configs: this.getConfigList() };
    }
    if (name === 'ai') {
      const raw = await this._invoke(name, 'read');
      return { entries: Object.entries(raw || {}).map(([keyword, replies]) => ({ keyword, replies: Array.isArray(replies) ? replies : [] })) };
    }
    if (name === 'time_config') {
      const raw = await this._invoke(name, 'read');
      return {
        emojis: Array.isArray(raw?.emojis) ? raw.emojis : [],
        timeMessages: timeMessagesToFormRows(raw?.timeMessages)
      };
    }
    if (PLUGIN_LIST_NAMES.includes(name)) {
      const raw = await this._invoke(name, 'read');
      const arr = Array.isArray(raw) ? raw : [];
      return { list: arr.map(item => ({
        name: item?.name ?? '',
        cn_name: item?.cn_name ?? '',
        anothername: item?.anothername ?? '',
        description: item?.description ?? '',
        git: item?.git ?? ''
      })) };
    }
    return this._invoke(name, 'read');
  }

  async write(name, data, options = {}) {
    if (!name) throw new Error('XrkConfig 写入需要指定子配置名称');
    let result;
    if (name === 'ai' && data && Array.isArray(data.entries)) {
      const obj = {};
      for (const { keyword, replies } of data.entries) {
        if (keyword != null && String(keyword).trim() !== '') {
          obj[String(keyword).trim()] = Array.isArray(replies) ? replies : [];
        }
      }
      result = await this._invoke(name, 'write', obj, options);
      hub.reload(name);
      return result;
    }
    if (name === 'time_config' && data && typeof data === 'object') {
      const payload = {
        emojis: Array.isArray(data.emojis) ? data.emojis : [],
        timeMessages: normalizeTimeMessages(data.timeMessages)
      };
      result = await this._invoke(name, 'write', payload, options);
      hub.reload(name);
      return result;
    }
    if (PLUGIN_LIST_NAMES.includes(name) && data && Array.isArray(data.list)) {
      const arr = data.list
        .filter(item => item && (item.name != null && String(item.name).trim() !== ''))
        .map(item => ({
          name: String(item.name ?? '').trim(),
          cn_name: String(item.cn_name ?? '').trim(),
          anothername: String(item.anothername ?? '').trim(),
          description: String(item.description ?? '').trim(),
          git: String(item.git ?? '').trim()
        }));
      result = await this._invoke(name, 'write', arr, options);
      hub.reload(name);
      return result;
    }
    result = await this._invoke(name, 'write', data, options);
    if (name) hub.reload(name);
    return result;
  }

  async get(name, keyPath) {
    return this._invoke(name, 'get', keyPath);
  }

  async set(name, keyPath, value, options = {}) {
    const result = await this._invoke(name, 'set', keyPath, value, options);
    if (name) hub.reload(name);
    return result;
  }

  getStructure() {
    const structure = {
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      configs: {}
    };
    for (const [name, meta] of Object.entries(this.configFiles)) {
      structure.configs[name] = {
        ...meta,
        fields: (meta.schema && meta.schema.fields) || {}
      };
    }
    return structure;
  }

  getConfigList() {
    return Object.entries(this.configFiles).map(([name, meta]) => ({
      name,
      displayName: meta.displayName,
      description: meta.description,
      filePath: meta.filePath,
      fileType: meta.fileType
    }));
  }
}
