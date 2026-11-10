# Antonio Lu — Windows 95 Portfolio

My personal portfolio, built as a Windows 95 desktop. Open apps from the desktop icons or the
taskbar to read about me, view my resume, browse my work experience and projects, and check live
crypto prices.

**Live site:** https://4ntonio-lu.github.io/

## Features

- Windows 95 look and feel: draggable windows, desktop icons, taskbar with a clock, property-sheet
  tabs, and the classic font and cursors.
- Resume viewer, plus work experience and project details in tabbed windows.
- Crypto dashboard with current prices and one-year charts from CoinGecko, served through a small
  Cloudflare Worker so the API key never reaches the browser.
- Responsive layout with a mobile Start menu.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Vite](https://vite.dev/) for dev server and builds
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Router](https://reactrouter.com/) for app routes
- [Chart.js](https://www.chartjs.org/) for price charts
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for tests
- ESLint + Prettier, checked in CI with GitHub Actions
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) for the CoinGecko proxy

## Getting started

Requires Node.js 22 (see `.nvmrc`; run `nvm use` if you use nvm).

```bash
npm ci
npm run dev
```

Then open http://localhost:5173.

## Scripts

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run dev`           | Start the dev server with hot reload                            |
| `npm run build`         | Build the production site into `dist/`                          |
| `npm run preview`       | Serve the production build locally                              |
| `npm run lint`          | Lint with ESLint (warnings fail too)                            |
| `npm run format`        | Format everything with Prettier                                 |
| `npm run format:check`  | Check formatting without changing files                         |
| `npm run typecheck`     | Type-check the app and the build config                         |
| `npm test`              | Run the test suite once                                         |
| `npm run test:watch`    | Run tests in watch mode                                         |
| `npm run check`         | Everything CI runs: lint, format check, typecheck, tests, build |
| `npm run deploy`        | Build and publish to GitHub Pages (see below)                   |
| `npm run worker:dev`    | Run the Cloudflare Worker locally                               |
| `npm run worker:deploy` | Deploy the Cloudflare Worker                                    |

## Project structure

```
src/
  App.tsx                 Routes and the list of desktop apps
  components/
    elements/             Reusable pieces: windows, taskbar, desktop icons, tabs
    modules/              One component per app window (About, Resume, ...)
    hooks/                Shared React hooks
  assets/                 Images, icons, and fonts
  test/                   Test setup
public/                   Files served as-is (resume PDF, favicon)
cloudflare-worker/        CoinGecko proxy (separate npm package)
```

## Testing and CI

Tests live next to the code they cover (`*.test.tsx`) and run in jsdom with Vitest and Testing
Library. Run `npm run check` before pushing; it's the same set of steps the
[CI workflow](.github/workflows/ci.yml) runs on every push and pull request.

## Deployment

The site is hosted on GitHub Pages from the `gh-pages` branch.

```bash
npm run deploy
```

This builds the site, copies `index.html` to `404.html` so deep links like `/experiences` load the
app, and pushes `dist/` to the `gh-pages` branch with the
[`gh-pages`](https://github.com/tschaub/gh-pages) package. The copy step uses the Windows `copy`
command, so run it from a Windows terminal.

## Cloudflare Worker

The crypto app calls a Worker in [`cloudflare-worker/`](cloudflare-worker) that forwards requests
to CoinGecko and adds the API key. It's a separate npm package with its own Wrangler setup.

```bash
npm --prefix cloudflare-worker ci   # first time only
npm run worker:dev                  # local dev server
npm run worker:deploy               # deploy with Wrangler
```

The CoinGecko key is stored as a Worker secret, not in the repo:

```bash
cd cloudflare-worker
npx wrangler secret put COINGECKO_APIKEY
```

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), for example
`feat: add stocks app`, `fix(ui): keep wallpaper from tiling`, or `docs: update README`.
