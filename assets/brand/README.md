# 回头的猩猩

沿用作者原有的回头大猩猩：向右看的侧脸与单眼、斜向银背留白、后侧一颗暗红灯珠。去掉腿部、毛纹和周边装饰，收成同一份 16×16 网格。

- `logo.svg`、`logo.png`：透明底深灰标识；PNG 为 1024×1024，使用 macOS 系统 SVG 渲染器导出。
- `logo-reverse.svg`、`logo-reverse.png`：透明底暖白反色，用于深色底。
- `favicon.svg`：透明底，自适应浏览器的 `prefers-color-scheme`；浅色使用深灰，深色使用暖白。灯珠比大标识稍饱满，保证小尺寸对比。
- `favicon.ico`：16 / 32 / 48 三种尺寸。16px 使用同构图的实心像素作光学校正，避免圆点缩小后发虚；32 / 48px 保留圆点。均有暖白底保证明暗标签的对比。
- `favicon-16.png`、`favicon-32.png`、`favicon-48.png`：ICO 对应的独立图像。
- `apple-touch-icon.png`：180px、不透明暖白底；`icon-192.png` / `icon-512.png` 为其他大图标尺寸。
- `logo-preview.png`：标识在明暗背景上的大图；`favicon-preview.png`：16 / 32px 实际显示尺寸及 ICO 兜底对比。

原视觉依据为 `assets/matrix-gorilla.js`，以及源项目 `assets/works/gorilla/bing-gorilla-figure.svg`；这是重新简化的圆点 / 像素标识，不是将原图缩成小图，也不含字母或位图描摹。所有 SVG 都由原生圆形组成，没有字体、脚本或外部依赖。

编辑 `build-icons.py` 中的 `GRID` 后执行 `python3 assets/brand/build-icons.py` 可重建全部资产，需要 Pillow。`K` 是主体，`R` 是唯一红点，`.` 是留白。SVG 与 PNG 使用同一网格几何；浏览器标签声明由主站统一添加。
