# 向日葵插件默认配置（标准模板）

本目录为**只读标准配置**，随插件发布。**请勿在此目录直接修改用户配置。**

- 启动时会将本目录下所有 `.yaml`、`.yml`、`.json` 文件复制到 **data/xrkconfig/**（仅当目标文件不存在）。
- 用户与 CommonConfig 管理端只编辑 **data/xrkconfig/** 下的文件，与本体模板隔离，避免冲突。

## 当前模板

| 文件 | 说明 |
|------|------|
| config.yaml | 主配置（帮助优先级、戳一戳、资源分享、群号列表等） |
| help_system.yaml | 帮助菜单标题、主题、样式、分组与条目列表 |
| screenshot.yaml | 网页截图（URL过滤策略与截图参数） |
| ai.json | 词库 AI（消息 → 回复列表） |
| poke_responses.json | 戳一戳文案池（完整戳一戳系统文案） |
| time_config.json | 整点报时表情与文案池 |
| recommended_plugins.json | 安装插件：推荐插件列表 |
| entertainment_plugins.json | 安装插件：文娱类插件列表 |
| game_plugins.json | 安装插件：游戏类插件列表 |
| ip_plugins.json | 安装插件：IP相关插件列表 |
| js_plugins.json | 安装插件：单文件JS插件列表 |

新增模板文件放入本目录即可，下次启动且 data/xrkconfig 中无同名文件时会自动复制。
