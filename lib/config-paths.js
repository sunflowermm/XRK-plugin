/**
 * 向日葵插件配置路径与启动时复制逻辑
 * 对齐 Yunzai：config/default/* → data/xrkconfig/（仅缺则复制），CommonConfig 只编辑 data/xrkconfig/
 */
import path from 'path';
import yaml from 'yaml';
import { FileUtils } from '../../../lib/utils/file-utils.js';

const ROOT = process.cwd();

export const XRK_CONFIG_DIR = path.join(ROOT, 'data', 'xrkconfig');
export const XRK_DEFAULT_DIR = path.join(ROOT, 'plugins', 'XRK-plugin', 'config', 'default');
export const XRK_CONFIG_REL_DIR = path.join('data', 'xrkconfig');
export const XRK_DEFAULT_REL_DIR = path.join('plugins', 'XRK-plugin', 'config', 'default');

export function getConfigPath(name, ext = 'yaml') {
  return path.join(XRK_CONFIG_DIR, `${name}.${ext}`);
}

export function getDefaultPath(name, ext = 'yaml') {
  return path.join(XRK_DEFAULT_DIR, `${name}.${ext}`);
}

export function getRelConfigPath(name, ext = 'yaml') {
  return path.join(XRK_CONFIG_REL_DIR, `${name}.${ext}`);
}

export function getRelDefaultPath(name, ext = 'json') {
  return path.join(XRK_DEFAULT_REL_DIR, `${name}.${ext}`);
}

/**
 * 启动时：将 config/default 下所有 .yaml/.yml/.json 复制到 data/xrkconfig（仅当目标不存在）
 */
export function ensureAllConfigsSync() {
  const copied = [];
  if (!FileUtils.existsSync(XRK_DEFAULT_DIR)) return { copied };
  FileUtils.ensureDirSync(XRK_CONFIG_DIR);
  const files = FileUtils.readDirSync(XRK_DEFAULT_DIR) || [];
  for (const file of files) {
    if (!file || !(file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'))) continue;
    const target = path.join(XRK_CONFIG_DIR, file);
    if (FileUtils.existsSync(target)) continue;
    const src = path.join(XRK_DEFAULT_DIR, file);
    if (!FileUtils.existsSync(src)) continue;
    FileUtils.copyFileSync(src, target);
    copied.push(file);
  }
  return { copied };
}
