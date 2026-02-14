import yaml from 'yaml'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import xrkconfig from './xrkconfig.js'

/** 解析向日葵配置（统一走 xrkconfig） */
export function 解析向日葵插件yaml () {
  return xrkconfig.config || {}
}

/** 覆盖保存配置；若为 xrk 配置文件则委托 xrkconfig.save() 统一落盘 */
export function 保存yaml (targetPath, configObject) {
  try {
    const realPath = path.resolve(targetPath || xrkconfig.configPath)
    if (realPath === path.resolve(xrkconfig.configPath)) {
      xrkconfig.config = configObject
      xrkconfig.save()
      return
    }
    fs.writeFileSync(realPath, yaml.stringify(configObject), 'utf8')
  } catch (error) {
    console.error(`保存配置时出错: ${error.message}`)
  }
}

/**
 * 通用网页 JSON 解析（兼容旧代码的 解析网页json 名称）
 * @param {string} url
 * @returns {Promise<Object>} 解析后的 JSON 对象；出错时返回空对象
 */
export async function 解析网页json (url) {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`请求失败: ${res.status} ${res.statusText}`)
      return {}
    }
    return await res.json()
  } catch (error) {
    console.error(`解析网页 JSON 出错: ${error.message}`)
    return {}
  }
}