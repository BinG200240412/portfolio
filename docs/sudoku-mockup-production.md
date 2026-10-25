# 数独双机展示制作记录

2026-10-25。生成方式：**内置 imagegen**，不是 CLI/API fallback。

## 交付资产

- 白底双机底图：`assets/works/sudoku/iphone-duo-studio-base.png`，1254 × 1254，保留生成的原始 PNG。
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
