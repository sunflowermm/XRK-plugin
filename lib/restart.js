import { Restart } from '../../other/restart.js';

/** 重启 Bot（不发送主人私聊通知） */
export async function restart(e) {
  await e.reply('🔄 正在重启机器人，请稍候...');
  logger.mark('正在执行重启，请稍等...');
  setTimeout(() => new Restart(e).restart(), 2000);
  return true;
}
