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
- All text, dates, and links live in JSON files that are checked at build time (see
  [Editing content](#editing-content)).

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict mode)
- [Vite](https://vite.dev/) for dev server and builds
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [React Router](https://reactrouter.com/) for app routes
- [Chart.js](https://www.chartjs.org/) for price charts
- [Zod](https://zod.dev/) to validate the content files at build time
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

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `npm run dev`             | Start the dev server with hot reload                            |
| `npm run build`           | Build the production site into `dist/`                          |
| `npm run preview`         | Serve the production build locally                              |
| `npm run lint`            | Lint with ESLint (warnings fail too)                            |
| `npm run format`          | Format everything with Prettier                                 |
| `npm run format:check`    | Check formatting without changing files                         |
| `npm run typecheck`       | Type-check the app, the build config, and the scripts           |
| `npm test`                | Run the test suite once                                         |
| `npm run test:watch`      | Run tests in watch mode                                         |
| `npm run check`           | Everything CI runs: lint, format check, typecheck, tests, build |
| `npm run content:schemas` | Regenerate the JSON Schemas after changing the content schema   |
| `npm run deploy`          | Build and publish to GitHub Pages (see below)                   |
| `npm run worker:dev`      | Run the Cloudflare Worker locally                               |
| `npm run worker:deploy`   | Deploy the Cloudflare Worker                                    |

## Project structure

```
src/
  App.tsx                 Routes and the list of desktop apps
  content/                Site text as JSON, plus the schema that validates it
  components/
    elements/             Reusable pieces: windows, taskbar, desktop icons, tabs
    modules/              One component per app window (About, Resume, ...)
    hooks/                Shared React hooks
  assets/                 Images, icons, and fonts
  test/                   Test setup
scripts/content/          Build-time content validation and JSON Schema generator
public/                   Files served as-is (resume PDF, favicon)
cloudflare-worker/        CoinGecko proxy (separate npm package)
```

## Editing content

Everything the site says lives in JSON files in [`src/content/`](src/content), so updating the
portfolio doesn't mean editing React components.

| File               | What's in it                                                    |
| ------------------ | --------------------------------------------------------------- |
| `experiences.json` | Jobs in the Experiences window                                  |
| `projects.json`    | Projects in the Projects window                                 |
| `profile.json`     | The About window text, the taskbar links, and the resume's name |

Each file starts with a `$schema` line, so VS Code autocompletes field names, shows what each field
is for on hover, and underlines mistakes as you type. The dev server and the build also check every
file against [`src/content/schema.ts`](src/content/schema.ts), so a missing date or a misspelled
field stops the build with a message that says what to fix instead of shipping a broken page.

A few rules apply to every file:

- Dates are `"YYYY-MM"` and display as "May 2024". Use `null` for `end` if something is ongoing; it
  shows as "Present".
- Entries are shown newest first, so their order in the file doesn't matter.
- Images are file names in `src/assets/images/`, and the resume is a file name in `public/`. The
  build fails if a file doesn't exist.

### Adding a new job

1. Save the company's logo in `src/assets/images/`, for example `company-name.png`. It's shown 96
   pixels tall, so an image at least 192 pixels tall stays sharp on high-resolution screens.
2. Open `src/content/experiences.json` and add an entry to the `experiences` list. In VS Code, put
   the cursor inside the list, press Ctrl+Space, and pick **New job** to insert a template.
   Separate entries with a comma.

   ```json
   {
     "company": "Company Name",
     "role": "Job Title",
     "location": "City, ST",
     "logo": "company-name.png",
     "start": "2025-01",
     "end": null,
     "skills": ["First skill", "Second skill"],
     "bullets": ["What you built or improved, one sentence per bullet."]
   }
   ```

3. Run `npm run dev` and open the Experiences window. The new job is the first tab.
4. When the job ends, change `end` to its last month, for example `"2027-08"`.

Projects work the same way in `projects.json`, with `name` and `image` instead of `company`,
`role`, `location`, and `logo`, plus an optional `link`.

### When the build reports a problem

Each message names the file, the entry, and the field. For example, a new job with a start date
missing its leading zero, no `end`, and no bullet points stops the build with:

```
error during build:
[content-validation] [plugin content-validation] src/content/experiences.json: 3 problems to fix:
  - experiences[0] (Company Name).start: Use "YYYY-MM", for example "2024-05".
  - experiences[0] (Company Name).end: Required. Use "YYYY-MM", or null if it's ongoing.
  - experiences[0] (Company Name).bullets: Add at least one bullet point.
See "Editing content" in README.md.
```

`experiences[0]` is the first entry in the file, counting from zero. While `npm run dev` is
running, the same message appears in the browser and goes away when you save a fix. Image and
resume files are checked once the fields themselves are valid.

### Changing the content schema

To add or change a field, edit [`src/content/schema.ts`](src/content/schema.ts), run
`npm run content:schemas` to regenerate the editor schemas in `src/content/schemas/`, and update
the components that display it. A test fails if the generated schemas are out of date.

## Testing and CI

Tests live next to the code they cover (`*.test.ts` and `*.test.tsx`). Component tests run in
jsdom with Vitest and Testing Library, and the content validation tests in
`scripts/content/` run in Node. Run `npm run check` before pushing; it's the same set of steps the
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
