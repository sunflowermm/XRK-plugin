/**
 * nmc.cn 预报页截图前准备脚本（在 Puppeteer page.evaluate 中执行）
 */
import path from 'path'
import { pathToFileURL } from 'url'

export const WEATHER_FONTS_DIR = path.join(process.cwd(), 'plugins/XRK-plugin/resources/weather/fonts')

function fontFileUrl(name) {
  return pathToFileURL(path.join(WEATHER_FONTS_DIR, name)).href
}

/** 将 nmc 在线字体/图标映射到插件本地资源（通过 Puppeteer 通用 resourceRewrite 传入） */
export function buildNmcResourceRewrite() {
  const iconfont = path.join(WEATHER_FONTS_DIR, 'iconfont.woff2')
  const noto = path.join(WEATHER_FONTS_DIR, 'NotoSansSC-Regular.woff2')
  return [
    { match: 'font_1156386', toFile: iconfont, contentType: 'font/woff2' },
    { match: 'iconfont.woff', toFile: iconfont, contentType: 'font/woff2' },
    { match: 'iconfont.ttf', toFile: iconfont, contentType: 'font/woff2' },
    { match: 'NotoSansSC', toFile: noto, contentType: 'font/woff2' },
  ]
}

export function buildNmcFontCss() {
  const notoUrl = fontFileUrl('NotoSansSC-Regular.woff2')
  const iconUrl = fontFileUrl('iconfont.woff2')
  return `
@font-face {
  font-family: 'XRK Noto Sans SC';
  src: url('${notoUrl}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'iconfont';
  src: url('${iconUrl}') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
body, .weather-header, .cityreal, .alarmmsg, #day7, #hourValues, #climateDiv,
.bgwhite_, table, th, td, .hd, .hb, .hp, .highcharts-container, .highcharts-container text {
  font-family: 'XRK Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
.iconfont, [class*=" icon-"], [class^="icon-"] {
  font-family: 'iconfont', 'XRK Noto Sans SC', sans-serif !important;
}
#realTemperature {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
#day7 .weather .date, #day7 .weather .wd, #hourValues th, #hourValues td {
  font-size: 13px;
  line-height: 1.45;
}
.bgwhite_ {
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
`
}

export function buildNmcPrepareScript(opts = {}) {
  const includeClimate = opts.includeClimate !== false
  const maxDays = Math.min(7, Math.max(1, Number(opts.maxDays) || 7))
  return `(() => {
    const maxDays = ${maxDays};
    const includeClimate = ${includeClimate};

    const hideSel = [
      '#topBanner', '.topLine', '#toTop', 'a#toTop', 'a[href="#top"]',
      '.weather-header .container > .row:first-child',
      '.weather-header .cityselect', '.weather-header .breadcrumb', '#breadcrumb',
      '.navbar', '.navbar-default', 'footer', '.qrcodeList', '.frilink',
      '.scrollToTop', '#scrollTop', 'a.scrollToTop', '.scroll-top',
      '.product.index-product', '.link-title',
      '.kf', '.kf_box', '.side-bar', 'iframe',
    ].join(',');
    document.querySelectorAll(hideSel).forEach(el => {
      el.style.setProperty('display', 'none', 'important');
    });

    const climateEl = document.getElementById('climateDiv');
    if (climateEl) {
      let sib = climateEl.nextElementSibling;
      while (sib) {
        sib.style.setProperty('display', 'none', 'important');
        sib = sib.nextElementSibling;
      }
      if (includeClimate) climateEl.style.setProperty('display', 'block', 'important');
    }

    document.querySelectorAll('body *').forEach(el => {
      const st = getComputedStyle(el);
      if (st.position !== 'fixed' && st.position !== 'sticky') return;
      if (el.closest('.weather-header, #realChart, #climateDiv')) return;
      el.style.setProperty('display', 'none', 'important');
    });

    document.querySelectorAll('.hp.mt15').forEach(el => {
      if (el.querySelector('.index-product')) el.style.setProperty('display', 'none', 'important');
    });

    const day7 = document.getElementById('day7');
    if (day7) {
      day7.querySelectorAll('.weather').forEach((el, i) => {
        if (i >= maxDays) el.style.setProperty('display', 'none', 'important');
      });
      const first = day7.querySelector('.weather.selected') || day7.querySelector('.weather');
      if (first && typeof first.click === 'function') first.click();
    }

    document.querySelectorAll('img[data-original]').forEach(img => {
      const src = img.getAttribute('data-original');
      if (src && (!img.src || img.src.includes('default_loading'))) img.src = src;
    });

    const radarImg = document.querySelector('#radarImage img');
    if (radarImg) {
      radarImg.style.setProperty('height', 'auto', 'important');
      radarImg.style.setProperty('object-fit', 'contain', 'important');
      radarImg.style.setProperty('object-position', 'left center', 'important');
    }

    return {
      temp: document.querySelector('#realTemperature')?.textContent?.trim() || '',
      forecastChart: !!document.querySelector('#forecastChart .highcharts-container, #forecastChart svg'),
      climateChart: !!document.querySelector('#climateDiv .highcharts-container, #climateDiv svg, #climateDiv #container svg'),
    };
  })()`
}

export const WAIT_REAL_TEMPERATURE =
  "document.querySelector('#realTemperature') && document.querySelector('#realTemperature').textContent.trim().length > 0"

export const WAIT_HOUR_TABLE =
  "document.querySelector('#selectdate') && /\\d{2}\\/\\d{2}/.test(document.querySelector('#selectdate').textContent)"

export const WAIT_FORECAST_CHART =
  "document.querySelector('#forecastChart .highcharts-container svg, #forecastChart svg path')"

export const WAIT_CLIMATE_CHART =
  "document.querySelector('#climateDiv .highcharts-container svg, #climateDiv #container svg path')"

export const DEFAULT_CLIP_SELECTORS = [
  '.weather-header',
  '#realWarn',
  '#realChart',
  '#climateDiv',
]

export const NMC_WEATHER_BG_URL =
  'https://image.nmc.cn/assets/site/nmc/img/weather_bg.png?v=20220615'

export const NMC_SNAPSHOT_FIX_CSS = `
  body {
    margin: 0;
    padding: 0;
    background-color: #f7f7f7 !important;
    background-image: none !important;
  }
  .weather-header {
    margin-top: 0 !important;
    overflow: visible !important;
    background-color: #f7f7f7 !important;
    background-image: url('${NMC_WEATHER_BG_URL}') !important;
    background-repeat: no-repeat !important;
    background-position: center top !important;
  }
  .cityreal, .alarmmsg, #realWarn, .cityradar, #radarImage {
    overflow: visible !important;
  }
  .cityradar img, #radarImage img {
    width: 100% !important;
    height: auto !important;
    max-height: 380px !important;
    object-fit: contain !important;
    object-position: left center !important;
  }
  #topBanner, .topLine, #toTop, a#toTop, footer, .qrcodeList, .frilink, .link-title,
  .scrollToTop, #scrollTop, .kf, .side-bar, iframe {
    display: none !important;
  }
`

export const DEFAULT_HIDE_CSS = `
  #topBanner, .topLine, #toTop, a#toTop,
  .weather-header .container > .row:first-child,
  .weather-header .cityselect, .weather-header .breadcrumb, #breadcrumb,
  .navbar, .navbar-default, .frilink, footer, .qrcodeList,
  .scrollToTop, #scrollTop, .product.index-product, .link-title, iframe {
    display: none !important;
  }
  .highcharts-button, .highcharts-contextbutton, g.highcharts-button { display: none !important; }
  #climateDiv { display: block !important; visibility: visible !important; }
  ${NMC_SNAPSHOT_FIX_CSS}
`

export function buildNmcSnapshotStyle(extraCss = '') {
  const extra = typeof extraCss === 'string' && extraCss.trim() ? `\n${extraCss}` : ''
  return `${buildNmcFontCss()}${DEFAULT_HIDE_CSS}${extra}`
}

