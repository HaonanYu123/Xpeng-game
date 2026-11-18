# 小P · 云栖乐园

和小P一起养萌宠、探索秘境、轻松对战，收获每天的小小快乐。

Play now: https://haonanyu123.github.io/Xpeng-game/

## Play and save

- Play through the repository's GitHub Pages URL.
- Levels, XP, attributes and expressions are stored in each browser using localStorage.
- Closing the browser does not normally clear progress. Clearing site data or using a different browser/device gives a separate save.
- Changing the website origin does not automatically transfer existing saves.
- Battles return automatically to their originating map after the result display.

## Deployment

Enable GitHub Pages with GitHub Actions as the source. Pushes to main deploy the dist directory through .github/workflows/pages.yml.

## Validation

Run `node assets-test.cjs`. No package installation or build is needed.

This repository contains the current runtime, an asset check and deployment configuration. It excludes local backups, development history and computer-specific records.

UI update: no help icon or intimacy system; scene labels are read-only. Backpack cards use a clipped rounded shell and internal scrolling. Navigation uses stronger colors and in-button labels.
