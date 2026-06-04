import { takeScreenshot } from '../components/util/takeScreenshot.js';
import path from 'path';
import fs from 'fs';
import hub from '../lib/xrk-hub.js';

const cwd = process.cwd();
const root = path.join(cwd, 'plugins/XRK-plugin');
const helpDir = path.join(root, 'resources/help');

function getRandomBackgroundImage() {
  const imageExt = /\.(jpg|jpeg|png|gif)$/i;
  const cfg = hub.helpCfg || {};
  const theme = cfg.theme || 'all';
  const exclude = new Set((cfg.themeExclude || []).map(String));
  const collect = (dir, prefix) => {
    try {
      return fs.readdirSync(dir)
        .filter(f => imageExt.test(f))
        .filter(f => ![...exclude].some(ex => ex && (f.includes(ex) || prefix.includes(ex))))
        .map(f => `${prefix}${f}`);
    } catch {
      return [];
    }
  };
  const sources = [];
  if (theme === 'all' || theme === 'bg') sources.push(['bg', './bg/']);
  if (theme === 'all' || theme === 'bgbg') sources.push(['bgbg', './bgbg/']);
  if (!['all', 'bg', 'bgbg'].includes(theme)) {
    sources.push([theme, `./${theme}/`]);
  }
  const all = sources.flatMap(([folder, prefix]) => collect(path.join(helpDir, folder), prefix));
  if (all.length === 0) logger.error('没有找到背景图片');
  return all.length ? all[Math.floor(Math.random() * all.length)] : './bg/';
}

function filterHelpList() {
  return hub.helpList.filter(g => g.group !== '向日葵资源相关功能' || hub.sharing);
}

/** 将 help_system.yaml 中的样式/列数接入帮助页 CSS */
function applyHelpSystemStyle(css) {
  const cfg = hub.helpCfg || {};
  const style = cfg.style || {};
  const cols = Math.max(1, Number(cfg.columnCount) || 3);
  const colWidth = Math.max(120, Number(cfg.colWidth) || 265);
  const colPct = (100 / cols).toFixed(4);
  const bgBlur = cfg.bgBlur ? 'filter: blur(8px); transform: scale(1.05);' : '';
  return `${css}
/* help_system.yaml 动态样式 */
.background { ${bgBlur} }
.content { background: ${style.contBgColor || 'rgba(6, 21, 31, .5)'}; backdrop-filter: blur(${style.contBgBlur ?? 4}px); }
.head-box .title { color: ${style.fontColor || '#fff'}; }
.head-box .sub-title { color: ${style.descColor || '#ddd'}; }
.help-group { color: ${style.fontColor || '#fff'}; background: ${style.headerBgColor || 'transparent'}; }
.help-table .td { flex: 0 1 calc(${colPct}% - 12px); max-width: ${colWidth}px; background: ${style.rowBgColor1 || 'rgba(153, 120, 120, 0.533)'}; }
.help-table .td:nth-child(even) { background: ${style.rowBgColor2 || style.rowBgColor1 || 'rgba(153, 120, 120, 0.533)'}; }
.help-title { color: ${style.fontColor || '#fff'}; }
.help-desc { color: ${style.descColor || '#ededed'}; }
footer, footer small { color: ${style.descColor || '#ddd'}; }
`;
}

export class showmainHelp extends plugin {
  constructor() {
    super({
      name: '向日葵帮助插件',
      dsc: 'xrk帮助',
      event: 'message',
      priority: hub.help_priority,
      rule: [{ reg: '^#?(xrk|向日葵)?(插件)?(帮助|help|Help|菜单|功能)', fnc: 'generateHelpScreenshot' }],
    });
  }

  async generateHelpScreenshot(e) {
    const htmlPath = path.join(helpDir, 'help.html');
    const cssPath = path.join(helpDir, 'help.css');
    let css = fs.readFileSync(path.join(helpDir, 'help_template.css'), 'utf-8').replace('{{bgImagePath}}', getRandomBackgroundImage());
    css = applyHelpSystemStyle(css);
    fs.writeFileSync(cssPath, css);

    const mainPkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    const pluginPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    const sections = filterHelpList().map(group =>
      `<div class="help-group">${group.group}</div><div class="help-table">${group.list.map(item =>
        `<div class="td"><div class="help-icon" style="background-image: url('./icons/icon-${item.icon}.png');"></div><div class="help-text"><div class="help-title">${item.title}</div><div class="help-desc">${item.desc}</div></div></div>`
      ).join('')}</div>`
    ).join('');

    let html = fs.readFileSync(path.join(helpDir, 'help_template.html'), 'utf-8');
    html = html.replace('{{title}}', hub.helpCfg.title).replace('{{subTitle}}', hub.helpCfg.subTitle).replace('{{helpSections}}', sections)
      .replace('{{mainPackageName}}', mainPkg.name).replace('{{mainPackageVersion}}', mainPkg.version)
      .replace('{{pluginPackageName}}', pluginPkg.name).replace('{{pluginPackageVersion}}', pluginPkg.version);
    fs.writeFileSync(htmlPath, html);

    try {
      const buf = await takeScreenshot(htmlPath, 'help_screenshot', { fullPage: true, width: 1024, deviceScaleFactor: 2, waitForTimeout: 800, priority: true });
      if (buf) await e.reply([segment.image(buf)]);
      else await e.reply('生成帮助截图失败，请稍后重试。');
    } catch (err) {
      logger.error('生成帮助截图失败:', err);
      await e.reply('生成帮助截图失败，请稍后重试。');
    } finally {
      try { fs.unlinkSync(htmlPath); fs.unlinkSync(cssPath); } catch (_) {}
    }
  }
}
