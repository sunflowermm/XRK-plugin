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

### 环境要求

- 已安装并运行 **XRK-Yunzai**（Node.js 18+）
- 插件目录：将本仓库放在 `XRK-Yunzai/plugins/XRK-plugin`，或通过主项目「安装插件」等方式拉取

### 依赖

部分功能依赖以下 npm 包，缺失时启动会提示：

| 依赖 | 用途 |
|------|------|
| axios | 网络请求（天气、早报等） |
| uuid | 唯一标识 |
| form-data | 表单上传 |
| node-schedule | 定时任务（整点报时等） |
| sqlite | 本地数据（若启用） |

在项目根目录执行：

```bash
pnpm add axios uuid form-data node-schedule -w
# 或 npm install axios uuid form-data node-schedule -w
```

### 首次使用

启动 XRK-Yunzai 后，插件会自动加载。按各功能触发词或主人设置进行配置即可。

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
