# 数独双机展示制作记录

2026-10-25。生成方式：**内置 imagegen**，不是 CLI/API fallback。

## 交付资产

- 当前透明底图：`assets/works/sudoku/iphone-duo-studio-black-transparent.png`，1254 × 1254，RGBA；外部白底已移除。
- 完整透明成品：`assets/works/sudoku/iphone-duo-sudoku-transparent.png`，含两块真实 App 界面，直接下载即可使用。
- 透明成品导出脚本：`scripts/export-sudoku-mockup.mjs`，从网页场景自动读取同一套屏幕四角和轮廓。
- 黑色白底制作源：`assets/works/sudoku/iphone-duo-studio-black.png`，1254 × 1254。
- 初始蓝色底图：`assets/works/sudoku/iphone-duo-studio-base.png`，1254 × 1254，作为制作源保留。
- 原始前屏：`assets/works/sudoku/board.png`，1320 × 2868。
- 原始后屏：`assets/works/sudoku/coach.png`，1320 × 2868。
- 可编辑贴屏与遮挡：`assets/sudoku-product-scene.js`、`assets/sudoku-character.css`，消费入口 `sections/sudoku.html#character`。

底图是生成的硬件产品场景，并非 Apple 官方摄影。原始 App 截图不交给模型重画，网页通过四点单应变换映射到屏幕；数字、字体、文字和控件都来自原图。屏幕圆角单独裁剪，前机整机轮廓遮挡后屏，避免屏幕覆盖前机金属边。放大窗口复用相同场景。

## 屏幕四角

坐标以 1254 × 1254 底图为准；顺序左上、右上、右下、左下。圆角前的理论尖角为：

```js
front: [[205,174], [607,147], [723,1111], [322,1163]]
back:  [[643,47], [1045,73], [979,1035], [577,986]]
```

精确圆角轮廓与前机壳遮挡路径保存在脚本中的 `outlines`；截图和底图整组等比例缩放，机身不再单独执行 CSS 透视旋转。

## 最终生成提示词

Use case: product-mockup. Create one square, high resolution, photorealistic premium smartphone product photograph to serve as a website mockup base. Pure white seamless studio background (#ffffff), very soft natural grounded shadows. Exactly two realistic modern Apple iPhone Pro Max phones with deep blue metal chassis, portrait orientation, both displays facing the viewer. One phone is in the front at the lower left, the second is behind at the upper right, with a slight spatial overlap (about 10 percent of the rear phone), making their front-to-back depth unambiguous. Coherent single camera, telephoto product-photography perspective; accurate rigid rectangular planes, consistent thickness and physically correct camera perspective, no warped or bent screens. Front phone only slightly turned 8 degrees to camera and leaning about 5 degrees counterclockwise; rear phone slightly turned the other way 12 degrees and leaning about 4 degrees clockwise. Keep both full displays clearly visible, rear lower panel not substantially hidden. Fill most of the square frame with the two phones but leave 8 percent margin on all sides. Each display is a completely blank uniform matte white placeholder within a thin black bezel, with a realistic centered black Dynamic Island pill at the top. Standard iPhone screen proportions approximately 1320 by 2868; keep the display edges and four corner positions crisp and easy to map for later exact screenshot compositing. No text, no UI, no digits, no wallpaper, no lettering, no logos, no captions. Restrained high-end commercial hardware photography, soft key light from upper left and gentle rim highlights. No dramatic glare obscuring screen edges. No extra devices, no hands, no cables, no props. The white blank displays will be replaced later with real screenshots, so leave them absolutely empty.

## 黑色机身修改提示词

仍使用内置 imagegen 编辑初始底图；画布、屏幕四角与遮挡路径保持不变，截图继续按原坐标贴入。普通分析图与原图放大中的官方机身仅在 CSS 硬件伪元素上使用 grayscale(1) brightness(.9)，不处理 App 截图。

Use case: precise-object-edit. Recolor this exact existing product photograph only. Change BOTH phones' deep blue metal chassis, rims and side buttons to neutral pure black / black titanium. No blue or cool blue tint should remain on the hardware. Keep realistic black-metal highlights and subtle grey specular reflections so the phones retain believable volume; do not turn the bodies into flat silhouettes. Invariants: preserve the entire photograph's geometry pixel-for-pixel as closely as possible: same 1254 by 1254 square canvas, identical positions, sizes, angles, front-to-back overlap, exact screen edges and rounded-corner boundaries, black Dynamic Islands, all side buttons, white blank screens, white background, shadows, lighting, crop and camera. The screen surfaces must remain completely blank white, no UI, no text, no extra marks. These exact display quadrilaterals are already mapped for separate real screenshot overlays, so do not alter or regenerate any contours or perspective. This is a surgical hardware COLOR CHANGE ONLY from blue to pure neutral black. No composition changes, no new objects, no added branding.

## 透明背景修改提示词

内置 imagegen 编辑黑色白底源图，`transparent_background=true`。已核验输出为 RGBA，四角 alpha=0，外部为真实透明区域；页面文案区和场景容器也去掉白底，继承网站背景。完整成品由现有场景代码导出，原始 App 截图没有交给模型重画。

Use case: background-extraction. Remove ONLY the exterior white studio background from this exact existing two-phone product photograph and output a real transparent PNG with alpha. Both black phones must remain unchanged: preserve the exact 1254 by 1254 canvas, pixel positions, sizes, angles, screen corner coordinates, rounded display edges, black neutral chassis, all buttons, highlights, Dynamic Islands and front-to-back overlap. DO NOT remove the white areas INSIDE the two phone displays: these are opaque blank white screens and must stay fully opaque because real app screenshots will be overlaid there. Keep the original subtle contact shadows below the phones as translucent neutral dark alpha, not as a white mat. Every area outside the phone silhouettes and soft shadows must be fully transparent. Clean antialiased edges with no white halo, no checkerboard pattern painted into the image, no white rectangular backdrop. Do not crop, move, resize, reshape or redraw the phones. Change background transparency only. No text, no new objects, no added UI.

### 完整透明成品导出

运行 `node scripts/export-sudoku-mockup.mjs`（依赖已有 `@napi-rs/canvas`），自动复用网页场景中的 `quads`、`outlines` 与 `project()`。以逆单应映射和 3 × 3 子像素采样导出原图，复用圆角裁剪与前机遮挡，不重画 UI。

核验：完整成品 1254 × 1254，PNG/RGBA，四角 alpha 均为 0；屏幕外 alpha 与透明底图一致，半透明阴影保留。
