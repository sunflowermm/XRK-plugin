#!/usr/bin/env node
/** 下载早报示例图至 assets/morning-news.png（供 README 展示） */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { fetchMorningNewsImageUrl } from '../lib/morning-news.js';
import { fetchImageBuffer } from '../lib/fetch-media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '..');
const yunzaiRoot = path.resolve(pluginRoot, '../..');

process.chdir(yunzaiRoot);
globalThis.Bot = { makeLog: () => {} };
globalThis.logger = console;

const url = await fetchMorningNewsImageUrl();
const buf = await fetchImageBuffer(url, 20000);
if (!buf) {
  console.error('早报图片下载失败:', url);
  process.exit(1);
}

const out = path.join(pluginRoot, 'assets', 'morning-news.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`已生成: ${out}`);
