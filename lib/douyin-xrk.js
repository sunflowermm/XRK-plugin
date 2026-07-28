/**
 * 抖音扩展能力（R 不做的）：热榜、推荐流随机视频。
 * Cookie / a_bogus 复用 rconsole-plugin。
 */
import path from 'node:path';
import yaml from 'yaml';
import { createRequire } from 'node:module';
import { FileUtils } from '../../../lib/utils/file-utils.js';

const require = createRequire(import.meta.url);
const aBogus = require('../../rconsole-plugin/utils/a-bogus.cjs');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PLAY = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=540p&line=0';
const PLAY_720 = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=720p&line=0';
/** 与 R 下载器一致的移动端 UA（桌面 UA + CDN 直链易 403） */
const UA_MOBILE =
  'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.25 Mobile Safari/537.36';
/** 推荐流跳过过长视频（毫秒） */
const MAX_FEED_DURATION_MS = 60_000;
/** QQ 上传友好上限；更大易 NapCat 超时 */
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;

const COMMON = {
  device_platform: 'webapp',
  aid: '6383',
  channel: 'channel_pc_web',
  pc_client_type: '1',
  version_code: '190500',
  version_name: '19.5.0',
  cookie_enabled: 'true',
  screen_width: '1920',
  screen_height: '1080',
  browser_language: 'zh-CN',
  browser_platform: 'Win32',
  browser_name: 'Chrome',
  browser_version: '124.0.0.0',
  browser_online: 'true',
  engine_name: 'Blink',
  engine_version: '124.0.0.0',
  os_name: 'Windows',
  os_version: '10',
  cpu_core_num: '8',
  device_memory: '8',
  platform: 'PC'
};

const LABEL = { 1: '新', 3: '热', 5: '沸', 8: '首' };

function rconsoleToolsPath() {
  return path.join(process.cwd(), 'plugins/rconsole-plugin/config/tools.yaml');
}

export function readRDouyinCookie() {
  const p = rconsoleToolsPath();
  if (!FileUtils.existsSync(p)) return '';
  try {
    const cfg = yaml.parse(FileUtils.readFileSync(p, 'utf8')) || {};
    return String(cfg.douyinCookie || '').trim();
  } catch (err) {
    Bot.makeLog('debug', `[XRK douyin] 读 Cookie 失败: ${err.message}`, 'XRK-plugin');
    return '';
  }
}

function buildUrl(pathname, extra = {}) {
  const qs = new URLSearchParams({ ...COMMON, ...extra });
  return `https://www.douyin.com${pathname}?${qs.toString()}`;
}

function signUrl(url) {
  const qs = new URL(url).searchParams.toString();
  return `${url}&a_bogus=${encodeURIComponent(aBogus.generate_a_bogus(qs, UA))}`;
}

async function dyGet(pathname, extra = {}) {
  const cookie = readRDouyinCookie();
  if (!cookie) throw new Error('未配置 R 插件 douyinCookie');
  const url = signUrl(buildUrl(pathname, extra));
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': UA,
      Referer: 'https://www.douyin.com/',
      Accept: 'application/json, text/plain, */*',
      cookie
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function videoUri(aweme) {
  return aweme?.video?.play_addr?.uri
    || aweme?.video?.play_addr_h264?.uri
    || aweme?.video?.download_addr?.uri
    || aweme?.video?.bit_rate?.[0]?.play_addr?.uri
    || '';
}

function firstHttpUrl(list) {
  if (!Array.isArray(list)) return '';
  for (const u of list) {
    if (typeof u === 'string' && /^https?:\/\//i.test(u)) return u;
  }
  return '';
}

function pushUrl(urls, u) {
  if (typeof u === 'string' && /^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
}

/** 优先 snssdk 540p（与 R 一致、体积小）；720p/CDN 仅回退 */
function collectPlayUrls(aweme) {
  const urls = [];
  const uri = videoUri(aweme);
  if (uri) pushUrl(urls, PLAY.replace('{}', uri));
  const rates = aweme?.video?.bit_rate;
  if (Array.isArray(rates)) {
    for (let i = rates.length - 1; i >= 0; i--) {
      pushUrl(urls, firstHttpUrl(rates[i]?.play_addr?.url_list));
    }
  }
  pushUrl(urls, firstHttpUrl(aweme?.video?.play_addr?.url_list));
  pushUrl(urls, firstHttpUrl(aweme?.video?.play_addr_h264?.url_list));
  if (uri) pushUrl(urls, PLAY_720.replace('{}', uri));
  pushUrl(urls, firstHttpUrl(aweme?.video?.download_addr?.url_list));
  return urls;
}

function durationMsOf(aweme) {
  let n = Number(aweme?.duration) || Number(aweme?.video?.duration) || 0;
  // 少数字段给秒；正常为毫秒（如 15000）
  if (n > 0 && n < 1000) n *= 1000;
  return n > 0 ? n : 0;
}

function downloadHeaderVariants(cookie) {
  const sets = [{ 'User-Agent': UA_MOBILE }];
  if (cookie) {
    sets.push({
      'User-Agent': UA_MOBILE,
      Referer: 'https://www.douyin.com/',
      cookie
    });
    sets.push({
      'User-Agent': UA,
      Referer: 'https://www.douyin.com/',
      cookie
    });
  }
  return sets;
}

/**
 * 按候选 URL × 请求头回退下载（对齐 R：主用 snssdk + 移动 UA）
 * @param {string|string[]} playUrlOrUrls
 * @returns {Promise<string>} 本地 mp4 路径
 */
export async function downloadDouyinPlayToFile(playUrlOrUrls) {
  const urls = (Array.isArray(playUrlOrUrls) ? playUrlOrUrls : [playUrlOrUrls]).filter(Boolean);
  if (!urls.length) throw new Error('无可用视频地址');

  const cookie = readRDouyinCookie();
  const dir = path.join(process.cwd(), 'data', 'temp', 'xrk-douyin');
  await FileUtils.ensureDir(dir);
  const dest = path.join(dir, `dy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp4`);

  let lastErr = 'unknown';
  for (const url of urls) {
    for (const headers of downloadHeaderVariants(cookie)) {
      try {
        const res = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(90000),
          headers
        });
        if (!res.ok) {
          lastErr = `HTTP ${res.status}`;
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 1024) {
          lastErr = '视频过小，可能被拦';
          continue;
        }
        if (buf.length > MAX_VIDEO_BYTES) {
          lastErr = `视频过大 ${(buf.length / 1024 / 1024).toFixed(1)}MB`;
          continue;
        }
        if (!(await FileUtils.writeFileBuffer(dest, buf))) {
          throw new Error('写入临时视频失败');
        }
        return dest;
      } catch (err) {
        lastErr = err.message || String(err);
      }
    }
  }
  throw new Error(`视频下载失败 ${lastErr}`);
}

function formatHotValue(n) {
  const v = Number(n) || 0;
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`;
  if (v >= 1e4) return `${(v / 1e4).toFixed(1)}万`;
  return String(v);
}

/** 抖音热搜榜（过滤置顶空热度项） */
export async function fetchDouyinHotList(limit = 30) {
  const json = await dyGet('/aweme/v1/web/hot/search/list/', { detail_list: '1' });
  const raw = json?.data?.word_list || [];
  const list = [];
  for (const item of raw) {
    const word = String(item.word || '').trim();
    if (!word) continue;
    if (!(Number(item.hot_value) > 0) && item.word_type === 14) continue;
    list.push({
      word,
      hotValue: Number(item.hot_value) || 0,
      hotText: formatHotValue(item.hot_value),
      label: LABEL[item.label] || '',
      position: item.position || list.length + 1
    });
    if (list.length >= limit) break;
  }
  return {
    activeTime: json?.data?.active_time || '',
    list
  };
}

export function formatHotListText(board, limit = 20) {
  const rows = (board.list || []).slice(0, limit);
  if (!rows.length) return '抖音热榜暂无数据';
  const lines = [`抖音热榜${board.activeTime ? `（${board.activeTime}）` : ''}`];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const tag = r.label ? `[${r.label}]` : '';
    const heat = r.hotValue > 0 ? ` ${r.hotText}` : '';
    lines.push(`${i + 1}. ${r.word}${tag}${heat}`);
  }
  return lines.join('\n');
}

/** 推荐流视频列表 */
export async function fetchDouyinFeedVideos({ rounds = 1, count = 16 } = {}) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < rounds; i++) {
    const json = await dyGet('/aweme/v1/web/tab/feed/', {
      count: String(count),
      refresh_index: String(i + 1)
    });
    for (const aweme of json?.aweme_list || []) {
      const playUrls = collectPlayUrls(aweme);
      const id = String(aweme.aweme_id || '');
      if (!playUrls.length || !id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        desc: String(aweme.desc || '').trim(),
        author: aweme.author?.nickname || '',
        uri: videoUri(aweme),
        playUrl: playUrls[0],
        playUrls,
        durationMs: durationMsOf(aweme),
        cover: aweme.video?.cover?.url_list?.[0] || aweme.video?.origin_cover?.url_list?.[0] || ''
      });
    }
  }
  return out;
}

/** 随机打乱后取候选池（优先短视频） */
function feedCandidatePool(list) {
  const short = list.filter(v => !v.durationMs || v.durationMs <= MAX_FEED_DURATION_MS);
  const pool = [...(short.length ? short : list)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** 随机一条推荐视频（优先 ≤90s） */
export async function pickDouyinFeedVideo() {
  const list = await fetchDouyinFeedVideos({ rounds: 1, count: 16 });
  if (!list.length) return null;
  return feedCandidatePool(list)[0] || null;
}

/**
 * 选一条并能下下来的推荐视频（单条 403 时换下一条，最多试 4 条）
 */
export async function pickDownloadableFeedVideo({ tries = 4 } = {}) {
  const list = await fetchDouyinFeedVideos({ rounds: 1, count: 16 });
  if (!list.length) return null;
  const pool = feedCandidatePool(list);
  let lastErr = '';
  for (const v of pool.slice(0, Math.max(1, tries))) {
    try {
      const localPath = await downloadDouyinPlayToFile(v.playUrls || v.playUrl);
      return { ...v, localPath };
    } catch (err) {
      lastErr = err.message || String(err);
      Bot.makeLog('debug', `[XRK douyin] 候选 ${v.id} 下载失败: ${lastErr}`, 'XRK-plugin');
    }
  }
  throw new Error(lastErr || '暂无可用视频');
}

/** 热榜随机一词 + 可下载的推荐视频 */
export async function pickDouyinHotWordWithFeedVideo() {
  const board = await fetchDouyinHotList(30);
  const words = board.list.filter(w => w.hotValue > 0);
  const word = words.length
    ? words[Math.floor(Math.random() * Math.min(words.length, 15))]
    : null;
  const video = await pickDownloadableFeedVideo();
  return { word, video, activeTime: board.activeTime };
}
