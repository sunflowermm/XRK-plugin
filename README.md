<h1 align="center">向日葵插件 · XRK-plugin</h1>

<p align="center">
  <strong>面向 <a href="https://github.com/sunflowermm/XRK-Yunzai">XRK-Yunzai</a> 的多功能消息插件</strong><br>
  帮助图 · 插件安装与管理 · 资源图 · 早报自渲 · 抖音热榜/推荐 · 整点报时
</p>

<div align="center">

[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-XRK--Yunzai-blue?style=flat-square)](https://github.com/sunflowermm/XRK-Yunzai)
[![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen?style=flat-square)](package.json)

</div>

---

## 目录

- [预览](#预览)
- [功能](#功能)
- [环境要求](#环境要求)
- [安装](#安装)
- [常用指令](#常用指令)
- [配置与入库](#配置与入库)
- [重新生成预览图](#重新生成预览图)
- [目录结构](#目录结构)
- [License](#license)

---

## 预览

<p align="center">预览图位于 <code>assets/</code>，随仓库发布；每行两张。</p>

### 帮助卡

<p align="center">
  <img src="assets/help-preview.png" width="48%" alt="#向日葵帮助" />
  <img src="assets/help-plugins.png" width="48%" alt="#插件相关帮助" />
</p>
<p align="center"><sub>左：主帮助　右：插件管理帮助</sub></p>

<p align="center">
  <img src="assets/help-emoji.png" width="48%" alt="全局表情帮助" />
  <img src="assets/help-feet.png" width="48%" alt="刷步数帮助" />
</p>
<p align="center"><sub>左：全局表情　右：刷步数</sub></p>

<p align="center">
  <img src="assets/help-news.png" width="48%" alt="早报推送帮助" />
  <img src="assets/help-time.png" width="48%" alt="整点报时帮助" />
</p>
<p align="center"><sub>左：早报推送帮助　右：整点报时</sub></p>

<p align="center">
  <img src="assets/help-master.png" width="48%" alt="主人相关帮助" />
  <img src="assets/morning-news.png" width="48%" alt="早报示例图" />
</p>
<p align="center"><sub>左：主人管理　右：早报自渲示例</sub></p>

### 安装插件列表

<p align="center">
  <code>#安装插件列表</code> 运行时按分类截图；下列为入库示例（推荐 / 游戏）。<br>
  全量缓存 <code>resources/plugins/*_group_*.png</code> 体积大且随列表变化，<strong>gitignore，不入库</strong>。
</p>

<p align="center">
  <img src="assets/plugins-list-recommended.png" width="48%" alt="推荐插件列表示例" />
  <img src="assets/plugins-list-game.png" width="48%" alt="游戏插件列表示例" />
</p>
<p align="center"><sub>左：推荐插件　右：游戏插件</sub></p>

---

## 功能

| 分类 | 说明 |
|------|------|
| 帮助卡 | 主帮助与各子页（表情 / 步数 / 早报 / 报时 / 插件 / 主人） |
| 插件管理 | 查 / 装 / 删 / 启停；分类列表截图 |
| 资源图 | 随机图与关键词图（东方、cos、黑丝等） |
| 早报 | JSON → 本地 HTML 截图；白名单定时推送 |
| 抖音 | 热榜 / 推荐流 / 热词视频（复用 R Cookie；链接解析请用 R） |
| 其它 | 全局表情、偷图、刷步数、整点报时、天气、群文件等 |

---

## 环境要求

| 组件 | 说明 |
|------|------|
| 框架 | [XRK-Yunzai](https://github.com/sunflowermm/XRK-Yunzai)（Node.js 24+） |
| 可选 | [rconsole-plugin](https://gitee.com/kyrzy0416/rconsole-plugin) + `douyinCookie`（抖音热榜 / 推荐） |

---

## 安装

在 Yunzai 根目录将本仓库克隆到 `plugins/XRK-plugin/`（三选一）：

```bash
# Gitcode（国内）
git clone --depth=1 https://gitcode.com/Xrkseek/XRK-plugin.git plugins/XRK-plugin

# Gitee
git clone --depth=1 https://gitee.com/xrkseek/XRK-plugin.git plugins/XRK-plugin

# GitHub
git clone --depth=1 https://github.com/sunflowermm/XRK-plugin.git plugins/XRK-plugin
```

依赖（在框架根目录按需安装，见启动日志）：

```bash
pnpm add axios uuid form-data node-schedule -w
```

完成后重启 Bot。

---

## 常用指令

| 类别 | 指令 |
|------|------|
| 帮助 | `#向日葵帮助` · `#插件相关帮助` · `#早报推送帮助` · `#全局表情帮助` … |
| 插件 | `#查插件` · `#安装插件列表` · `#安装插件名` · `#停用插件` / `#启用插件` |
| 随机图 | `#随机图片` · `#东方图` · `#cos图` · `#黑丝图` … |
| 早报 | `#早报` · `#今日早报` · 白名单 / 推送时间相关指令 |
| 抖音 | `#抖音热榜` · `#抖音推荐` · `#抖音热词视频` |

<p align="center"><sub>完整条目以帮助图为准。</sub></p>

---

## 配置与入库

| 路径 | 说明 | 入库 |
|------|------|------|
| `config/default/*` | 默认模板（帮助列表、插件分类 JSON 等） | 是 |
| `data/xrkconfig/`（或端口目录） | 运行时用户配置（首次从 default 复制） | 否 |
| `help_system.yaml` | 主帮助文案、`columnCount`、面板样式 | 模板在 default |
| `assets/*.png` | README 预览图（含帮助卡与列表示例） | **是** |
| `resources/help/` | 帮助模板、字体、背景 | 是（运行时 html/css 除外） |
| `resources/plugins/*_group_*.png` | `#安装插件列表` 全量截图缓存 | **否** |
| R：`plugins/rconsole-plugin/config/tools.yaml` | `douyinCookie` | 属 R 仓；勿提交 Cookie |

帮助背景：`lib/sub-help-pages.js` → `HELP_BACKGROUNDS` + `resources/help/bgother/`。

---

## 重新生成预览图

在 **XRK-Yunzai 仓库根目录**执行：

```bash
# 全部帮助预览 → assets/help-*.png
node plugins/XRK-plugin/scripts/render-help-preview.mjs

# 早报示例 → assets/morning-news.png
node plugins/XRK-plugin/scripts/render-morning-news-preview.mjs
```

安装列表示例：从本机 `resources/plugins/` 拷贝到 `assets/`（如 `plugins-list-recommended.png`、`plugins-list-game.png`）。

---

## 目录结构

```
XRK-plugin/
├── apps/                 # 指令入口
├── lib/                  # 帮助渲染、插件列表、抖音、早报等
├── resources/help/       # 帮助模板、字体、背景
├── resources/plugins/    # 列表 HTML 模板；全量截图缓存不入库
├── assets/               # 入库预览 PNG
├── config/default/       # 默认配置模板
├── scripts/              # 预览渲染脚本
└── commonconfig/         # CommonConfig（若启用）
```

---

## License

<p align="center">
  <a href="LICENSE">MIT</a> © Sunflower Studio
</p>
