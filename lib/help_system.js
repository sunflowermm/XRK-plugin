/**
 * 向日葵帮助系统配置加载
 * 从 data/xrkconfig/help_system.yaml 读取，启动时由 ensureAllConfigsSync 复制；文件变更自动重载。
 */
import fs from 'fs';
import yaml from 'yaml';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { getConfigPath } from './config-paths.js';

const HELP_SYSTEM_PATH = getConfigPath('help_system');

const DEFAULT_HELP_CFG = {
  title: '向日葵帮助',
  subTitle: 'xrk-bot && XRK',
  columnCount: 3,
  colWidth: 265,
  theme: 'all',
  themeExclude: ['default'],
  style: {
    fontColor: '#ceb78b',
    descColor: '#eee',
    contBgColor: 'rgba(6, 21, 31, .5)',
    contBgBlur: 4,
    headerBgColor: 'rgba(6, 21, 31, .4)',
    rowBgColor1: 'rgba(6, 21, 31, .2)',
    rowBgColor2: 'rgba(6, 21, 31, .35)'
  },
  bgBlur: false
};

let helpCfg = { ...DEFAULT_HELP_CFG };
let helpList = [];

function load() {
  try {
    if (FileUtils.existsSync(HELP_SYSTEM_PATH)) {
      const content = fs.readFileSync(HELP_SYSTEM_PATH, 'utf8');
      const data = yaml.parse(content) || {};
      const { helpList: hl, ...cfg } = data;
      helpCfg = { ...DEFAULT_HELP_CFG, ...cfg };
      helpList = Array.isArray(hl) ? hl : [];
    }
  } catch (e) {
    logger?.error?.('[help_system] 加载失败:', e);
  }
}

load();

if (FileUtils.existsSync(HELP_SYSTEM_PATH)) {
  fs.watchFile(HELP_SYSTEM_PATH, (curr, prev) => {
    if (curr.mtime !== prev.mtime) load();
  });
}

export { helpCfg, helpList };
export const isSys = true;
