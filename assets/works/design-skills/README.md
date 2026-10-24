# Design Skills assets

This folder contains the selected SVG files for the portfolio's Design Skills page.

- `catalog.json`: 75 unique engraving compositions and 43 handcut icons, with dimensions and SHA-256 checksums.
- `archive/`: existing finished vector artwork from Sudoku, daily challenges and related print experiments. Embedded raster wrappers and superseded revisions are excluded. Original vector paths and proportions are preserved.
- `icons/`: 10 finished Widget/symbol/travel icons plus 33 Sudoku interface icons. The 33 interface copies use `#41403D` in place of `#000000`; their geometry is unchanged. These copies have `-41403d.svg` filenames and `inkNormalized: true` in the catalog. The source files are untouched.
- `figma-settings-poster-group.svg`: the actual exported artwork group used in the Figma workflow illustration. The surrounding frame, ruler values and comparisons are illustrative, not a Figma recording or an iOS build capture.

The page uses the SVGs directly, reserves image proportions and lazy-loads offscreen media. Both the artwork archive and icon library allow individual SVG downloads; the icon library also creates ZIPs locally from the selected SVGs.

Validate the catalog and payloads from the repository root:

```sh
python3 scripts/verify-design-skills.py
```

Skill documentation: [BinG Design Skills](https://github.com/BinG200240412/bing-design-skills).
