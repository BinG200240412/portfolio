# 原生介绍页与数独历史录屏

采集日期：2026-10-27。源 App 为 `/tmp/portfolio-sudoku-green-dd/Build/Products/Debug-iphonesimulator/Sudoku.app`，实际 Info.plist 再次核对为 `com.hanyuzhu.sudoku`、`1.2 (28)`。设备为独立的 `Sudoku Portfolio Capture`（iPhone 17 Pro Max / iOS 26.5），原生屏幕 1320 × 2868，09:41、普通满电、鼠尾绿。没有操作用户的 `Sudoku Minimal Preview`。

`AboutView.swift` 包含完整中文、英文正文。页面由 App 内 WKWebView 原生呈现，顶部保留原生 Sheet 与关闭按钮；从开发者介绍、创作初衷，到数独历史标题、五个历史节点、结语和 `SUDOKU / ABOUT · 2026` 页尾。没有替换文字、网页重绘、拼接长图或模拟滚动。

| 文件 | 语言 | 真实采集过程 | 网页规格 |
| --- | --- | --- | --- |
| `history-zh.mp4` | 简体中文 | 已有 DEBUG 入口 `-zh -settings -about`，原生 Page Down 键逐屏滚动，原始素材从完整 About 顶部录到可见页尾；成片从第 5 秒历史标题完整靠上、引言与第一节点可见的稳定帧开始，保留后续全部五节点与页尾 | H.264，660 × 1434，30 fps，41.733 秒，原速，无音轨，faststart |
| `history-zh.jpg` | 简体中文 | 中文 MP4 第 0 秒导出，未重绘 | 660 × 1434 |
| `history-en.mp4` | 英文 | 用户在专用模拟器中真实滚动，从原始素材 193.4 秒历史标题与引言完整可见处开始，录到完整五节点、结语与 footer；用户原始滚动较快，保持原速 | H.264，660 × 1434，30 fps，11.633 秒，无音轨，faststart |
| `history-en.jpg` | 英文 | 英文 MP4 第 0 秒导出，未重绘 | 660 × 1434 |

原始录屏及首尾证据在本地 `artifacts/sudoku-history-gallery-20261027/`，不随网站发布。中文版最终源为 `history-zh-paced-native.mov`；其他试录保留作为制作记录。网页 MP4 只做等比缩放、帧率统一与 H.264 压缩，未改变滚动速度或顺序。中文仅剪去前 5 秒开发者介绍，原始长录完整保留。

英文最终源为 `history-en-user-scroll-native.mov`（224.142 秒）。因自动鼠标接口 `noWindowsAvailable`，英文重新启动后的键盘滚动也未响应，用户依照采集请求亲自完成英文页滚动；成片使用 193.4–205 秒，保留真实滚动及页尾停留，没有改速。逐秒联系表核对了标题、引言、Euler、巴黎报纸、Garns、Kaji、Gould 与完整 footer；顶部与底部另存原生 PNG 证据。
