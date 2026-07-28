/**
 * 网页截图底层：URL 提取/校验 + 渲染器参数组装 + 截图调用
 */
import path from 'node:path';
import RendererLoader from '../../../lib/renderer/loader.js';
import { findUrlCandidates, trimUrlTail } from './url-detect.js';

/** 分步滚动以触发懒加载，最后回到顶部 */
const LAZY_LOAD_SCROLL = `return new Promise((resolve) => {
  const step = Math.max(window.innerHeight || 800, 400);
  const max = Math.min(
    Math.max(document.body?.scrollHeight || 0, document.documentElement?.scrollHeight || 0),
    12000
  );
  let y = 0;
  const tick = () => {
    window.scrollTo(0, y);
    y += step;
    if (y >= max) {
      window.scrollTo(0, 0);
      setTimeout(resolve, 400);
      return;
    }
    setTimeout(tick, 120);
  };
  tick();
})`;

/** 从渲染器返回值中取出可传给 segment.image() 的 Buffer/路径 */
export function toImagePayload(result) {
  if (result == null || result === false) return null;
  if (Array.isArray(result) && result.length > 0) result = result[0];
  if (Buffer.isBuffer(result)) return result;
  if (result?.type === 'image') {
    const file = result.file ?? result.data?.file;
    if (file != null && (Buffer.isBuffer(file) || typeof file === 'string')) return file;
  }
  if (result?.buffer != null && Buffer.isBuffer(result.buffer)) return result.buffer;
  try {
    if (Buffer.isBuffer(Buffer.from(result))) return Buffer.from(result);
  } catch (err) {
    console.debug?.('[XRK web-screenshot] toImagePayload', err);
  }
  return null;
}

/** 将 screenshot.yaml + 主配置合并项转为渲染器 data */
export function buildRendererOptions(screenshotConfig = {}) {
  const {
    width = 1280,
    height = 900,
    deviceScaleFactor = 1.5,
    fullPage = false,
    maxFullPageHeight = 6000,
    waitUntil = 'networkidle2',
    imageWaitTimeout = 3000,
    fontWaitTimeout = 800,
    delayBeforeScreenshot = 2000,
    lazyLoadScroll = true,
    imgType = 'jpeg',
    quality = 85,
    pageGotoTimeout = 60000,
    ...rest
  } = screenshotConfig;

  const opts = {
    width,
    height,
    deviceScaleFactor,
    waitUntil,
    imageWaitTimeout,
    fontWaitTimeout,
    delayBeforeScreenshot,
    delayBeforeScreenshotUrl: delayBeforeScreenshot,
    imgType,
    quality,
    waitImages: true,
    waitFonts: true,
    pageGotoParams: { timeout: pageGotoTimeout },
    ...rest
  };

  if (lazyLoadScroll !== false) {
    opts.pageEvaluate = LAZY_LOAD_SCROLL;
  }

  if (fullPage === true && maxFullPageHeight > 0) {
    opts.pageEvaluateBeforeScreenshot = `return (() => {
      const w = Math.max(document.documentElement.clientWidth || ${width}, 1);
      const scrollH = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0
      );
      const h = Math.min(scrollH, ${maxFullPageHeight});
      return { x: 0, y: 0, width: w, height: Math.max(h, ${height}) };
    })()`;
    opts.fullPage = false;
  } else {
    opts.fullPage = false;
  }

  return opts;
}

export async function renderUrlScreenshot(url, name, screenshotConfig = {}, renderer = null) {
  const r = renderer ?? RendererLoader.getRenderer();
  if (!r?.screenshot) return null;
  try {
    const data = { url, ...buildRendererOptions(screenshotConfig) };
    const result = await r.screenshot(name, data);
    return toImagePayload(result);
  } catch (e) {
    logger?.error?.(`[XRK web-screenshot] ${e.message}`, e);
    return null;
  }
}

/** 本地 HTML / 模板截图（非 URL） */
export async function renderFileScreenshot(target, name, options = {}, renderer = null) {
  const r = renderer ?? RendererLoader.getRenderer();
  if (!r?.screenshot) return null;
  try {
    const data = {
      width: 1024,
      height: 800,
      deviceScaleFactor: 2,
      fullPage: false,
      waitUntil: 'domcontentloaded',
      imageWaitTimeout: 800,
      imgType: 'png',
      ...options,
      tplFile: path.isAbsolute(target) ? target : path.resolve(process.cwd(), target),
      saveId: name
    };
    if (options.clip && (options.clip.w !== undefined || options.clip.h !== undefined)) {
      data.clip = {
        x: options.clip.x,
        y: options.clip.y,
        width: options.clip.width ?? options.clip.w,
        height: options.clip.height ?? options.clip.h
      };
    }
    const result = await r.screenshot(name, data);
    return toImagePayload(result);
  } catch (e) {
    logger?.error?.(`[XRK web-screenshot] ${e.message}`, e);
    return null;
  }
}

export async function takeScreenshot(target, name, options = {}, renderer = null) {
  if (/^https?:\/\//i.test(String(target))) {
    return renderUrlScreenshot(target, name, options, renderer);
  }
  return renderFileScreenshot(target, name, options, renderer);
}

export class WebScreenshotUrlService {
  constructor(urlRules) {
    this.config = urlRules || {};
  }

  extractUrls(message) {
    if (!message || typeof message !== 'string') return [];

    const matches = findUrlCandidates(message);
    const urls = new Set();
    const seenDomains = new Set();
    const proc = this.config.urlProcessing || {};
    const maxUrls = proc.maxUrlsPerMessage ?? 5;
    const minLen = proc.minUrlLength ?? 4;
    const maxLen = proc.maxUrlLength ?? 2083;

    for (let url of matches) {
      if (urls.size >= maxUrls) break;

      url = trimUrlTail(url);
      if (!url || url.length < minLen || url.length > maxLen) continue;

      url = this.cleanAndNormalizeUrl(url);
      if (!url) continue;

      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();

        if (!this.isValidDomain(domain)) continue;
        if (seenDomains.has(domain)) continue;
        if (this.isBlockedFileType(urlObj.pathname)) continue;

        url = this.cleanUrlParameters(urlObj);
        urls.add(url);
        seenDomains.add(domain);
      } catch {
        continue;
      }
    }

    return [...urls];
  }

  cleanAndNormalizeUrl(url) {
    try {
      url = trimUrlTail(url);
      if (!/^https?:\/\//i.test(url)) {
        url = this.isLocalAddress(url.split('/')[0]) ? `http://${url}` : `https://${url}`;
      }

      const urlObj = new URL(url);
      urlObj.pathname = decodeURIComponent(urlObj.pathname)
        .replace(/\/+/g, '/')
        .replace(/\/{2,}/g, '/');
      urlObj.search = decodeURIComponent(urlObj.search).replace(/[&?]$/, '');

      if ((urlObj.protocol === 'http:' && urlObj.port === '80') ||
          (urlObj.protocol === 'https:' && urlObj.port === '443')) {
        urlObj.port = '';
      }

      urlObj.username = '';
      urlObj.password = '';

      return urlObj.toString()
        .replace(/\/$/, '')
        .replace(/([^:]\/)\/+/g, '$1');
    } catch {
      return null;
    }
  }

  cleanUrlParameters(urlObj) {
    const searchParams = new URLSearchParams(urlObj.search);
    for (const param of this.config.filteredParams || []) {
      searchParams.delete(param);
    }
    for (const [key, value] of searchParams.entries()) {
      if (!value.trim()) searchParams.delete(key);
    }
    urlObj.search = searchParams.toString();
    return urlObj.toString();
  }

  isValidDomain(domain) {
    domain = domain.toLowerCase();
    const whitelist = this.config.whitelistDomains || [];
    const blacklist = this.config.blacklistDomains || [];

    if (whitelist.some(d => domain.includes(d))) return true;
    if (blacklist.some(d => domain.includes(d))) return false;

    if (this.isIPAddress(domain)) return this.isAllowedIP(domain);
    if (this.isLocalAddress(domain)) {
      return (this.config.allowedLocalAddresses || []).includes(domain);
    }
    return true;
  }

  isBlockedFileType(pathname) {
    const last = (pathname || '').split('/').pop() || '';
    const dot = last.lastIndexOf('.');
    if (dot <= 0) return false;
    const extension = last.slice(dot + 1).toLowerCase();
    if (!/^[a-z0-9]{1,8}$/.test(extension)) return false;
    return Object.values(this.config.blockedExtensions || {})
      .flat()
      .includes(extension);
  }

  isIPAddress(host) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
  }

  isAllowedIP(ip) {
    const allowed = this.config.allowedLocalAddresses || [];
    if (allowed.includes(ip)) return true;
    return !(this.config.blacklistIPs || []).some(range => this.isIPInRange(ip, range));
  }

  isIPInRange(ip, range) {
    try {
      const [rangeIP, bits] = range.split('/');
      const ipLong = this.ipToLong(ip);
      const rangeLong = this.ipToLong(rangeIP);
      const mask = -1 << (32 - parseInt(bits, 10));
      return (ipLong & mask) === (rangeLong & mask);
    } catch {
      return false;
    }
  }

  ipToLong(ip) {
    return ip.split('.')
      .reduce((long, octet) => (long << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  isLocalAddress(host) {
    if (!host) return false;
    try {
      return (this.config.allowedLocalAddresses || []).some(addr =>
        host.startsWith(addr) || host.includes(addr)
      );
    } catch {
      return false;
    }
  }
}
