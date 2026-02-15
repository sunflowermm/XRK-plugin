import path from "node:path"
import RendererLoader from "../../../../lib/renderer/loader.js"

/** 从渲染器返回值中取出可传给 segment.image() 的 Buffer/路径；支持 Buffer、segment（oicq .file / .data.file）、{ buffer } */
function toImagePayload(result) {
  if (result == null || result === false) return null
  if (Array.isArray(result) && result.length > 0) result = result[0]
  if (Buffer.isBuffer(result)) return result
  if (result?.type === "image") {
    const file = result.file ?? result.data?.file
    if (file != null && (Buffer.isBuffer(file) || typeof file === "string")) return file
  }
  if (result?.buffer != null && Buffer.isBuffer(result.buffer)) return result.buffer
  try {
    if (Buffer.isBuffer(Buffer.from(result))) return Buffer.from(result)
  } catch {}
  return null
}

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
    const result = await r.screenshot(name, data)
    return toImagePayload(result)
  } catch (e) {
    logger?.error?.(`[XRK takeScreenshot] ${e.message}`, e)
    return null
  }
}
