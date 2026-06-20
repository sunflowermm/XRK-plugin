/**
 * 锅巴面板：读写 data/xrkconfig/*，表单见 guoba.schemas.js
 */
import lodash from 'lodash'
import hub from './lib/xrk-hub.js'
import { getDefaultMainConfig, normalizeMainConfig } from './lib/config-normalize.js'
import { EXTRA_SUBCONFIG_MAP } from './lib/config-registry.js'
import {
  formatPokeTimeSlotsForForm,
  parsePokeTimeSlotsFromForm,
  normalizeCoremaster,
  normalizeGroupList
} from './lib/config-adapters.js'
import {
  EXTRA_CFG_KEYS,
  serializeGuobaExtra,
  mergeGuobaExtra,
  readGuobaExtra,
  writeConfigDisk
} from './lib/config-persist.js'
import { allGuobaSchemas } from './guoba.schemas.js'

function stripExtraFromPatch(patch) {
  const extra = {}
  for (const key of EXTRA_CFG_KEYS) {
    if (patch[key] !== undefined) {
      extra[key] = patch[key]
      delete patch[key]
    }
  }
  delete patch._guoba_hint
  delete patch._xrk_console_hint
  return extra
}

export function supportGuoba() {
  return {
    pluginInfo: {
      name: 'xrk-plugin',
      title: '向日葵插件',
      author: '@Xrkseek',
      authorLink: 'https://gitcode.com/Xrkseek/XRK-plugin',
      link: 'https://github.com/sunflowermm/XRK-plugin',
      isV3: true,
      isV2: false,
      description:
        '锅巴可编辑主配置、词库、报时、戳文案常用池、帮助分组、插件列表、查天气与网页截图；深层 JSON 仍可用 XRK 控制台。',
      icon: 'mdi:flower',
      iconColor: '#e8a317',
    },
    configInfo: {
      schemas: allGuobaSchemas,
      getConfigData() {
        const base = formatPokeTimeSlotsForForm(lodash.cloneDeep(hub.config))
        const extra = {}
        for (const key of EXTRA_CFG_KEYS) {
          const meta = EXTRA_SUBCONFIG_MAP[key]
          extra[key] = readGuobaExtra(key, meta ? hub.readDisk(meta.file) : null, hub)
        }
        return { ...base, ...extra }
      },
      setConfigData(data, { Result }) {
        const patch = lodash.cloneDeep(data)
        const extra = stripExtraFromPatch(patch)

        if (patch.coremaster !== undefined) patch.coremaster = normalizeCoremaster(patch.coremaster)
        for (const f of ['time_groupss', 'news_groupss', 'thumwhiteList']) {
          if (patch[f] !== undefined) patch[f] = normalizeGroupList(patch[f])
        }

        parsePokeTimeSlotsFromForm(patch)

        hub.config = normalizeMainConfig(lodash.merge({}, getDefaultMainConfig(), hub.config, patch))
        hub.save()

        for (const [cfgKey, meta] of Object.entries(EXTRA_SUBCONFIG_MAP)) {
          if (extra[cfgKey] == null) continue
          const payload = mergeGuobaExtra(cfgKey, serializeGuobaExtra(cfgKey, extra[cfgKey]), hub.readDisk(meta.file))
          writeConfigDisk(meta.file, meta.ext, payload)
          hub.reload(meta.file)
        }

        return Result.ok({}, '向日葵配置已保存~')
      },
    },
  }
}
