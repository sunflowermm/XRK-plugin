/**
 * 早报：60s JSON + 抖音热榜 → 本地 HTML 截图；失败回退官方图。
 */
import path from 'node:path';
import { FileUtils } from '../../../lib/utils/file-utils.js';
import { fetchImageBuffer } from './fetch-media.js';
import { takeScreenshot } from './web-screenshot.js';
import { fetchDouyinHotList } from './douyin-xrk.js';

const API = 'https://60s.viki.moe/v2/60s';
const TIMEOUT_MS = 15000;
const DEFAULT_INTRO = '早安！这是今天的早报\n';
const DOUYIN_TOP_N = 8;

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

/** 并行附加抖音热榜（无 Cookie / 失败则跳过，不影响早报） */
export async function attachDouyinHotToNews(data, limit = DOUYIN_TOP_N) {
  if (!data || typeof data !== 'object') return data;
  try {
    const board = await fetchDouyinHotList(limit);
    if (board?.list?.length) data.douyin = board;
  } catch (err) {
    Bot.makeLog?.('debug', `[早报] 抖音热榜跳过: ${err.message}`, 'XRK-plugin');
    logger?.debug?.(`[早报] 抖音热榜跳过: ${err.message}`);
  }
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

function renderCoverBlock(data) {
  const src = String(data?.cover || '').trim();
  if (!/^https?:\/\//i.test(src)) return '';
  return `<div class="cover"><img src="${escapeHtml(src)}" alt="" /></div>`;
}

function renderDouyinBlock(board, limit = DOUYIN_TOP_N) {
  const rows = (board?.list || []).slice(0, limit);
  if (!rows.length) return '';
  const items = rows.map((r, i) => {
    const tag = r.label ? `<span class="dy-tag">${escapeHtml(r.label)}</span>` : '';
    const heat = r.hotValue > 0 ? `<span class="dy-heat">${escapeHtml(r.hotText)}</span>` : '';
    return `<li><span class="dy-rank">${i + 1}</span><span class="dy-word">${escapeHtml(r.word)}</span>${tag}${heat}</li>`;
  }).join('');
  const time = board.activeTime
    ? `<span class="dy-time">${escapeHtml(board.activeTime)}</span>`
    : '';
  return `<section class="dy-hot">
    <div class="dy-head">
      <h2 class="dy-title">抖音热榜</h2>
      ${time}
    </div>
    <ol class="dy-list">${items}</ol>
  </section>`;
}

/** 截图用本地字体内联为 data URI，避免 file:// 加载失败回退到系统字体 */
function withEmbeddedFonts(css, newsDir) {
  const fontsDir = path.join(newsDir, 'fonts');
  const title = FileUtils.readFileBufferSync(path.join(fontsDir, 'HYWH-65W.woff'));
  const body = FileUtils.readFileBufferSync(path.join(fontsDir, 'NotoSansSC-Regular.woff2'));
  if (!title?.length || !body?.length) {
    throw new Error('早报字体缺失：请确认 resources/news/fonts 下有 HYWH-65W.woff 与 NotoSansSC-Regular.woff2');
  }
  return css
    .replaceAll(
      "url('fonts/HYWH-65W.woff')",
      `url('data:font/woff;base64,${title.toString('base64')}')`
    )
    .replaceAll(
      "url('fonts/NotoSansSC-Regular.woff2')",
      `url('data:font/woff2;base64,${body.toString('base64')}')`
    );
}

export function writeMorningNewsPage(data, newsDir = NEWS_DIR()) {
  const htmlPath = path.join(newsDir, '_render.html');
  const cssPath = path.join(newsDir, '_render.css');
  const tplHtml = FileUtils.readFileSync(path.join(newsDir, 'news_template.html'));
  const tplCss = FileUtils.readFileSync(path.join(newsDir, 'news_template.css'));
  FileUtils.writeFileSync(cssPath, withEmbeddedFonts(tplCss, newsDir));

  const items = (data.news || []).map(line => `<li>${escapeHtml(line)}</li>`).join('');
  const html = tplHtml
    .replaceAll('{{cssFile}}', '_render.css')
    .replaceAll('{{title}}', '每天60秒读懂世界')
    .replaceAll('{{date}}', escapeHtml(data.date || ''))
    .replaceAll('{{dayOfWeek}}', escapeHtml(data.day_of_week || ''))
    .replaceAll('{{lunarDate}}', escapeHtml(data.lunar_date || ''))
    .replaceAll('{{tip}}', escapeHtml(data.tip || ''))
    .replaceAll('{{coverBlock}}', renderCoverBlock(data))
    .replaceAll('{{newsItems}}', items)
    .replaceAll('{{douyinBlock}}', renderDouyinBlock(data.douyin));
  FileUtils.writeFileSync(htmlPath, html);
  return { htmlPath, cssPath };
}

export async function renderMorningNewsImage(data) {
  const newsDir = NEWS_DIR();
  const { htmlPath, cssPath } = writeMorningNewsPage(data, newsDir);
  try {
    // jpeg + 较低 DPR，控制体积，避免 NapCat 发图超时
    return await takeScreenshot(htmlPath, 'morning_news', {
      fullPage: false,
      width: 800,
      deviceScaleFactor: 1.25,
      imgType: 'jpeg',
      quality: 78,
      selector: '.card',
      waitUntil: 'domcontentloaded',
      imageWaitTimeout: data?.cover ? 2000 : 600,
      fontWaitTimeout: 8000,
      waitFonts: true,
      delayBeforeScreenshot: 200,
      pageEvaluate: `return (async () => {
        if (!document.fonts) return;
        await Promise.all([
          document.fonts.load('400 32px "XRK News Title"'),
          document.fonts.load('400 16px "XRK News Body"')
        ]);
        await document.fonts.ready;
      })()`
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
  const data = await attachDouyinHotToNews(await fetchMorningNewsData());
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
      if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      logger.error(`[早报] 群 ${groupId} 推送失败:`, err);
    }
  }
}
