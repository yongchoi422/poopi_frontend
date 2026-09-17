# SOULI website release candidate

This release adds an English website built around original SOULI SVG artwork and a layered pixel world.

- `/`: pixel home, five-region preview, original SVG gallery, launch plan and FAQ.
- `/lighthouse.html`: idle game with read-only Base address / injected-wallet lookup.
- Game entry links support `region=sky|home|roots|crystal|abyss`, `soul=0..5`, and `panel=souls|launch`.
- `/legacy.html` is a development-only entry for the original collection application. It is deliberately not part of the production build inputs. The original source is retained.

The game runs locally in the browser. Multiplayer, live market weather, token rewards, actual sales, automatic Uniswap liquidity and refunds are not connected. The launch calculator and funding controls are explicitly marked simulations. No new sale or liquidity contract has been deployed.

## Build and test

Use the locked dependencies with `npm ci`, then `npm run build`. Static output is `dist`, with two HTML entries. `npm run dev` serves the source; `npm run preview` serves the production build. This release targets the original `yongchoi422/poopi_frontend` GitHub repository and `https://souli.net/`.

Existing tests:

```
node scripts/test-lighthouse.mjs
node scripts/test-idle.mjs
node scripts/test-purchase.mjs
node scripts/test-wallet-session.mjs
```

Verified on 2026-09-17: production build, all four test scripts, desktop / 390px / 360px layouts, five-layer preview, gallery-to-game selection, launch deep link, SVG address lookup against Base, FAQ, image loading and browser console. No wallet signing or financial transaction was performed.

The homepage shares the SVG renderer with the game but does not load Web3. The game keeps the existing `souli-idle-v2` saved-progress schema. Changing hosting origin starts a separate browser save; local development progress does not transfer automatically.

## Official deployment status

The release candidate lives on `souli-pixel-world`; the existing default branch is `master`. The homepage canonical and sharing URL point to souli.net. The separate Sites preview is not the official deployment target, and its hosting binding is omitted from this branch.

Read-only inspection on 2026-09-17 found Google serving souli.net, a Dockerfile in this repository that builds and serves `dist` on port 8080, and no GitHub Actions runs or commit checks on the existing master commit. This does not identify the actual hosting service or prove whether an external build trigger exists. No production deployment, DNS change, or default-branch update has been performed.

Before publishing this branch to souli.net, identify the Google Cloud project / hosting service and its build trigger, preserve the current deployment revision for rollback, and verify both `/` and `/lighthouse.html` on the resulting deployment. The current original collection UI is retained in source and development-only `legacy.html`, but is excluded from this candidate's production build; it must be given a production route if that interface is to remain available on the new site. The existing Dockerfile still uses Node 16 and has not been rebuilt or validated for the actual production environment.

No credentials are committed. The funding goal and LP lock terms remain proposals requiring implementation and verification before real payments can be enabled.
