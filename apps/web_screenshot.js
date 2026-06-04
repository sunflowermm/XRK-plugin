import plugin from '../../../lib/plugins/plugin.js';
import hub from '../lib/xrk-hub.js';
import { bindHub } from '../lib/xrk-runtime.js';
import { URL_RULE_PATTERN } from '../lib/url-detect.js';
import { WebScreenshotUrlService, renderUrlScreenshot } from '../lib/web-screenshot.js';

export class WebpageScreenshot extends plugin {
  constructor() {
    super({
      name: '网页截图',
      dsc: '自动识别消息中的链接并截图',
      event: 'message',
      priority: 999999,
      rule: [
        {
          reg: URL_RULE_PATTERN,
          fnc: 'autoScreenshot',
          log: false
        }
      ]
    });
    this.applyScreenshotConfig();
    bindHub(this, {
      events: ['config', 'screenshot'],
      apply: () => this.applyScreenshotConfig()
    });
  }

  applyScreenshotConfig() {
    const rt = hub.getScreenshotRuntime();
    this._runtime = rt;
    this._urlService = new WebScreenshotUrlService(rt.urlRules);
  }

  isScreenshotEnabled() {
    return this._runtime?.enabled ?? hub.getScreenshotRuntime().enabled;
  }

  async autoScreenshot(e) {
    if (!this.isScreenshotEnabled()) {
      logger.debug('[网页截图] 未开启（主配置 screen_shot_http 或 screenshot.yaml enabled）');
      return false;
    }

    try {
      const urls = this._urlService.extractUrls(e.msg);
      if (urls.length === 0) {
        logger.debug(`[网页截图] 未提取到有效 URL: ${String(e.msg || '').slice(0, 80)}`);
        return false;
      }

      const validUrls = await this._urlService.filterReachableUrls(urls);
      if (validUrls.length === 0) {
        logger.debug(`[网页截图] URL 预检均未通过: ${urls.join(', ')}`);
        return false;
      }

      const max = this._runtime.urlRules.urlProcessing?.maxUrlsPerMessage ?? 5;
      const screenshotSegments = [];
      for (const url of validUrls.slice(0, max)) {
        const buf = await renderUrlScreenshot(
          url,
          `screenshot_${Date.now()}`,
          this._runtime.screenshotConfig
        );
        if (buf) screenshotSegments.push(segment.image(buf));
      }

      if (screenshotSegments.length === 0) return true;

      try {
        if (screenshotSegments.length > 1) {
          const forwardMsg = await this.makeForwardMsg(e, screenshotSegments, '网页截图');
          if (forwardMsg) await e.reply(forwardMsg);
        } else {
          await e.reply(screenshotSegments[0]);
        }
      } catch {
        for (const seg of screenshotSegments) {
          try {
            await e.reply(seg);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      logger.debug(`[网页截图] 处理失败: ${error?.message || error}`);
    }

    return true;
  }

  async makeForwardMsg(e, messages, title = '网页截图') {
    const nickname = Bot.nickname;
    const user_id = Bot.uin;

    const forwardMessages = [
      {
        message: title,
        nickname,
        user_id,
        time: Math.floor(Date.now() / 1000)
      }
    ];

    messages.forEach((msg, idx) => {
      forwardMessages.push({
        message: msg,
        user_id,
        time: Math.floor(Date.now() / 1000) + idx + 1
      });
    });

    try {
      if (e.isGroup) return await e.group.makeForwardMsg(forwardMessages);
      return await e.friend.makeForwardMsg(forwardMessages);
    } catch {
      return null;
    }
  }
}
