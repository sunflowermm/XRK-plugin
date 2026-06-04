/**
 * 锅巴面板支持（与 guoba-plugin 约定一致）
 * 主配置读写 data/xrkconfig/config.yaml，经 lib/xrkconfig.js 单例
 * 帮助/词库/戳文案/截图/插件列表等见 commonconfig/xrk.js 与 Web 控制台「向日葵配置」
 */
import lodash from 'lodash'
import yaml from 'yaml'
import xrkconfig from './lib/xrkconfig.js'
import { readConfigSync, getConfigPath } from './lib/config-paths.js'
import { FileUtils } from '../../lib/utils/file-utils.js'

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
      description: '向日葵帮助、戳一戳、早报报时、词库 AI、网页截图等；完整多文件配置请用 XRK 控制台',
      icon: 'mdi:flower',
      iconColor: '#e8a317',
    },
    configInfo: {
      schemas: [
        { component: 'Divider', label: '基础' },
        {
          field: 'help_priority',
          label: '帮助优先级',
          bottomHelpMessage: '数值越大优先级越高，与 #向日葵修改帮助优先级 一致',
          component: 'InputNumber',
        },
        {
          field: 'sharing',
          label: '资源分享',
          component: 'Switch',
        },
        {
          field: 'peopleai',
          label: '词库 AI',
          bottomHelpMessage: '人工 AI 词库回复（data/xrkconfig/ai.json）',
          component: 'Switch',
        },
        {
          field: 'screen_shot_http',
          label: '网页截图',
          component: 'Switch',
        },
        {
          field: 'screen_shot_quality',
          label: '截图渲染精度',
          component: 'InputNumber',
          componentProps: { min: 1, max: 3, step: 0.1 },
        },
        {
          field: 'emoji_filename',
          label: '全局表情目录名',
          component: 'Input',
        },
        {
          field: 'coremaster',
          label: '核心主人 QQ',
          component: 'InputNumber',
          componentProps: { min: 0 },
        },
        { component: 'Divider', label: '推送' },
        {
          field: 'news_pushtime',
          label: '早报推送时间(点)',
          component: 'InputNumber',
          componentProps: { min: 0, max: 23 },
        },
        {
          field: 'news.delay',
          label: '早报群间间隔(ms)',
          component: 'InputNumber',
          componentProps: { min: 0 },
        },
        {
          field: 'time_groupss',
          label: '整点报时群',
          component: 'GTags',
          componentProps: { allowAdd: true, allowDel: true },
        },
        {
          field: 'news_groupss',
          label: '早报推送群',
          component: 'GTags',
          componentProps: { allowAdd: true, allowDel: true },
        },
        {
          field: 'thumwhiteList',
          label: '骗赞白名单群',
          component: 'GTags',
          componentProps: { allowAdd: true, allowDel: true },
        },
        { component: 'Divider', label: '查天气' },
        {
          field: 'weather_cfg.enabled',
          label: '启用查天气',
          bottomHelpMessage: '关闭后 #查天气 不可用；写入 data/xrkconfig/weather.yaml',
          component: 'Switch',
        },
        {
          field: 'weather_cfg.max_cities',
          label: '单次最多城市数',
          component: 'InputNumber',
          componentProps: { min: 1, max: 10 },
        },
        {
          field: 'weather_cfg.forecast_days',
          label: '预报天数',
          bottomHelpMessage: '截图/文本均只展示前 N 天（爬虫截取 day7 区后裁剪）',
          component: 'InputNumber',
          componentProps: { min: 1, max: 7 },
        },
        {
          field: 'weather_cfg.reply_mode',
          label: '回复模式',
          bottomHelpMessage: 'image：打开 nmc.cn 原页截取预报区；text：纯文本',
          component: 'Select',
          componentProps: {
            options: [
              { label: '图片（官网 DOM 截图）', value: 'image' },
              { label: '文本', value: 'text' },
            ],
          },
        },
        {
          field: 'weather_cfg.include_charts',
          label: '含预报/气候曲线',
          bottomHelpMessage: '截图包含预报曲线与气候背景（需等待 Highcharts 渲染）',
          component: 'Switch',
        },
        {
          field: 'weather_cfg.screenshot.mode',
          label: '截图模式',
          bottomHelpMessage: 'live：官网原页；html：爬虫 HTML 离线回退',
          component: 'Select',
          componentProps: {
            options: [
              { label: '官网 live', value: 'live' },
              { label: '离线 HTML', value: 'html' },
            ],
          },
        },
        {
          field: 'weather_cfg.include_climate',
          label: '含气候背景图',
          component: 'Switch',
        },
        {
          field: 'weather_cfg.screenshot.delayBeforeScreenshot',
          label: '截图前等待(ms)',
          bottomHelpMessage: '等待 Highcharts/雷达图渲染，网络慢时可加大',
          component: 'InputNumber',
          componentProps: { min: 1000, max: 15000 },
        },
        {
          field: 'weather_cfg.screenshot.width',
          label: '截图视口宽',
          component: 'InputNumber',
          componentProps: { min: 640, max: 1920 },
        },
        {
          field: 'weather_cfg.screenshot.deviceScaleFactor',
          label: '截图清晰度',
          component: 'InputNumber',
          componentProps: { min: 1, max: 3, step: 0.5 },
        },
        {
          field: 'weather_cfg.request_timeout_ms',
          label: '请求超时(ms)',
          component: 'InputNumber',
          componentProps: { min: 3000 },
        },
        {
          field: 'weather_cfg.user_agent',
          label: 'User-Agent',
          component: 'Input',
        },
        { component: 'Divider', label: '戳一戳' },
        {
          field: 'chuomaster',
          label: '戳一戳主人',
          component: 'Switch',
        },
        {
          field: 'poke_priority',
          label: '戳一戳优先级',
          component: 'InputNumber',
        },
        {
          field: 'corepoke_priority',
          label: '戳一戳主人优先级',
          component: 'InputNumber',
        },
        {
          field: 'poke.enabled',
          label: '启用戳一戳',
          component: 'Switch',
        },
        {
          field: 'poke.pokeback_enabled',
          label: '允许戳回去',
          component: 'Switch',
        },
        {
          field: 'poke.basic_reply_chance',
          label: '基础回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.05 },
        },
        {
          field: 'poke.image_chance',
          label: '图片回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.05 },
        },
        {
          field: 'poke.voice_chance',
          label: '语音回复概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.05 },
        },
        {
          field: 'poke.modules.basic',
          label: '模块：基础回复',
          component: 'Switch',
        },
        {
          field: 'poke.modules.pokeback',
          label: '模块：戳回去',
          component: 'Switch',
        },
        {
          field: 'poke.modules.image',
          label: '模块：图片',
          component: 'Switch',
        },
        {
          field: 'poke.modules.voice',
          label: '模块：语音',
          component: 'Switch',
        },
        {
          component: 'Divider',
          label: '更多配置',
        },
        {
          field: '_guoba_hint',
          label: '说明',
          bottomHelpMessage:
            '帮助菜单、词库 AI、戳文案、网页截图、天气 User-Agent、安装插件列表等请在 XRK 控制台「向日葵配置」子项中编辑。',
          component: 'Input',
          componentProps: { disabled: true, placeholder: '仅提示，无需填写' },
        },
      ],
      getConfigData() {
        return {
          ...lodash.cloneDeep(xrkconfig.config),
          weather_cfg: readConfigSync('weather') || {},
        }
      },
      setConfigData(data, { Result }) {
        const patch = { ...data }
        const weatherCfg = patch.weather_cfg
        delete patch._guoba_hint
        delete patch.weather_cfg
        const merged = lodash.merge({}, xrkconfig.getDefaultConfig(), xrkconfig.config, patch)
        xrkconfig.config = merged
        xrkconfig.save()
        xrkconfig.emit('change')
        if (weatherCfg && typeof weatherCfg === 'object') {
          const path = getConfigPath('weather')
          FileUtils.writeFileSync(path, yaml.stringify(weatherCfg), 'utf8')
        }
        return Result.ok({}, '向日葵配置已保存~')
      },
    },
  }
}
