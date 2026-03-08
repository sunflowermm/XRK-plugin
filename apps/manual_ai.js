import plugin from '../../../lib/plugins/plugin.js';
import xrkconfig from '../lib/xrkconfig.js';
import { readConfigSync } from '../lib/config-paths.js';

/** 词库数据：data/xrkconfig/ai.json */
const aiData = (() => {
  const raw = readConfigSync('ai', 'json');
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (!raw) logger.warn('[人工AI] 未找到 data/xrkconfig/ai.json，当前不使用词库回复');
  return {};
})();

export class ExamplePlugin extends plugin {
  constructor() {
    super({
      name: 'ai',
      dsc: '简单开发示例',
      event: 'message',
      priority: -10000,
      rule: [
        { reg: '.*', fnc: 'aiHandler', log: false },
        { reg: '^#开启向日葵ai$', fnc: 'activateAi' },
        { reg: '^#关闭向日葵ai$', fnc: 'deactivateAi' }
      ]
    });
  }

  async handleResponse(e) {
    const userMessage = e.msg;
    const responseKey = this.findMatch(userMessage, aiData);
    if (responseKey && aiData[responseKey]) {
      const responses = aiData[responseKey];
      const reply = responses[Math.floor(Math.random() * responses.length)];
      await e.reply(reply, true);
    }
  }

  findMatch(msg, json) {
    if (!msg) return null;
    return Object.keys(json).find(key => key === msg) || null;
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
    if (e.img) return false;
    await this.handleResponse(e);
    return false;
  }
}
