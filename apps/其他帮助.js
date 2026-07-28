import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import { captureHelpScreenshot } from '../lib/help-render.js';
import { SUB_HELP_PAGES } from '../lib/sub-help-pages.js';

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
        { reg: /^#?(xrk|向日葵)?插件(相关)?帮助$/, fnc: 'pluginshelp' },
        { reg: /^#?(xrk|向日葵)?主人(相关)?帮助$/, fnc: 'masterhelp' }
      ],
    });
  }

  async _help(e, pageKey, imageName, needMaster = false) {
    if (needMaster && !e.isMaster) {
      await e.reply('只有主人才能命令我哦');
      return;
    }
    const page = SUB_HELP_PAGES[pageKey];
    if (!page) return;

    const buf = await captureHelpScreenshot({
      slug: `sub-${pageKey}`,
      helpCfg: hub.helpCfg,
      helpList: page.groups,
      title: page.title,
      subTitle: page.subTitle ?? '',
      imageName
    });
    if (buf) await e.reply(segment.image(buf));
    else await e.reply('生成帮助截图失败，请稍后再试。');
  }

  async emojihelp(e) { await this._help(e, 'emoji', 'emoji_help'); }
  async feethelp(e) { await this._help(e, 'feet', 'feet_help'); }
  async newshelp(e) { await this._help(e, 'news', 'news_help', true); }
  async timehelp(e) { await this._help(e, 'time', 'time_help', true); }
  async pluginshelp(e) { await this._help(e, 'plugins', 'plugins_help'); }
  async masterhelp(e) { await this._help(e, 'master', 'master_help'); }
}
