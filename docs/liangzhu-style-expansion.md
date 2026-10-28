# 良渚风格预演：横向扩绘记录

2026-10-28，按作者要求使用内置 imagegen，逐张参考原图重绘并扩展为横向场景。
这四张图用于“风格预演”的网页展示，不作为原始 ComfyUI 输出或 Marble 结果。
原文件仍保存在 `assets/works/ai3d/board/`，未覆盖。
网页文件仅做 WebP 编码，保留生成图的完整像素尺寸，未再裁切或缩放。

| 主题 | 原图 | 网页素材 | 尺寸 |
| --- | --- | --- | --- |
| 草原湖景 | `board/style-wetland.webp` | `board/style-wide/style-wetland.webp` | 1672 × 941 |
| 积云湿地 | `board/style-clouds.webp` | `board/style-wide/style-clouds.webp` | 1672 × 941 |
| 明亮田野 | `board/style-field.webp` | `board/style-wide/style-field.webp` | 1672 × 941 |
| 森林柔光 | `board/style-forest.webp` | `board/style-wide/style-forest.webp` | 1672 × 940 |

表中路径相对于 `assets/works/ai3d/`。文件校验与来源记录见
`assets/works/ai3d/board/style-wide/sources.json`。

## 使用的提示词

每张的完整提示词由以下通用前缀、对应场景说明、通用后缀依次组成，
并仅引用该张原图作为 edit target。背景不透明。

通用前缀：

> Use case: stylized-concept. Asset type: wide landscape reference illustration for an interactive design portfolio.

草原湖景：

> The first reference is the edit target: a softly lit green pastoral highland with a foreground grey boulder, two small dark grazing horses in the middle distance, a turquoise lake and layered hills. Preserve its tranquil pastel turquoise sky, warm sunlight, muted fresh greens and the same environment. Expand naturally to the left and right with continuing grass, wild plants, boulders, rolling hills and distant water.

积云湿地：

> The reference is the edit target: a low open flowering wetland meadow with small blue pools and a single towering bright white cumulus cloud against a deep clear blue sky; distant pale rocky peaks on the horizon. Preserve the expansive low horizon, pink wildflowers, green flat wetlands and the distinctive cloud as the central subject. Expand the marsh and sky naturally to both sides.

明亮田野：

> The reference is the edit target: a vivid yellow-green sunlit grassland, small dark brown horses, a large textured grey rock at foreground right, layered hills and a blue lake under a soft blue and pink-clouded sky. Preserve its bright lime greens, warm saturated sunlight, horses, stones, distant water and the same dreamy painterly game-landscape feel. Extend the valley and grassy foreground on both sides, adding space rather than magnifying any subject.

森林柔光：

> The reference is the edit target: a lush painted forest clearing under a shaft of golden sunlight, huge old trees, small wildflowers, a turquoise pool and a narrow waterfall at right. Keep the same hand-painted animation aesthetic, dappled light, soft deep green woodland, and quiet clearing. Recompose and extend this into a crisp panoramic landscape while preserving the clearing, old trees, light beam and waterfall, not enlarging the existing low-resolution pixels.

通用后缀：

> Primary request: redraw and outpaint the supplied composition as ONE detailed wide horizontal 16:9 image, ideally 2048 x 1152 pixels or greater. This is a faithful landscape expansion, with a wide coherent field of view; the original visual anchors occupy modest scale within the enlarged environment. Preserve the reference's specific palette, lighting, atmosphere and visual subjects. Clean, deliberate painterly surfaces with crisp environmental detail at web display size, not blurry upscaled pixels or photographic texture. The whole frame must be filled with one uninterrupted scene. No collage, no panels, no text, no brand marks, no watermarks, no border. Do not introduce buildings, people or narrative props that are absent from the target.
