# 向日葵插件 (XRK-plugin)

## 帮助图预览

主帮助与子帮助共用 `resources/help/help_template.*`：**双列**布局、汉仪文黑字体、高透明毛玻璃面板；背景图每次从 `bgother/` 随机抽取（3× 设备像素比 PNG）。

### 主帮助 `#向日葵帮助`

![向日葵帮助预览](assets/help-preview.png)

### 其它帮助（同一套模板与样式）

| 指令 | 预览 |
|------|------|
| `#全局表情帮助` | ![全局表情](assets/help-emoji.png) |
| `#刷步数帮助` | ![刷步数](assets/help-feet.png) |
| `#插件相关帮助` | ![插件管理](assets/help-plugins.png) |
| `#主人相关帮助` | ![主人](assets/help-master.png) |
| `#早报推送帮助` | ![早报](assets/help-news.png) |
| `#整点报时帮助` | ![报时](assets/help-time.png) |

重新生成全部预览图（输出至 `assets/`，与 README 引用一致）：

```bash
node plugins/XRK-plugin/scripts/render-help-preview.mjs
```

## 目录结构

```
XRK-plugin/
├── assets/                   # README 预览图（已纳入版本库）
├── lib/help-render.js        # 渲染 + captureHelpScreenshot
├── lib/sub-help-pages.js     # 子帮助内容
├── resources/help/           # 模板、字体、bgother 背景
├── apps/help.js              # 主帮助
└── apps/其他帮助.js           # 子帮助
```

## 配置

- `help_system.yaml`：`columnCount: 2` 双列；`style.contBgColor` 等控制透明度
- 背景图：`resources/help/bgother/`

## 使用

- **主帮助**：`#向日葵帮助` / `#xrk帮助`
- **子帮助**：见上表指令
- **配置**：`import hub from './lib/xrk-hub.js'`
