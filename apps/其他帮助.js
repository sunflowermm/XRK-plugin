import plugin from '../../../lib/plugins/plugin.js';
import fs from 'fs';
import path from 'path';
import { takeScreenshot } from '../../../components/util/takeScreenshot.js';

const helpDir = path.join(process.cwd(), 'plugins/XRK-plugin/resources/help');

export class showHelp extends plugin {
  constructor() {
    super({
      name: '其他帮助',
      dsc: '向日葵帮助',
      event: 'message',
      priority: 500,
      rule: [
        { reg: /^#?(xrk|向日葵)?全局(表情)?帮助$/, fnc: 'emojihelp' },
        { reg: /^#?(xrk|向日葵)?刷步数帮助$/, fnc: 'feethelp' },
        { reg: /^#?(xrk|向日葵)?(早报)?推送帮助$/, fnc: 'newshelp' },
        { reg: /^#?(xrk|向日葵)?(整点)?报时帮助$/, fnc: 'timehelp' },
        { reg: /^#?(xrk|向日葵)?(人工)?(ai|AI|Ai|aI)帮助$/, fnc: 'aihelp' },
        { reg: /^#?(xrk|向日葵)?插件(相关)?帮助$/, fnc: 'pluginshelp' },
        { reg: /^#?(xrk|向日葵)?主人(相关)?帮助$/, fnc: 'masterhelp' }
      ],
    });
  }

  updateCSS(htmlPath) {
    const dir = path.dirname(htmlPath);
    const templateCssPath = path.join(dir, 'style_template.css');
    const styleCssPath = path.join(dir, 'style.css');
    const cssContent = fs.readFileSync(templateCssPath, 'utf-8');
    const bgotherDir = path.join(dir, 'bgother');
    const imageFiles = fs.readdirSync(bgotherDir).filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f));
    if (imageFiles.length === 0) {
      logger.error('bgother 目录中没有找到图片文件');
      return;
    }
    const rel = path.relative(dir, path.join(bgotherDir, imageFiles[Math.floor(Math.random() * imageFiles.length)])).replace(/\\/g, '/');
    fs.writeFileSync(styleCssPath, cssContent.replace(/{{bgImagePath}}/g, rel), 'utf-8');
  }

  async _help(e, htmlName, imageName, needMaster = false) {
    if (needMaster && !e.isMaster) {
      await e.reply('只有主人才能命令我哦');
      return;
    }
    const htmlPath = path.join(helpDir, `${htmlName}.html`);
    this.updateCSS(htmlPath);
    const buf = await takeScreenshot(htmlPath, imageName, { fullPage: true, width: 1024, deviceScaleFactor: 2 });
    if (buf) await e.reply(segment.image(buf));
    else await e.reply('生成帮助截图失败，请稍后再试。');
  }

  async emojihelp(e) { await this._help(e, 'emoji-help', 'emoji_help'); }
  async feethelp(e) { await this._help(e, 'feet-help', 'feet_help'); }
  async newshelp(e) { await this._help(e, 'news-help', 'news_help', true); }
  async timehelp(e) { await this._help(e, 'time-help', 'time_help', true); }
  async aihelp(e) { await this._help(e, 'ai-help', 'ai_help'); }
  async pluginshelp(e) { await this._help(e, 'plugins-help', 'plugins_help'); }
  async masterhelp(e) { await this._help(e, 'master-help', 'master_help'); }
}
