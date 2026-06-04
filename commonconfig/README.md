# 向日葵 CommonConfig

本目录由框架 **lib/commonconfig/loader.js** 扫描加载，用于 Web 配置管理端展示与编辑。

## 配置体系

- **标准模板**：`config/default/`（只读）。启动时 `lib/config-paths.js` 的 `ensureAllConfigsSync()` 将 default 下文件复制到 `data/xrkconfig/`（仅缺则复制）。
- **用户配置**：仅编辑 `data/xrkconfig/`，与模板隔离。

## 本目录文件

| 文件 | 管理端 key | 子配置 |
|------|------------|--------|
| xrk.js | xrk | config、help_system、ai、poke_responses、time_config、screenshot、weather、recommended_plugins、entertainment_plugins、game_plugins、ip_plugins、js_plugins |

采用多文件模式（对齐 system.js），点击「向日葵配置」后选择子配置进行编辑。

## 子配置说明

| 子配置 | 文件 | 说明 |
|--------|------|------|
| config | config.yaml | 主配置：帮助优先级、资源分享、戳一戳开关等 |
| help_system | help_system.yaml | 帮助菜单标题、样式、分组列表 |
| ai | ai.json | 词库 AI（消息 → 回复列表） |
| poke_responses | poke_responses.json | 戳一戳文案池 |
| time_config | time_config.json | 整点报时表情与文案池 |
| screenshot | screenshot.yaml | 网页截图：URL 过滤策略与截图参数 |
| weather | weather.yaml | 查天气：nmc.cn 爬取参数（非截图） |
| recommended_plugins | recommended_plugins.json | 安装插件：推荐插件列表 |
| entertainment_plugins | entertainment_plugins.json | 安装插件：文娱类插件列表 |
| game_plugins | game_plugins.json | 安装插件：游戏类插件列表 |
| ip_plugins | ip_plugins.json | 安装插件：IP相关插件列表 |
| js_plugins | js_plugins.json | 安装插件：单文件JS插件列表 |

## 与运行时关系

- **锅巴** 通过根目录 `guoba.support.js` 编辑主配置常用字段（同一 `config.yaml`）；本目录负责 Web 控制台全量子配置。
- 所有子配置写入后由 **lib/xrk-hub.js** 统一 `reload`，与控制台、锅巴、指令侧热更新一致。
- **ai**、**poke_responses**、**time_config** 由各 app 读取 `data/xrkconfig/*.json`。
- **screenshot** 由 `apps/web_screenshot.js` 读取 `data/xrkconfig/screenshot.yaml`。
- **插件列表** 由 `lib/plugin-lists.js` 提供路径与读取接口，模板在 `config/default/`。
