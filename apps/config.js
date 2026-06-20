import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import BotUtil from '../../../lib/util.js';
import cfg from '../../../lib/config/config.js';

async function denyUnlessMaster(e) {
  if (e.isMaster) return true;
  await e.reply('❌ 您没有权限执行此操作');
  return false;
}

async function setIntegerConfig(e, pattern, key, label) {
  if (!await denyUnlessMaster(e)) return;
  const n = parseInt(e.msg.replace(pattern, '').trim(), 10);
  if (Number.isNaN(n) || n % 1 !== 0) return e.reply('❌ 请输入有效的整数数值');
  hub.set(key, n);
  return e.reply(`✅ ${label}已修改为: ${n}`);
}

async function toggleConfig(e, key, label, getCurrent) {
  if (!await denyUnlessMaster(e)) return;
  const on = e.msg.includes('开启');
  if (getCurrent() === on) return e.reply(`${label}已${on ? '开启' : '关闭'}, 无需重复操作`);
  hub.set(key, on);
  return e.reply(`✅ ${label}已${on ? '开启' : '关闭'}`);
}

function formatGroupWhitelist(groups, emptyHint) {
  if (!groups?.length) return `└─ ${emptyHint}`;
  return groups.map(g => `└─ ${g}`).join('\n');
}

export class XrkSettings extends plugin {
  constructor() {
    super({
      name: '向日葵设置',
      dsc: '查看向日葵插件设置',
      event: 'message',
      priority: 100,
      rule: [
        { reg: '^#?(向日葵|xrk)设置$', fnc: 'showSettings' },
        { reg: '^#?(向日葵|xrk)修改帮助优先级(.*)$', fnc: 'setHelpPriority' },
        { reg: '^#?(向日葵|xrk)修改戳一戳优先级(.*)$', fnc: 'setChuoPriority' },
        { reg: '^#?(向日葵|xrk)修改戳一戳主人优先级(.*)$', fnc: 'setChuoMasterPriority' },
        { reg: '^#?(向日葵|xrk)(开启|关闭)戳一戳主人(.*)$', fnc: 'toggleChuoMaster' },
        { reg: '^#?(向日葵|xrk)修改渲染精度(.*)$', fnc: 'setRenderQuality' },
        { reg: '^#?(向日葵|xrk)(开启|关闭)网页截图$', fnc: 'toggleScreenshot' },
        { reg: '^#?(向日葵|xrk)(开启|关闭)资源$', fnc: 'toggleSharing' }
      ]
    });
  }

  generateSettingsMessages() {
    const c = hub.config;
    const messages = [];
    messages.push('=== 向日葵插件设置 ===');
    messages.push('【戳一戳设置】');
    messages.push([
      `❯ 戳一戳主人: ${c.chuomaster ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#向日葵开启/关闭戳一戳主人】\n来更改设置`,
      `❯ 戳一戳优先级: ${c.poke_priority}\n└─ 发送\n【#向日葵修改戳一戳优先级xxx】\n来更改(支持正负整数)`,
      `❯ 戳一戳主人优先级: ${c.corepoke_priority}\n└─ 发送\n【#向日葵修改戳一戳主人优先级xxx】\n来更改(支持正负整数)`
    ].join('\n'));

    messages.push('【基础设置】');
    messages.push([
      `❯ 词库 AI: ${c.peopleai ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#开启/关闭向日葵ai】\n来更改设置`,
      `❯ 帮助优先级: ${c.help_priority}\n└─ 发送\n【#向日葵修改帮助优先级xxx】\n来更改(支持正负整数)`,
      `❯ 渲染精度: ${c.screen_shot_quality}\n└─ 发送\n【#向日葵修改渲染精度x.xx】\n来更改(1-3之间，支持两位小数)`,
      `❯ 网页截图: ${c.screen_shot_http ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#向日葵开启/关闭网页截图】\n来更改设置`,
      `❯ 资源分享: ${c.sharing ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#向日葵开启/关闭资源】\n来更改设置`
    ].join('\n'));

    messages.push('【推送设置】');
    messages.push([
      `❯ 整点报时推送群:\n${formatGroupWhitelist(c.time_groupss, '暂无白名单群')}\n发送\n【整点报时添加/删除白名单】\n来更改设置`,
      `❯ 早报推送群:\n${formatGroupWhitelist(c.news_groupss, '暂无白名单群')}\n发送\n【#早报添加白名单】或【#早报删除白名单】\n来更改设置`,
      `❯ 早报推送时间: ${c.news_pushtime}点\n└─ 发送\n【#修改早报推送时间8】\n来更改(0-23)`,
      `❯ 手动获取早报: 发送\n【#早报】或【#今日早报】`
    ].join('\n'));

    messages.push('【权限设置】');
    messages.push(this.generateMasterInfo());
    messages.push(`❯ 核心主人: ${c.coremaster}\n└─ 使用stdin身份发送\n【#核心主人(主人qq)】来更改`);
    messages.push('【其他设置】');
    messages.push(`❯ 全局表情目录: ${c.emoji_filename}\n└─ 发送\n【偷图设置目录】来更改`);
    return messages;
  }

  generateMasterInfo() {
    const core = hub.config.coremaster;
    const others = (cfg.masterQQ || []).map(String).filter(q => q && q !== String(core));
    let masterMsg = '❯ 向日葵主人设置:';
    if (core && Number(core) > 0) masterMsg += `\n核心主人：\n└─ ${core}`;
    if (others.length) masterMsg += `\n其他主人：\n${others.map(m => `└─ ${m}`).join('\n')}`;
    if (!(core && Number(core) > 0) && !others.length) masterMsg += '\n└─ 暂无主人设置';
    masterMsg += '\n发送\n【#主人添加(Botqq:主人qq)】\n或\n【#主人添加(主人qq)】来更改';
    return masterMsg;
  }

  async showSettings(e) {
    if (!await denyUnlessMaster(e)) return;
    await BotUtil.makeChatRecord(e, this.generateSettingsMessages(), '向日葵设置', ['笨比笨比一个一个字看准了！']);
  }

  setHelpPriority(e) {
    return setIntegerConfig(e, /^#?(向日葵|xrk)修改帮助优先级/, 'help_priority', '帮助优先级');
  }

  setChuoPriority(e) {
    return setIntegerConfig(e, /^#?(向日葵|xrk)修改戳一戳优先级/, 'poke_priority', '戳一戳优先级');
  }

  setChuoMasterPriority(e) {
    return setIntegerConfig(e, /^#?(向日葵|xrk)修改戳一戳主人优先级/, 'corepoke_priority', '戳一戳主人优先级');
  }

  toggleChuoMaster(e) {
    return toggleConfig(e, 'chuomaster', '戳一戳主人', () => hub.config.chuomaster);
  }

  async setRenderQuality(e) {
    if (!await denyUnlessMaster(e)) return;
    const quality = parseFloat(e.msg.replace(/^#?(向日葵|xrk)修改渲染精度/, '').trim());
    if (Number.isNaN(quality) || quality < 1 || quality > 3 || !/^\d+(\.\d{0,2})?$/.test(String(quality))) {
      return e.reply('❌ 请输入1-3之间的数值，最多支持两位小数');
    }
    hub.set('screen_shot_quality', quality);
    return e.reply(`✅ 渲染精度已修改为: ${quality}`);
  }

  toggleScreenshot(e) {
    return toggleConfig(e, 'screen_shot_http', '网页截图', () => hub.config.screen_shot_http);
  }

  toggleSharing(e) {
    return toggleConfig(e, 'sharing', '资源分享', () => hub.config.sharing);
  }
}
