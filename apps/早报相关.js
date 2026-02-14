import plugin from '../../../lib/plugins/plugin.js';
import _ from 'lodash';
import xrkconfig from '../components/xrkconfig.js';

export class SettingsPlugin extends plugin {
  constructor() {
    super({
      name: '早报设置',
      dsc: '早报设置与自动推送功能',
      event: 'message',
      priority: _.get(xrkconfig.config, 'priority.news', 500),
      rule: [
        { reg: '^#*早报添加白名单(\\d+)?$', fnc: 'addWhitelist' },
        { reg: '^#*早报删除白名单(\\d+)?$', fnc: 'removeWhitelist' },
        { reg: '^#*查看早报白名单$', fnc: 'showWhitelist' },
        { reg: '^#*修改早报推送时间(\\d+)$', fnc: 'setPushTime' }
      ]
    });
    this.task = {
      name: '每日早报推送',
      cron: `0 0 ${xrkconfig.news_pushtime || 8} * * ?`,
      fnc: () => this.scheduledPush()
    };
  }

  async scheduledPush() {
    const API_URL = 'https://api.03c3.cn/api/zb';
    const DELAY = _.get(xrkconfig.config, 'news.delay', 1000);
    try {
      const message = ['早安！这是今天的早报\n', segment.image(API_URL)];
      for (const groupId of xrkconfig.news_groupss) {
        const group = Bot.pickGroup(groupId);
        if (group) await group.sendMsg(message) && await this.sleep(DELAY);
        else logger.error(`群组 ${groupId} 不存在`);
      }
    } catch (error) {
      logger.error('获取早报图片失败:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setPushTime(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const newTime = parseInt(e.msg.match(/修改早报推送时间(\d+)/)?.[1]);
    if (isNaN(newTime) || newTime < 0 || newTime > 23) return e.reply('请提供有效的时间（0-23）');
    xrkconfig.config.news_pushtime = newTime;
    xrkconfig.save();
    await e.reply(`已将早报推送时间修改为${newTime}点`);
  }

  async addWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const groupId = parseInt(e.msg.match(/早报添加白名单(\d+)?/)?.[1] || e.group_id);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号');
    const list = [...xrkconfig.news_groupss];
    if (list.includes(groupId)) return e.reply('该群已在白名单中');
    list.push(groupId);
    xrkconfig.set('news_groupss', list);
    await e.reply(`已将群${groupId}添加到早报白名单`);
  }

  async removeWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const groupId = parseInt(e.msg.match(/早报删除白名单(\d+)?/)?.[1] || e.group_id);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号');
    const list = [...xrkconfig.news_groupss];
    if (!list.includes(groupId)) return e.reply('该群不在白名单中');
    xrkconfig.set('news_groupss', list.filter(id => id !== groupId));
    await e.reply(`已将群${groupId}从早报白名单中移除`);
  }

  async showWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const list = xrkconfig.news_groupss;
    list.length ? e.reply(`当前早报白名单群号：\n${list.join('\n')}`) : e.reply('白名单为空');
  }
}
