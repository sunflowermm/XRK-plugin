import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { FileUtils } from '../../../lib/utils/file-utils.js';

export const HELP_DIR = path.join(process.cwd(), 'plugins/XRK-plugin/resources/help');
export const HELP_PAGE_WIDTH = 1280;
export const HELP_DEVICE_SCALE = 3;
export const HELP_COLUMN_COUNT = 2;

export const HELP_SCREENSHOT_OPTS = {
  fullPage: true,
  width: HELP_PAGE_WIDTH,
  deviceScaleFactor: HELP_DEVICE_SCALE,
  imgType: 'png',
  imageWaitTimeout: 2000,
  fontWaitTimeout: 1600,
  priority: true,
  pageEvaluateBeforeScreenshot: `return (() => {
    const root = document.querySelector('.container') || document.body;
    const rect = root.getBoundingClientRect();
    const h = Math.ceil(rect.bottom + window.scrollY + 4);
    return { x: 0, y: 0, width: ${HELP_PAGE_WIDTH}, height: Math.max(h, 120) };
  })()`
};

export const HELP_FONT_FAMILY = "'XRK Help', '汉仪文黑-65W', 'PingFang SC', 'Microsoft YaHei', sans-serif";

export const HELP_STYLE_DEFAULTS = {
  contBgColor: 'rgba(255, 255, 255, 0.08)',
  contBgBlur: 6,
  groupBgColor: 'linear-gradient(90deg, rgba(94, 234, 212, 0.04), rgba(255, 255, 255, 0.03))',
  rowBgColor1: 'rgba(255, 255, 255, 0.01)',
  rowBgColor2: 'rgba(255, 255, 255, 0.03)'
};

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
const BODY_GRADIENT_FALLBACK = 'linear-gradient(180deg,rgba(15,23,42,0.45) 0%,rgba(15,23,42,0.75) 100%)';
const BODY_GRADIENT_OVERLAY = 'linear-gradient(180deg,rgba(15,23,42,0.02) 0%,rgba(15,23,42,0.05) 45%,rgba(15,23,42,0.12) 100%)';

function listBackgroundImages(helpDir) {
  const dir = path.join(helpDir, 'bgother');
  if (!FileUtils.existsSync(dir)) return [];
  try {
    return FileUtils.readDirSync(dir).filter(f => IMAGE_EXT.test(f));
  } catch (err) {
    logger?.warn?.(`[XRK help] 读取背景目录失败 ${dir}: ${err.message}`);
    return [];
  }
}

function pickRandomBackground(helpDir) {
  const images = listBackgroundImages(helpDir);
  if (images.length === 0) return null;
  return images[Math.floor(Math.random() * images.length)];
}

function resolveBackgroundUrl(helpDir) {
  const file = pickRandomBackground(helpDir);
  if (!file) return null;
  return pathToFileURL(path.join(helpDir, 'bgother', file)).href;
}

function buildHelpFontFace(helpDir) {
  const woff = path.join(helpDir, 'fonts/HYWH-65W.woff');
  if (!FileUtils.existsSync(woff)) return '';
  const url = pathToFileURL(woff).href;
  return `@font-face{font-family:'XRK Help';src:url('${url}') format('woff');font-weight:normal;font-style:normal;font-display:block;}`;
}

export function buildHelpStyleOverrides(helpCfg = {}, bgFileUrl = null) {
  const style = helpCfg.style || {};
  const cols = Math.max(1, Number(helpCfg.columnCount) || HELP_COLUMN_COUNT);
  const colPct = (100 / cols).toFixed(4);
  const bodyBg = bgFileUrl
    ? `background-color:#0f172a;background-image:${BODY_GRADIENT_OVERLAY},url('${bgFileUrl}');background-repeat:no-repeat;background-position:center top;background-size:cover;`
    : `background-color:#0f172a;background-image:${BODY_GRADIENT_FALLBACK};`;
  const d = HELP_STYLE_DEFAULTS;
  return `
body.xrk-help { ${bodyBg} min-height:100%; font-family:${HELP_FONT_FAMILY}; }
.cont-box { background: ${style.contBgColor || d.contBgColor}; backdrop-filter: blur(${style.contBgBlur ?? d.contBgBlur}px); -webkit-backdrop-filter: blur(${style.contBgBlur ?? d.contBgBlur}px); }
.head-box .title { color: ${style.titleColor || '#f8fafc'}; }
.head-box .sub-title { color: ${style.subTitleColor || 'rgba(248,250,252,0.88)'}; }
.help-group { color: ${style.groupColor || '#0f172a'}; border-left-color: ${style.accentColor || '#5eead4'}; background: ${style.groupBgColor || d.groupBgColor}; }
.help-table .tr:nth-child(odd) { background: ${style.rowBgColor1 || d.rowBgColor1}; }
.help-table .tr:nth-child(even) { background: ${style.rowBgColor2 || d.rowBgColor2}; }
.help-table .td { width: ${colPct}%; }
.help-title { color: ${style.fontColor || '#1e293b'}; }
.help-desc { color: ${style.descColor || '#475569'}; }
.copyright { color: ${style.footerColor || 'rgba(248,250,252,0.72)'}; }
`;
}

function iconStyle(helpDir, icon) {
  const url = pathToFileURL(path.join(helpDir, 'icons', `icon-${icon}.png`)).href;
  return `background-image:url('${url}')`;
}

function cellHtml(helpDir, item) {
  const desc = item.desc ? `<span class="help-desc">${item.desc}</span>` : '';
  return `<div class="td"><div class="help-icon" style="${iconStyle(helpDir, item.icon)}"></div><span class="help-title">${item.title}</span>${desc}</div>`;
}

export function buildHelpSections(helpList, helpDir = HELP_DIR, colCount = HELP_COLUMN_COUNT) {
  const cols = Math.max(1, colCount);
  return helpList.map((group) => {
    const rows = [];
    for (let i = 0; i < group.list.length; i += cols) {
      const chunk = group.list.slice(i, i + cols);
      rows.push(`<div class="tr">${chunk.map(item => cellHtml(helpDir, item)).join('')}</div>`);
    }
    return `<div class="help-group">${group.group}</div><div class="help-table">${rows.join('')}</div>`;
  }).join('');
}

function readPackageVersions(cwd = process.cwd()) {
  const root = path.join(cwd, 'plugins/XRK-plugin');
  const mainPkg = JSON.parse(FileUtils.readFileSync(path.join(cwd, 'package.json')));
  const pluginPkg = JSON.parse(FileUtils.readFileSync(path.join(root, 'package.json')));
  return { mainPkg, pluginPkg };
}

export function writeHelpPage({
  slug = 'help',
  helpCfg = {},
  helpList,
  title,
  subTitle = '',
  helpDir = HELP_DIR,
  cwd = process.cwd()
}) {
  const htmlPath = path.join(helpDir, `${slug}.html`);
  const cssPath = path.join(helpDir, `${slug}.css`);
  const bgFileUrl = resolveBackgroundUrl(helpDir);
  if (!bgFileUrl) logger?.warn?.('[XRK help] 未找到背景图片（bgother/）');

  const css = buildHelpFontFace(helpDir)
    + FileUtils.readFileSync(path.join(helpDir, 'help_template.css'))
    + buildHelpStyleOverrides(helpCfg, bgFileUrl);
  FileUtils.writeFileSync(cssPath, css);

  const { mainPkg, pluginPkg } = readPackageVersions(cwd);
  const subTitleHtml = subTitle ? `<p class="sub-title">${subTitle}</p>` : '';
  const cols = Math.max(1, Number(helpCfg.columnCount) || HELP_COLUMN_COUNT);

  let html = FileUtils.readFileSync(path.join(helpDir, 'help_template.html'));
  const titleText = title ?? helpCfg.title ?? '';
  html = html
    .replaceAll('{{cssFile}}', `${slug}.css`)
    .replaceAll('{{title}}', titleText)
    .replaceAll('{{subTitleHtml}}', subTitleHtml)
    .replaceAll('{{helpSections}}', buildHelpSections(helpList, helpDir, cols))
    .replaceAll('{{mainPackageName}}', mainPkg.name)
    .replaceAll('{{mainPackageVersion}}', mainPkg.version)
    .replaceAll('{{pluginPackageName}}', pluginPkg.name)
    .replaceAll('{{pluginPackageVersion}}', pluginPkg.version);
  FileUtils.writeFileSync(htmlPath, html);

  return { htmlPath, cssPath };
}

/** 渲染帮助截图（主帮助 / 其它帮助共用） */
export async function captureHelpScreenshot(takeScreenshot, {
  slug,
  helpCfg,
  helpList,
  title,
  subTitle = '',
  imageName
}) {
  const { htmlPath, cssPath } = writeHelpPage({
    slug,
    helpCfg,
    helpList,
    title,
    subTitle
  });
  try {
    return await takeScreenshot(htmlPath, imageName, HELP_SCREENSHOT_OPTS);
  } finally {
    await removeEphemeralHelp(htmlPath, cssPath);
  }
}

export async function removeEphemeralHelp(...paths) {
  await Promise.all(paths.map(async (p) => {
    try {
      if (await FileUtils.exists(p)) await FileUtils.unlink(p);
    } catch (err) {
      Bot.makeLog('debug', `[XRK help] 清理临时文件失败 ${p}: ${err.message}`, 'XRK-plugin');
    }
  }));
}
