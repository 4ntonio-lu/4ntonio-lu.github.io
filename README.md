# Antonio Lu: Windows 95 Portfolio

My personal portfolio, built as a Windows 95 desktop.

**Live site:** https://4ntonio-lu.github.io/

Open apps from the desktop icons, the Start menu, or the taskbar. Click an icon to select it, and double-click to open it. Several windows can stay open at once. Drag a window by its title bar, or minimize, maximize, and close it. On a phone, windows fill the screen and the Start menu launches apps.

## Apps

- About
- Resume
- Experiences
- Projects
- Crypto
- Stocks
- Weather
- LinkedIn
- Mail

About, Resume, Experiences, Projects, Crypto, Stocks, and Weather open windows. LinkedIn and Mail are shortcuts: LinkedIn opens my profile, and Mail starts an email.

## Run it locally

Requires Node.js 22. See `.nvmrc`.

```bash
npm ci
npm run dev
```

Then open http://localhost:5173.

## Cloudflare Worker

Stocks and crypto load their prices through a Cloudflare Worker in [`cloudflare-worker/`](cloudflare-worker). The CoinGecko key stays a Wrangler secret, never in the repo.

```bash
cd cloudflare-worker
npx wrangler secret put COINGECKO_APIKEY
```
