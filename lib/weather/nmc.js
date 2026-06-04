import axios from 'axios'

const DATE_RE = /^\d{2}\/\d{2}$/
const TEMP_RE = /^-?\d+℃$/
/** 仅用于文本模式：day7 结束于 day1 小时块之前（勿用 hour3，其在 hourItems 内部） */
const DAY7_END_MARKERS = ['id=day1', 'id="day1"', 'class="hourItems']
/** 主预报区（实况+雷达+7天+小时表） */
const MAIN_BLOCK_START = 'class=bgwhite_'
const MAIN_BLOCK_END_MARKERS = ['id=realChart', 'class="hp mt15" id=realChart']
/** 全量预报内容：主区 + 预报曲线 + 气候背景（至推荐产品前） */
const FULL_BLOCK_END_MARKERS = ['推荐产品', 'class="hp mt15"><div class=hd><span class=line>推荐产品', 'index-product']

export const NMC_CSS = [
  'https://image.nmc.cn/assets/bootstrap-3.3.7-dist/css/bootstrap.min.css',
  'https://image.nmc.cn/assets/css/basic.css?v=20220615',
  'https://image.nmc.cn/assets/font_1156386_lc7j7y0ob2/iconfont.css',
  'https://image.nmc.cn/assets/css/jquery.mCustomScrollbar.min.css',
  'https://image.nmc.cn/assets/js/jcarousel-0.2.9/skins/tango/skin.css?v=20220615',
  'https://image.nmc.cn/assets/css/newcss.css?v=20220615',
]

export function getNmcForecastUrl(cityInfo) {
  return `http://www.nmc.cn/publish/forecast/${cityInfo.provinceCode}/${cityInfo.enCity}.html`
}

export async function fetchNmcHtml(cityInfo, opts = {}) {
  const url = getNmcForecastUrl(cityInfo)
  const { data: html } = await axios.get(url, {
    headers: {
      'User-Agent': opts.userAgent || 'Mozilla/5.0',
      Referer: 'http://www.nmc.cn/',
      Accept: 'text/html,application/xhtml+xml',
    },
    responseType: 'text',
    timeout: opts.timeout ?? 15000,
    validateStatus: s => s >= 200 && s < 400,
  })
  return { url, html }
}

function extractCityTitle(html) {
  const m =
    html.match(/class="active"[^>]*>([^<]+)</) ||
    html.match(/id="breadcrumb"[\s\S]*?active[^>]*>([^<]+)</) ||
    html.match(/class=cityName>\s*([^<]+)/)
  return m?.[1]?.trim() || ''
}

function sliceByMarkers(html, startMarker, endMarkers, searchFrom = 0) {
  const startPos = html.indexOf(startMarker, searchFrom)
  if (startPos < 0) return null
  const divStart = html.lastIndexOf('<div', startPos)
  if (divStart < 0) return null
  let end = html.length
  for (const m of endMarkers) {
    const p = html.indexOf(m, startPos + startMarker.length)
    if (p > divStart && p < end) end = p
  }
  return html.slice(divStart, end)
}

function sanitizeHtml(fragment) {
  return fragment
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

/**
 * 官网主预报白底区：左侧实况+雷达，右侧 7 天+逐小时表
 */
export function extractMainForecastBlock(html, cityInfo = {}) {
  const published = html.match(/发布时间[：:]\s*([^<]+)/)?.[1]?.trim() || ''
  const cityName = extractCityTitle(html) || cityInfo.matchedName || cityInfo.enCity || ''
  let panelHtml = sliceByMarkers(html, MAIN_BLOCK_START, MAIN_BLOCK_END_MARKERS)
  if (!panelHtml) throw new Error('未找到主预报区域')
  panelHtml = sanitizeHtml(panelHtml)
  if (!/class=bgwhite_/i.test(panelHtml)) {
    panelHtml = `<div class="bgwhite_">${panelHtml}</div>`
  }
  return { cityName, published, panelHtml, cssLinks: NMC_CSS }
}

/**
 * 全量预报 HTML：bgwhite_ + realChart + climateDiv（离线回退，图表需原站 JS）
 */
export function extractFullForecastBlock(html, cityInfo = {}) {
  const published = html.match(/发布时间[：:]\s*([^<]+)/)?.[1]?.trim() || ''
  const cityName = extractCityTitle(html) || cityInfo.matchedName || cityInfo.enCity || ''
  let panelHtml = sliceByMarkers(html, MAIN_BLOCK_START, FULL_BLOCK_END_MARKERS)
  if (!panelHtml) throw new Error('未找到全量预报区域')
  panelHtml = sanitizeHtml(panelHtml)
  if (!/class=bgwhite_/i.test(panelHtml)) {
    panelHtml = `<div class="bgwhite_">${panelHtml}</div>`
  }
  const pcode = html.match(/var pcode\s*=\s*'([^']+)'/)?.[1] || ''
  const scode = html.match(/var scode\s*=\s*'([^']+)'/)?.[1] || ''
  return { cityName, published, panelHtml, pcode, scode, cssLinks: NMC_CSS }
}

/** 文本模式：仅解析 7 天预报列 */
export function extractDay7Panel(html, cityInfo = {}) {
  const published = html.match(/发布时间[：:]\s*([^<]+)/)?.[1]?.trim() || ''
  const cityName = extractCityTitle(html) || cityInfo.matchedName || cityInfo.enCity || ''
  const classPos = html.search(/class="[^"]*7days\s+day7[^"]*"/i)
  const idPos = html.indexOf('id=day7')
  if (classPos < 0 && idPos < 0) throw new Error('未找到 7 天预报区域')
  const anchor = classPos >= 0 ? classPos : idPos
  const divStart = html.lastIndexOf('<div', anchor)
  let end = html.length
  for (const m of DAY7_END_MARKERS) {
    const p = html.indexOf(m, anchor + 10)
    if (p > divStart && p < end) end = p
  }
  let panelHtml = sanitizeHtml(html.slice(divStart, end))
  if (!/class="[^"]*7days/i.test(panelHtml)) {
    panelHtml = `<div class="7days day7 pull-right clearfix" id="day7">${panelHtml}</div>`
  }
  return { cityName, published, panelHtml }
}

/** @deprecated 使用 extractMainForecastBlock / extractDay7Panel */
export function extractForecastPanel(html, cityInfo = {}) {
  return extractMainForecastBlock(html, cityInfo)
}

export function parseDay7Tokens(tokens) {
  const days = []
  let i = 0
  while (i < tokens.length && !DATE_RE.test(tokens[i])) i++

  while (i < tokens.length && days.length < 7) {
    if (!DATE_RE.test(tokens[i])) {
      i++
      continue
    }
    const date = tokens[i++]
    const weekday = tokens[i++] ?? ''
    const dayWeather = tokens[i++] ?? ''
    const windDir = tokens[i++] ?? ''
    const windLevel = tokens[i++] ?? ''
    const high = tokens[i++] ?? ''
    const low = tokens[i++] ?? ''

    const row = {
      date,
      weekday,
      day: { weather: dayWeather, wind: `${windDir} ${windLevel}`.trim() },
      high,
      low,
    }

    if (
      i < tokens.length &&
      !DATE_RE.test(tokens[i]) &&
      !TEMP_RE.test(tokens[i]) &&
      !/^周/.test(tokens[i])
    ) {
      const nightWeather = tokens[i++] ?? ''
      const nightDir = tokens[i++] ?? ''
      const nightLevel = tokens[i++] ?? ''
      row.night = { weather: nightWeather, wind: `${nightDir} ${nightLevel}`.trim() }
    }

    days.push(row)
  }
  return days
}

export async function fetchNmcForecast(cityInfo, opts = {}) {
  const { url, html } = await fetchNmcHtml(cityInfo, opts)
  const { cityName, published, panelHtml } = extractDay7Panel(html, cityInfo)

  const tokens = panelHtml
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  let days = parseDay7Tokens(tokens)
  const maxDays = opts.maxDays ?? 7
  if (maxDays > 0) days = days.slice(0, maxDays)

  return {
    url,
    cityName,
    province: cityInfo.province,
    published,
    days,
  }
}
