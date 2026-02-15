# 向日葵 commonconfig

本目录由框架 **lib/commonconfig/loader.js** 在启动时扫描加载，用于在通用配置管理端展示与编辑向日葵插件配置。

## 加载规则

- 仅加载 `.js` 文件，且模块需 **default 导出**为 `ConfigBase` 子类（或其实例）。
- 配置在管理端中的 **key** = `插件目录名_文件名`，例如 `xrk.js` → **XRK-plugin_xrk**。
- 每个配置类需实现 **getStructure()**（由 ConfigBase 提供，返回 name、displayName、schema 等），供前端渲染表单。

## 与 components/xrkconfig 的关系

- **commonconfig/xrk.js**：定义 schema 与文件路径 `data/xrkconfig/config.yaml`，供管理端读/写/恢复默认。
- **components/xrkconfig.js**：插件运行时单例，读写同一文件，供各 app 通过 `xrkconfig.xxx`、`get/set` 使用。
- 管理端通过 ConfigBase 写入文件后，xrkconfig 的 `fs.watch` 会检测到变更并自动 `load()`，两边无需额外同步。

## 新增配置项

1. 在 **commonconfig/xrk.js** 的 `schema.fields` 中增加字段（含 type、label、default、component 等）。
2. 在 **components/xrkconfig.js** 的 `getDefaultConfig()` 中增加相同 key 的默认值。
3. 若需通过 `xrkconfig.xxx` 访问，在 xrkconfig.js 中增加对应 getter。
