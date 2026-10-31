# Arright case study

Updated 2026-10-30. The public case remains `sections/arright.html` in the existing portfolio. Only Arright's page, scoped styles/scripts, and its independent media/prototype files are included in this change.

## Narrative and facts

Seven reading panels: current work → visual voice → garden mechanisms and difficulty → residential prototypes → chair orientation → native shell migration → current scope and verification.

- The minimal **Sudoku by BinG** is a separate work. Its current maintained board illustrates the minimal starting direction, not a claim that the image was captured at the first release. The later poster Sudoku branch and Arright remain distinct.
- Naming is **Arright**, confirmed by the author's 11 October record. Concern about similarities with Murdoku prompted the residential direction on 13 October. No legal or novelty conclusion is made.
- Author records were checked for the American poster statement, well-count difficulty correction, zero natural whitespace, chair orientation, and restoring the complete original interface. Only short relevant quotations are used. Private conversations and personal source paths are excluded from the site.
- The early tools-as-digits gardening concept, later relationship gardens and current native garden are separate stages. Historical growth imagery is not labelled as current functionality.
- Current native state is **0.2.0 (2)**, a local development build. The native project's `README.md`, `original-shell-migration.md`, `original-shell-verification.md`, `garden-catalog.md` and `factory-mechanics.md` were checked on 30 October.
- **12 home / 6 garden / 4 factory** puzzles. Only the six garden puzzles claim exhaustive unique-solution validation. Home and factory accept alternative legal layouts. Factory is a new playable proposal awaiting author judgment.
- **32 native rule/save tests**, plus key iPhone Air/17e simulator flows, refer to the **28 October record**, not a rerun by this portfolio task. No physical iPhone, TestFlight, App Store or player difficulty calibration is claimed.
- Motivation and design judgment stay with the documented garden, housing and native-shell iterations. The separate closing reflection draft has been removed to avoid repeating those decisions.

## Image provenance

All captures retain their complete source frame. WebP conversion uses quality 94 at the source dimensions, without retouching interface content. Images may be enlarged with the portfolio's shared viewer. The source interfaces retain their original languages.

`assets/works/arright/native/sources.json` records original filenames, source SHA-256 and dimensions. These are 28 October native simulator captures. `home-0-1.webp` is 0.1.0; all other files in that directory are 0.2.0. Completion and layout demonstrations are labelled accordingly. `paper-curl-actual-frame-air.webp` is an actual captured frame, not an interactive web reproduction of Metal.

`assets/works/arright/history/history-sources.json` records:

- `poster-sudoku-20261012.webp`: original poster Sudoku, iPhone simulator, 12 October.
- `garden-web-20260920.webp`: original relationship garden web prototype, 20 September.
- `garden-growth-20261006.webp`: earlier native garden growth state, iPhone simulator, 6 October.

The original brand illustration in the current native shell still says Sudoku and contains earlier pricing. This unfinished artwork is explicitly disclosed in the case.

## Source-based plan graphics

`assets/works/arright/plans/P04.svg`, `P06.svg`, `P07.svg`, `P08.svg` were generated using the archived prototype's unmodified `boardSvg`, `example` and puzzle data. Each demonstrated state passed that source engine's `complete` check. They are vector source-data renderings, not historical screenshots or player solutions:

- P04: 4×4, 16 cells, zero natural whitespace.
- P06: 87-cell irregular house with entrance and corridor.
- P07 revision 2: 24-cell living room with desk light, chair facing desk and pull-out clearance.
- P08: 87 cells and 19 furniture items with whole-house relationships.

The standalone chair interaction is explicitly a schematic explanation. It is neither an actual puzzle nor a proof of uniqueness.

## Archived playable web prototype

The old hosted URL requires sign-in, so the static 18 October first-chapter source is preserved at `assets/works/arright/play/index.html`. `lab.html` preserves P01–P08. Both are linked with explicit historical and Chinese-language labels. This is the archived residential web prototype, not the native 0.2.0 app.

Puzzle data, solver, placement, routes, hint logic and save validation are unchanged. Portfolio-only adjustments add a return link, remove unsupported registration marks and hide save/feedback file export/import interfaces. Puzzle progress remains browser-local. No private chats, developer logs, credentials or personal paths are included.

## Maintenance

Main text remains HTML. The exact-string English dictionary is `assets/arright-project-context-i18n.js`. Selection controls are scoped to `arright-case.js`; the explanatory chair interaction has its own CSS/JS. Shared theme, image viewer, media policy and page snapping remain the portfolio implementations. Seven predeclared `.portfolio-snap-page` sections are registered by the existing Arright branch in `page-snap.js`; no shared file changes are required.

## Verification for this page update

- 320×852, 390×844, 768×1024, 1512×982, 1728×1117, 1920×1080 and 2560×1440: no horizontal overflow in DOM geometry checks. Complete 2560px and mobile page captures were inspected; lazy media was also checked when entering its chapter.
- Chinese/English and light/dark switching; chair rotation from invalid to desk-facing valid; functional-space toggle; P04/P08 plan selection; 0.1.0/0.2.0 comparison; native page-curl image selection.
- Image detail and the original top-left return restore the page, focus and native snapping. The same layer sequence was checked in the portfolio iframe.
- Archived first chapter A01 was manually completed through furniture placement, two-cell route and delivery. Its original test suite was rerun: 1,885 laboratory assertions + 1,250 campaign assertions passed. Ten copied engine/data modules match that tested source byte for byte.
- Shared media policy verifier and JavaScript syntax checks passed. No error/warning was captured for the case page during the checked interactions.
- No fixed motivation/learning summary or public reflection-draft banner remains; the source-based decisions stay beside their corresponding prototypes and version comparisons.

## Source presentation repair · 2026-10-31

The latest seven-panel case was retained. This repair changes its presentation, not the native app or puzzle rules.

- The twelve native source PNGs and three historical source PNGs were found and checked against the existing provenance SHA-256 records. Native WebP assets have the full original screen dimensions; no new screen crops or UI redraws were made.
- Twelve static mobile views, plus the seven selectable native captures, now use the same hardware asset as the Sudoku case. Its measured canvas is 1470×3000; the display window starts at (75,66) and is 1320×2868. Complete captures use `contain`, with no `cover` fitting. The CSS is scoped to Arright; Sudoku's page and styles are unchanged.
- Captures that already contain a system island are layered above the decorative hardware island. That includes the 0.1.0 home, captured Metal curl frame, poster-stage simulator home and historical growth capture. A frame is cloned once for image detail; no second frame is put inside it. Shared media corner clipping is bypassed for hardware.
- `poster-original.svg` and `apple-{early,middle,mature}.svg` are exact original vector copies, with hashes in `history/source-art.json`. The original artwork is shown by default; historical simulator screens remain available through the existing stage logic and the added artwork/interface switch.
- The partial browser view `garden-web-20260920.webp` is no longer used as a case image. The file remains in the source archive. Its replacement is an editable SVG based on the early prototype's actual first-board initial state, original well path and six original plant SVGs. It explicitly depicts source-data reconstruction, not a running UI or a solved puzzle. Its English variant changes text only; the board and paths remain the same. Provenance and source file hashes are in `garden-relations-source.json`.
- The phone/source-art detail dialog is `#media-viewer`, using the existing shared top-left return layer. Close returns focus to the original opener and restores the same native snapping behavior.
- All required original assets for this repair were found locally. No additional user-provided images are required. Device hardware is presentation, not physical-device validation.

Repair verification: entered from Practice on desktop and 390px mobile. Chinese/English, light/dark, original-art/interface switches, version comparison and actual curl-frame selection were checked. Full hardware remained visible in the detail view; at 390×844 its bounds were x28.4–361.6, y124–804, with one frame and `contain`. Top-left return and Escape restore focus and `y mandatory` snapping. No hardware image received shared corner clipping. DOM geometry checks at 320, 390, 768, 1512, 1728, 1920 and 2560px found no horizontal overflow. The checked Arright interactions produced no console errors or warnings. Shared media-policy and syntax checks passed. This is website verification, not a new native-app test run.
