import plugin from '../../../lib/plugins/plugin.js';
import xrkconfig from '../components/xrkconfig.js';
import BotUtil from '../../../lib/util.js';

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
        { reg: '^#?(开启|关闭)(向日葵|xrk)?签名监测$', fnc: 'toggleSignChecker' },
        { reg: '^#?(向日葵|xrk)(开启|关闭)网页截图$', fnc: 'toggleScreenshot' },
        { reg: '^#?(向日葵|xrk)(开启|关闭)资源$', fnc: 'toggleSharing' }
      ]
    });
  }

  async save() {
    try {
      xrkconfig.save();
      return true;
    } catch (error) {
      console.error(`保存配置时出错: ${error.message}`);
      return false;
    }
  }

  generateSettingsMessages(e) {
    const c = xrkconfig.config;
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
      `❯ 向日葵人工AI状态: ${c.peopleai ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【开启/关闭向日葵ai】\n来更改设置`,
      `❯ 帮助优先级: ${c.help_priority}\n└─ 发送\n【#向日葵修改帮助优先级xxx】\n来更改(支持正负整数)`,
      `❯ 渲染精度: ${c.screen_shot_quality}\n└─ 发送\n【#向日葵修改渲染精度x.xx】\n来更改(1-3之间，支持两位小数)`,
      `❯ 签名监测: ${c.signchecker ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【开启/关闭向日葵签名监测】\n来更改设置`,
      `❯ 网页截图: ${c.screen_shot_http ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#向日葵开启/关闭网页截图】\n来更改设置`,
      `❯ 资源分享: ${c.sharing ? '✅已开启' : '❌已关闭'}\n└─ 发送\n【#向日葵开启/关闭资源】\n来更改设置`
    ].join('\n'));

    messages.push('【推送设置】');
    messages.push([
      `❯ 整点报时推送群:\n${(c.time_groupss?.length > 0 ? c.time_groupss.map(g => `└─ ${g}`).join('\n') : '└─ 暂无白名单群')}\n发送\n【整点报时添加/删除白名单】\n来更改设置`,
      `❯ 早报推送群:\n${(c.news_groupss?.length > 0 ? c.news_groupss.map(g => `└─ ${g}`).join('\n') : '└─ 暂无白名单群')}\n发送\n【早报添加/删除白名单】\n来更改设置`,
      `❯ 早报推送时间: ${c.news_pushtime}点\n└─ 发送\n【#修改早报推送时间xxx】\n来更改设置`
    ].join('\n'));

    messages.push('【权限设置】');
    messages.push(this.generateMasterInfo());
    messages.push(`❯ 核心主人: ${c.coremaster}\n└─ 使用stdin身份发送\n【#核心主人(主人qq)】来更改`);
    messages.push('【其他设置】');
    messages.push(`❯ 全局表情目录: ${c.emoji_filename}\n└─ 发送\n【偷图设置目录】来更改`);
    return messages;
  }

  generateMasterInfo() {
    const c = xrkconfig.config;
    let masterMsg = '❯ 向日葵主人设置:';
    if (c.master && Object.keys(c.master).length > 0) {
      let hasMasters = false;
      for (const [botId, masters] of Object.entries(c.master)) {
        if (masters?.length > 0 && botId !== 'stdin') {
          hasMasters = true;
          masterMsg += `\n${botId}的主人：\n${masters.map(m => `└─ ${m}`).join('\n')}`;
        }
      }
      if (!hasMasters) masterMsg += '\n└─ 暂无主人设置';
    } else {
      masterMsg += '\n└─ 暂无主人设置';
    }
    masterMsg += '\n发送\n【#主人添加(Botqq:主人qq)】\n或\n【#主人添加(主人qq)】来更改';
    return masterMsg;
  }

  async showSettings(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const messages = this.generateSettingsMessages(e);
    await BotUtil.makeChatRecord(e, messages, '向日葵设置', ['笨比笨比一个一个字看准了！']);
  }

  async setHelpPriority(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const priority = parseInt(e.msg.replace(/^#?(向日葵|xrk)修改帮助优先级/, '').trim());
    if (isNaN(priority) || priority % 1 !== 0) return await e.reply('❌ 请输入有效的整数数值');
    xrkconfig.set('help_priority', priority);
    await e.reply(`✅ 帮助优先级已修改为: ${priority}`);
  }

  async setChuoPriority(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const priority = parseInt(e.msg.replace(/^#?(向日葵|xrk)修改戳一戳优先级/, '').trim());
    if (isNaN(priority) || priority % 1 !== 0) return await e.reply('❌ 请输入有效的整数数值');
    xrkconfig.set('poke_priority', priority);
    await e.reply(`✅ 戳一戳优先级已修改为: ${priority}`);
  }

  async setChuoMasterPriority(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const priority = parseInt(e.msg.replace(/^#?(向日葵|xrk)修改戳一戳主人优先级/, '').trim());
    if (isNaN(priority) || priority % 1 !== 0) return await e.reply('❌ 请输入有效的整数数值');
    xrkconfig.set('corepoke_priority', priority);
    await e.reply(`✅ 戳一戳主人优先级已修改为: ${priority}`);
  }

  async toggleChuoMaster(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const isEnable = e.msg.includes('开启');
    if (xrkconfig.chuomaster === isEnable) return await e.reply(`戳一戳主人已${isEnable ? '开启' : '关闭'}, 无需重复操作`);
    xrkconfig.set('chuomaster', isEnable);
    await e.reply(`✅ 戳一戳主人已${isEnable ? '开启' : '关闭'}`);
  }

  async setRenderQuality(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const quality = parseFloat(e.msg.replace(/^#?(向日葵|xrk)修改渲染精度/, '').trim());
    if (isNaN(quality) || quality < 1 || quality > 3 || !/^\d+(\.\d{0,2})?$/.test(quality.toString())) {
      return await e.reply('❌ 请输入1-3之间的数值，最多支持两位小数');
    }
    xrkconfig.set('screen_shot_quality', quality);
    await e.reply(`✅ 渲染精度已修改为: ${quality}`);
  }

  async toggleSignChecker(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const isEnable = e.msg.includes('开启');
    xrkconfig.set('signchecker', isEnable);
    await e.reply(`✅ 签名监测已${isEnable ? '开启' : '关闭'}`);
  }

  async toggleScreenshot(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const isEnable = e.msg.includes('开启');
    if (xrkconfig.screen_shot_http === isEnable) return await e.reply(`网页截图已${isEnable ? '开启' : '关闭'}, 无需重复操作`);
    xrkconfig.set('screen_shot_http', isEnable);
    await e.reply(`✅ 网页截图已${isEnable ? '开启' : '关闭'}`);
  }

  async toggleSharing(e) {
    if (!e.isMaster) return await e.reply('❌ 您没有权限执行此操作');
    const isEnable = e.msg.includes('开启');
    if (xrkconfig.sharing === isEnable) return await e.reply(`资源分享已${isEnable ? '开启' : '关闭'}, 无需重复操作`);
    xrkconfig.set('sharing', isEnable);
    await e.reply(`✅ 资源分享已${isEnable ? '开启' : '关闭'}`);
  }

}
