import path from 'path'
import fs from 'fs'
import BotUtil from '../../../../lib/util.js'
import { FileUtils } from '../../../../lib/utils/file-utils.js'
import { takeScreenshot } from '../../components/util/takeScreenshot.js'
import {
  fetchNmcHtml,
  extractFullForecastBlock,
  getNmcForecastUrl,
  NMC_CSS,
} from './nmc.js'
import {
  buildNmcPrepareScript,
  buildNmcSnapshotStyle,
  buildNmcResourceRewrite,
  buildNmcFontCss,
  WAIT_CLIMATE_CHART,
  WAIT_FORECAST_CHART,
  WAIT_HOUR_TABLE,
  WAIT_REAL_TEMPERATURE,
} from './nmc-prepare.js'
import { buildNmcBeforeScreenshotScript, resolveNmcClipConfig } from './nmc-clip.js'

function logInfo(...args) {
  if (typeof logger !== 'undefined') logger.info(...args)
}

function logWarn(...args) {
  if (typeof logger !== 'undefined') logger.warn(...args)
}

const SHELL_PATH = path.join(process.cwd(), 'plugins/XRK-plugin/resources/weather/snapshot-shell.html')
const TEMP_DIR = path.join(process.cwd(), 'data/temp/xrk-weather')

const NMC_CHART_SCRIPTS = [
  'https://image.nmc.cn/assets/js/jquery-1.9.1.min.js',
  'https://image.nmc.cn/assets/js/highcharts.js',
  'https://image.nmc.cn/assets/site/nmc/js/weather_chart.js?v=20220615_20221227',
  'https://image.nmc.cn/assets/site/nmc/js/ac.js?v=20220615',
  'https://image.nmc.cn/assets/js/weather.js?v=20220615_20221111',
]

function buildHideDaysCss(maxDays) {
  const n = Math.min(7, Math.max(1, Number(maxDays) || 7))
  return `.7days.day7 > .weather:nth-child(n+${n + 1}){display:none!important;}`
}

function buildCssLinks(links) {
  return links.map(href => `<link rel="stylesheet" href="${href}" />`).join('\n  ')
}

function buildScriptTags(urls) {
  return urls.map(src => `<script src="${src}"></script>`).join('\n  ')
}

function buildFallbackDocument(panel, maxDays, { includeCharts = true } = {}) {
  let shell = FileUtils.readFileSync(SHELL_PATH, 'utf8')
  if (!shell) throw new Error('缺少天气截图模板 snapshot-shell.html')

  const hideCss = buildHideDaysCss(maxDays)
  const climateStyle = includeCharts ? '#climateDiv{display:block!important;}' : '#realChart,#climateDiv{display:none!important;}'
  const fontCss = buildNmcFontCss()
  const pcodeScript = panel.pcode
    ? `<script>var pcode='${panel.pcode}';var scode='${panel.scode || ''}';</script>`
    : ''
  const chartScripts = includeCharts ? buildScriptTags(NMC_CHART_SCRIPTS) : ''

  return shell
    .replace('__EXTRA_CSS__', buildCssLinks(panel.cssLinks || NMC_CSS))
    .replace('__HIDE_DAYS_CSS__', `${fontCss}\n    ${hideCss}\n    ${climateStyle}`)
    .replace('__PANEL__', panel.panelHtml)
    .replace('__CHART_SCRIPTS__', `${pcodeScript}\n  ${chartScripts}`)
}

function writeTempHtml(html, saveId) {
  BotUtil.mkdir(TEMP_DIR)
  const filePath = path.join(TEMP_DIR, `${saveId}.html`)
  FileUtils.writeFileSync(filePath, html, 'utf8')
  return filePath
}

function resolveClipConfig(cfg) {
  const clip = resolveNmcClipConfig(cfg)
  if (cfg.include_charts === false) {
    clip.selectors = clip.selectors.filter(s => s !== '#realChart' && s !== '#climateDiv')
  }
  if (cfg.include_climate === false) {
    clip.selectors = clip.selectors.filter(s => s !== '#climateDiv')
  }
  return clip
}

function buildLiveScreenshotOptions(cityInfo, cfg, opts) {
  const shot = cfg.screenshot || {}
  const includeCharts = cfg.include_charts !== false
  const includeClimate = cfg.include_climate !== false
  const timeout = Number(shot.selectorTimeout) ?? 25000

  const waitForSelectorList = []
  if (shot.wait_for_hour !== false) waitForSelectorList.push('#hourValues .hour3')
  waitForSelectorList.push('#radarImage img')
  if (includeCharts && shot.wait_for_charts !== false) {
    waitForSelectorList.push('#forecastChart .highcharts-container, #forecastChart svg')
    if (includeClimate) {
      waitForSelectorList.push('#climateDiv .highcharts-container svg, #climateDiv #container svg')
    }
  }

  const waitForFunctionList = [WAIT_REAL_TEMPERATURE]
  const waitForFunctionAfterList = []
  if (shot.wait_for_hour !== false) waitForFunctionAfterList.push(WAIT_HOUR_TABLE)
  if (includeCharts && shot.wait_for_charts !== false) {
    waitForFunctionAfterList.push(WAIT_FORECAST_CHART)
    if (includeClimate) waitForFunctionAfterList.push(WAIT_CLIMATE_CHART)
  }

  const clipCfg = resolveClipConfig(cfg)

  return {
    width: Number(shot.width) || 1500,
    height: Number(shot.height) || 1000,
    deviceScaleFactor: Number(shot.deviceScaleFactor) || 2,
    fullPage: false,
    waitUntil: shot.waitUntil || 'networkidle2',
    imageWaitTimeout: Number(shot.imageWaitTimeout) ?? 10000,
    fontWaitTimeout: Number(shot.fontWaitTimeout) ?? 4000,
    delayBeforeScreenshot: Number(shot.delayBeforeScreenshot) ?? 3500,
    imgType: shot.imgType || 'jpeg',
    quality: Number(shot.quality) || 92,
    selectorTimeout: timeout,
    pageStyle: buildNmcSnapshotStyle(shot.hide_css),
    resourceRewrite: buildNmcResourceRewrite(),
    waitForFunctionList,
    waitForFunctionAfterList,
    waitForSelectorList,
    pageEvaluate: buildNmcPrepareScript({
      includeClimate,
      maxDays: opts.maxDays,
    }),
    pageEvaluateBeforeScreenshot: buildNmcBeforeScreenshotScript(clipCfg),
    pageGotoParams: {
      waitUntil: shot.waitUntil || 'networkidle2',
      timeout: Number(shot.goto_timeout_ms) || 45000,
    },
    priority: true,
  }
}

async function screenshotLivePage(cityInfo, cfg, opts) {
  const url = getNmcForecastUrl(cityInfo)
  const saveId = `weather_${cityInfo.enCity}_${Date.now()}`
  const options = buildLiveScreenshotOptions(cityInfo, cfg, opts)

  logInfo(`[向日葵查天气] live 截图 ${cityInfo.matchedName || cityInfo.enCity} clip.width=${resolveClipConfig(cfg).width}`)

  const image = await takeScreenshot(url, saveId, options)
  if (!image) throw new Error('官网预报区截图失败')

  let published = ''
  try {
    const { html } = await fetchNmcHtml(cityInfo, opts)
    published = html.match(/发布时间[：:]\s*([^<]+)/)?.[1]?.trim() || ''
  } catch (_) { /* ignore */ }

  return {
    image,
    url,
    cityName: cityInfo.matchedName || cityInfo.enCity,
    published,
  }
}

async function screenshotFallbackHtml(cityInfo, cfg, opts) {
  const shot = cfg.screenshot || {}
  const { url, html } = await fetchNmcHtml(cityInfo, opts)
  const panel = extractFullForecastBlock(html, cityInfo)
  const doc = buildFallbackDocument(panel, opts.maxDays, {
    includeCharts: cfg.include_charts !== false,
  })
  const saveId = `weather_${cityInfo.enCity}_${Date.now()}`
  const tplFile = writeTempHtml(doc, saveId)

  logInfo(`[向日葵查天气] html 回退截图 ${panel.cityName}`)

  const image = await takeScreenshot(tplFile, saveId, {
    width: Number(shot.width) || 1500,
    height: Number(shot.height) || 1000,
    deviceScaleFactor: Number(shot.deviceScaleFactor) || 2,
    fullPage: true,
    waitUntil: shot.waitUntil || 'networkidle2',
    imageWaitTimeout: Number(shot.imageWaitTimeout) ?? 8000,
    fontWaitTimeout: Number(shot.fontWaitTimeout) ?? 4000,
    delayBeforeScreenshot: Number(shot.delayBeforeScreenshot) ?? 4000,
    imgType: shot.imgType || 'jpeg',
    quality: Number(shot.quality) || 92,
    resourceRewrite: buildNmcResourceRewrite(),
    priority: true,
  })

  if (FileUtils.existsSync(tplFile)) fs.unlinkSync(tplFile)
  if (!image) throw new Error('离线预报区截图失败')
  return { image, url, cityName: panel.cityName, published: panel.published }
}

/**
 * 优先打开 nmc.cn 原页，等 JS 渲染后按 DOM 区域截图；失败时回退到爬虫 HTML
 */
export async function screenshotNmcForecast(cityInfo, cfg = {}) {
  const opts = {
    timeout: Number(cfg.request_timeout_ms) || 20000,
    userAgent: cfg.user_agent,
    maxDays: Math.min(7, Math.max(1, Number(cfg.forecast_days) || 7)),
  }

  const mode = (cfg.screenshot?.mode || 'live').toLowerCase()
  if (mode === 'html') {
    return screenshotFallbackHtml(cityInfo, cfg, opts)
  }

  try {
    return await screenshotLivePage(cityInfo, cfg, opts)
  } catch (err) {
    logWarn('[向日葵查天气] 官网截图失败，回退离线 HTML:', err?.message || err)
    return screenshotFallbackHtml(cityInfo, cfg, opts)
  }
}
