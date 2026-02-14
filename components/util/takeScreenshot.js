/**
 * 统一走底层 renderer 截图（Puppeteer/Playwright），URL 或本地 HTML 均可。
 * 每次调用传入各自 options，无全局默认配置。
 */
export async function takeScreenshot(target, name, options = {}) {
  try {
    const renderer = (await import('../../../../lib/renderer/loader.js')).default.getRenderer();
    if (!renderer?.screenshot) return null;
    const opts = { ...options };
    if (opts.type !== undefined && opts.imgType === undefined) {
      opts.imgType = opts.type;
      delete opts.type;
    }
    if (opts.clip && (opts.clip.w !== undefined || opts.clip.h !== undefined)) {
      opts.clip = { x: opts.clip.x, y: opts.clip.y, width: opts.clip.width ?? opts.clip.w, height: opts.clip.height ?? opts.clip.h };
    }
    const isUrl = /^https?:\/\//i.test(String(target));
    const result = await renderer.screenshot(name, isUrl ? { url: target, ...opts } : { tplFile: target, saveId: name, ...opts });
    return result ?? null;
  } catch (e) {
    logger.error(`[XRK takeScreenshot] ${e.message}`, e);
    return null;
  }
}
