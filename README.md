# 向日葵插件 (XRK-plugin)

## 目录结构

```
XRK-plugin/
├── config/
│   ├── default/              # 默认配置模板（只读，启动时复制到 data/xrkconfig/）
│   │   ├── config.yaml       # 主配置
│   │   ├── help_system.yaml  # 帮助菜单
│   │   ├── screenshot.yaml   # 网页截图
│   │   ├── ai.json           # 词库 AI
│   │   ├── poke_responses.json # 戳一戳文案池
│   │   ├── time_config.json  # 整点报时文案池
│   │   ├── recommended_plugins.json   # 安装插件：推荐
│   │   ├── entertainment_plugins.json # 安装插件：文娱
│   │   ├── game_plugins.json         # 安装插件：游戏
│   │   ├── ip_plugins.json           # 安装插件：IP类
│   │   ├── js_plugins.json           # 安装插件：JS单文件
│   │   └── README.md
├── lib/                      # 插件核心逻辑（配置加载与单例）
│   ├── config-paths.js       # 路径与启动复制 ensureAllConfigsSync
│   ├── plugin-lists.js       # 插件列表路径与读取（data/xrkconfig/*.json）
│   ├── xrkconfig.js          # 主配置单例（data/xrkconfig/config.yaml）
│   └── help_system.js        # 帮助配置加载（data/xrkconfig/help_system.yaml）
├── components/
│   └── xrkconfig.js          # 兼容入口 → lib/xrkconfig.js
├── commonconfig/             # 框架扫描，Web 控制台编辑（仅一个入口）
│   ├── xrk.js                # 多文件配置：config、help_system、ai、poke_responses、time_config、screenshot、5个安装插件列表
│   └── README.md
├── guoba.support.js          # 锅巴面板：export supportGuoba()，由 guoba-plugin 自动扫描加载
├── apps/                     # 业务指令（index.js 自动加载）
└── README.md
```

## 配置体系

- **标准模板**：`config/default/`，随插件发布，用户不直接改。
- **用户配置**：`data/xrkconfig/`，启动时从 default 复制缺的文件；CommonConfig 与各模块只读写此目录。
- **入口**：首次加载会执行 `ensureAllConfigsSync()`，将 default 下 `.yaml`/`.yml`/`.json` 复制到 `data/xrkconfig/`（仅当目标不存在）。

## 使用方式

- **锅巴**：安装 `guoba-plugin` 后，锅巴左侧会出现「向日葵插件」；主配置写 `config.yaml`，查天气项写 `weather.yaml`（`weather_cfg.*` 字段）。多文件完整编辑仍用 XRK 控制台「向日葵配置」。
- **查天气**：`#查天气北京`，爬取 [中央气象台](http://www.nmc.cn/) 页面 `id=day7` 七天预报区，不再使用区域截图。
- **主配置**：`import xrkconfig from './lib/xrkconfig.js'`（或 `./components/xrkconfig.js`），使用 `xrkconfig.get/set`、`xrkconfig.xxx`。
- **帮助配置**：`import { helpCfg, helpList } from './lib/help_system.js'`。
- **读其它配置文件**：`import { readConfigSync, getConfigPath } from './lib/config-paths.js'`，例如：`readConfigSync('screenshot')` 读取 `data/xrkconfig/screenshot.yaml`。
- **读插件列表**：`import { readPluginListSync, getResourcesPluginsDir } from './lib/plugin-lists.js'`，例如：`readPluginListSync('recommended_plugins')` 读取 `data/xrkconfig/recommended_plugins.json`。

## 依赖

- 框架：`lib/utils/file-utils.js`、`lib/commonconfig/commonconfig.js`
- 插件内仅 `lib/` 为实现目录；`components/xrkconfig.js` 为兼容入口（历史 app 仍在引用）。
