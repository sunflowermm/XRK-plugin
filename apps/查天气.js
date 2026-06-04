import plugin from '../../../lib/plugins/plugin.js'
import BotUtil from '../../../lib/util.js'
import { readConfigSync } from '../lib/config-paths.js'
import { findCityInfo } from '../lib/weather/city-index.js'
import { fetchNmcForecast } from '../lib/weather/nmc.js'
import { formatForecastCard } from '../lib/weather/format.js'
import { screenshotNmcForecast } from '../lib/weather/snapshot.js'

function getWeatherCfg() {
  return readConfigSync('weather') || {}
}

export class weather extends plugin {
  constructor() {
    super({
      name: '向日葵查天气',
      dsc: '打开中央气象台原页，截取完整预报区并截图',
      event: 'message',
      priority: 500,
      rule: [
        { reg: /^#查天气(.*)$/i, fnc: 'search_weather' },
      ],
    })
  }

  async search_weather(e) {
    const cfg = getWeatherCfg()
    if (cfg.enabled === false) {
      await e.reply('查天气功能已关闭，可在锅巴或控制台「查天气」配置中开启')
      return true
    }

    const raw = e.msg.match(/^#查天气(.*)$/i)?.[1]?.trim()
    if (!raw) {
      await e.reply('请输入城市名，例如：#查天气北京\n多城市：#查天气北京 上海')
      return true
    }

    const cities = raw.split(/\s+/).filter(Boolean)
    const maxCities = Math.max(1, Number(cfg.max_cities) || 5)
    if (cities.length > maxCities) {
      await e.reply(`一次最多查询 ${maxCities} 个城市`)
      return true
    }

    const replyMode = (cfg.reply_mode || 'image').toLowerCase()
    const messages = []
    const labels = []
    const failed = []

    for (const name of cities) {
      const cityInfo = findCityInfo(name)
      if (!cityInfo) {
        failed.push(name)
        continue
      }
      try {
        if (replyMode === 'text') {
          const data = await fetchNmcForecast(cityInfo, {
            timeout: cfg.request_timeout_ms,
            userAgent: cfg.user_agent,
            maxDays: cfg.forecast_days,
          })
          messages.push(formatForecastCard(data, name))
        } else {
          const { image, cityName, published } = await screenshotNmcForecast(cityInfo, cfg)
          const title = `${name || cityName} 天气`
          const sub = published ? `发布时间：${published}` : ''
          messages.push([title, sub].filter(Boolean).join('\n'))
          messages.push(segment.image(image))
        }
        labels.push(name)
      } catch (err) {
        logger.error(`[向日葵查天气] ${name}:`, err)
        failed.push(name)
      }
    }

    if (messages.length === 0) {
      await e.reply(failed.length ? `未能获取天气：${failed.join('、')}` : '未查询到任何城市')
      return true
    }

    await BotUtil.makeChatRecord(e, messages, '向日葵查天气', labels)
    if (failed.length) await e.reply(`以下城市失败：${failed.join('、')}`)
    return true
  }
}
