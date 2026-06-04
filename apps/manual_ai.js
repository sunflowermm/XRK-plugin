import plugin from '../../../lib/plugins/plugin.js';
import xrkconfig from '../lib/xrkconfig.js';
import { loadAiDict, findMatchInDict, normalizeMessage } from '../lib/ai-dict.js';

function hasImages(e) {
  if (!e.img) return false;
  return Array.isArray(e.img) ? e.img.length > 0 : true;
}

export class ExamplePlugin extends plugin {
  constructor() {
    super({
      name: 'ai',
      dsc: '向日葵词库人工AI',
      event: 'message',
      priority: -10000,
      rule: [
        { reg: '.*', fnc: 'aiHandler', log: false },
        { reg: '^#开启向日葵ai$', fnc: 'activateAi' },
        { reg: '^#关闭向日葵ai$', fnc: 'deactivateAi' }
      ]
    });
  }

  /** 群聊 onlyReplyAt 时仍允许词库命中（在 loader.accept 之后生效） */
  async accept(e) {
    if (!xrkconfig.peopleai || hasImages(e)) return false;
    const key = findMatchInDict(e.msg, loadAiDict());
    if (!key) return false;
    e._xrkPeopleAiBypass = true;
    e._xrkPeopleAiKey = key;
    return true;
  }

  async activateAi(e) {
    if (!e.isMaster) return;
    xrkconfig.set('peopleai', true);
    await e.reply('向日葵词库AI已开启');
  }

  async deactivateAi(e) {
    if (!e.isMaster) return;
    xrkconfig.set('peopleai', false);
    await e.reply('向日葵词库AI已关闭');
  }

  async aiHandler(e) {
    if (!xrkconfig.peopleai) return false;
    if (hasImages(e)) return false;

    const dict = loadAiDict();
    const key = e._xrkPeopleAiKey || findMatchInDict(e.msg, dict);
    if (!key || !dict[key]?.length) return false;

    const reply = dict[key][Math.floor(Math.random() * dict[key].length)];
    await e.reply(reply, true);
    return true;
  }
}
