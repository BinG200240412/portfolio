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

## 作品页中的字体样张与迭代对照

2026-10-25：字体样张按维护工程 `ios/Sources/Foundation.swift`、`BoardView.swift` 的实际调用核对。字标 Fraunces（wght 380、opsz 144、SOFT 0、WONK 0）；题目数字 EB Garamond（lining/tabular）；填写与候选笔记 Mynerve；中文标题与正文源云明体。网页正文字体仍由全站主题控制，仅样张和操作示意使用 App 字体。

- `mynerve-regular.woff2` 与 `fraunces.woff2` 从 App 原始字体生成 ASCII 与常用标点子集，107 个码位无缺字；轮廓与原字体逐字比对一致，Fraunces 保留变量轴。原始文件信息及 OFL 授权全文见 `fonts-LICENSE.txt`。
- 中文与 EB Garamond 样张复用现有 `assets/fonts/PortfolioGenWan-Medium.woff2`、`EBGaramond.woff2`，许可证位于相同字体目录。
- `board-blue.png` 为既有旧英文界面，仅在「早期界面」对照中使用。它的数字字体与布局均不同于当前维护版本；不能作为当前界面的单纯换色示例。对照的当前画面使用本目录现有 `board.png`，明确标注为维护版本。

## 第二部分的产品展示与组件细节

2026-10-25：广告式双机展示复用原始 `board.png`、`coach.png` 和官方正视机身，用 CSS 透视变换统一改变整台手机的角度。未生成或重绘屏幕内容；两台均朝向观众，便于同时阅读盘面与辅导。

组件细节使用 SVG viewBox 直接查看原始截图的局部，原文件未修改。源码依据（同一维护工程 `ios/Sources/`）：

- `ContentView.swift:497` 的更多按钮使用 `.buttonStyle(.glass)` 与圆形边界；`ContentView.swift:536` 的暂停按钮使用 `.glassEffect(.regular.interactive(), in: Circle())`。仅 iOS 26+ 分支称为 Liquid Glass，低版本回退到 Material。
- `ContentView.swift:971` 的数字键与 `BoardView.swift:143` 的盘面使用连续圆角 RoundedRectangle；未把它们描述为玻璃材质。
- `Sheets.swift:98` 使用系统 TabView/Tab 与 `.tabBarOnly`，对应设置截图底部导航。

## 白底双机摄影底图与精确贴屏（替换早前 CSS 机身透视）

2026-10-25：`iphone-duo-studio-base.png` 是按用户要求使用内置 imagegen 生成的白底双机产品场景，1254 × 1254。它是生成的机身与光影底图，不是官方 Apple 实拍照片；图中屏幕留白。提示词、四角映射及遮挡路径记录在 `docs/sudoku-mockup-production.md`。

网页以独立图层将原始 `board.png` 与 `coach.png` 映射到两块屏幕；截图不交给图像模型重画，源文件未修改。`assets/sudoku-product-scene.js` 使用四点单应映射、屏幕轮廓裁剪与前机机壳遮挡，整组场景按比例缩放；放大时仍复用这套完整场景。第三部分分析图继续使用官方正视机身。

### 黑色机身版本

2026-10-25：按用户选择，将初始蓝色机身通过内置 imagegen 定向改色为中性黑色，保存为 `iphone-duo-studio-black.png`，1254 × 1254。保留原构图、四角映射、机壳遮挡和独立 App 截图图层。原蓝色底图保留为制作源。分析图、辅导及原图放大的正视机身使用仅作用于硬件伪元素的 CSS 去色与轻微压暗，官方原 PNG 和屏幕内容不修改。

### 真正透明的 PNG 版本

2026-10-25：按用户要求使用内置 imagegen 仅移除黑色双机摄影底图外部的白色背景，保存为 `iphone-duo-studio-black-transparent.png`，1254 × 1254、RGBA、有真实 alpha 通道；屏幕内部的白色留白保留供独立 App 截图覆盖。网页去掉双机与文案区域的白色底板，继承全站浅色/深色背景。原始截图、屏幕四角与前机遮挡保持原方案。完整合成另导出为 `iphone-duo-sudoku-transparent.png`，含两块真实 App 界面，可直接使用。
