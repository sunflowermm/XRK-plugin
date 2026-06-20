import { getDefaultNmcClip } from '../config-normalize.js'

export function normalizeNmcClip(clip = {}) {
  const def = getDefaultNmcClip()
  return {
    selectors: clip.selectors || def.selectors,
    anchor: clip.anchor ?? def.anchor,
    bottom_anchor: clip.bottom_anchor ?? def.bottom_anchor,
    width: clip.width ?? def.width,
    x: clip.x ?? def.x,
    padding: { ...def.padding, ...(clip.padding || {}) },
  }
}

export function resolveNmcClipConfig(cfg = {}) {
  return normalizeNmcClip(cfg.screenshot?.clip || {})
}

function buildNmcClipBody(cfgJson) {
  return `
    const cfg = ${cfgJson};
    const pad = cfg.padding || {};
    const pl = Number(pad.left) || 0;
    const pr = Number(pad.right) || 0;
    const pt = Number(pad.top) || 0;
    const pb = Number(pad.bottom) || 0;

    const measure = (el) => {
      const r = el.getBoundingClientRect();
      let top = r.top;
      if (el.id === 'realWarn' || el.classList?.contains('alarmmsg')) {
        el.querySelectorAll('img, a, span, svg').forEach((c) => {
          const st = getComputedStyle(c);
          if (st.display === 'none' || st.visibility === 'hidden') return;
          const cr = c.getBoundingClientRect();
          if (cr.width > 0 && cr.height > 0) top = Math.min(top, cr.top);
        });
      }
      return {
        left: r.left + window.scrollX,
        top: top + window.scrollY,
        right: r.right + window.scrollX,
        bottom: r.bottom + window.scrollY,
      };
    };

    const rects = (cfg.selectors || [])
      .map(s => document.querySelector(s))
      .filter(Boolean)
      .map(measure)
      .filter(r => (r.right - r.left) > 0 && (r.bottom - r.top) > 0);
    if (!rects.length) return null;

    let y1 = Math.min(...rects.map(r => r.top)) - pt;
    let y2 = Math.max(...rects.map(r => r.bottom)) + pb;
    const bottomEl = cfg.bottom_anchor ? document.querySelector(cfg.bottom_anchor) : null;
    if (bottomEl) {
      y2 = Math.min(y2, bottomEl.getBoundingClientRect().bottom + window.scrollY + pb);
    }

    const anchor = cfg.anchor ? document.querySelector(cfg.anchor) : null;
    const fixedW = Number(cfg.width) || 0;
    const fixedX = cfg.x;
    let x1;
    let x2;
    if (fixedW > 0) {
      if (fixedX != null && fixedX !== '' && Number.isFinite(Number(fixedX))) {
        x1 = Number(fixedX);
      } else if (anchor) {
        x1 = anchor.getBoundingClientRect().left + window.scrollX + pl;
      } else {
        x1 = Math.min(...rects.map(r => r.left)) + pl;
      }
      x2 = x1 + fixedW;
    } else if (anchor) {
      const ar = anchor.getBoundingClientRect();
      x1 = ar.left + window.scrollX - pl;
      x2 = ar.right + window.scrollX + pr;
    } else {
      x1 = Math.min(...rects.map(r => r.left)) - pl;
      x2 = Math.max(...rects.map(r => r.right)) + pr;
    }

    return {
      x: Math.max(0, Math.floor(x1)),
      y: Math.max(0, Math.floor(y1)),
      width: Math.ceil(x2 - x1),
      height: Math.ceil(y2 - y1),
    };
  `
}

/** 截图前清理 + 返回裁切框（供 Puppeteer 通用 pageEvaluateBeforeScreenshot 使用） */
export function buildNmcBeforeScreenshotScript(clipCfg) {
  const cfgJson = JSON.stringify(normalizeNmcClip(clipCfg))
  return `(() => {
    document.querySelectorAll('#toTop, a#toTop, a[href="#top"], #topBanner, .topLine, footer, .qrcodeList, .frilink')
      .forEach(el => el.style.setProperty('display', 'none', 'important'));
    ${buildNmcClipBody(cfgJson)}
  })()`
}
