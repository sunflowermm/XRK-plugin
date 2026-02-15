import path from "node:path"

export async function takeScreenshot(target, name, options = {}) {
  try {
    const renderer = global.RendererLoader?.getRenderer?.()
    if (!renderer?.screenshot) return null
    const isUrl = /^https?:\/\//i.test(String(target))
    const data = {
      width: 1024,
      height: 800,
      deviceScaleFactor: 2,
      fullPage: false,
      waitUntil: "networkidle2",
      imageWaitTimeout: 800,
      imgType: "png",
      ...options,
      priority: options.priority === true,
    }
    if (isUrl) data.url = target
    else {
      data.tplFile = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target)
      data.saveId = name
    }
    if (options.clip && (options.clip.w !== undefined || options.clip.h !== undefined)) {
      data.clip = { x: options.clip.x, y: options.clip.y, width: options.clip.width ?? options.clip.w, height: options.clip.height ?? options.clip.h }
    }
    const result = await renderer.screenshot(name, data)
    return result == null ? null : (Buffer.isBuffer(result) ? result : Buffer.from(result))
  } catch (e) {
    logger?.error?.(`[XRK takeScreenshot] ${e.message}`, e)
    return null
  }
}
