import path from "node:path"
import RendererLoader from "../../../../lib/renderer/loader.js"

export async function takeScreenshot(target, name, options = {}, renderer = null) {
  try {
    const r = renderer ?? RendererLoader.getRenderer()
    if (!r?.screenshot) return null
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
    let result = await r.screenshot(name, data)
    if (result == null) return null
    if (Array.isArray(result) && result.length > 0) result = result[0]
    if (Buffer.isBuffer(result)) return result
    // 兼容层 lib/puppeteer/puppeteer.js 会返回 segment（type:'image', data:{ file }），解包出 file 供 segment.image() 使用
    if (result?.type === 'image' && result?.data?.file != null) return result.data.file
    if (result?.buffer != null && Buffer.isBuffer(result.buffer)) return result.buffer
    try {
      return Buffer.from(result)
    } catch {
      return result?.buffer != null ? Buffer.from(result.buffer) : null
    }
  } catch (e) {
    logger?.error?.(`[XRK takeScreenshot] ${e.message}`, e)
    return null
  }
}
