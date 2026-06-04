import path from 'path'
import { FileUtils } from '../../../../lib/utils/file-utils.js'

const SUFFIXES = ['乡', '镇', '县', '市', '区']
const TRY_SUFFIXES = ['市', '县', '区', '镇', '乡']

let indexCache = null

function buildIndex(provinces) {
  const byName = new Map()
  for (const p of provinces) {
    const areas = p.Area.split(/\s+/)
    const enAreas = p.En_Area.split(/\s+/)
    areas.forEach((name, i) => {
      if (!name) return
      byName.set(name, {
        provinceCode: p.province_code,
        enCity: enAreas[i],
        province: p.province,
        matchedName: name,
      })
    })
  }
  return byName
}

export function loadCityIndex() {
  if (indexCache) return indexCache
  const dataPath = path.join(process.cwd(), 'plugins/XRK-plugin/resources/weather/weather.json')
  try {
    const raw = FileUtils.readFileSync(dataPath, 'utf8')
    indexCache = buildIndex(JSON.parse(raw))
  } catch (err) {
    logger.error('[向日葵查天气] 加载城市索引失败:', err)
    indexCache = new Map()
  }
  return indexCache
}

function lookup(name) {
  const idx = loadCityIndex()
  return idx.get(name) ?? null
}

function removeSuffix(name) {
  for (const s of SUFFIXES) {
    if (name.endsWith(s)) return name.slice(0, -s.length)
  }
  return name
}

export function findCityInfo(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  let hit = lookup(raw)
  if (hit) return hit

  const base = removeSuffix(raw)
  if (base !== raw) {
    hit = lookup(base)
    if (hit) return hit
  }

  for (const suffix of TRY_SUFFIXES) {
    hit = lookup(base + suffix)
    if (hit) return hit
  }
  return null
}
