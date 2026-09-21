# Intrinsic Value Desk — Frontend
 
A dark-themed, calculator-style interface for the [Intrinsic Value Desk DCF engine](https://github.com/yecb-prog/dcf-project) — pick a ticker, adjust your assumptions, get a discounted cash flow valuation with sensitivity analysis.
 
**Live demo:** https://dcf-frontend.vercel.app
**Backend repo:** [dcf-project](https://github.com/yecb-prog/dcf-project)
 
## Features
 
- Ticker input with live valuation, WACC, cost of debt, and tax rate — all calculated per-company from real financial data, not flat assumptions
- Adjustable growth rate, terminal growth, and buyback rate sliders
- Optional WACC override, with an explanation of when and why to use it
- Multi-stage growth toggle (high growth fading to terminal rate, instead of one flat rate)
- Color-coded verdict (green = undervalued, red = overvalued, gray = fairly priced) — color is reserved for meaning, not decoration; amber/blue is used only for interactive elements
- A WACC × terminal-growth sensitivity heatmap (green-to-red gradient, with an expandable full-size view for a closer look)
- A "market-implied growth rate" card — reverse-solves for what growth assumption the current market price already reflects
## Tech stack
 
Next.js (App Router) · TypeScript · Tailwind CSS
 
## Running locally
 
```bash
npm install
npm run dev
```
 
By default this points at the live backend (`https://dcf-project.onrender.com`). To run against a local backend instead, change `API_BASE` at the top of `app/page.tsx` to `http://127.0.0.1:8000` and make sure the [backend](https://github.com/yecb-prog/dcf-project) is running locally too.
 
## Design notes
 
The interface intentionally leans into a dark, data-dense "terminal" aesthetic rather than a generic SaaS dashboard template — monospace type for all numeric data, serif type for headings/labels, and a restrained color system (blue for interaction, green/red/gray for verdict meaning only). The sensitivity heatmap layout (axis labels, gradient legend, wide flat cells) was directly modeled after conventions used in professional/Streamlit-style financial tools.
 
