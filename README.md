# XiaoP Cloudhaven

A browser pet game with six companions, care interactions, four exploration maps and arena battles.

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
