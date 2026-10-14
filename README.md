# SOULI web, inscriptions and game prototypes

Start here when moving to another computer: [SOULI handoff and setup (한국어)](HANDOFF.ko.md).

This repository contains the SOULI homepage, Base ETH checkout, original ERC-20i inscription viewer, operator tools, web whitepaper and game prototypes. The default branch is `master`. Mainnet checkout at `/buy/` reads the configured contract's current status before allowing a purchase; historical pilot pages are separate. `/manage/` is the operator UI, with the Sepolia shop at `/manage/?network=testnet`. Each of the three registered operators acts independently; public data is readable without a wallet. The game is still in development.

Production deployment to Azure Static Web Apps at souli.net is manual. A Git push does not deploy the site or execute a blockchain transaction. See [release scope](SITE-RELEASE.md) for implemented features and simulation boundaries, and [the Git checkpoint](docs/GIT-CHECKPOINT.ko.md) for source/media coverage. The optional game API is a separate Node service. The web field guide is `/whitepaper/`, the original inscription viewer is `/soul/`, and Base Sepolia experiments are at `/testnet/`.

## Local setup

Use Node.js 24 or later. On Windows, use `npm.cmd` if PowerShell blocks `npm`.

```sh
npm ci
npm --prefix server ci
npm --prefix contracts ci
npm run dev
```

Open `http://127.0.0.1:5173/`. `npm run dev:api` starts the optional local API; copy `server/.env.example` to a local `.env` only when configuring that service. Never put wallet secrets or cloud credentials in Git. Opening the website does not approve a wallet request.

## Validation

```sh
npm test
npm run test:sale
```

The root suite checks browser-side logic, the API, the production build and the Docker runtime file set. Contract tests compile and exercise local fixtures without public-chain transactions. Real wallet, hosted-release and RPC fork checks are separate. Docker is optional for local frontend development.

## Game and media work

- `output/game/room-v2/`: 3D world experiments, source, GLB exports and visual verification. Run `npm ci` and `npm start` in that folder, then open `http://127.0.0.1:4318/`.
- `output/game/waiting-room/`: standalone Little Daylight prototype. Run `npm ci`, `npm test` and `npm start` there, then open `http://127.0.0.1:4320/`. These prototypes are not integrated into the production purchase flow.
- `public/media/`: the actual homepage video, poster and game teaser assets included in production builds.
- `output/marketing/souli-film/`: production scripts, prompts, original SVG inputs and delivery manifests. Large production video libraries, contact sheets and ZIP archives are kept outside Git; see the manifests for media-library references.

## Original project artwork

```
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////%%%%###%%#/////////////////////////////////
//////////////////////////////////%%%%%#####%#%%%%(/////////////////////////////
//////////////////////////////////################(/////////////////////////////
//////////////////////////////#%######################//////////////////////////
///////////////////////////%#########################%##%///////////////////////
///////////////////////////#######//(,,,,,,,,,,(//(######///////////////////////
///////////////////////////%######///          ///(#####%///////////////////////
/////////////////////////////////*                ./////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
/////////////////////////////////////          /////////////////////////////////
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
```
