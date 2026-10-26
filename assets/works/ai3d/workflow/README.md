# Liangzhu native workflow diagrams

| Source | Data | Visible nodes | Groups | Reconstructed links |
| --- | --- | ---: | ---: | ---: |
| Group 2.png, 7376 × 3945 | graph.json | 26 | 9 | 40 |
| 工作流2.png, 4968 × 2272 | graph2.json | 16 | 7 | 15 |
| 工作流3.png, 5439 × 2152 | graph3.json | 4 | 0 | 4 |

The supplied PNGs contain no embedded ComfyUI JSON. The renderer rebuilds the visible shapes, labels, editable fields and connection ports as native SVG/HTML. Positions and dimensions were measured from the source pixels, and readable values were checked with enlarged crops and OCR. Diagrams 2 and 3 use uniform coordinate scaling to keep their original, differently sized UI exports consistent in the webpage.

This is a visual reconstruction, not a runnable ComfyUI workflow or a pixel-exact recovery. Truncated filenames remain truncated; hidden nodes and covered values are not invented. Internal IDs 201/202 in diagram 2 identify visible nodes whose original badges are covered, and are not displayed as original IDs. Connections are reconstructed from visible ports and workflow context. The high-resolution generation internals hidden behind diagram 2's preview are not recovered. Diagram 2's four scene previews are actual crops from the supplied PNG, stored in previews/; the node panels and text are independently editable rather than flattened screenshots.

Each diagram has a transparent, screen-wide horizontal scroll plane. It starts at a readable scale and retains the full natural vertical height so ordinary page scrolling can reach the entire graph. Blank-space dragging, native horizontal trackpad scrolling, and touch swiping browse sideways; Ctrl/Command-wheel and pinch zoom the diagram. Overview fits its horizontal extent, Reading size restores the readable scale, and Reset restores only that diagram's source layout and fields. There is no embedded narrow frame or modal expansion. The page's existing vertical snapping remains native.

Node colours are fixed by their role and adapt to the site's light/dark theme. Groups retain dotted outlines; connections use solid orthogonal segments and moving signal beads. All SVG link IDs are instance-specific so repeated source node IDs across the three diagrams cannot cross-connect. Dragging a node or group updates its incident links; group corner handles resize its boundary. Double-click a node to focus it. Fields remain keyboard-editable, and arrow keys move focused nodes.

The source background silhouettes, grids, and platform watermarks are not redrawn. Outer figures and stages remain transparent over the actual page's ambient field. Local image selection uses object URLs for local preview only; no image, parameter, or layout is uploaded. No generation backend, source download, or export UI is added. Motion pauses offscreen/when hidden and hides for reduced-motion preferences. Shared particle-cover loading, navigation, media restrictions and page-snap resources remain intact.
