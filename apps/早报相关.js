/**
 * 早报设置与每日推送（白名单、推送时间、定时任务）
 */
import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';

/** 早报图片 API（03c3  zb 接口，直接返回 PNG） */
const MORNING_NEWS_IMAGE = 'https://api.03c3.cn/api/zb';

function morningNewsCron() {
  return `0 0 ${hub.news_pushtime} * * ?`;
}

async function pushMorningNews() {
  const groups = hub.news_groupss;
  if (!groups.length) return;
  const delay = hub.news_push_delay;
  for (const groupId of groups) {
    try {
      await Bot.pickGroup(groupId)?.sendMsg(['早安！这是今天的早报\n', segment.image(MORNING_NEWS_IMAGE)]);
      if (delay > 0) await new Promise(r => setTimeout(r, delay));
    } catch (err) {
      logger.error(`[早报] 群 ${groupId} 推送失败:`, err);
    }
  }
}

export class SettingsPlugin extends plugin {
  constructor() {
    super({
      name: '早报设置',
      dsc: '早报设置与自动推送功能',
      event: 'message',
      priority: 500,
      rule: [
        { reg: /^#?早报添加白名单(\d+)?$/, fnc: 'addWhitelist' },
        { reg: /^#?早报删除白名单(\d+)?$/, fnc: 'removeWhitelist' },
        { reg: /^#?查看早报白名单$/, fnc: 'showWhitelist' },
        { reg: /^#?(向日葵|xrk)?修改早报推送时间(\d+)$/, fnc: 'setPushTime' }
      ]
    });
    this.task = {
      name: '每日早报推送',
      cron: morningNewsCron(),
      fnc: pushMorningNews
    };
  }

  async setPushTime(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const match = e.msg.match(/^#?(?:向日葵|xrk)?修改早报推送时间(\d+)$/);
    const hour = match ? Number(match[1]) : NaN;
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return e.reply('请提供有效的时间（0-23）');
    hub.set('news_pushtime', hour);
    this.task.cron = morningNewsCron();
    await e.reply(`✅ 已将早报推送时间修改为 ${hour} 点（重启 Bot 后定时任务完全生效）`);
  }

  async addWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const match = e.msg.match(/^#?早报添加白名单(\d+)?$/);
    const groupId = Number(match?.[1] || e.group_id);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号');
    const list = [...hub.news_groupss];
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
    const list = hub.news_groupss.filter(id => id !== groupId);
    if (list.length === hub.news_groupss.length) return e.reply('该群不在白名单中');
    hub.set('news_groupss', list);
    await e.reply(`✅ 已将群 ${groupId} 从早报白名单中移除`);
  }

  async showWhitelist(e) {
    if (!e.isMaster) return e.reply('只有主人才能命令我哦');
    const list = hub.news_groupss;
    if (list.length) await e.reply(`当前早报白名单群号：\n${list.join('\n')}`);
    else await e.reply('白名单为空');
  }
}
