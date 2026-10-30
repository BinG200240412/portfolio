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
- Two closing first-person reflections are editorial drafts derived from documented decisions. The page explicitly marks them for the author's wording review.

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
