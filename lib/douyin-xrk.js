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

const PLAY = 'https://aweme.snssdk.com/aweme/v1/play/?video_id={}&ratio=720p&line=0';

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

/** 推荐流视频列表（多刷几次凑够） */
export async function fetchDouyinFeedVideos({ rounds = 3, count = 12 } = {}) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < rounds; i++) {
    const json = await dyGet('/aweme/v1/web/tab/feed/', {
      count: String(count),
      refresh_index: String(i + 1)
    });
    for (const aweme of json?.aweme_list || []) {
      const uri = videoUri(aweme);
      const id = String(aweme.aweme_id || '');
      if (!uri || !id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        desc: String(aweme.desc || '').trim(),
        author: aweme.author?.nickname || '',
        uri,
        playUrl: PLAY.replace('{}', uri),
        cover: aweme.video?.cover?.url_list?.[0] || aweme.video?.origin_cover?.url_list?.[0] || ''
      });
    }
  }
  return out;
}

/** 随机一条推荐视频 */
export async function pickDouyinFeedVideo() {
  const list = await fetchDouyinFeedVideos();
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

/** 热榜随机一词 + 推荐视频（搜索接口有 verify_check，用推荐流代替） */
export async function pickDouyinHotWordWithFeedVideo() {
  const board = await fetchDouyinHotList(30);
  const words = board.list.filter(w => w.hotValue > 0);
  const word = words.length
    ? words[Math.floor(Math.random() * Math.min(words.length, 15))]
    : null;
  const video = await pickDouyinFeedVideo();
  return { word, video, activeTime: board.activeTime };
}
