# 插件列表资源

本目录存放**安装插件**相关的**运行时资源**，不再存放插件列表 JSON 配置。

## 目录职责

- **plugin_screenshots_index.json**：插件截图索引（类别 → PNG 文件列表）
- **template.html**：生成插件截图时使用的 HTML 模板
- **\*_group_*.png**：各分类插件列表的截图缓存

## 插件列表配置（已迁移）

插件列表 JSON 已迁移至 **config/default/** 作为模板，运行时使用 **data/xrkconfig/**：

| 原路径 | 新路径 |
|--------|--------|
| resources/plugins/recommended_plugins.json | config/default/recommended_plugins.json → data/xrkconfig/ |
| resources/plugins/entertainment_plugins.json | config/default/entertainment_plugins.json → data/xrkconfig/ |
| resources/plugins/game_plugins.json | config/default/game_plugins.json → data/xrkconfig/ |
| resources/plugins/ip_plugins.json | config/default/ip_plugins.json → data/xrkconfig/ |
| resources/plugins/js.json | config/default/js_plugins.json → data/xrkconfig/ |

读取插件列表请使用 `lib/plugin-lists.js`：

```js
import { getPluginListPath, readPluginListSync, getResourcesPluginsDir } from './lib/plugin-lists.js';

// 读取推荐插件列表
const list = readPluginListSync('recommended_plugins');

// 获取 resources/plugins 目录（PNG、index 等）
const dir = getResourcesPluginsDir();
```
