/**
 * 早报：60s JSON → 本地 HTML 截图；失败回退官方图。
 */
import path from 'node:path';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { fetchImageBuffer } from './fetch-media.js';
import { takeScreenshot } from './web-screenshot.js';

const API = 'https://60s.viki.moe/v2/60s';
const TIMEOUT_MS = 15000;
const DEFAULT_INTRO = '早安！这是今天的早报\n';

const NEWS_DIR = () => path.join(process.cwd(), 'plugins/XRK-plugin/resources/news');

export async function fetchMorningNewsData() {
  const res = await fetch(`${API}?encoding=json`, {
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json?.data;
  if (!data?.news?.length) throw new Error(json?.message || '早报接口未返回新闻');
  return data;
}

/** 官方图直链（自渲失败时用） */
export async function fetchMorningNewsImageUrl() {
  try {
    const res = await fetch(`${API}?encoding=image-proxy`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (res.ok && res.headers.get('content-type')?.includes('image')) {
      return `${API}?encoding=image-proxy`;
    }
  } catch (err) {
    logger?.warn?.(`[早报] image-proxy 不可用: ${err.message}`);
  }

  const data = await fetchMorningNewsData();
  if (data.image) return data.image;
  throw new Error('早报接口未返回图片');
}

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function writeMorningNewsPage(data, newsDir = NEWS_DIR()) {
  const htmlPath = path.join(newsDir, '_render.html');
  const cssPath = path.join(newsDir, '_render.css');
  const tplHtml = FileUtils.readFileSync(path.join(newsDir, 'news_template.html'));
  const tplCss = FileUtils.readFileSync(path.join(newsDir, 'news_template.css'));
  FileUtils.writeFileSync(cssPath, tplCss);

  const items = (data.news || []).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const html = tplHtml
    .replaceAll('{{cssFile}}', '_render.css')
    .replaceAll('{{title}}', '每天60秒读懂世界')
    .replaceAll('{{date}}', escapeHtml(data.date || ''))
    .replaceAll('{{dayOfWeek}}', escapeHtml(data.day_of_week || ''))
    .replaceAll('{{lunarDate}}', escapeHtml(data.lunar_date || ''))
    .replaceAll('{{tip}}', escapeHtml(data.tip || ''))
    .replaceAll('{{newsItems}}', items);
  FileUtils.writeFileSync(htmlPath, html);
  return { htmlPath, cssPath };
}

export async function renderMorningNewsImage(data) {
  const newsDir = NEWS_DIR();
  const { htmlPath, cssPath } = writeMorningNewsPage(data, newsDir);
  try {
    return await takeScreenshot(htmlPath, 'morning_news', {
      fullPage: false,
      width: 900,
      deviceScaleFactor: 2,
      imgType: 'png',
      selector: '.card',
      waitUntil: 'domcontentloaded',
      imageWaitTimeout: 800,
      fontWaitTimeout: 600
    });
  } finally {
    await Promise.all([htmlPath, cssPath].map(async (p) => {
      try {
        if (await FileUtils.exists(p)) await FileUtils.unlink(p);
      } catch (err) {
        Bot.makeLog('debug', `[早报] 清理临时文件失败 ${p}: ${err.message}`, 'XRK-plugin');
      }
    }));
  }
}

async function fetchRemoteNewsImage(data) {
  const url = data?.image || await fetchMorningNewsImageUrl();
  const buf = await fetchImageBuffer(url, TIMEOUT_MS);
  if (buf) return buf;
  return url;
}

export function morningNewsCronExpr(hour) {
  return `0 0 ${hour} * * ?`;
}

export async function buildMorningNewsReply(intro = DEFAULT_INTRO) {
  const data = await fetchMorningNewsData();
  let img = null;
  try {
    img = await renderMorningNewsImage(data);
  } catch (err) {
    logger?.warn?.(`[早报] 自渲染失败，回退官方图: ${err.message}`);
  }
  if (!img) img = await fetchRemoteNewsImage(data);
  if (!img) throw new Error('早报图片生成失败');
  return [intro, segment.image(img)];
}

export async function pushMorningNewsToGroups(groups, delayMs = 0, intro = DEFAULT_INTRO) {
  if (!groups?.length) return;

  let reply;
  try {
    reply = await buildMorningNewsReply(intro);
  } catch (err) {
    logger.error('[早报] 获取图片失败:', err);
    return;
  }

  for (const groupId of groups) {
    try {
      const group = Bot.pickGroup(groupId);
      if (!group) {
        logger.error(`[早报] 群 ${groupId} 不存在`);
        continue;
      }
      await group.sendMsg(reply);
    } catch (err) {
      logger.error(`[早报] 群 ${groupId} 推送失败:`, err);
    }
  }
}
