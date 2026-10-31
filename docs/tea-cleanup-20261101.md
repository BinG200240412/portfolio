# 茶弦记收尾排版修订

- 删除封面横向章节导航，保留原生章节吸附和侧边定位。
- 十二茶先生使用原 PNG 的十二个独立网页显示窗口，四列三行分散排布，与左侧地图上下对齐；手机自然换为独立整组。未重画角色，原始素材未覆盖。
- 宋代点茶原图黑底为全不透明。使用内置 imagegen 去底，采用第二版透明 PNG，网页窗口仅收起上下透明留白；详情可浏览全图。原始黑底 PNG 保留。
- 周边五步奖励流程新增整体青绿点线框和逐项金色点线框，箭头仍在项间。
- 五张流动课程照片、完整展板展开入口和团队署名合并在 `#course` 一页。`#boards` 留为内部锚点，不再占独立章节。

## 透明图处理

输出：`assets/works/tea/studies/tea-making-steps-transparent.png`，2172×724，RGBA。采用内置 imagegen。最终提示词：Remove the black background from this existing image. Keep the 8 illustrations pixel-faithful and exactly the same subdued gold/teal colors. Clean transparent background. No other changes. Do NOT enhance the rings. Do NOT add any color or flecks or detail. Do not redraw or redesign any object. The tiny thin gold circles should stay thin and faint. Empty space inside rings should be transparent too. Keep one row of 8 icons. This is strictly a clean background removal job.
