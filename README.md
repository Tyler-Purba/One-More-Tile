# One More Tile

A photo guessing game for two people sharing one screen. The coin winner picks the opening player. On each turn, guess once or skip. A correct guess wins the round. Otherwise, reveal a tile and pass the turn. Three different Pexels photos are drawn for the 4×4, 8×8 and 16×16 rounds. The opening player alternates. Highest score after all three wins.

## Run on your computer

Use Node 24 and npm 11.6 or later. From the extracted project folder, run `node local.mjs` and open http://localhost:4173. This mode needs no package installation. Run `node checks/flow.mjs` for a complete scripted match against the local server.

## How it works

- `public/duel/game.js` draws the board, flips the coin, enforces the turn sequence and counts points. Refreshing starts over.
- `game/api.mjs` selects three distinct photos using the match ID as a seed, returns a single requested tile, and checks guesses against accepted aliases. It sends the full image and credit link after a correct guess.
- `game/photos.json` contains ten pre-cut photos and the accepted answers. It is bundled with the worker. See PHOTOS.md for the sources.
- `worker.ts` connects the puzzle API to the DeepSpace worker. Each request uses the match ID to reproduce the same three-photo draw from the server-side deck. This requires no database binding. `local.mjs` serves the same handler locally.

Both players share a device, so turn and score changes stay in the browser. This is a casual game: a determined client can request extra tiles. Round secrecy here means the normal page receives only the clues requested and the server keeps the answer list. There is no account setup, invite link, or external photo API at play time.

## GitHub and DeepSpace

1. Extract this ZIP. Put its **contents** in the root of your GitHub repository, including .gitignore. package.json and wrangler.toml should be at the repository root.
2. Clone the published repository on your Mac (or use your local Git checkout with its GitHub origin already configured). Open a terminal in that directory.
3. Run the following in order. The login command is interactive. Enter credentials in your terminal. The init command registers the app and supplies its permanent ID.

```sh
npm ci
npm test
npx deepspace auth login
npx deepspace app init
npm run build
```

4. Review any changes from registration, commit the generated app identity/configuration to your GitHub repository, then run `npm run deploy`. Keep the CLI-issued live URL.
5. Open the live URL in a fresh tab and play a match. The submission portal requests the live URL, repository URL, and a short note.

## Verification

`npm test` runs a three-round flow through the UI action functions and real HTTP endpoints. It checks distinct photos, opening turns, skipped and incorrect guesses, reveals, aliases, scoring and replay. `npm run type-check` checks TypeScript. For the browser version of the same test run `npx playwright install chromium` followed by `npm run test:e2e`. The latter launches a disposable local server.

## Submission notes

Implementation and automated verification were performed with a coding agent. The main design choice was a shared-screen game with a small photo API. The browser handles the social game; the backend selects puzzles, serves fragments and judges guesses. In your portal note, add what you personally tested or changed after trying the public deployment.
