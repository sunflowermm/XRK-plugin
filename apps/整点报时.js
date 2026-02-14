import plugin from '../../../lib/plugins/plugin.js';
import moment from 'moment';
import fs from 'fs';
import path from 'path';
import xrkconfig from '../components/xrkconfig.js';

const ROOT_PATH = process.cwd();
const PLUGIN_PATH = path.join(ROOT_PATH, 'plugins/XRK-plugin');
const TIME_CONFIG_PATH = path.join(PLUGIN_PATH, 'config/time_config.json');
const IMAGE_DIR_PATH = path.join(PLUGIN_PATH, 'resources/emoji/整点报时图库');

export class WhitelistManager extends plugin {
  constructor() {
    super({
      name: '整点报时与白名单管理',
      dsc: '管理整点报时白名单及定时报时功能',
      event: 'message',
      priority: 5,
      rule: [
        { reg: /^#整点报时添加白名单(\d+)?$/, fnc: 'addGroup' },
        { reg: /^#整点报时删除白名单(\d+)?$/, fnc: 'removeGroup' },
        { reg: /^#查看整点报时白名单$/, fnc: 'showGroups' }
      ]
    });
    this.task = { name: '整点报时任务', cron: '0 0 * * * *', fnc: () => this.hourlyNotification() };
    this.timeConfig = this.loadTimeConfig();
  }

  loadTimeConfig() {
    try {
      return JSON.parse(fs.readFileSync(TIME_CONFIG_PATH, 'utf8'));
    } catch {
      return { emojis: [], timeMessages: [] };
    }
  }

  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomEmoji() {
    return this.getRandomItem(this.timeConfig.emojis || []);
  }

  async getRandomFile(dirPath, fileTypes) {
    const files = await fs.promises.readdir(dirPath).catch(() => []);
    const validFiles = files.filter(file => new RegExp(`\\.(${fileTypes})$`, 'i').test(file));
    return validFiles.length ? path.join(dirPath, this.getRandomItem(validFiles)) : null;
  }

  async checkMasterPermission(e) {
    if (!e.isMaster) await e.reply('只有主人才能命令我哦 ' + this.getRandomEmoji());
    return e.isMaster;
  }

  extractGroupId(e) {
    return parseInt(e.msg.match(/(\d+)?$/)?.[1] || e.group_id, 10);
  }

  async addGroup(e) {
    if (!await this.checkMasterPermission(e)) return;
    const groupId = this.extractGroupId(e);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号 ' + this.getRandomEmoji());
    const list = [...xrkconfig.time_groupss];
    if (list.includes(groupId)) return e.reply(`群号 ${groupId} 已经在白名单中呢 ${this.getRandomEmoji()}`);
    list.push(groupId);
    xrkconfig.set('time_groupss', list);
    await e.reply(`已添加群号 ${groupId} 到整点报时白名单 ${this.getRandomEmoji()}`);
  }

  async removeGroup(e) {
    if (!await this.checkMasterPermission(e)) return;
    const groupId = this.extractGroupId(e);
    if (!groupId) return e.reply('请在群聊中使用此命令或指定群号 ' + this.getRandomEmoji());
    const list = [...xrkconfig.time_groupss];
    if (!list.includes(groupId)) return e.reply(`群号 ${groupId} 不在白名单中呢 ${this.getRandomEmoji()}`);
    xrkconfig.set('time_groupss', list.filter(g => g !== groupId));
    await e.reply(`已从整点报时白名单中删除群号 ${groupId} ${this.getRandomEmoji()}`);
  }

  async showGroups(e) {
    if (!await this.checkMasterPermission(e)) return;
    const groups = xrkconfig.time_groupss;
    await e.reply(groups.length ? `当前整点报时白名单中的群号有：${groups.join(', ')} ${this.getRandomEmoji()}` : `当前整点报时白名单为空呢~ ${this.getRandomEmoji()}`);
  }

  async notifyGroup(groupId, hours) {
    const message = this.getRandomItem(this.timeConfig.timeMessages || ['{hours}点']).replace('{hours}', hours).replace('{botName}', Bot.nickname);
    const messages = [`${message} ${this.getRandomEmoji()}`];
    const imgPath = await this.getRandomFile(IMAGE_DIR_PATH, 'jpg|jpeg|png|gif|bmp');
    const group = Bot.pickGroup(groupId);
    try { await group.sendMsg({ type: 'poke', id: Math.floor(Math.random() * 7) }); } catch {}
    await group.sendMsg(messages);
    if (imgPath) await group.sendMsg(segment.image(imgPath));
  }

  async hourlyNotification() {
    const groupList = xrkconfig.time_groupss;
    if (!groupList?.length) return;
    const currentHour = moment().hour();
    for (const groupId of groupList) {
      await this.notifyGroup(groupId, currentHour);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
