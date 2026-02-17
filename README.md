<h1 align="center">XRK-plugin（向日葵插件）</h1>

<p align="center">
  <strong>XRK-Yunzai 的功能扩展插件</strong><br>
  提供帮助、早报、整点报时、网页截图、插件管理、天气、群文件等能力，随主项目一起使用。
</p>

<div align="center">

![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js)

</div>

---

## ✨ 功能概览

| 分类 | 能力 |
|------|------|
| 帮助与配置 | 帮助菜单、其他帮助、主人设置、全局表情设置、插件/安装插件、插件管理、远程指令 |
| 内容与娱乐 | 早报、整点报时、戳一戳、骗赞、偷图、资源库、人工 AI、全局表情 |
| 工具 | 网页截图、查天气、群文件、刷步数 |

依赖主项目 [XRK-Yunzai](https://github.com/sunflowermm/XRK-Yunzai) 的插件体系（`plugin` 基类、工作流、配置等）。

---

## 🚀 安装与使用

- 需已运行 **XRK-Yunzai**（Node.js 18+）。在项目内发送「向日葵妈咪妈咪哄」或「#向日葵妈咪妈咪哄」自动下载/更新本插件及原神适配器（GitCode 失败会切 GitHub）。QQ 需主人权限；终端/stdin、Web 控制台、API 默认主人。**无需打依赖**，跟本体依赖即可。启动后插件自动加载，按触发词或主人设置配置即可。

---

## 🗂 目录结构

```
XRK-plugin/
├── index.js              # 入口、依赖检查、凭证清理
├── package.json
├── guoba.support.js      # 锅巴支持（若使用）
├── apps/                 # 功能模块
│   ├── 帮助.js
│   ├── 早报相关.js
│   ├── 整点报时.js
│   ├── 网页截图.js
│   ├── 插件管理.js / 安装插件.js
│   ├── 主人设置.js / 远程指令.js
│   ├── 查天气.js / 群文件.js / 戳一戳.js
│   └── …
├── components/           # 公共组件
│   ├── xrkconfig.js
│   ├── config.js
│   ├── util/
│   ├── restart.js
│   └── apiKey.js
├── commonconfig/         # 公共配置（如 xrk.js）
├── config/               # 插件配置（天气、整点、戳一戳等）
└── resources/            # 帮助模板、静态资源、缓存
```

---

## ⚙️ 配置说明

- 插件相关配置与数据目录：`data/xrkconfig/`（含截图、凭证、缓存等）
- 各子功能配置见 `config/` 下对应 json（如 `time_config.json`、`sign-servers.json`、`ai.json` 等）
- 主人设置、远程指令等需在主项目或本插件内按提示配置权限与命令

---

## 📄 许可证

MIT License，见 [LICENSE](./LICENSE)。Copyright (c) 2025 Sunflower Studio。
