/**
 * 向日葵插件配置路径与启动时复制逻辑
 * 对齐 Yunzai：config/default/* → data/xrkconfig/（仅缺则复制），CommonConfig 只编辑 data/xrkconfig/
 */
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { FileUtils } from '../../../lib/utils/file-utils.js';

const ROOT = process.cwd();

export const XRK_CONFIG_DIR = path.join(ROOT, 'data', 'xrkconfig');
export const XRK_DEFAULT_DIR = path.join(ROOT, 'plugins', 'XRK-plugin', 'config', 'default');

export function getConfigPath(name, ext = 'yaml') {
  return path.join(XRK_CONFIG_DIR, `${name}.${ext}`);
}

export function getDefaultPath(name, ext = 'yaml') {
  return path.join(XRK_DEFAULT_DIR, `${name}.${ext}`);
}

export function ensureConfigSync(name, fallbackData = null, ext = 'yaml') {
  const target = getConfigPath(name, ext);
  const defaultPath = getDefaultPath(name, ext);
  if (FileUtils.existsSync(target)) return false;
  if (!FileUtils.existsSync(XRK_CONFIG_DIR)) {
    fs.mkdirSync(XRK_CONFIG_DIR, { recursive: true });
  }
  if (FileUtils.existsSync(defaultPath)) {
    fs.writeFileSync(target, fs.readFileSync(defaultPath, 'utf8'), 'utf8');
    return true;
  }
  if (fallbackData != null) {
    const content = ext === 'json'
      ? (typeof fallbackData === 'string' ? fallbackData : JSON.stringify(fallbackData, null, 2))
      : (typeof fallbackData === 'string' ? fallbackData : yaml.stringify(fallbackData));
    fs.writeFileSync(target, content, 'utf8');
    return true;
  }
  return false;
}

/**
 * 启动时：将 config/default 下所有 .yaml/.yml/.json 复制到 data/xrkconfig（仅当目标不存在）
 */
export function ensureAllConfigsSync() {
  const copied = [];
  if (!FileUtils.existsSync(XRK_DEFAULT_DIR)) return { copied };
  if (!FileUtils.existsSync(XRK_CONFIG_DIR)) {
    fs.mkdirSync(XRK_CONFIG_DIR, { recursive: true });
  }
  const files = FileUtils.readDirSync(XRK_DEFAULT_DIR) || [];
  for (const file of files) {
    if (!file || !(file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json'))) continue;
    const target = path.join(XRK_CONFIG_DIR, file);
    if (FileUtils.existsSync(target)) continue;
    const src = path.join(XRK_DEFAULT_DIR, file);
    if (!FileUtils.existsSync(src)) continue;
    fs.writeFileSync(target, fs.readFileSync(src, 'utf8'), 'utf8');
    copied.push(file);
  }
  return { copied };
}

/** 供 app 使用：读取 data/xrkconfig 下配置（对象），不存在返回 null */
export function readConfigSync(name, ext = 'yaml') {
  const p = getConfigPath(name, ext);
  if (!FileUtils.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf8');
  if (ext === 'json') {
    try { return JSON.parse(raw); } catch (_) { return null; }
  }
  try { return yaml.parse(raw) || null; } catch (_) { return null; }
}
