# Evangeline Home Center — Live P&L Dashboard

A clean, executive dashboard that shows **Evangeline Home Center's Profit &
Loss live throughout the business day**. Sales tick in through the day, and the
P&L statement, KPIs, charts, and a live sales feed all update in real time.

Built as a **single static site** — no backend, no setup, no login. Open it and
the day starts playing.

> **Demo data.** All figures are *simulated*. The dashboard generates a
> realistic full day of sales for the store (seeded by the calendar date, so a
> given day is consistent), then reveals each sale in real time as the clock
> moves. To plug in real numbers later, see [Going live with real data](#going-live-with-real-data).

## What it shows

- **Four headline KPIs** — Net Sales, Gross Profit (with margin), Operating
  Expenses accrued so far, and **Net Profit today** (with net margin).
- **Full P&L statement** — Gross Sales → Returns → Net Sales → COGS → Gross
  Profit → Operating Expenses → **Net Operating Income**, with both *today so
  far* and *projected end-of-day* columns plus % of net sales.
- **Revenue through the day** — cumulative net sales by hour; solid line is what
  has actually been rung up, dashed line is the projected full day.
- **Sales by department** — Lumber, Hardware, Paint, Plumbing, Electrical,
  Garden, Appliances, Flooring.
- **From sales to profit** — a waterfall from Net Sales down to Net Profit.
- **Live sales feed** — individual transactions (and returns) as they happen.

## Controls

- **● Live** — tracks the real time of day. Open it at 2pm and you see the day
  up to 2pm, then it keeps ticking.
- **⏩ Replay the day** — fast-forwards the whole business day (7am–8pm) in about
  90 seconds. Great for showing the full arc in a quick demo.
- A **business-day progress bar** and an **Open / Closed / Day Complete** status
  show where in the day you are.

## Run it locally

It's a static site — serve the folder with anything:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Charts load Chart.js from a CDN, so the machine viewing it needs internet.)

## Deploy to Vercel

1. Push this repo to GitHub.
2. In [vercel.com](https://vercel.com): **Add New → Project → Import** this repo.
3. Framework preset: **Other** (static site, no build step).
4. **Deploy.** Every push redeploys automatically.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Executive light theme / layout |
| `dashboard.js` | Day simulation, live P&L, charts, sales feed |
| `vercel.json` | Vercel static-site config |

## Going live with real data

The whole simulation lives in `dashboard.js`. To drive the dashboard from real
numbers instead:

- **The business model** (departments, margins, average tickets, hourly
  traffic, and daily operating expenses) is defined at the top of
  `dashboard.js` in `DEPARTMENTS`, `HOUR_WEIGHTS`, and `OPEX`. Tune these to
  match the store.
- **The data source** is `buildDay()`, which returns a time-sorted list of
  `{ ts, deptId, amount, cogs, isReturn }` transactions. Replace it with a feed
  from your point-of-sale / accounting system (e.g. a periodic `fetch()` to an
  API), and the rest of the dashboard — KPIs, P&L, charts, feed — keeps working
  unchanged.
