# Liangzhu original-board coverage

Source: `assets/works/ai3d/liangzhu-3d.pdf`, one original 2721.26 × 6165.35 pt board.
The four-stage overview and conclusion connect the original modules. Necessary
explanations sit beside their actual components; repeated model-loading prose is
removed, and the board's additional export plans remain available on demand.

| Original module | Website location | Representation |
| --- | --- | --- |
| 01 Background research | `#liangzhu-background` | Three vertical research branches, beside the site-reference grid |
| 02 Existing scenarios | `#liangzhu-site-references` | All four original photographs in a hover-expanding 2 × 2 crop grid |
| 03 Style preview | `#liangzhu-style-studies` | Original description and four author-requested horizontal redraws; original references remain in the source folder |
| 04 Workflow 1 | `#liangzhu-workflow` | Editable graph with four attached image-input, LoRA, ControlNet and sampling annotations |
| 05 Output pictures | `#liangzhu-style-outputs` | All six originals in two equal-window rows, expanding on hover by cropping neighbours |
| 06 Implementation path | `#liangzhu-repaint-path` | Responsive native SVG: stages on the left, components on the right; all 16 labels and 15 relationships, without small-node links |
| 07 Case concept | `#liangzhu-spatial-cinema` | Spatial-cinema and game pre-production intent |
| 08 Key points | Workflow 2 component annotations | Style continuity at the image reference; 2:1 geometry and edge continuity at EmptyLatent |
| 09 Implementation | `#liangzhu-panorama-implementation` | Editable graph with three attached reference, draft/production and panorama-geometry annotations |
| 10 Workflow description | `#liangzhu-panorama-stages` | Actual models and conditions remain visible in the graph; unique seamless/HDR extension plans are optional |
| 11 Final panorama works | `#liangzhu-panorama-outputs` | Both input/output comparisons and both original generation records |
| 12 General workflow | `#liangzhu-complete-path` | Two-row U-shaped Sankey with all 17 nodes, 23 connections and four chapter links |
| 13 Workflow 3 | `#liangzhu-scene-understanding`, `#liangzhu-prompt-output` | Editable Janus-Pro graph with two attached annotations; full generated text stays in its node, with a readable excerpt beside the panorama |
| 14 Marble input | `#liangzhu-marble-inputs`, `#liangzhu-marble-handoff` | Three equal-window image inputs; the actual Marble interface is paired with image, semantic and output notes |
| 15 Scene models | `#process-result` | Both three-image result rows: point-cloud preview and two scene views each, plus their original Web/VR links |

## Source fidelity and technical scope

`scripts/import-liangzhu-board.py` extracts the original embedded photographs,
outputs and UI screenshots. It also converts the exact coloured marks and Bézier
ribbons in the PDF into native SVG path data. `board/sources.json` records source
hash, image xrefs, original dimensions and page rectangles. `sankey-paths.json`
records each original drawing index. Source images remain preserved. The four style-study display images were redrawn
and expanded horizontally on 2026-10-28 at the author’s request; their provenance
is in `board/style-wide/sources.json`. Site photographs, workflow outputs and
Marble results continue to use the original images.

The overview now follows the requested folded reading order: four columns from
left to right above, then four columns from right to left below. Its SVG geometry
is recomputed for the available width and language, with no horizontal scroller.
Text wraps at its real font width; each text block's rendered bounds are vertically
centred against its node dot. The original straight paths remain in the source
JSON as provenance. The repainting-path figure is now recomposed into a vertical
sequence of left-hand stages and right-hand components, preserving all 16 labels,
the 15 relationships. Model choice feeds upward into sampling;
it is an auxiliary input rather than a stage after sampling. Neither explanatory
diagram requires horizontal scrolling; the editable ComfyUI graphs retain their
independent canvas controls.
Visible labels use concise equivalents; below 480 px these are shortened further so the two rows remain
readable at 16 px; every node keeps its complete original label in its accessible
name and tooltip. Only the four workflow headings link to their chapter starts;
small nodes in both diagrams are noninteractive labels. The heading links use an
explicit instant chapter jump, avoiding smooth-scroll and snap conflicts.

The supplied `02_矢量/体验流程框架.svg` was inspected but is a separate generic
workflow ending in a social upload. It is not used in place of this board’s two
Liangzhu diagrams.

The board describes both IP-Adapter and the implemented Flux-Kontext approach.
The narrative preserves the distinction. Seamless Tile, specialised circular/HDR
decoding and 32-bit .hdr/.exr export are described as board-documented extension
plans; the current graph and displayed image files do not establish that those
extra nodes ran. The actual page cover remains the existing sampled PLY display
of the original Marble scene, not a lossless Gaussian-splat file.

## Four-workflow reading order and image interactions

The written three-item overview is removed. The U-shaped map uses nearly the
full viewport width, up to 1440 px, while retaining its existing text scale.
At a 1280 px viewport it is 1216 px wide. The right-hand return lane reserves
more space for its three parallel coloured connections. Each is an open stroked
centreline (7.5 px on wide layouts, 5.5 px on narrow layouts), preserving thickness
at the vertical tangent. Dotted frames identify style repainting and
image-to-panorama above, then prompt derivation and Marble generation below in
right-to-left order. Each frame has a round-dot leader to its numbered title and links
to its own chapter. Janus-Pro is Workflow 3; the existing Marble image inputs and
handoff are Workflow 4. The three editable ComfyUI reconstructions remain available; the public display cleanup below records the two omitted text-only nodes in Workflow 1.
The page-snap registry discovers all four chapter anchors automatically.

All four workflows start with a horizontal, dotted-frame input/process/output sequence.
Its two dotted arrows animate in order when the sequence enters view, with static
rendering for reduced-motion preferences. Three research branches and the 2 × 2
site-reference grid share a desktop row, followed by a downward arrow into the
equal-width horizontal style-study composition. On phones the research row reflows
vertically, while the input/process/output sequence remains horizontal.

Both reference galleries use native buttons with hover, keyboard and touch
support. Hovering a grid image grows its row and column; hovering a style image
grows its track. The style strip rests at four equal widths. Neighbouring windows
shrink and crop with object-fit: cover; image proportions are never stretched.
Pointer exit restores the equal layout; touch can toggle an image, and arrow
keys move keyboard focus. Escape resets. Container heights remain
fixed during the transition, avoiding page jumps. Source images, alt text, shared
media corners and all other full-image viewers are preserved.

The input/process/output sequences use compact coloured blocks with actual
round-dot SVG borders. All explanatory arrows are sampled with individual SVG
circles rather than dashed strokes. Both arrowhead arms use exactly mirrored
coordinates and matching animation phases. Card arrival animates opacity only,
so a stagger cannot temporarily move one card away from its arrow. Research
branches are measured from the current title and item bounds, then drawn as
three round-dot arrows. Arrow and text positions are recalculated when language,
font loading or responsive layout changes.

## Component-side explanations and output windows

The three graph JSON files add bilingual `annotations` metadata. Apart from the
public display cleanup recorded below, the reconstructed groups and links are
preserved. At the author's request on 2026-10-28, the Janus
instruction is replaced and its text field/node height increased to show the
full requirements; parameter rows and the two notes move to accommodate it.
Other original component parameters and positions remain unchanged. The SVG renderer
wraps each explanation at its actual font width, includes it in the drawing
bounds, and moves its dotted leader and text with the owning component. Four,
three and two notes respectively replace the repeated explanation blocks below
the graphs. Reset restores both components and notes.

All nine native notes now have transparent round-dot frames with internal
padding. Their leaders meet the frame edge, and the three Marble interface notes
use matching dotted boxes. Component headings consistently use “工作流一/二/三/四与组件说明”.

The revised Chinese instruction asks for evidence-based geometry and spatial
guidance for Marble: depth layers, relative scale, occlusion, ground contact,
terrain, materials, lighting and panorama continuity. It distinguishes unseen
areas from visible facts and rejects invented absolute dimensions. Its proposed
180–240-word English output is this project's authored format, not a vendor
requirement. The original generated output remains identified as an original
example; no new Janus/Marble inference is claimed. The target is consistent with
World Labs' description of text/image/panorama world inputs in
[Announcing the World API](https://www.worldlabs.ai/blog/announcing-the-world-api).

Style outputs use two rows of three equal-size windows; Marble inputs and scene
comparisons use the same interaction. Hover/focus expands the chosen window and
crops its neighbours, keeping row height and image proportions fixed. Pointer
exit returns to equal widths. The two panorama pairs retain the complete 2:1
images for checking boundaries and aspect ratio. All 30 original image assets
remain on the page; the prompt-output excerpt reuses the corresponding panorama.


## Public display cleanup — 2026-10-30

This pass cleans the website representation; it does not rerun ComfyUI,
Janus-Pro or Marble, modify the original PNG/PDF board, or establish that the
reconstructed node data is an executable source project.

- Workflow 1 omits display-only text nodes 89 and 56, their incoming links 19
  and 20, and their prompt-group memberships. These contained unrelated
  character/wardrobe/Christmas template output. No replacement landscape output
  is invented. The remaining graph has 24 nodes, 9 groups and 38 links.
- Node 12 uses a bilingual functional label, “场景参考图 / Scene reference image”,
  because the actual input filename has not been verified. Node 51's `1boy`
  exclusion is cleared; node 7 retains generic image-quality negatives while
  removing human-anatomy terms. The original Ghibli/gongqijun style trigger and
  actual CLIP encoder components are preserved.
- The four-stage overview now names Janus-Pro in full, compact, phone,
  tooltip and accessible labels. This corrects the overview's former CLIP
  image-understanding label; it does not remove real CLIP encoders elsewhere.
- No training logs, exported LoRA weights or training artifacts were found in
  the inspected Liangzhu source folder or this repository's AI3D assets. The
  site therefore describes LoRA conditioning and the author's workflow role,
  without asserting a verified self-training result. This is an evidence limit,
  not a claim that training never occurred.
- All three image controls say “本地换图预览 / Local image preview”. A short
  bilingual boundary statement appears before Workflow 1's node canvas and
  in each canvas accessible description: changing images or parameters does
  not execute generation. The renderer owns these translations under the
  ignored native graph hosts. Local previews use object URLs; a reset clears
  them. A user-selected filename stays unchanged across language switching.
- The panorama ratio note distinguishes 2:1 image dimensions from correct
  equirectangular projection, complete 360° × 180° coverage and a seamless
  boundary. These require separate inspection. Existing optional seamless/HDR
  plans and the original Janus text output remain identified as such.

Validation covers all node/port references, link IDs, group memberships and
annotation owners in the three reconstructions. All remaining original links
are preserved. The pre-existing reconstructed link 15 uses LIST → STRING;
this display cleanup does not invent an execution repair. Group dragging and
reset, local image selection, both languages/themes, and 390, 1512, 1728, 1920
and 2560 px widths were checked. The latest “负责事项 / 进度” project overview,
all page image URLs and four workflow chapters remain preserved.


## Cover camera motion — 2026-10-31

The existing point coordinates, colors, density, zero scatter/drift and camera
presets remain unchanged. The cover starts at its farthest distance, then adds
bounded camera offsets around the selected view: yaw ±0.055 radians over 18 s,
pitch ±0.008 radians over 21 s, and an inward/return distance change of at most
3% over 13 s. These oscillations do not accumulate into a full orbit.

A gesture commits the currently displayed pose before accepting input, avoiding
a snap back to the unmoving base camera. While dragging or pinching the automatic
motion stops; after 3.5 s without input it fades back in over 1.2 s. Ordinary hover
does not stop it. Idle drawing is capped at 30 fps, with direct gestures retaining
the existing render cadence. Reduced-motion preferences disable automatic motion;
manual controls and all four view presets remain available. Offscreen/hidden
suspension and iframe disposal clear animation frames and the idle wake-up timer.
Preview-to-full-detail refinement retains the same camera phase and pose.
