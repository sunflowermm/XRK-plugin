/**
 * 早报：手动查询、白名单、定时推送
 */
import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import {
  buildMorningNewsReply,
  morningNewsCronExpr,
  pushMorningNewsToGroups
} from '../lib/morning-news.js';

async function pushMorningNews() {
  await pushMorningNewsToGroups(hub.config.news_groupss, hub.config.news_push_delay);
}

export class SettingsPlugin extends plugin {
  constructor() {
    super({
      name: '早报设置',
      dsc: '早报查询与自动推送',
      event: 'message',
      priority: 500,
      rule: [
        { reg: /^#?(?:今日)?早报$/, fnc: 'sendMorningNews' },
        { reg: /^#?早报添加白名单(\d+)?$/, fnc: 'addWhitelist' },
        { reg: /^#?早报删除白名单(\d+)?$/, fnc: 'removeWhitelist' },
        { reg: /^#?查看早报白名单$/, fnc: 'showWhitelist' },
        { reg: /^#?(向日葵|xrk)?修改早报推送时间(\d+)$/, fnc: 'setPushTime' }
      ]
    });
    this.task = {
      name: '每日早报推送',
      cron: morningNewsCronExpr(hub.config.news_pushtime),
      fnc: pushMorningNews
    };
    hub.registerRuntime({
      id: 'xrk-morning-news-cron',
      events: ['config'],
      apply: () => { this.task.cron = morningNewsCronExpr(hub.config.news_pushtime); }
    });
  }

  async sendMorningNews(e) {
    try {
      await e.reply(await buildMorningNewsReply());
    } catch (err) {
      logger.error('[早报] 手动获取失败:', err);
      await e.reply('早报获取失败，请稍后再试');
    }
    return true;
  }

  async setPushTime(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const match = e.msg.match(/^#?(?:向日葵|xrk)?修改早报推送时间(\d+)$/);
    const hour = match ? Number(match[1]) : NaN;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return e.reply('请提供有效的时间（0-23）');
    hub.set('news_pushtime', hour);
    this.task.cron = morningNewsCronExpr(hour);
    await e.reply(`✅ 已将早报推送时间修改为 ${hour} 点（重启 Bot 后定时任务完全生效）`);
  }

  async addWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const match = e.msg.match(/^#?早报添加白名单(\d+)?$/);
    const groupId = Number(match?.[1] || e.group_id);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号');
    const list = [...hub.config.news_groupss];
    if (list.includes(groupId)) return e.reply('该群已在白名单中');
    list.push(groupId);
    hub.set('news_groupss', list);
    await e.reply(`✅ 已将群 ${groupId} 添加到早报白名单`);
  }

  async removeWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const match = e.msg.match(/^#?早报删除白名单(\d+)?$/);
    const groupId = Number(match?.[1] || e.group_id);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号');
    const list = hub.config.news_groupss.filter(id => id !== groupId);
    if (list.length === hub.config.news_groupss.length) return e.reply('该群不在白名单中');
    hub.set('news_groupss', list);
    await e.reply(`✅ 已将群 ${groupId} 从早报白名单中移除`);
  }

  async showWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const list = hub.config.news_groupss;
    if (list.length) await e.reply(`当前早报白名单群号：\n${list.join('\n')}`);
    else await e.reply('白名单为空');
  }
}
