# WrestlingPath

**One game**: BitLife-style wrestling career sim from high school to college. Month-by-month choices, state/NCAA tournaments, Fargo/Super 32/WNO, weight classes, rankings, recruiting. Built with Next.js + React + TypeScript.

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Turn-based**: week-by-week simulation with a **time budget**
- **Deterministic**: seeded RNG; save/load reproduces identical outcomes for the same seed + choices
- **OOP engine**: `Wrestler`, `GameEngine`, `SeededRNG`, `TimeBudget`, `MatchSimulator`, `RankingSystem`, etc.

## Project structure

- **`/src/engine`** – Pure sim logic (types, Wrestler, TimeBudget, MatchSimulator, Progression, RankingSystem, Recruiting, Economy, Relationship, GameEngine)
- **`/src/ui`** – React components and screens (CreateScreen, WeeklyPlanner, Left/Center/Right panels, GameContext)
- **`/src/db`** – Persistence (localStorage save/load)
- **`/src/data`** – Schools (30), tournaments (Fargo, Super 32, WNO), opponent generators
- **`/src/engine/unified/`** – Unified engine: month-based flow, choices, tournaments, offseason events, rankings (seeded RNG)

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a wrestler (name, weight class, seed), then each month pick an action (train technique, conditioning, compete, rest, study, etc.) and tap **Next month**. Districts/state (HS), conference/NCAA (college), and offseason events (Fargo, Super 32, WNO) run automatically. Use the **Rankings** tab to see your weight-class board.

## GitHub Pages (static hosting)

The app is built as a **static export** (`output: 'export'`), so it works on GitHub Pages with no server.

1. **One-time setup in the repo**
   - **Settings → Pages** → Source: **GitHub Actions** (not “Deploy from a branch”).

2. **Deploy**
   - Push to `main` (or run the “Deploy to GitHub Pages” workflow manually). The workflow runs `npm run build` and deploys the `out/` folder.
   - Your site will be at `https://<username>.github.io/<repo>/` (repo Pages) or `https://<username>.github.io/` (user/org site).

3. **If the site is under a subpath** (e.g. `username.github.io/cs319/`):
   - In `next.config.ts`, set `basePath: "/cs319"` and `assetPrefix: "/cs319/"`, then push again.

## Build & test

```bash
npm run build   # Produces static site in out/
npm run test    # Vitest (if ESM/config compatible on your Node)
```

Unit tests cover:

- **Time budget**: available hours, tournament week reduction, allocation sum ≤ available, extra practice caps (HS 3 / college 4 blocks of 2h)
- **Recordkeeping**: wins/losses/pins/techs/majors
- **Yearly growth cap** and **rest decay** (Wrestler)
- **SeededRNG** determinism
- **MatchSimulator** variance and determinism
- **RankingSystem** player rank and update after match
- **Recruiting** negotiation chance and determinism
- **GameEngine** same seed + same allocation ⇒ same state

## MVP features

- **Create**: name, home state, weight class, seed
- **Weekly planner**: auto-deducted baseline (HS/college), allocate remaining hours to technique, conditioning, strength, film, study, recovery, social, job, extra practice (2h blocks), weight cut, relationship
- **Left panel**: attributes, meters (energy/health/stress/confidence), ranking, finances, record
- **Center**: narrative, weekly planner, advance week
- **Right panel**: calendar log, recruiting inbox, relationship
- **Save/load**: full state (including RNG) in localStorage; deterministic on reload

## Design notes

- **College entry**: stat compression (e.g. `min(A, cap) + 0.35 * max(0, A - cap)`) by division so HS maxed stats don’t carry over unchanged.
- **Match sim**: effective skill from TrueSkill + condition modifiers + style matchup; winProb = sigmoid((myEff - oppEff) / k); method (Dec/Major/Tech/Fall) and variance via seeded RNG.
- **Rankings**: per weight class; updates after matches/events.
