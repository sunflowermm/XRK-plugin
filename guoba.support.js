import lodash from 'lodash';
import xrkconfig from './components/xrkconfig.js';

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'XRK',
      title: '向日葵插件',
      description: '支持icqq签名监测，插件安装，全局表情，整点报时，早报推送，刷zepp步数',
      author: ['@xrk114514'],
      authorLink: ['https://gitcode.com/Xrkseek'],
      link: 'https://gitcode.com/Xrkseek/XRK-Yunzai',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'emojione:sunflower'
    },
    
    configInfo: {
      schemas: [
        {
          label: '基础配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'signchecker',
          label: '签名检测',
          bottomHelpMessage: '基于ICQQ的签名监测，签名寄了自动换',
          component: 'Switch'
        },
        {
          field: 'help_priority',
          label: '帮助优先级',
          helpMessage: '设置帮助优先级，优先级越低越优先',
          component: 'InputNumber',
          componentProps: {
            defaultValue: 500,
            bordered: true,
            autofocus: true,
            controls: true
          }
        },
        {
          field: 'screen_shot_quality',
          label: '帮助渲染精度',
          component: 'Slider',
          componentProps: {
            dots: true,
            max: 3.00,
            min: 1.00,
            step: 0.01
          }
        },
        {
          field: 'emoji_filename',
          label: '偷图目录设置',
          component: 'Input',
          componentProps: {
            placeholder: '请输入目录名',
          }
        },
        {
          field: 'coremaster',
          label: '核心主人',
          bottomHelpMessage: '设置核心主人QQ，只能设置一个',
          helpMessage: '核心主人无法被其他主人删除',
          component: 'GSelectFriend',
          componentProps: {
            placeholder: '请选择核心主人QQ'
          }
        },
        {
          field: 'peopleai',
          label: '人工AI',
          bottomHelpMessage: '开启后会自动打开词库ai，并非大模型ai',
          component: 'Switch'
        },
        {
          label: '推送配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'news_pushtime',
          label: '新闻日报推送时间',
          component: 'Slider',
          componentProps: {
            dots: true,
            max: 23,
            min: 0
          }
        },
        {
          field: 'news_groupss',
          label: '新闻日报推送群聊',
          component: 'GSelectGroup',
          componentProps: {
            placeholder: '请选择推送群聊',
          }
        },
        {
          field: 'time_groupss',
          label: '整点报时推送群聊',
          component: 'GSelectGroup',
          componentProps: {
            placeholder: '请选择推送群聊',
          }
        },
        {
          field: 'thumwhiteList',
          label: '骗赞推送群聊',
          component: 'GSelectGroup',
          componentProps: {
            placeholder: '请选择推送群聊',
          }
        },
        {
          label: '戳一戳配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.enabled',
          label: '戳一戳总开关',
          bottomHelpMessage: '控制戳一戳功能的总开关',
          component: 'Switch'
        },
        {
          field: 'poke.priority',
          label: '戳一戳优先级',
          helpMessage: '设置戳一戳优先级，优先级越低越优先',
          component: 'InputNumber',
          componentProps: {
            defaultValue: -5000,
            bordered: true,
            autofocus: true,
            controls: true
          }
        },
        {
          label: '戳一戳模块开关',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.modules.basic',
          label: '基础回复',
          component: 'Switch'
        },
        {
          field: 'poke.modules.mood',
          label: '心情系统',
          component: 'Switch'
        },
        {
          field: 'poke.modules.intimacy',
          label: '亲密度系统',
          component: 'Switch'
        },
        {
          field: 'poke.modules.achievement',
          label: '成就系统',
          component: 'Switch'
        },
        {
          field: 'poke.modules.special',
          label: '特殊效果',
          component: 'Switch'
        },
        {
          field: 'poke.modules.punishment',
          label: '惩罚系统',
          component: 'Switch'
        },
        {
          field: 'poke.modules.pokeback',
          label: '反戳系统',
          component: 'Switch'
        },
        {
          field: 'poke.modules.image',
          label: '图片发送',
          component: 'Switch'
        },
        {
          field: 'poke.modules.voice',
          label: '语音发送',
          component: 'Switch'
        },
        {
          field: 'poke.modules.master',
          label: '主人保护',
          component: 'Switch'
        },
        {
          label: '戳一戳功能配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.pokeback_enabled',
          label: '机器人戳回功能',
          bottomHelpMessage: '是否启用机器人戳回功能（无法戳时关闭）',
          component: 'Switch'
        },
        {
          field: 'poke.image_chance',
          label: '发送图片概率',
          component: 'Slider',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.3
          }
        },
        {
          field: 'poke.voice_chance',
          label: '发送语音概率',
          component: 'Slider',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.2
          }
        },
        {
          field: 'poke.master_image',
          label: '戳主人时发送图片',
          component: 'Switch'
        },
        {
          field: 'poke.master_punishment',
          label: '惩罚戳主人的人',
          component: 'Switch'
        },
        {
          label: '戳一戳冷却时间',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.cooldowns.interaction',
          label: '互动冷却（毫秒）',
          component: 'InputNumber',
          componentProps: {
            defaultValue: 30000,
            bordered: true,
            autofocus: true,
            controls: true,
            min: 0
          }
        },
        {
          field: 'poke.cooldowns.special_effect',
          label: '特效冷却（毫秒）',
          component: 'InputNumber',
          componentProps: {
            defaultValue: 180000,
            bordered: true,
            autofocus: true,
            controls: true,
            min: 0
          }
        },
        {
          field: 'poke.cooldowns.punishment',
          label: '惩罚冷却（毫秒）',
          component: 'InputNumber',
          componentProps: {
            defaultValue: 60000,
            bordered: true,
            autofocus: true,
            controls: true,
            min: 0
          }
        },
        {
          label: '戳一戳概率设置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'poke.chances.mood_change',
          label: '心情变化概率',
          component: 'Slider',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.2
          }
        },
        {
          field: 'poke.chances.special_trigger',
          label: '特效触发概率',
          component: 'Slider',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.15
          }
        },
        {
          field: 'poke.chances.punishment',
          label: '惩罚概率',
          component: 'Slider',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01,
            defaultValue: 0.3
          }
        }
      ],

      getConfigData() {
        return xrkconfig.config;
      },

      setConfigData(data, { Result }) {
        for (const [keyPath, value] of Object.entries(data)) {
          lodash.set(xrkconfig.config, keyPath, value);
        }
        try {
          xrkconfig.save();
          return Result.ok({}, '保存成功~');
        } catch (error) {
          return Result.error(`保存失败: ${error.message}`);
        }
      }
    }
  };
}