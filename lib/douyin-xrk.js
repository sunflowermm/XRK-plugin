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

const PLAY_360 = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=360p&line=0';
const PLAY = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=540p&line=0';
const PLAY_720 = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=720p&line=0';
/** 与 R 下载器一致的移动端 UA（桌面 UA + CDN 直链易 403） */
const UA_MOBILE =
  'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.25 Mobile Safari/537.36';
/** 推荐流跳过过长视频（毫秒） */
const MAX_FEED_DURATION_MS = 45_000;
/** QQ 上传友好上限（过严会导致全员失败；过松易超时） */
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

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
  // 优先 H.264：ByteVC1/HEVC 在 QQ 里常黑屏只出声
  return aweme?.video?.play_addr_h264?.uri
    || aweme?.video?.play_addr?.uri
    || aweme?.video?.download_addr?.uri
    || aweme?.video?.bit_rate?.find(b => isH264FriendlyRate(b))?.play_addr?.uri
    || aweme?.video?.bit_rate?.[0]?.play_addr?.uri
    || '';
}

function pushUrl(urls, u) {
  if (typeof u === 'string' && /^https?:\/\//i.test(u) && !urls.includes(u)) urls.push(u);
}

function isH264FriendlyRate(b) {
  if (!b?.play_addr) return false;
  if (b.is_bytevc1 === 1 || b.is_bytevc1 === true) return false;
  const tip = `${b.gear_name || ''} ${b.codec_type || ''} ${b.format || ''}`.toLowerCase();
  if (/bytevc|h265|hevc|hvc1|hev1/.test(tip)) return false;
  const w = Number(b.play_addr.width) || 0;
  const h = Number(b.play_addr.height) || 0;
  if (w < 2 || h < 2) return false;
  return true;
}

/** 仅 snssdk play（web CDN 常 403）；360p→540p→720p，且强制 H.264 uri */
function collectPlayUrls(aweme) {
  const urls = [];
  const uri = aweme?.video?.play_addr_h264?.uri || videoUri(aweme);
  if (!uri) return urls;
  pushUrl(urls, PLAY_360.replace('{}', uri));
  pushUrl(urls, PLAY.replace('{}', uri));
  pushUrl(urls, PLAY_720.replace('{}', uri));
  return urls;
}

function durationMsOf(aweme) {
  let n = Number(aweme?.duration) || Number(aweme?.video?.duration) || 0;
  if (n > 0 && n < 1000) n *= 1000;
  return n > 0 ? n : 0;
}

function downloadHeaderVariants(cookie) {
  // snssdk 常无需 Cookie；带 Cookie 的 CDN 反而易 403
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

/** 粗检：须为含 H.264 视频轨的 mp4；纯音频 / 仅 HEVC 在 QQ 会黑屏 */
function isQqPlayableVideo(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 2048) return false;
  const probe = buf.slice(0, Math.min(buf.length, 512 * 1024)).toString('latin1');
  if (!probe.includes('ftyp') && buf.slice(4, 8).toString('ascii') !== 'ftyp') return false;
  const hasAvc = /avc1|avc3/i.test(probe);
  const hasVide = /vide/i.test(probe);
  const hasHevc = /hev1|hvc1|bytevc/i.test(probe);
  const hasSoun = /soun|mp4a/i.test(probe);
  if (hasSoun && !hasVide && !hasAvc && !hasHevc) return false;
  if (hasHevc && !hasAvc) return false;
  return hasAvc || hasVide;
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
        const contentLen = Number(res.headers.get('content-length') || 0);
        if (contentLen > MAX_VIDEO_BYTES) {
          lastErr = `视频过大 ${(contentLen / 1024 / 1024).toFixed(1)}MB`;
          try { await res.body?.cancel?.(); } catch { /* ignore */ }
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
        if (!isQqPlayableVideo(buf)) {
          lastErr = '非 QQ 可播画面（纯音频/HEVC）';
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
      position: item.position || list.length + 1,
      sentenceId: String(item.sentence_id || '').trim(),
      groupId: String(item.group_id || '').trim()
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
      const v = normalizeAweme(aweme);
      if (!v || seen.has(v.id)) continue;
      seen.add(v.id);
      out.push(v);
    }
  }
  return out;
}

function normalizeAweme(aweme) {
  if (!aweme) return null;
  const playUrls = collectPlayUrls(aweme);
  const id = String(aweme.aweme_id || '');
  if (!playUrls.length || !id) return null;
  return {
    id,
    desc: String(aweme.desc || '').trim(),
    author: aweme.author?.nickname || '',
    uri: videoUri(aweme),
    playUrl: playUrls[0],
    playUrls,
    durationMs: durationMsOf(aweme),
    cover: aweme.video?.cover?.url_list?.[0] || aweme.video?.origin_cover?.url_list?.[0] || ''
  };
}

/** 作品详情（搜索接口常 verify_check，热词页只给 id 时用此补全） */
export async function fetchAwemeById(awemeId) {
  const json = await dyGet('/aweme/v1/web/aweme/detail/', { aweme_id: String(awemeId) });
  const v = normalizeAweme(json?.aweme_detail);
  if (!v) throw new Error(`作品详情无效: ${awemeId}`);
  return v;
}

/** 热榜话题页 SSR 抽关联 aweme_id（搜索接口会被 verify_check） */
async function fetchHotTopicAwemeIds(sentenceId) {
  const cookie = readRDouyinCookie();
  const url = `https://www.douyin.com/hot/${encodeURIComponent(sentenceId)}`;
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
    headers: {
      'User-Agent': UA,
      Referer: 'https://www.douyin.com/',
      Accept: 'text/html,application/xhtml+xml',
      ...(cookie ? { cookie } : {})
    }
  });
  if (!res.ok) throw new Error(`热榜话题页 HTTP ${res.status}`);
  const html = await res.text();
  const ids = new Set();
  for (const re of [/\/video\/(\d{15,})/g, /"aweme_id"\s*:\s*"(\d{15,})"/g, /modal_id=(\d{15,})/g]) {
    for (const m of html.matchAll(re)) ids.add(m[1]);
  }
  return [...ids];
}

/** 某热词下的关联视频列表 */
export async function fetchHotTopicVideos(sentenceId, { limit = 6 } = {}) {
  if (!sentenceId) return [];
  const ids = await fetchHotTopicAwemeIds(sentenceId);
  const out = [];
  for (const id of ids.slice(0, Math.max(1, limit))) {
    try {
      out.push(await fetchAwemeById(id));
    } catch (err) {
      Bot.makeLog('debug', `[XRK douyin] 热词作品 ${id} 失败: ${err.message}`, 'XRK-plugin');
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

function shuffle(list) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** 随机一条推荐视频 */
export async function pickDouyinFeedVideo() {
  const list = await fetchDouyinFeedVideos({ rounds: 1, count: 16 });
  if (!list.length) return null;
  return feedCandidatePool(list)[0] || null;
}

/**
 * 选一条并能下下来的推荐视频（单条 403 时换下一条，最多试 4 条）
 */
export async function pickDownloadableFeedVideo({ tries = 8 } = {}) {
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

/**
 * 热榜热词 + 该话题页关联视频（与热词相关；不再塞推荐流）
 */
export async function pickDownloadableHotWordVideo({ wordTries = 5, videoTries = 4 } = {}) {
  const board = await fetchDouyinHotList(30);
  const words = board.list.filter(w => w.hotValue > 0 && w.sentenceId);
  if (!words.length) throw new Error('热榜暂无可用热词');

  let lastErr = '';
  for (const word of shuffle(words).slice(0, Math.max(1, wordTries))) {
    try {
      const videos = await fetchHotTopicVideos(word.sentenceId);
      if (!videos.length) {
        lastErr = `热词「${word.word}」暂无关联视频`;
        continue;
      }
      for (const v of feedCandidatePool(videos).slice(0, Math.max(1, videoTries))) {
        try {
          const localPath = await downloadDouyinPlayToFile(v.playUrls || v.playUrl);
          return { word, video: { ...v, localPath }, activeTime: board.activeTime };
        } catch (err) {
          lastErr = err.message || String(err);
          Bot.makeLog('debug', `[XRK douyin] 热词视频 ${v.id} 下载失败: ${lastErr}`, 'XRK-plugin');
        }
      }
    } catch (err) {
      lastErr = err.message || String(err);
      Bot.makeLog('debug', `[XRK douyin] 热词「${word.word}」失败: ${lastErr}`, 'XRK-plugin');
    }
  }
  throw new Error(lastErr || '暂无可用热词视频');
}
