import common from '../../../lib/common/common.js'
import moment from 'moment'
import _ from 'lodash'
import xrkcfg from '../components/xrkconfig.js'

const groupLikeStatusMap = new Map();
let isLikeTaskRunning = false;

class ThumbUp {
  constructor(event) {
    this.event = event;
    this.bot = event.bot ?? Bot;

    if (!this.bot || typeof this.bot !== 'object') {
      throw new Error('Bot对象未初始化或无效');
    }
  }

  async thumbUp(userId, times = 1) {
    if (this.bot?.sendLike && this.event.adapter?.red) {
      return this.bot.sendLike(userId, Math.min(times, 20));
    }
    if (this.event?.adapter && ['shamrock', 'LagrangeCore'].includes(this.event.adapter)) {
      return await this.sendLikeByLagrange(userId, times);
    }
    return await this.sendLikeByIcqq(userId, times);
  }

  async sendLikeByLagrange(userId, times) {
    try {
      let adapterType = this.event.adapter;
      if (adapterType === 'LagrangeCore') {
        let tasks = Array.from({ length: times }, () =>
          this.bot.sendApi('send_like', { user_id: userId, times: 1 })
        );
        await Promise.all(tasks);
      } else {
        await this.bot.sendApi('send_like', { user_id: userId, times });
      }
      return { code: 0, msg: '点赞成功' };
    } catch (err) {
      logger.error(`点赞出错: ${err}`);
      return { code: 1, msg: '点赞失败' };
    }
  }

  async sendLikeByIcqq(userId, times) {
    let core = this.bot.icqq?.core ?? this.bot.core;
    if (!core) {
      try {
        core = (await import('icqq')).core;
      } catch (error) {
        return await this.sendLikeByHocbot(userId, times);
      }
    }

    if (times > 20) times = 20;

    try {
      let reqFavorite = core.jce.encodeStruct([
        core.jce.encodeNested([
          this.bot.uin,
          1,
          this.bot.sig.seq + 1,
          1,
          0,
          this.bot.fl.get(userId) ? Buffer.from("0C180001060131160131", "hex") : Buffer.from("0C180001060131160135", "hex")
        ]),
        userId,
        0,
        this.bot.fl.get(userId) ? 1 : 5,
        times
      ]);

      let body = core.jce.encodeWrapper({ reqFavorite }, 'VisitorSvc', 'ReqFavorite', this.bot.sig.seq + 1);
      let payload = await this.bot.sendUni('VisitorSvc.ReqFavorite', body);
      let result = core.jce.decodeWrapper(payload)[0];
      return { code: result[3], msg: result[4] };
    } catch (err) {
      logger.error(`ICQQ点赞失败: ${err}`);
      return { code: 1, msg: '点赞失败' };
    }
  }

  async sendLikeByHocbot(userId, times) {
    let thumbUpFunction = this.bot.pickFriend(userId)?.thumbUp;
    if (!thumbUpFunction) throw new Error('当前适配器不支持点赞');
    try {
      let res = await thumbUpFunction(times);
      return { code: res.retcode || res.code, msg: res.message || res.msg };
    } catch (err) {
      logger.error(`好友点赞失败: ${err}`);
      return { code: 1, msg: '点赞失败' };
    }
  }
}

function getRandomCron() {
  const hour = _.random(2, 4);
  const minute = _.random(0, 59);
  return `0 ${minute} ${hour} * * ?`;
}

export class GroupLike extends plugin {
  constructor() {
    super({
      name: '群点赞',
      dsc: '群自动点赞',
      event: 'message',
      priority: 100,
      rule: [
        {
          reg: '^#群点赞增加白名单$',
          fnc: 'addWhiteList',
        },
        {
          reg: '^#群点赞删除白名单$',
          fnc: 'removeWhiteList',
        },
        {
          reg: '^#今日群点赞状态$',
          fnc: 'checkLikeStatus',
        },
        {
          reg: '^#开启群点赞$',
          fnc: 'startGroupLike',
        },
      ]
    });
    this.task = {
      cron: getRandomCron(),
      name: '群点赞任务',
      fnc: () => this.groupLikeTask()
    };
  }

  updateLikeStatus(groupId, status, message = '') {
    groupLikeStatusMap.set(groupId, {
      status: status,
      timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
      message: message,
    });
  }

  async addWhiteList(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能操作白名单哦~');
      return true;
    }

    const groupId = e.group_id;
    const list = [...xrkcfg.thumwhiteList];

    if (list.includes(groupId)) {
      await this.reply('该群已在白名单中~');
      return true;
    }

    list.push(groupId);
    try {
      xrkcfg.set('thumwhiteList', list);
      await this.reply('白名单添加成功~');
    } catch (err) {
      logger.error(`保存群点赞白名单失败: ${err}`);
      await this.reply('白名单添加失败...');
    }
    return true;
  }

  async removeWhiteList(e) {
    if (!e.isMaster) {
      await this.reply('只有主人才能操作白名单哦~');
      return true;
    }

    const groupId = e.group_id;
    const list = [...xrkcfg.thumwhiteList];

    if (list.length === 0) {
      await this.reply('白名单为空');
      return true;
    }

    const index = list.indexOf(groupId);
    if (index === -1) {
      await this.reply('该群不在白名单中');
      return true;
    }

    list.splice(index, 1);
    try {
      xrkcfg.set('thumwhiteList', list);
      await this.reply('白名单删除成功~');
    } catch (err) {
      logger.error(`保存群点赞白名单失败: ${err}`);
      await this.reply('白名单删除失败...');
    }
    return true;
  }

  async checkLikeStatus(e) {
    const groupId = e.group_id;
    const status = groupLikeStatusMap.get(groupId);

    if (!status) {
      await this.reply('今日尚未执行群点赞任务');
      return true;
    }

    await this.reply(`群点赞状态：${status.status}\n时间：${status.timestamp}\n${status.message ? '消息：' + status.message : ''}`);
    return true;
  }

  async sendLike(bot, userId) {
    try {
      const thumbUpInstance = new ThumbUp({ bot });
      const result = await thumbUpInstance.thumbUp(userId, 10);

      if (result.code !== 0) {
        logger.error(`点赞失败 ${userId}: ${result.msg}`);
        return false;
      }

      await common.sleep(_.random(10000, 20000));
      return true;
    } catch (err) {
      logger.error(`点赞出错 ${userId}: ${err}`);
      return false;
    }
  }

  async likeGroupMembers(bot, groupId) {
    const group = bot.pickGroup(groupId);
    if (!group) {
      throw new Error('无法获取群信息');
    }

    const members = await group.getMemberMap();
    const memberIds = Array.from(members.keys());
    const batches = _.chunk(memberIds, 10);

    for (const batch of batches) {
      for (const userId of batch) {
        await this.sendLike(bot, userId);
      }
      if (batches.indexOf(batch) !== batches.length - 1) {
        const delay = _.random(300000, 600000);
        await common.sleep(delay);
      }
    }
  }

  async startGroupLike(e) {
    if (isLikeTaskRunning) {
      await this.reply('当前点赞任务正在进行中，请稍后再试');
      return true;
    }

    const groupId = e.group_id;
    const whiteList = xrkcfg.thumwhiteList;

    if (whiteList.length > 0 && !whiteList.includes(groupId)) {
      await this.reply('该群不在白名单中，无法执行点赞任务');
      return true;
    }

    isLikeTaskRunning = true;
    await this.reply('开始执行群点赞任务...');
    this.updateLikeStatus(groupId, 'pending', '手动触发任务');

    try {
      const bot = e.bot || Bot;
      await this.likeGroupMembers(bot, groupId);

      this.updateLikeStatus(groupId, 'completed', '手动任务执行完成');
      await this.reply('群点赞任务执行完成');
    } catch (err) {
      logger.error(`群 ${groupId} 点赞失败: ${err}`);
      this.updateLikeStatus(groupId, 'failed', err.message);
      await this.reply('群点赞任务执行失败，请查看日志');
    }

    isLikeTaskRunning = false;
    return true;
  }

  async groupLikeTask() {
    if (isLikeTaskRunning) {
      logger.info('当前点赞任务正在进行中，跳过执行');
      return;
    }

    logger.info('开始执行群点赞任务...');
    isLikeTaskRunning = true;

    const bots = Array.from(Bot).filter(([_, bot]) => bot && !/^[a-zA-Z]+$/.test(bot.uin));

    try {
      for (let [_, bot] of bots) {
        const whiteList = xrkcfg.thumwhiteList;
        const groups = whiteList.length > 0 ? whiteList : Array.from(bot.gl.keys());

        for (let groupId of groups) {
          this.updateLikeStatus(groupId, 'pending', '自动任务执行中');

          try {
            logger.info(`开始为群 ${groupId} 点赞`);
            await this.likeGroupMembers(bot, groupId);

            this.updateLikeStatus(groupId, 'completed', '自动任务执行完成');
            logger.info(`群 ${groupId} 点赞完成`);
          } catch (err) {
            logger.error(`群 ${groupId} 点赞失败: ${err}`);
            this.updateLikeStatus(groupId, 'failed', err.message);
            continue;
          }
        }
      }
    } finally {
      isLikeTaskRunning = false;
      logger.info('群点赞任务执行完成');
    }
  }
}