# SOULI World preview

This release adds an English website built around original SOULI SVG artwork and a layered pixel world.

- `/`: pixel home, five-region preview, original SVG gallery, launch plan and FAQ.
- `/lighthouse.html`: idle game with read-only Base address / injected-wallet lookup.
- Game entry links support `region=sky|home|roots|crystal|abyss`, `soul=0..5`, and `panel=souls|launch`.
- `/legacy.html` is a development-only entry for the original collection application. It is deliberately not part of the production build inputs. The original source is retained.

The game runs locally in the browser. Multiplayer, live market weather, token rewards, actual sales, automatic Uniswap liquidity and refunds are not connected. The launch calculator and funding controls are explicitly marked simulations. No new sale or liquidity contract has been deployed.

## Build and test

Use the locked dependencies with `npm ci`, then `npm run build`. Static output is `dist`, with two HTML entries. `npm run dev` serves the source; `npm run preview` serves the production build. Site metadata is in `.openai/hosting.json`.

Existing tests:

```
node scripts/test-lighthouse.mjs
node scripts/test-idle.mjs
node scripts/test-purchase.mjs
node scripts/test-wallet-session.mjs
```

Verified on 2026-09-17: production build, all four test scripts, desktop / 390px / 360px layouts, five-layer preview, gallery-to-game selection, launch deep link, SVG address lookup against Base, FAQ, image loading and browser console. No wallet signing or financial transaction was performed.

The homepage shares the SVG renderer with the game but does not load Web3. The game keeps the existing `souli-idle-v2` saved-progress schema. Changing hosting origin starts a separate browser save; local development progress does not transfer automatically.

## Publication scope

Sites hosts this as a separate owner-private preview. It does not replace souli.net or alter its DNS. The preview source is pushed only to the Site's managed repository. No credentials are committed. The funding goal and LP lock terms remain proposals requiring implementation and verification before real payments can be enabled.
