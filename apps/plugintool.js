import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import { takeScreenshot } from '../components/util/takeScreenshot.js';

export let pluginData = {};

// 代理配置
export const PROXY_TIMEOUT = 5000;
export const proxyList = [
    "http://124.156.150.245:10086",
    "http://140.83.60.48:8081",
    "https://gh-proxy.com",
    "http://43.154.105.8:8888",
    "http://8.210.153.246:9000",
    "http://gh.smiek.top:8080",
    "https://cf2.algin.cn",
    "https://dl.fastconnect.cc",
    "https://dl.nzjk.cf",
    "https://fast.zhaishis.cn",
    "https://fastgh.lainbo.com",
    "https://file.sweatent.top",
    "https://firewall.lxstd.org",
    "https://g.blfrp.cn",
    "https://g.in0.re",
    "https://get.2sb.org",
    "https://gh-proxy.llyke.com",
    "https://gh.222322.xyz",
    "https://gh.b52m.cn",
    "https://gh.chjina.com",
    "https://gh.gpuminer.org",
    "https://gh.hoa.moe",
    "https://gh.idayer.com",
    "https://gh.llkk.cc",
    "https://gh.meiqiu.net.cn",
    "https://gh.pylogmon.com",
    "https://gh.tangyuewei.com",
    "https://gh.tlhub.cn",
    "https://gh.tryxd.cn",
    "https://gh.whjpd.top/gh",
    "https://ghjs.us.kg",
    "https://ghp.aaaaaaaaaaaaaa.top",
    "https://ghp.ci",
    "https://ghp.miaostay.com",
    "https://ghpr.cc",
    "https://ghproxy.homeboyc.cn",
    "https://ghproxy.imciel.com",
    "https://ghproxy.kokomi0728.eu.org",
    "https://ghproxy.lyln.us.kg",
    "https://git.669966.xyz",
    "https://git.886.be",
    "https://git.ikxiuxin.com",
    "https://git.linrol.cn",
    "https://git.smartapi.com.cn",
    "https://git.snoweven.com",
    "https://git.speed-ssr.tech",
    "https://git.xiandan.uk",
    "https://git.xkii.cc",
    "https://git.z23.cc",
    "https://gitcdn.uiisc.org",
    "https://github.aci1.com",
    "https://github.bachang.org",
    "https://github.bef841ca.cn",
    "https://github.blogonly.cn",
    "https://github.codecho.cc",
    "https://github.cutemic.cn",
    "https://github.ffffffff0x.com",
    "https://github.jianrry.plus",
    "https://github.moeyy.xyz",
    "https://github.ur1.fun",
    "https://github.wper.club",
    "https://github.wuzhij.com",
    "https://github.xiaoning223.top",
    "https://github.xxlab.tech",
    "https://githubacc.caiaiwan.com",
    "https://githubapi.jjchizha.com",
    "https://jisuan.xyz",
    "https://ken.canaan.io",
    "https://mirror.ghproxy.com",
    "https://moeyy.cn/gh-proxy",
    "https://static.yiwangmeng.com",
    "https://www.ghproxy.cn"
];

// 截图统一落盘：plugins/XRK-plugin/resources/plugins/*.png；分类列表缓存索引同目录 plugin_screenshots_index.json
const PLUGINS_DIR = path.join(process.cwd(), 'plugins/XRK-plugin/resources/plugins');
const PLUGIN_HTML_TEMPLATE = path.join(PLUGINS_DIR, 'template.html');
const PLUGIN_SCREENSHOT_INDEX = path.join(PLUGINS_DIR, 'plugin_screenshots_index.json');
const HTML_TEMP_DIR = path.join(process.cwd(), 'plugins/XRK-plugin/resources/help_other');

export function createHtmlTemplate(title, content) {
  return fs.readFileSync(PLUGIN_HTML_TEMPLATE, "utf8").replaceAll("{{title}}", title).replace("{{content}}", content);
}

/** 渲染器可能返回 Buffer / 数组 / { buffer }，统一为 Buffer 便于落盘 */
function toBuffer(result) {
  if (result == null) return null;
  if (Buffer.isBuffer(result)) return result;
  if (Array.isArray(result) && result.length > 0) result = result[0];
  if (result?.buffer != null && Buffer.isBuffer(result.buffer)) return result.buffer;
  try {
    return Buffer.from(result);
  } catch {
    return result?.buffer != null ? Buffer.from(result.buffer) : null;
  }
}

/** 渲染 HTML 得到截图 Buffer（兼容多种渲染器返回值） */
async function renderPluginListScreenshot(htmlContent, saveId, options = {}) {
  fs.mkdirSync(HTML_TEMP_DIR, { recursive: true });
  const htmlPath = path.join(HTML_TEMP_DIR, `${saveId}.html`);
  fs.writeFileSync(htmlPath, htmlContent, "utf8");
  try {
    const raw = await takeScreenshot(htmlPath, `${saveId}_screenshot`, { fullPage: true, width: 1024, deviceScaleFactor: 2, ...options });
    return toBuffer(raw);
  } finally {
    try { fs.unlinkSync(htmlPath); } catch (_) {}
  }
}

/** 渲染并落盘到 resources/plugins/<fileName>.png，返回图片路径 */
export async function saveAndScreenshot(htmlContent, fileName, options = {}) {
  const buf = await renderPluginListScreenshot(htmlContent, fileName, options);
  if (!buf || !Buffer.isBuffer(buf)) return null;
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  const ext = path.extname(fileName) || ".png";
  const base = path.basename(fileName, ext);
  const outPath = path.join(PLUGINS_DIR, `${base}.png`);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

export async function testProxy(proxyUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT);
    const response = await fetch(`${proxyUrl}/https://github.com`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export async function getFirstAvailableProxy() {
  logger.info('[插件安装器] 开始测试代理...');
  
  for (const proxy of proxyList) {
    if (await testProxy(proxy)) {
      logger.info(`[插件安装器] 找到可用代理: ${proxy}`);
      return proxy;
    }
  }
  
  throw new Error('无可用代理');
}

// 下载文件（使用代理）
export async function downloadWithProxy(url, maxRetries = 3) {
  if (!url.includes('github.com')) {
    const response = await fetch(url, { timeout: 30000 });
    if (response.ok) return await response.text();
    throw new Error(`直接下载失败，状态码: ${response.status}`);
  }

  const proxy = await getFirstAvailableProxy();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const proxyUrl = `${proxy}/${url.replace(/^https?:\/\//, '')}`;
      const response = await fetch(proxyUrl, { timeout: 30000 });
      if (response.ok) return await response.text();
    } catch (error) {
      logger.error(`[插件安装器] 代理 ${proxy} 下载失败 (尝试 ${i + 1}/${maxRetries}): ${error.message}`);
      if (i === maxRetries - 1) throw error;
    }
  }
  
  throw new Error('下载失败');
}

// 获取Git克隆URL（使用代理）
export async function getGitCloneUrlWithProxy(repoUrl, maxRetries = 3) {
  if (!repoUrl.includes('github.com')) return repoUrl;

  // 串行测试代理
  logger.info('[插件安装器] 测试Git代理...');
  
  for (const proxy of proxyList) {
    const proxyCloneUrl = `${proxy}/${repoUrl}`;
    try {
      await execCommand(`git ls-remote ${proxyCloneUrl}`);
      logger.info(`[插件安装器] 使用代理: ${proxy}`);
      return proxyCloneUrl;
    } catch (error) {
      logger.error(`[插件安装器] 代理 ${proxy} 测试失败: ${error.message}`);
    }
  }
  
  logger.warn('[插件安装器] 所有代理测试失败，使用原链接');
  return repoUrl;
}

// 切换插件代理
export async function switchPluginProxy(pluginName, currentRemote) {
  const githubPath = currentRemote.split('/github.com/').pop();
  if (!githubPath) throw new Error('无法提取GitHub仓库信息');

  for (const proxy of proxyList) {
    const newRemote = `${proxy}/https://github.com/${githubPath}`;
    try {
      const response = await fetch(newRemote, { timeout: 5000 });
      if (response.ok) {
        logger.info(`[插件安装器] 切换到代理: ${proxy}`);
        return newRemote;
      }
    } catch {
      continue;
    }
  }
  
  throw new Error('所有代理测试失败');
}

// 更新插件远程地址
export async function updatePluginRemote(pluginPath, newRemote) {
  await execCommand(`git remote set-url origin ${newRemote}`, { cwd: pluginPath });
}

function readScreenshotIndex() {
  try {
    if (fs.existsSync(PLUGIN_SCREENSHOT_INDEX))
      return JSON.parse(fs.readFileSync(PLUGIN_SCREENSHOT_INDEX, "utf8"));
  } catch (_) {}
  return {};
}

function writeScreenshotIndex(index) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  fs.writeFileSync(PLUGIN_SCREENSHOT_INDEX, JSON.stringify(index, null, 2));
}

export function calculatePluginsHash(plugins) {
  return crypto.createHash('md5').update(JSON.stringify(plugins)).digest('hex');
}

export function generateTextPluginInfo(plugin) {
  return `━━━━━━━━━\n【${plugin.cn_name}】(${plugin.name})\n介绍:\n${plugin.description || '暂无'}\n别名:\n${plugin.anothername || '暂无'}\n地址:\n${plugin.git || plugin.url}\n━━━━━━━━━`;
}

/** 单条插件的 HTML 片段（列表/查询共用） */
export function formatPluginItemHtml(pluginInfo) {
  return `
    <div class="plugin-item">
      <h3>${pluginInfo.cn_name} (${pluginInfo.name})</h3>
      <p><strong>插件介绍: </strong>${pluginInfo.description || ''}</p>
      <p><strong>插件别名: </strong>${pluginInfo.anothername || '暂无'}</p>
      <p><strong>项目地址：</strong><a href="${pluginInfo.git || pluginInfo.url}">${pluginInfo.git || pluginInfo.url}</a></p>
    </div>
  `;
}

export const PLUGIN_CATEGORIES = [
  { name: '推荐插件', file: 'recommended_plugins.json' },
  { name: '文娱插件', file: 'entertainment_plugins.json' },
  { name: 'IP类插件', file: 'ip_plugins.json' },
  { name: '游戏插件', file: 'game_plugins.json' },
  { name: 'JS插件', file: 'js.json' }
];

/** 按用户输入解析分类：先匹配 name，再匹配 file 去掉 .json 的部分 */
export function getCategoryByInput(input) {
  const trimmed = typeof input === 'string' ? input.trim() : '';
  if (!trimmed) return undefined;
  return (
    PLUGIN_CATEGORIES.find(c => c.name === trimmed) ||
    PLUGIN_CATEGORIES.find(c => (c.file || '').replace(/\.json$/i, '') === trimmed)
  );
}

function loadPluginsForCategory(category) {
  const filePath = path.join(PLUGINS_DIR, category.file);
  const plugins = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  updatePluginData(plugins);
  return plugins;
}

/** 单分类：先看索引与 hash，命中则返回 segments（文件在 resources/plugins/）；否则生成并落盘为 .png，写索引后返回 */
async function loadOrGenerateCategory(category) {
  const key = category.name;
  const plugins = loadPluginsForCategory(category);
  const currentHash = calculatePluginsHash(plugins);
  const index = readScreenshotIndex();
  const entry = index[key];
  if (entry?.hash === currentHash && Array.isArray(entry.files) && entry.files.length > 0) {
    const segments = entry.files
      .map(f => path.join(PLUGINS_DIR, f))
      .filter(p => typeof p === "string" && fs.existsSync(p))
      .map(p => ({ type: "image", file: p }));
    if (segments.length === entry.files.length) return segments;
  }

  const files = await generatePluginImages(category, plugins);
  if (files.length === 0) return [];
  index[key] = { hash: currentHash, files };
  writeScreenshotIndex(index);
  return files.map(f => ({ type: "image", file: path.join(PLUGINS_DIR, f) }));
}

/** 获取某分类截图段：仅磁盘（resources/plugins/），无则生成并落盘为图片后返回。找不到分类返回 null。 */
export async function ensureCategoryImageSegments(categoryName) {
  const category = getCategoryByInput(categoryName) ?? PLUGIN_CATEGORIES.find(c => c.name === categoryName);
  if (!category) return null;
  return await loadOrGenerateCategory(category);
}

/** 按分类名读取插件列表（用于文字版），并更新 pluginData */
export function getCategoryPlugins(categoryName) {
  const category = getCategoryByInput(categoryName) ?? PLUGIN_CATEGORIES.find(c => c.name === categoryName);
  if (!category) return [];
  return loadPluginsForCategory(category);
}

export function initializePluginList() {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

// 执行命令
export function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    logger.info(`[插件安装器] 执行: ${command}`);
    exec(command, { shell: true, ...options }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

/**
 * 解析插件标识符(支持序号、名称、别名、文件名)
 * @param {string[]} inputs - 待解析的数组（如用户输入的序号或插件名）
 * @param {Object} pluginMap - 已安装插件的映射表
 * @returns {Object[]} - 解析好的插件信息
 */
export function resolveMultiplePluginIdentifiers(inputs, pluginMap) {
  const result = [];
  
  for (const token of inputs) {
    let foundPluginInfo = null;
    for (const key in pluginData) {
      const info = pluginData[key];
      if (!info) continue;
      
      const allNames = [
        info.name,
        info.cn_name,
        ...(info.anothername ? info.anothername.split(/\s+/) : [])
      ];
      
      if (allNames.includes(token)) {
        const installedInfo = Object.values(pluginMap).find(p => 
          p.name === info.name || 
          (p.type === 'js' && p.displayName === info.name)
        );
        if (installedInfo) {
          foundPluginInfo = { ...installedInfo };
          break;
        }
      }
    }
    if (!foundPluginInfo) {
      const pluginDirs = fs.readdirSync(path.join(process.cwd(), 'plugins'))
        .filter(p => fs.statSync(path.join(process.cwd(), 'plugins', p)).isDirectory());
      
      if (pluginDirs.includes(token)) {
        foundPluginInfo = { name: token, type: 'package' };
      } else {
        const jsPath = path.join(process.cwd(), 'plugins/example', token);
        if (fs.existsSync(jsPath) || fs.existsSync(jsPath + '.disable')) {
          foundPluginInfo = { 
            name: token,
            displayName: token.replace('.js.disable','.js').replace('.js',''),
            type: 'js' 
          };
        }
      }
    }
    if (!foundPluginInfo) {
      const num = parseInt(token);
      if (!isNaN(num) && pluginMap[num]) {
        foundPluginInfo = { ...pluginMap[num] };
      }
    }
    
    result.push(foundPluginInfo || { error: true, token });
  }
  
  return result;
}

export function getInstalledPlugins() {
  const pluginDirPath = path.join(process.cwd(), 'plugins');
  const exampleDirPath = path.join(pluginDirPath, 'example');
  const excluded = ['example', 'other', 'system', 'adapter', 'ji-plugin'];

  const pluginDirs = fs.readdirSync(pluginDirPath).filter(d => !excluded.includes(d) && fs.statSync(path.join(pluginDirPath, d)).isDirectory());
  const jsFiles = fs.readdirSync(exampleDirPath).filter(f => f.endsWith('.js') || f.endsWith('.js.disable'));

  let pluginList = [];
  let pluginMap = {};
  let index = 1;

  pluginDirs.forEach(name => {
    const status = fs.readdirSync(path.join(pluginDirPath, name)).some(f => f.endsWith('.js')) ? '启用' : '已停用';
    pluginList.push({ index, name, type: 'package', status });
    pluginMap[index] = { name, type: 'package' };
    pluginMap[name] = { index, name, type: 'package' };
    index++;
  });

  jsFiles.forEach(file => {
    const displayName = file.replace('.disable', '').replace('.js', '');
    const status = file.endsWith('.js') ? '启用' : '已停用';
    pluginList.push({ index, name: file, displayName, type: 'js', status });
    pluginMap[index] = { name: file, displayName, type: 'js' };
    pluginMap[displayName] = { index, name: file, type: 'js' };
    index++;
  });

  return { pluginList, pluginMap, totalPlugins: index - 1 };
}

function updatePluginData(plugins) {
  plugins.forEach(plugin => {
    pluginData[plugin.name] = plugin;
    pluginData[plugin.cn_name] = plugin;
    if (plugin.anothername) plugin.anothername.split(/\s+/).forEach(alias => pluginData[alias] = plugin);
  });
}

/** 生成分类截图并写入 resources/plugins/*.png，返回文件名数组供索引（复用 saveAndScreenshot） */
async function generatePluginImages(category, plugins) {
  const groups = [];
  for (let i = 0; i < plugins.length; i += 10) groups.push(plugins.slice(i, i + 10));
  const files = [];
  for (let [index, group] of groups.entries()) {
    const content = group.map(p => formatPluginItemHtml(p)).join('');
    const baseName = `${category.file.replace(/\.json$/i, '')}_group_${index + 1}`;
    const htmlContent = createHtmlTemplate(`${category.name} - 第 ${index + 1} 组`, content);
    const outPath = await saveAndScreenshot(htmlContent, baseName, { waitForTimeout: 600 });
    if (outPath) files.push(path.basename(outPath));
  }
  return files;
}

initializePluginList();