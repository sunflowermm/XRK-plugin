import plugin from '../../../lib/plugins/plugin.js';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import {
  readRDouyinCookie,
  fetchDouyinHotList,
  formatHotListText,
  pickDouyinFeedVideo,
  pickDouyinHotWordWithFeedVideo,
  downloadDouyinPlayToFile
} from '../lib/douyin-xrk.js';

const REG = '^#?(xrk|向日葵)?抖音';

export class XrkDouyin extends plugin {
  constructor() {
    super({
      name: '向日葵抖音',
      dsc: '抖音热榜/推荐（复用 R Cookie，不做链接解析）',
      event: 'message',
      priority: 50,
      rule: [
        { reg: `${REG}热榜(图)?$`, fnc: 'hotList' },
        { reg: `${REG}热搜$`, fnc: 'hotList' },
        { reg: `${REG}推荐$`, fnc: 'feedVideo' },
        { reg: `${REG}随机(视频)?$`, fnc: 'feedVideo' },
        { reg: `${REG}热词(视频)?$`, fnc: 'hotWordVideo' }
      ]
    });
  }

  needCookieReply() {
    if (readRDouyinCookie()) return false;
    return '未配置抖音 Cookie：请在 R 插件 plugins/rconsole-plugin/config/tools.yaml 填写 douyinCookie';
  }

  async replyFeedVideo(e, caption, playUrl) {
    await e.reply(caption);
    let local = '';
    try {
      local = await downloadDouyinPlayToFile(playUrl);
      await e.reply(segment.video(local));
    } finally {
      if (local) await FileUtils.unlink(local);
    }
  }

  async hotList(e) {
    const miss = this.needCookieReply();
    if (miss) {
      await e.reply(miss);
      return true;
    }
    try {
      const board = await fetchDouyinHotList(25);
      await e.reply(formatHotListText(board, 20));
    } catch (err) {
      Bot.makeLog('warn', `[XRK douyin] 热榜失败: ${err.message}`, 'XRK-plugin');
      await e.reply(`抖音热榜获取失败：${err.message}`);
    }
    return true;
  }

  async feedVideo(e) {
    const miss = this.needCookieReply();
    if (miss) {
      await e.reply(miss);
      return true;
    }
    try {
      const v = await pickDouyinFeedVideo();
      if (!v) {
        await e.reply('抖音推荐流暂无可用视频，请稍后再试');
        return true;
      }
      const head = `抖音推荐${v.author ? ` · ${v.author}` : ''}${v.desc ? `\n${v.desc.slice(0, 80)}` : ''}`;
      await this.replyFeedVideo(e, head, v.playUrl);
    } catch (err) {
      Bot.makeLog('warn', `[XRK douyin] 推荐失败: ${err.message}`, 'XRK-plugin');
      await e.reply(`抖音推荐获取失败：${err.message}`);
    }
    return true;
  }

  async hotWordVideo(e) {
    const miss = this.needCookieReply();
    if (miss) {
      await e.reply(miss);
      return true;
    }
    try {
      const { word, video } = await pickDouyinHotWordWithFeedVideo();
      if (!video) {
        await e.reply('暂无可用视频，请稍后再试');
        return true;
      }
      const tip = word
        ? `今日热词：${word.word}${word.hotText ? `（${word.hotText}）` : ''}\n附推荐流视频 ↓`
        : '抖音推荐视频';
      await this.replyFeedVideo(e, tip, video.playUrl);
    } catch (err) {
      Bot.makeLog('warn', `[XRK douyin] 热词视频失败: ${err.message}`, 'XRK-plugin');
      await e.reply(`获取失败：${err.message}`);
    }
    return true;
  }
}
