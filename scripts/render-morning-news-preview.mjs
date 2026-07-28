#!/usr/bin/env node
/** 自渲染早报示例图至 assets/morning-news.png（供 README 展示） */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const yunzaiRoot = path.resolve(pluginRoot, '../..')

process.chdir(yunzaiRoot)
globalThis.Bot ??= { makeLog: () => {} }
globalThis.logger ??= console

await import(pathToFileURL(path.join(yunzaiRoot, 'lib/util.js')).href)

const {
  fetchMorningNewsData,
  attachDouyinHotToNews,
  renderMorningNewsImage,
  fetchMorningNewsImageUrl
} = await import('../lib/morning-news.js')
const { fetchImageBuffer } = await import('../lib/fetch-media.js')

let buf = null
try {
  const data = await attachDouyinHotToNews(await fetchMorningNewsData())
  buf = await renderMorningNewsImage(data)
} catch (err) {
  console.warn('自渲染失败，回退官方图:', err.message)
}
if (!buf) {
  const url = await fetchMorningNewsImageUrl()
  buf = await fetchImageBuffer(url, 20000)
  if (!buf) {
    console.error('早报图片失败')
    process.exit(1)
  }
}

const out = path.join(pluginRoot, 'assets', 'morning-news.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, Buffer.isBuffer(buf) ? buf : Buffer.from(buf))
console.log(`已生成: ${out}`)
