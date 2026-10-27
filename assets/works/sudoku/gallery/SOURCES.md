# 原生界面展示墙来源

采集日期：2026-10-27。所有新增 PNG 都由 `xcrun simctl io 778FF9AD-7257-4C3C-9D43-18A4090E5152 screenshot` 直接获取，1320 × 2868，未裁切、调色、重绘、拼接或翻译像素。App 实际构建为 `com.hanyuzhu.sudoku`、`1.2 (28)`，iPhone 17 Pro Max / iOS 26.5，09:41、普通满电、`.sage` 主题。

仅使用专用 `Sudoku Portfolio Capture`。通过既有 DEBUG 入口选择语言与页面，再使用真实原生按钮进入内部页面。未修改 App 源码、未请求线上导师、未编造统计或完成记录。采集结束后关闭该专用模拟器；用户的 `Sudoku Minimal Preview` 保持 Booted，未操作。

## 九类新增的中文、英文成对页面

| 文件（后缀 `-zh.png` / `-en.png`） | 真实入口及状态 |
| --- | --- |
| `gameplay` | `-zh/-en -settings` → 对局规则 / Gameplay；纸上模式关闭、错误次数限制开启、长按罗盘选择标色 |
| `assists` | 设置 → 盘面辅助 / Assists；保留设备真实的高亮、笔记与剩余计数开关状态 |
| `guidance` | 设置 → 导师 / Guidance；内置离线引导，未接入模型或请求网络 |
| `appearance` | 设置 → 外观 / Appearance；计时器、常规数字字重与鼠尾绿信号色及其他可选配色 |
| `feedback` | 设置 → 声音与震动 / Sound & Haptics；完成微光与震动开启、音效关闭 |
| `board-editor` | 设置 → 外观 → 编辑盘面 / Edit board；真实布局组件、放置槽与组件库；仅进入，未拖动或删除布局 |
| `guide` | `-zh/-en -settings -guide`；真实教程目录，中文界面原本即保留英文术语 |
| `guide-lesson` | 教程目录 → 隐性唯一数 / Hidden Single；真实正文与 TechniqueDiagram，包含盘面与候选数字示意 |
| `walkthrough` | `-zh/-en -classics` → AI Escargot 的列表图标；完整解法播放器，0/58 步初始状态；没有生成或声称已完成一局 |

中英文分别运行既有语言选项，采用 App 内翻译及实际排版。盘面编辑示例随当前真实游戏不同；没有为了两张像素相同而伪造盘面。教程中文正文中的标点与原生排版也原样保留。

## 为现有四类页面补齐英文

| 新增英文文件 | 对应现有中文文件 | 实际采集状态 |
| --- | --- | --- |
| `board-en.png` | `../board.png`，或已有 `../visual/board-study.png` | `-en -share -fill` 后关闭真实分享 Sheet；中等难度、8 个真实正确填写及 6 个候选笔记格；题目与中文素材不同 |
| `settings-en.png` | `../settings.png` | `-en -settings`；设置分类首页 |
| `classics-en.png` | `../classics.png` | `-en -classics`；经典残局列表 |
| `share-en.png` | `../share.png` | `-en -share -fill`；真实分享预览，已填 8 格，未按发送按钮 |

现有中文四张为此前确认的同一 `1.2 (28)` 维护构建、相同设备规格与鼠尾绿主题，本次没有重新生成或覆盖。旧版 `board-blue.png` 没有混入英文对图。

本地 `artifacts/sudoku-history-gallery-20261027/capture-metadata.json` 包含文件尺寸、SHA-256、历史录屏剪辑范围与设备信息；`gallery-contact.jpg` 为检查联系表。原始历史录屏、首尾截图与不用作展示墙的历史中间截图保留为本地证据。历史视频来源另见 [`../history/SOURCES.md`](../history/SOURCES.md)。
