import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_HELP_CFG } from './config-normalize.js';
import hub from './xrk-hub.js';
import { SUB_HELP_PAGES, HELP_BACKGROUNDS } from './sub-help-pages.js';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { takeScreenshot } from './web-screenshot.js';

export const HELP_PAGE_WIDTH = 1280;
export const HELP_DEVICE_SCALE = 3;

export function resolveHelpDir(cwd = process.cwd()) {
  return path.join(cwd, 'plugins', 'XRK-plugin', 'resources', 'help');
}

export const HELP_SCREENSHOT_OPTS = {
  fullPage: false,
  width: HELP_PAGE_WIDTH,
  deviceScaleFactor: HELP_DEVICE_SCALE,
  imgType: 'png',
  imageWaitTimeout: 2000,
  fontWaitTimeout: 1600,
  // 截 .container 卡片本身，勿用 y:0 从页面顶硬裁
  selector: '.container',
  waitUntil: 'domcontentloaded'
};

export const HELP_FONT_FAMILY = "'XRK Help', '汉仪文黑-65W', 'PingFang SC', 'Microsoft YaHei', sans-serif";

/** 各帮助页背景键（main + 子帮助） */
export const HELP_BG_ORDER = ['main', ...Object.keys(SUB_HELP_PAGES)];

const d = DEFAULT_HELP_CFG.style;
const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;
const BODY_GRADIENT_FALLBACK = 'linear-gradient(180deg,rgba(15,23,42,0.45) 0%,rgba(15,23,42,0.75) 100%)';

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

/** slug → 背景键：help / _preview-main → main；sub-emoji / _preview-emoji → emoji */
export function normalizeHelpBackgroundKey(slug = 'help') {
  let key = String(slug).replace(/^_preview-/, '').replace(/^sub-/, '');
  if (key === 'help') key = 'main';
  return key;
}

export function resolveBackgroundFile(helpDir, slug = 'help') {
  const bgKey = normalizeHelpBackgroundKey(slug);
  const file = HELP_BACKGROUNDS[bgKey];
  if (file) {
    const full = path.join(helpDir, 'bgother', file);
    if (FileUtils.existsSync(full)) return file;
    logger?.warn?.(`[XRK help] 背景不存在: ${file} (${bgKey})`);
  }
  const images = listBackgroundImages(helpDir).sort();
  if (!images.length) return null;
  const orderIdx = HELP_BG_ORDER.indexOf(bgKey);
  return images[orderIdx >= 0 ? orderIdx % images.length : 0];
}

function resolveBackgroundUrl(helpDir, slug = 'help') {
  const file = resolveBackgroundFile(helpDir, slug);
  if (!file) return null;
  return pathToFileURL(path.join(helpDir, 'bgother', file)).href;
}

function buildHelpFontFace(helpDir) {
  const woff = path.join(helpDir, 'fonts/HYWH-65W.woff');
  if (!FileUtils.existsSync(woff)) return '';
  const url = pathToFileURL(woff).href;
  return `@font-face{font-family:'XRK Help';src:url('${url}') format('woff');font-weight:normal;font-style:normal;font-display:block;}`;
}

export function filterHelpList(helpList, sharing) {
  const list = helpList ?? hub.helpList;
  const share = sharing ?? hub.config.sharing;
  return list.filter(g => g.group !== '向日葵资源相关功能' || share);
}

export function buildHelpStyleOverrides(helpCfg = {}, bgFileUrl = null) {
  const style = helpCfg.style || {};
  const cols = Math.max(1, Number(helpCfg.columnCount) || DEFAULT_HELP_CFG.columnCount);
  const colPct = (100 / cols).toFixed(4);
  // 矮内容 + cover 居中会只露头顶；容器加高、面板不拉满，把脸落在面板下方留白
  const bodyBg = bgFileUrl
    ? `background-color:#0f172a;background-image:url('${bgFileUrl}');background-repeat:no-repeat;background-position:center 42%;background-size:cover;`
    : `background-color:#0f172a;background-image:${BODY_GRADIENT_FALLBACK};`;
  const contBg = pickPanelBg(style.contBgColor, d.contBgColor);
  const groupBg = pickPanelBg(style.groupBgColor, d.groupBgColor);
  const row1 = pickPanelBg(style.rowBgColor1, d.rowBgColor1);
  const row2 = pickPanelBg(style.rowBgColor2, d.rowBgColor2);
  return `
html, body.xrk-help { margin:0; padding:0; background:#0f172a; }
body.xrk-help { min-height:100%; font-family:${HELP_FONT_FAMILY}; display:flex; justify-content:center; }
.container { ${bodyBg} min-height:900px; margin:0 auto; display:flex; flex-direction:column; }
.help-stack { flex:1; display:flex; flex-direction:column; justify-content:center; width:100%; }
.cont-box { background: ${contBg}; flex:none; backdrop-filter:blur(10px); }
.head-box { padding: 12px 0 18px; text-align:center; }
.head-box .title { color: ${style.titleColor || d.titleColor}; }
.head-box .sub-title { color: ${style.subTitleColor || d.subTitleColor}; }
.help-group { color: ${style.groupColor || d.groupColor}; border-left-color: ${style.accentColor || d.accentColor}; background: ${groupBg}; }
.help-table .tr:nth-child(odd) { background: ${row1}; }
.help-table .tr:nth-child(even) { background: ${row2}; }
.help-table .td { width: ${colPct}%; }
.help-title { color: ${style.fontColor || d.fontColor}; }
.help-desc { color: ${style.descColor || d.descColor}; }
.copyright { color: ${style.footerColor || d.footerColor}; }
`;
}

/** 过透/过实 → 默认玻璃 */
function pickPanelBg(value, fallback) {
  const s = String(value || '');
  const m = s.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/i);
  if (m) {
    const a = Number(m[1]);
    if (a < 0.10 || a > 0.35) return fallback;
  }
  return value || fallback;
}

function iconStyle(helpDir, icon) {
  const url = pathToFileURL(path.join(helpDir, 'icons', `icon-${icon}.png`)).href;
  return `background-image:url('${url}')`;
}

function cellHtml(helpDir, item) {
  const desc = item.desc ? `<span class="help-desc">${item.desc}</span>` : '';
  return `<div class="td"><div class="help-icon" style="${iconStyle(helpDir, item.icon)}"></div><span class="help-title">${item.title}</span>${desc}</div>`;
}

export function buildHelpSections(helpList, helpDir = resolveHelpDir(), colCount = DEFAULT_HELP_CFG.columnCount) {
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
  helpDir = resolveHelpDir(),
  cwd = process.cwd()
}) {
  const htmlPath = path.join(helpDir, `${slug}.html`);
  const cssPath = path.join(helpDir, `${slug}.css`);
  const bgFileUrl = resolveBackgroundUrl(helpDir, slug);
  if (!bgFileUrl) logger?.warn?.('[XRK help] 未找到背景图片（bgother/）');

  const css = buildHelpFontFace(helpDir)
    + FileUtils.readFileSync(path.join(helpDir, 'help_template.css'))
    + buildHelpStyleOverrides(helpCfg, bgFileUrl);
  FileUtils.writeFileSync(cssPath, css);

  const { mainPkg, pluginPkg } = readPackageVersions(cwd);
  const subTitleHtml = subTitle ? `<p class="sub-title">${subTitle}</p>` : '';
  const cols = Math.max(1, Number(helpCfg.columnCount) || DEFAULT_HELP_CFG.columnCount);

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
export async function captureHelpScreenshot({
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
