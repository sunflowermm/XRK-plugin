#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import yaml from 'yaml';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');
const yunzaiRoot = path.resolve(pluginRoot, '../..');

process.chdir(yunzaiRoot);
globalThis.Bot = { makeLog: () => {} };
global.logger = console;

const { parseHelpSystem } = await import('../lib/config-normalize.js');
const { getConfigPath } = await import('../lib/config-paths.js');
const {
  writeHelpPage,
  HELP_PAGE_WIDTH,
  HELP_DEVICE_SCALE,
  filterHelpList
} = await import('../lib/help-render.js');
const { SUB_HELP_PAGES } = await import('../lib/sub-help-pages.js');

const defaultPath = path.join(pluginRoot, 'config/default/help_system.yaml');
const userPath = getConfigPath('help_system');
const helpYaml = fs.readFileSync(fs.existsSync(userPath) ? userPath : defaultPath, 'utf8');
const { cfg: helpCfg, list: helpList } = parseHelpSystem(yaml.parse(helpYaml));
const previewList = filterHelpList(helpList, true);

const jobs = [
  {
    slug: '_preview-main',
    out: 'help-preview.png',
    title: helpCfg.title,
    subTitle: helpCfg.subTitle,
    helpList: previewList,
    helpCfg
  },
  ...Object.entries(SUB_HELP_PAGES).map(([key, page]) => ({
    slug: `_preview-${key}`,
    out: `help-${key}.png`,
    title: page.title,
    subTitle: page.subTitle ?? '',
    helpList: page.groups,
    helpCfg
  }))
];

const outDir = path.join(pluginRoot, 'assets');
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    const { htmlPath, cssPath } = writeHelpPage({
      slug: job.slug,
      helpCfg: job.helpCfg,
      helpList: job.helpList,
      title: job.title,
      subTitle: job.subTitle
    });
    await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluateHandle('document.fonts.ready');
    const clip = await page.evaluate(() => {
      const root = document.querySelector('.container') || document.body;
      const rect = root.getBoundingClientRect();
      const h = Math.ceil(rect.bottom + window.scrollY + 4);
      return { x: 0, y: 0, width: 1280, height: Math.max(h, 120) };
    });
    await page.setViewport({
      width: HELP_PAGE_WIDTH,
      height: clip.height,
      deviceScaleFactor: HELP_DEVICE_SCALE
    });
    const outFile = path.join(outDir, job.out);
    await page.screenshot({ path: outFile, clip, type: 'png' });
    console.log(`已生成: ${outFile}`);
    fs.unlinkSync(htmlPath);
    fs.unlinkSync(cssPath);
  }
} finally {
  await browser.close();
}
