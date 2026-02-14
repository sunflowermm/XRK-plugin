import path from "node:path"

/**
 * 使用项目渲染器截图（global.RendererLoader → getRenderer().screenshot）。
 * 支持 URL 或本地 HTML；本地 HTML 建议传绝对路径以正确加载同目录 CSS/图片。
 * @param {string} target - URL 或本地 HTML 路径
 * @param {string} name - 截图标识（saveId）
 * @param {object} options - width/height/deviceScaleFactor/fullPage/waitUntil/waitForTimeout/imgType/clip
 * @returns {Promise<Buffer|null>}
 */
export async function takeScreenshot(target, name, options = {}) {
  try {
    const loader = global.RendererLoader
    const renderer = loader.getRenderer()
    if (!renderer?.screenshot) return null

    const isUrl = /^https?:\/\//i.test(String(target))
    const data = {
      width: options.width ?? 1024,
      height: options.height ?? 800,
      deviceScaleFactor: options.deviceScaleFactor ?? 2,
      fullPage: options.fullPage === true,
      waitUntil: options.waitUntil ?? "networkidle2",
      imageWaitTimeout: options.waitForTimeout ?? 800,
      imgType: options.imgType ?? "png",
      ...options
    }
    if (isUrl) data.url = target
    else {
      data.tplFile = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target)
      data.saveId = name
    }
    if (options.clip && (options.clip.w !== undefined || options.clip.h !== undefined)) {
      data.clip = {
        x: options.clip.x,
        y: options.clip.y,
        width: options.clip.width ?? options.clip.w,
        height: options.clip.height ?? options.clip.h
      }
    }

    const result = await renderer.screenshot(name, data)
    return result == null ? null : (Buffer.isBuffer(result) ? result : Buffer.from(result))
  } catch (e) {
    logger.error(`[XRK takeScreenshot] ${e.message}`, e)
    return null
  }
}
