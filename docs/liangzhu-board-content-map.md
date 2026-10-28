# Liangzhu original-board coverage

Source: `assets/works/ai3d/liangzhu-3d.pdf`, one original 2721.26 × 6165.35 pt board.
The three-stage overview and conclusion remain. Every original numbered module is
now part of the visible narrative, rather than being available only in collapsed
board screenshots.

| Original module | Website location | Representation |
| --- | --- | --- |
| 01 Background research | `#liangzhu-background` | Spatial structure, architecture and atmosphere as native text |
| 02 Existing scenarios | `#liangzhu-site-references` | All four original photographs |
| 03 Style preview | `#liangzhu-style-studies` | Original description and all four style references |
| 04 Workflow 1 | `#liangzhu-workflow` | Existing editable graph, with image-input, LoRA, ControlNet and sampling explanations |
| 05 Output pictures | `#liangzhu-style-outputs` | All six original style outputs |
| 06 Implementation path | `#liangzhu-repaint-path` | Original PDF vector paths and native bilingual, linked labels |
| 07 Case concept | `#liangzhu-spatial-cinema` | Spatial-cinema and game pre-production intent |
| 08 Key points | Workflow 2, “关键要点和意义” | Style continuity, edge continuity, 2:1 geometry |
| 09 Implementation | `#liangzhu-panorama-implementation` | Existing editable graph, latent reference, draft/production modes |
| 10 Workflow description | `#liangzhu-panorama-stages` | Models, reference/text conditions, sampling, and separately identified seamless/HDR extensions |
| 11 Final panorama works | `#liangzhu-panorama-outputs` | Both input/output comparisons and both original generation records |
| 12 General workflow | `#liangzhu-complete-path` | Responsive two-row U-shaped Sankey, preserving all 17 labels, 23 connections and links to the detailed sections |
| 13 Workflow 3 | `#liangzhu-scene-understanding` | Existing editable Janus-Pro graph, original full generated text in its text node, and step explanations |
| 14 Marble input | `#liangzhu-marble-inputs`, `#liangzhu-marble-handoff` | All three original image inputs, image/text handoff and actual Marble interface |
| 15 Scene models | `#process-result` | Both three-image result rows: point-cloud preview and two scene views each, plus their original Web/VR links |

## Source fidelity and technical scope

`scripts/import-liangzhu-board.py` extracts the original embedded photographs,
outputs and UI screenshots. It also converts the exact coloured marks and Bézier
ribbons in the PDF into native SVG path data. `board/sources.json` records source
hash, image xrefs, original dimensions and page rectangles. `sankey-paths.json`
records each original drawing index. Image content is preserved; no images are
generated, repainted or reconstructed from approximate scenery.

The overview now follows the requested folded reading order: four columns from
left to right above, then four columns from right to left below. Its SVG geometry
is recomputed for the available width and language, with no horizontal scroller.
Text wraps at its real font width; each text block's rendered bounds are vertically
centred against its node dot. The original straight paths remain in the source
JSON as provenance, and the repainting-path figure retains its original geometry.
Below 480 px the visible labels use short equivalents so the same two rows remain
readable at 16 px; every node keeps its complete original label in its accessible
name and tooltip, and still links to the full explanation.

The supplied `02_矢量/体验流程框架.svg` was inspected but is a separate generic
workflow ending in a social upload. It is not used in place of this board’s two
Liangzhu diagrams.

The board describes both IP-Adapter and the implemented Flux-Kontext approach.
The narrative preserves the distinction. Seamless Tile, specialised circular/HDR
decoding and 32-bit .hdr/.exr export are described as board-documented extension
plans; the current graph and displayed image files do not establish that those
extra nodes ran. The actual page cover remains the existing sampled PLY display
of the original Marble scene, not a lossless Gaussian-splat file.
