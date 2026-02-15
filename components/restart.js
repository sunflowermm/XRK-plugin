import { Restart } from '../../other/restart.js';

/**
 * 重启 Bot（不依赖主人 QQ，不发送私聊通知）
 * @param {Object} e - 消息事件对象
 * @param {Array} [_installedPlugins] - 已安装的插件列表（保留参数兼容，不再发主人通知）
 */
export async function restart(e, _installedPlugins = []) {
  await e.reply('🔄 正在重启机器人，请稍候...');
  logger.mark('正在执行重启，请稍等...');
  setTimeout(() => new Restart(e).restart(), 2000);
  return true;
}