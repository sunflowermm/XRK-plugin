import { takeScreenshot } from '../../../components/util/takeScreenshot.js';
import path from 'path';
import fs from 'fs';
import { helpCfg, helpList } from '../config/system/help_system.js';
import xrkconfig from '../components/xrkconfig.js';

const cwd = process.cwd();
const root = path.join(cwd, 'plugins/XRK-plugin');
const helpDir = path.join(root, 'resources/help');

function getRandomBackgroundImage() {
  const bgFolderPath = path.join(helpDir, 'bg');
  const files = fs.readdirSync(bgFolderPath).filter(f => /\.(jpg|jpeg|png|gif)$/i.test(f));
  if (files.length === 0) logger.error('没有找到背景图片');
  return `./bg/${files[Math.floor(Math.random() * files.length)]}`;
}

function filterHelpList() {
  return helpList.filter(g => g.group !== '向日葵资源相关功能' || xrkconfig.sharing);
}

export class showmainHelp extends plugin {
  constructor() {
    super({
      name: '向日葵帮助插件',
      dsc: 'xrk帮助',
      event: 'message',
      priority: xrkconfig.help_priority,
      rule: [{ reg: '^#?(xrk|向日葵)?(插件)?(帮助|help|Help|菜单|功能)', fnc: 'generateHelpScreenshot' }],
    });
  }

  async generateHelpScreenshot(e) {
    const htmlPath = path.join(helpDir, 'help.html');
    const cssPath = path.join(helpDir, 'help.css');
    let css = fs.readFileSync(path.join(helpDir, 'help_template.css'), 'utf-8').replace('{{bgImagePath}}', getRandomBackgroundImage());
    fs.writeFileSync(cssPath, css);

    const mainPkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'));
    const pluginPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    const sections = filterHelpList().map(group =>
      `<div class="help-group">${group.group}</div><div class="help-table">${group.list.map(item =>
        `<div class="td"><div class="help-icon" style="background-image: url('./icons/icon-${item.icon}.png');"></div><div class="help-text"><div class="help-title">${item.title}</div><div class="help-desc">${item.desc}</div></div></div>`
      ).join('')}</div>`
    ).join('');

    let html = fs.readFileSync(path.join(helpDir, 'help_template.html'), 'utf-8');
    html = html.replace('{{title}}', helpCfg.title).replace('{{subTitle}}', helpCfg.subTitle).replace('{{helpSections}}', sections)
      .replace('{{mainPackageName}}', mainPkg.name).replace('{{mainPackageVersion}}', mainPkg.version)
      .replace('{{pluginPackageName}}', pluginPkg.name).replace('{{pluginPackageVersion}}', pluginPkg.version);
    fs.writeFileSync(htmlPath, html);

    try {
      const buf = await takeScreenshot(htmlPath, 'help_screenshot', { fullPage: true, width: 1024, deviceScaleFactor: 2, waitForTimeout: 800 });
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
