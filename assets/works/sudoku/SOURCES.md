# 极简数独截图来源

采集日期：2026-10-24。此目录用于第一版极简数独，Bundle ID `com.hanyuzhu.sudoku`、App Store ID `6775198044`；与美式报刊视觉探索的素材分开。

## iPhone 机身外框

2026-10-25 新增 `iphone-17-pro-max-deep-blue-portrait.png`，来自 [Apple Design Resources / Product Bezels](https://developer.apple.com/design/resources/#product-bezels) 的 [iPhone 17 官方素材包](https://devimages-cdn.apple.com/design/resources/download/Bezel-iPhone-17.dmg)。原文件名 `iPhone 17 Pro Max - Deep Blue - Portrait.png`，1470 × 3000，526,669 字节；按原始字节复制，未重绘、调色或重新编码。使用遵循 Apple 原包附带条款及其链接的 [Marketing Resources and Identity Guidelines](https://developer.apple.com/app-store/marketing/guidelines/)。

屏幕开口坐标为 x=75、y=66，尺寸 1320 × 2868，与下列原始截图一致。网页以独立图层叠加机身，保留官方边框、按键和灵动岛相机细节；五张截图文件未修改。图库、辅导展示及放大查看复用同一机身，切换仅改变内部截图。

SHA-256：`5201a518fd2d3c6f968ad522a195c24793d7583e1d011d618aa705383bdde4da`。

## 当前作品页的五张截图

五张均来自同一份真实原生 App 开发构建：`1.2 (28)`，Debug / iOS Simulator。统一为中文界面、鼠尾绿 `.sage` 主题、6.9 寸 iPhone 17 Pro Max、iOS 26.5、1320 × 2868；状态栏固定 09:41。

原始截图保存在 `/Users/bing/Documents/codex/2026-10-24/sudoku-green-screenshots/`，与本目录同名文件逐字节一致。通过 `xcrun simctl io ... screenshot` 直接获取屏幕内容，没有模拟器窗口外框、鼠标指针或网页内容，没有重着色、滤镜、裁切或拼接。

| 网站文件 | 已有 DEBUG 启动参数 | 实际画面 |
| --- | --- | --- |
| `board.png` | `-zh` | 简单难度主棋盘，鼠尾绿进度条与计时标记 |
| `coach.png` | `-zh -coach` | 内置离线“隐性唯一”辅导：高亮目标行与格子，“先自己想想”步骤；不是联网请求等待态 |
| `settings.png` | `-zh -settings` | 设置分类首页：对局规则、盘面辅助、导师、声音与震动、外观、语言等 |
| `classics.png` | `-zh -classics` | 经典残局列表，含 AI Escargot、Inkala 2012 等条目与 SE 信息 |
| `share.png` | `-zh -share -fill` | 分享这局残局：真实盘面预览、已填 8/54 格、发送给朋友按钮；预览不含候选笔记 |

## 工程与采集设置

- 源工程：`/Users/bing/Documents/codex/2026-10-11/sudoku-minimal-maintenance/ios/Sudoku.xcodeproj`，scheme `Sudoku`。
- 版本、Bundle ID 均再次从实际构建产物 `Sudoku.app/Info.plist` 核对。
- 采集设备：新建的独立模拟器 `Sudoku Portfolio Capture`（UDID `778FF9AD-7257-4C3C-9D43-18A4090E5152`）；没有覆盖用户原有模拟器的应用或数据。
- 只在该模拟器的应用偏好中选择现有的 `sage`、中文和 `coachMode=standard`，确认离线配置保存成功后采集；没有请求线上教练服务，也没有修改 App 功能或源码。
- 所有次级页面均使用工程已有的 DEBUG 参数打开；分享的少量已填数字也由已有 `-fill` 逻辑生成。
- 构建目录 `/tmp/portfolio-sudoku-green-dd`；日志 `/tmp/portfolio-sudoku-green-build.log`，结果 `BUILD SUCCEEDED`。本次仅为原生界面采集，不代表真机或 App Store 二进制验收。

## 与公开商店版本的边界

Apple 官方 [App Store 页面](https://apps.apple.com/cn/app/sudoku-2026/id6775198044) 与 [Lookup API](https://itunes.apple.com/lookup?id=6775198044&country=cn) 本次返回 `Sudoku.2026`、版本 `1.1.1`（2026-07-11）。当前作品页五张图来自上述 `1.2 (28)` 维护构建，不能称为线上 `1.1.1` 的全套商店截图。

本次也核对了用户本地 `.../Sudoku.by BinG/Sudoku/iPhone截图-6.9寸/` 的绿色商店原图。其中主棋盘、英文设置与世界难题棋盘可用，但教练图处于等待态、没有干净分享图。为统一版本与语言，最终五张全部采用同次原生维护构建的截图。原有橙色截图源自 `.../Sudoku.by BinG/Sudoku/产品截图/` 的 2026-06-12 旧图，本次五个当前引用均已替换。
