import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import { captureHelpScreenshot, filterHelpList } from '../lib/help-render.js';

export class showmainHelp extends plugin {
  constructor() {
    super({
      name: '向日葵帮助插件',
      dsc: 'xrk帮助',
      event: 'message',
      priority: hub.config.help_priority,
      rule: [{ reg: '^#?(xrk|向日葵)?(插件)?(帮助|help|Help|菜单|功能)', fnc: 'generateHelpScreenshot' }],
    });
    hub.registerRuntime({
      id: 'xrk-help-priority',
      events: ['config'],
      apply: () => { this.priority = hub.config.help_priority; }
    });
  }

  async generateHelpScreenshot(e) {
    try {
      const buf = await captureHelpScreenshot({
        slug: 'help',
        helpCfg: hub.helpCfg,
        helpList: filterHelpList(),
        title: hub.helpCfg.title,
        subTitle: hub.helpCfg.subTitle,
        imageName: 'help_screenshot'
      });
      if (buf) await e.reply([segment.image(buf)]);
      else await e.reply('生成帮助截图失败，请稍后重试。');
    } catch (err) {
      logger.error('生成帮助截图失败:', err);
      await e.reply('生成帮助截图失败，请稍后重试。');
    }
  }
}
